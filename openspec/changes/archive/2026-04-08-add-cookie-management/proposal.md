## Why

req-kit 当前完全不具备 Cookie 管理能力 — 响应中的 `Set-Cookie` 被丢弃，后续请求也不会自动携带 `Cookie` header。这导致最基本的工作流（登录 → 获取 session cookie → 访问受保护接口）无法开箱即用，用户只能在 Pre-request Script 中手动提取并注入 token，体验很差。

## What Changes

- 新增全局 Cookie Jar：解析响应中的 `Set-Cookie` header，按 RFC 6265 子集存储到 SQLite
- 请求发出前自动注入匹配的 `Cookie` header（不覆盖用户手动设置的 Cookie header）
- 新增 `cookies` 数据库表，持久化存储 cookie（domain、path、name、value、expires、httpOnly、secure、sameSite）
- 后端新增 Cookie Service + Cookie Routes（CRUD + 按域名查询/清空）
- 侧栏新增 Cookie 管理入口，modal 中按域名分组展示所有 cookie，支持手动增删改
- 响应面板新增 Cookies tab，展示当前响应设置的 cookie（含高亮标记新增/更新）
- Cookie 过期自动清理

## Capabilities

### New Capabilities

- `cookie-jar`: Cookie 存储与匹配核心能力 — 包括 cookie 的解析、存储、域名/路径匹配、过期清理、以及与 proxy pipeline 的集成

### Modified Capabilities

- `proxy`: 请求管道新增 Cookie 注入（发出前）和 Set-Cookie 提取（返回后）两个阶段

## Impact

- **数据库**: 新增 `cookies` 表
- **后端**: 新增 `CookieService`、`CookieRoutes`；修改 `proxy.ts` pipeline 增加 Cookie 注入/提取步骤
- **前端**: 新增 Cookie 管理 modal 组件；响应面板新增 Cookies tab；侧栏新增入口按钮
- **API**: 新增 `/api/cookies` 系列端点（GET/DELETE），响应中的 proxy 结果新增 `set_cookies` 字段
