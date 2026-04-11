## 1. Mock 服务器实现

- [x] 1.1 创建 `tests/e2e/mock-server.ts`，实现所有 httpbin.org 端点的 mock（/get, /post, /put, /patch, /delete, /anything, /json, /xml, /html, /image/png, /uuid, /status/:code, /redirect/:n, /delay/:seconds, /cookies/set, /response-headers）
- [x] 1.2 实现 mock 服务器的健康检查端点（GET `/` 返回 200）
- [x] 1.3 实现 PNG 图片数据（内嵌最小有效 PNG 二进制，用于 /image/png 端点）

## 2. Mock URL 常量与基础设施

- [x] 2.1 创建 `tests/e2e/helpers/mock.ts`，导出 `MOCK_BASE_URL` 常量（`http://localhost:4000`）

## 3. 全局 Setup/Teardown 集成

- [x] 3.1 修改 `tests/e2e/global-setup.ts`：在启动主应用前清理端口 4000 残留进程，用 `Bun.spawn` 启动 mock 服务器，轮询健康检查确认就绪，写 `.mock-server.pid`
- [x] 3.2 修改 `tests/e2e/global-teardown.ts`：读取 `.mock-server.pid` 终止 mock 服务器进程，清理 PID 文件

## 4. E2E 测试文件 URL 替换

- [x] 4.1 替换所有 spec 文件中的 `https://httpbin.org` 为 `${MOCK_BASE_URL}`，并添加 import 语句（涉及 30+ 个文件：app, auth, body-types, collection-advanced, collection-context-menu, collection-variables, cookie-advanced, cookies, edge-cases, environment, export, follow-redirects, headers-params, history, history-advanced, history-load-verify, history-pagination, http-methods, import-export, keyboard-shortcuts, management-advanced, options-method, panel-resizer, request, request-cancellation, request-timeout, response-advanced, response-extras, response-format-switching, response-search-nav, runner, runner-advanced, runner-stop, save-dialog-advanced, save-load, save-update, scripts, tab-advanced, variables, variable-resolution）

## 5. 验证

- [x] 5.1 运行全部 E2E 测试确认通过（`bun run test:e2e`）
