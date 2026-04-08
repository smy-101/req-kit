## 1. 数据库与 Service 层

- [x] 1.1 在 `src/db/schema.sql` 新增 `cookies` 表和唯一索引 `(domain, path, name)`
- [x] 1.2 新建 `src/services/cookie.ts` — `CookieService` 类，实现 Set-Cookie 解析方法 `parseSetCookie(headerValue: string, requestHost: string): Cookie`
- [x] 1.3 实现 `CookieService.storeCookies(setCookieHeaders: string[], requestHost: string)` — 解析并 upsert 到数据库
- [x] 1.4 实现 `CookieService.getMatchingCookies(url: string): Cookie[]` — 按域名/路径/Secure/过期匹配，并懒清理过期 cookie
- [x] 1.5 实现 `CookieService.getAll(domain?: string)` / `deleteById(id)` / `deleteByDomain(domain)` / `deleteAll()` CRUD 方法

## 2. Cookie Routes

- [x] 2.1 新建 `src/routes/cookies.ts` — `GET /api/cookies`（支持 `?domain=` 过滤）、`DELETE /api/cookies/:id`、`DELETE /api/cookies?domain=`、`DELETE /api/cookies`
- [x] 2.2 在 `src/index.ts` 中实例化 `CookieService`，注册 Cookie Routes

## 3. Proxy Pipeline 集成

- [x] 3.1 修改 `routes/proxy.ts` — Auth 注入后、fetch 前，调用 `CookieService.getMatchingCookies(url)` 注入 `Cookie` header（当用户未手动设置时）
- [x] 3.2 修改 `routes/proxy.ts` — fetch 返回后，提取响应的 `Set-Cookie` header，调用 `CookieService.storeCookies()` 存入 jar，并在响应 JSON 中附加 `set_cookies` 字段（含 `cookie_action` 标记）
- [x] 3.3 修改 `routes/proxy.ts` 的 `streamProxyResponse` — 在 `onHeaders` 回调中同样处理 Set-Cookie 存储和 SSE 事件附加
- [x] 3.4 更新 `createProxyRoutes` 函数签名，接受 `CookieService` 参数

## 4. 前端 — 侧栏 Cookie 管理入口

- [x] 4.1 在 `index.html` 侧栏「全局变量」行后新增 Cookies 入口行（显示 cookie 总量图标和数字）
- [x] 4.2 新建 `src/public/js/components/cookie-manager.js` — Cookie 管理 modal 组件，按域名分组折叠展示，支持删除单条/按域名清空/全部清空
- [x] 4.3 在 `store.js` 中新增 cookie 相关 state 和事件（`cookies-updated`）
- [x] 4.4 在 `api.js` 中新增 cookie API 调用方法（`getCookies`、`deleteCookie`、`deleteCookiesByDomain`、`clearAllCookies`）

## 5. 前端 — 响应面板 Cookies Tab

- [x] 5.1 在 `index.html` 响应面板 tab-bar 中新增 Cookies tab 按钮，新增对应 tab-content 容器
- [x] 5.2 新建 `src/public/js/components/cookie-tab.js` — 展示当前响应的 `set_cookies` 列表，标记「新增」/「更新」高亮，无 cookie 时显示空状态
- [x] 5.3 修改请求发送后的响应处理逻辑，将 `set_cookies` 数据传递给 Cookie tab 组件渲染

## 6. 测试

- [x] 6.1 单元测试 `tests/unit/cookie.test.ts` — Set-Cookie 解析（简单、带属性、多值、Expires/Max-Age、upsert）
- [x] 6.2 单元测试 Cookie 匹配逻辑（精确域名、子域名、路径、Secure、过期、不覆盖用户 Cookie）
- [x] 6.3 集成测试 `tests/integration/cookie.test.ts` — Cookie CRUD API 端点测试
- [x] 6.4 集成测试 — proxy pipeline 中 cookie 自动注入和 Set-Cookie 自动存储的端到端验证
