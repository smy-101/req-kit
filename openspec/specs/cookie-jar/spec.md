## Purpose

Cookie Jar capability for parsing, storing, matching, and managing HTTP cookies across proxy requests. Provides automatic Cookie header injection on outgoing requests and Set-Cookie extraction from responses, with a management UI and CRUD API.

## Requirements

### Requirement: Cookie 解析与存储

系统 SHALL 在代理响应返回后，解析响应中的所有 `Set-Cookie` header，将每个 cookie 存储到 SQLite `cookies` 表中。

解析 SHALL 提取以下属性：
- `name` 和 `value`（必填）
- `Domain`（可选，默认为请求主机名）
- `Path`（可选，默认 `/`）
- `Expires` 或 `Max-Age`（可选，转换为 `expires_at` ISO 8601 格式；缺失则为 session cookie，`expires_at` 为 NULL）
- `HttpOnly`（可选标志）
- `Secure`（可选标志）
- `SameSite`（可选，值为 `strict`/`lax`/`none`）

当 (domain, path, name) 组合已存在时，系统 SHALL 更新 `value`、`expires_at`、`http_only`、`secure`、`same_site` 字段（upsert 行为）。

#### Scenario: 解析简单的 Set-Cookie header
- **WHEN** 代理响应包含 `Set-Cookie: sessionId=abc123`
- **THEN** 系统存储 cookie `{ domain: "请求主机名", path: "/", name: "sessionId", value: "abc123", expires_at: null }`

#### Scenario: 解析带属性的 Set-Cookie header
- **WHEN** 代理响应包含 `Set-Cookie: token=xyz; Domain=.example.com; Path=/api; Max-Age=3600; HttpOnly; Secure; SameSite=Lax`
- **THEN** 系统存储 cookie `{ domain: ".example.com", path: "/api", name: "token", value: "xyz", expires_at: "<当前时间+3600秒>", http_only: 1, secure: 1, same_site: "lax" }`

#### Scenario: 解析 Expires 属性
- **WHEN** 代理响应包含 `Set-Cookie: id=123; Expires=Wed, 09 Jun 2027 10:18:14 GMT`
- **THEN** 系统将 Expires 转换为 ISO 8601 格式存入 `expires_at`

#### Scenario: 覆盖同名 cookie
- **WHEN** cookie jar 中已存在 `(domain=".example.com", path="/", name="token")`，新响应包含 `Set-Cookie: token=newvalue; Domain=.example.com`
- **THEN** 系统更新该 cookie 的 `value` 为 `newvalue`，其他字段按新 Set-Cookie 属性更新

#### Scenario: 响应包含多个 Set-Cookie header
- **WHEN** 代理响应包含两个 `Set-Cookie` header（`a=1` 和 `b=2`）
- **THEN** 系统分别解析并存储两个 cookie

### Requirement: Cookie 匹配与注入

系统 SHALL 在代理请求发出前，根据请求 URL 的域名和路径，从 cookie jar 中匹配所有符合条件的 cookie，自动注入 `Cookie` header。

匹配规则：
1. **Domain 匹配**: cookie 的 domain（去除前导 `.`）等于请求域名，或是请求域名的后缀（如 `.example.com` 匹配 `api.example.com`）
2. **Path 匹配**: cookie 的 path 是请求路径的前缀（`/api` 匹配 `/api/users`）
3. **Secure 检查**: cookie 标记 `secure` 时，仅在 HTTPS 请求时匹配
4. **过期检查**: 已过期的 cookie 不匹配，并在此时删除

如果用户已在请求 headers 中设置了 `Cookie` header（不区分大小写），系统 SHALL NOT 覆盖，跳过自动注入。

匹配到的 cookie SHALL 按 path 长度降序、再按 name 字母序排列后，拼接为 `name1=value1; name2=value2` 格式。

#### Scenario: 精确域名匹配
- **WHEN** 请求 URL 为 `https://example.com/api`，cookie jar 中有 `domain=example.com, path=/, name=token`
- **THEN** 系统注入 `Cookie: token=value`

#### Scenario: 子域名匹配
- **WHEN** 请求 URL 为 `https://api.example.com/v1`，cookie jar 中有 `domain=.example.com, path=/, name=session`
- **THEN** 系统注入 `Cookie: session=value`

#### Scenario: 路径匹配
- **WHEN** 请求 URL 为 `https://example.com/api/users`，cookie jar 中有 `domain=example.com, path=/api, name=id`
- **THEN** 系统注入 `Cookie: id=value`

#### Scenario: Secure cookie 仅 HTTPS 发送
- **WHEN** 请求 URL 为 `http://example.com/`（HTTP），cookie jar 中有 `domain=example.com, path=/, name=token, secure=1`
- **THEN** 系统 NOT 注入该 cookie

#### Scenario: 不覆盖用户手动设置的 Cookie header
- **WHEN** 用户在请求 headers 中设置了 `Cookie: custom=value`，cookie jar 中有匹配的 cookie
- **THEN** 系统 NOT 注入 jar 中的 cookie，保留用户的 `Cookie: custom=value`

#### Scenario: 过期 cookie 不发送并删除
- **WHEN** 请求 URL 匹配某 cookie，但该 cookie 的 `expires_at` 已过期
- **THEN** 系统 NOT 注入该 cookie，并从 jar 中删除该 cookie

