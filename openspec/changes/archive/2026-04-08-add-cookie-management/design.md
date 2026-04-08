## Context

req-kit 是一个自托管 API 测试工具，使用 Bun + Hono 后端代理 HTTP 请求。当前代理管道（`routes/proxy.ts`）直接调用 `fetch()`，Bun 的 `fetch` 没有 cookie jar — 响应的 `Set-Cookie` header 被丢弃，后续请求不自动携带 `Cookie`。用户只能通过 Pre-request Script 手动提取 token 并注入，无法完成最基本的「登录 → session cookie → 访问受保护接口」工作流。

## Goals / Non-Goals

**Goals:**

- 实现全局 Cookie Jar，按域名自动管理 cookie 的存取
- 与现有 proxy pipeline 无缝集成：请求前自动注入、响应后自动提取
- 提供管理 UI：侧栏入口查看/编辑/删除 cookie，响应面板展示当前请求设置的 cookie
- 持久化到 SQLite，重启后 cookie 保留

**Non-Goals:**

- 不做按 Environment 隔离的 cookie（全局共享，与浏览器行为一致）
- 不实现完整 RFC 6265（忽略 Public Suffix List、SameSite 严格校验等边缘场景）
- 不做 Cookie 加密存储
- 不做 Cookie 导入/导出
- 不做 WebSocket/SSE 协议的 cookie 处理

## Decisions

### D1: Cookie 作用域 — 全局 Cookie Jar

**选择**: 全局 jar，按 domain 匹配，不按 environment 隔离。

**理由**: 浏览器就是这么工作的。用户期望 `api.example.com` 的 cookie 在所有请求中自动生效。如果需要隔离，用户可以手动清空 cookie。Postman 也是这个方案。

**替代方案**: 按 environment 隔离 — 更安全但违背用户直觉，且增加复杂度。

### D2: Cookie 注入位置 — Auth 注入之后

**选择**: Cookie 注入在 Auth 注入之后、`fetch()` 之前执行。

```
变量替换 → Pre-request Script → Auth 注入 → Cookie 注入 → fetch() → Cookie 存储 → Post-response Script → History
```

**理由**: 如果用户手动设置了 `Cookie` header（Headers tab 或脚本），不自动覆盖。只在用户没设时才填充。这也意味着 Cookie header 与用户设置的 header 合并时采用不覆盖策略。

**替代方案**: Cookie 注入在 Auth 之前 — 可能被 Auth 覆盖，不合理。

### D3: Set-Cookie 解析时机 — 响应返回后、Post-script 之前

**选择**: 在 `fetch()` 返回后、Post-response Script 执行之前解析 `Set-Cookie` 并存入 jar。

**理由**: Post-response Script 中用户可能通过 `variables.set()` 提取 cookie 值用于后续请求。虽然 `response.headers` 已经包含了 Set-Cookie，但尽早存入 jar 让整个流程更一致。

### D4: Cookie 匹配规则 — RFC 6265 子集

实现以下匹配规则：

| 规则 | 行为 |
|------|------|
| Domain 匹配 | 有 Domain 属性时支持子域名匹配（`Domain=.example.com` 匹配 `api.example.com`）；无 Domain 属性时精确匹配请求域名 |
| Path 匹配 | cookie-path 是 request-path 的前缀（`/api` 匹配 `/api`、`/api/users`） |
| Secure | 仅 HTTPS 请求时发送 |
| HttpOnly | 正常存储和发送，UI 中标记为 HttpOnly |
| Expires / Max-Age | 存储过期时间，过期 cookie 不发送；每次请求前懒清理 |

**不实现**: Public Suffix List、SameSite 严格校验、cookie 数量/大小上限。

### D5: 数据库设计

```sql
CREATE TABLE IF NOT EXISTS cookies (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    domain      TEXT NOT NULL,
    path        TEXT NOT NULL DEFAULT '/',
    name        TEXT NOT NULL,
    value       TEXT NOT NULL,
    expires_at  TEXT,           -- ISO 8601, NULL 表示 session cookie
    http_only   INTEGER DEFAULT 0,
    secure      INTEGER DEFAULT 0,
    same_site   TEXT,           -- 'strict' | 'lax' | 'none' | NULL
    created_at  TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cookies_unique ON cookies(domain, path, name);
```

**理由**: (domain, path, name) 唯一 — 同域同路径下同名 cookie 只保留最新值，符合浏览器行为。

### D6: UI 布局

- **侧栏**: 在「全局变量」行下方新增「Cookies」入口行，点击弹出管理 modal。Modal 中按域名分组折叠展示，支持删除单条/按域名清空。
- **响应面板**: 新增 Cookies tab（与 Body、Headers 并列），展示当前响应的 Set-Cookie 信息，高亮标记新增/更新的 cookie。

### D7: API 设计

```
GET    /api/cookies                    — 获取所有 cookie（按域名分组）
GET    /api/cookies?domain=example.com — 获取指定域名的 cookie
DELETE /api/cookies/:id                — 删除单条 cookie
DELETE /api/cookies?domain=example.com — 清空指定域名下所有 cookie
DELETE /api/cookies                    — 清空所有 cookie
```

Proxy 响应中新增 `set_cookies` 字段，包含本次响应解析出的 Set-Cookie 列表，供前端展示。

## Risks / Trade-offs

- **[Set-Cookie 解析复杂性]** → 使用简化解析器，覆盖主流格式。对于非标准 Set-Cookie 格式（如缺少空格、带引号等），best-effort 处理。
- **[Cookie 过期清理]** → 采用懒清理策略：每次查询匹配 cookie 时顺便删除过期项。不另起定时任务，避免架构复杂化。
- **[与现有 Cookie header 冲突]** → 注入时采用不覆盖策略：如果用户已设置 Cookie header，则跳过自动注入。
- **[fetch() 不传递 cookie 给 Bun]** → Bun 的 fetch 不处理 cookie，需手动在请求前注入 Cookie header、在响应后提取 Set-Cookie。这是正确做法，不受 Bun 行为限制。