#### Scenario: 多个匹配 cookie 拼接
- **WHEN** 请求 URL 匹配多个 cookie（path 较长的 `a=1` path=`/api`，path 较短的 `b=2` path=`/`）
- **THEN** 系统注入 `Cookie: a=1; b=2`（按 path 长度降序）

### Requirement: Cookie 过期清理

系统 SHALL 在每次查询匹配 cookie 时，删除所有 `expires_at` 不为 NULL 且早于当前时间的过期 cookie。

#### Scenario: 懒清理过期 cookie
- **WHEN** cookie jar 中有 3 条 cookie，其中 1 条已过期
- **THEN** 系统在下次匹配查询时删除该过期 cookie，不影响未过期的 cookie

#### Scenario: Session cookie 不被清理
- **WHEN** cookie 的 `expires_at` 为 NULL（session cookie）
- **THEN** 系统 NOT 删除该 cookie

### Requirement: Cookie CRUD API

系统 SHALL 提供以下 API 端点：

- `GET /api/cookies` — 返回所有 cookie，按 domain 分组。支持 `?domain=xxx` 查询参数过滤指定域名。
- `DELETE /api/cookies/:id` — 删除指定 ID 的 cookie。
- `DELETE /api/cookies?domain=xxx` — 删除指定域名下的所有 cookie。
- `DELETE /api/cookies` — 清空所有 cookie。

#### Scenario: 获取所有 cookie
- **WHEN** 客户端发送 `GET /api/cookies`
- **THEN** 系统返回 `{ "cookies": [{ id, domain, path, name, value, expires_at, http_only, secure, same_site, created_at }, ...] }`

#### Scenario: 按域名过滤 cookie
- **WHEN** 客户端发送 `GET /api/cookies?domain=example.com`
- **THEN** 系统返回 domain 为 `example.com` 或 `.example.com` 的所有 cookie

#### Scenario: 删除单条 cookie
- **WHEN** 客户端发送 `DELETE /api/cookies/42`
- **THEN** 系统删除 id=42 的 cookie，返回 `{ "success": true }`

#### Scenario: 清空域名下所有 cookie
- **WHEN** 客户端发送 `DELETE /api/cookies?domain=example.com`
- **THEN** 系统删除 domain 包含 `example.com` 的所有 cookie，返回 `{ "success": true, "deleted": N }`

#### Scenario: 清空所有 cookie
- **WHEN** 客户端发送 `DELETE /api/cookies`
- **THEN** 系统删除所有 cookie，返回 `{ "success": true, "deleted": N }`

### Requirement: Cookie 管理 UI

系统 SHALL 在侧栏「全局变量」行下方新增「Cookies」入口行，显示当前 cookie 总数，点击打开 Cookie 管理 modal。

Modal 中 SHALL 按域名分组折叠展示所有 cookie。每个 cookie 展示 name、value（截断显示）、path、过期时间、属性标记（HttpOnly/Secure）。

用户 SHALL 能执行以下操作：
- 展开域名组查看该域名下所有 cookie
- 删除单条 cookie
- 清空某域名下所有 cookie
- 清空所有 cookie

#### Scenario: 侧栏显示 cookie 数量
- **WHEN** cookie jar 中有 5 条 cookie
- **THEN** 侧栏 Cookies 行显示数字 `5`

#### Scenario: 按域名分组展示
- **WHEN** cookie jar 中有 `example.com` 域名下 3 条 cookie 和 `api.test.com` 域名下 2 条 cookie
- **THEN** modal 中展示两个分组，分别显示 3 条和 2 条 cookie

#### Scenario: 删除单条 cookie
- **WHEN** 用户在 modal 中点击某条 cookie 的删除按钮
- **THEN** 该 cookie 从 jar 中删除，UI 更新

#### Scenario: 清空域名下 cookie
- **WHEN** 用户点击域名组的「清空」按钮
- **THEN** 该域名下所有 cookie 被删除，UI 更新

### Requirement: 响应面板展示 Set-Cookie

系统 SHALL 在响应面板新增 Cookies tab（与 Body、Headers、Test Results 并列），展示当前响应解析出的 Set-Cookie 信息。

对于每条 Set-Cookie，SHALL 展示 name、value、domain、path、expires、属性标记。新增的 cookie（jar 中不存在）SHALL 高亮标记为「新增」，更新的 cookie（jar 中已存在同名）SHALL 高亮标记为「更新」。

当响应中没有 Set-Cookie header 时，Cookies tab SHALL 显示空状态提示。

#### Scenario: 响应设置了 cookie
- **WHEN** 代理响应包含 `Set-Cookie: session=abc`
- **THEN** Cookies tab 展示该 cookie 的完整信息

#### Scenario: 新增 cookie 高亮
- **WHEN** 代理响应设置了 jar 中不存在的 cookie
- **THEN** Cookies tab 中该 cookie 标记为「新增」

#### Scenario: 更新 cookie 高亮
- **WHEN** 代理响应设置了 jar 中已存在的同名 cookie（值不同）
- **THEN** Cookies tab 中该 cookie 标记为「更新」

#### Scenario: 响应无 Set-Cookie
- **WHEN** 代理响应中没有 Set-Cookie header
- **THEN** Cookies tab 显示「此响应没有设置 Cookie」的空状态提示
