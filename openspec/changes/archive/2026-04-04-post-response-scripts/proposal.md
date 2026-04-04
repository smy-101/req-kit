## Why

当前 req-kit 只支持前置脚本（在请求发送前执行），无法在收到响应后执行自定义逻辑。这意味着用户无法自动验证响应内容、从响应中提取变量传递给后续请求，也无法构建自动化的 API 测试流程。后置脚本是 API 测试工具从"手动调试器"升级为"自动化测试平台"的关键一步，也是 Postman 中使用频率最高的功能之一。

## What Changes

- 在代理管线中，于"发送请求"和"记录历史"之间插入后置脚本执行步骤
- `ScriptService` 新增 `executePostScript` 方法，沙箱中暴露 `response` 对象（status、headers、body、json()、time、size）和 `tests` 断言收集器
- 前端请求面板新增 "Tests" tab，用于编写后置脚本
- 前端响应面板新增 "Test Results" tab，展示断言通过/失败结果
- 数据库 `saved_requests` 和 `history` 表各新增 `post_response_script` 列
- Store 的 tab 状态新增 `postResponseScript` 字段
- SSE 流式模式下不支持后置脚本（响应体不完整）

## Capabilities

### New Capabilities
- `post-response-scripts`: 后置脚本执行引擎 — 在响应到达后运行用户脚本，支持断言收集、变量提取、日志输出
- `test-results-ui`: 测试结果展示 — 在响应面板中以可视化方式展示断言通过/失败状态和汇总统计

### Modified Capabilities
- `scripts`: 扩展脚本能力，新增后置脚本执行时机（当前仅支持前置脚本）
- `proxy`: 代理管线新增后置脚本执行步骤，影响请求/响应处理流程
- `history`: 历史记录新增 `post_response_script` 字段
- `collections`: 保存的请求模板新增 `post_response_script` 字段

## Impact

- **后端**: `src/services/script.ts`（新增方法）、`src/routes/proxy.ts`（管线插入步骤）、`src/db/schema.sql`（新增列）
- **前端**: `index.html`（新增 tab）、`js/store.js`（tab 状态扩展）、新增 `post-script-editor.js` 和 `test-results.js` 组件、`js/components/response-viewer.js`（新增 tab）
- **API**: `/api/proxy` 请求体新增 `post_response_script` 字段，响应体新增 `script_tests`、`post_script_logs`、`post_script_variables` 字段
- **数据库**: 两张表增量迁移（ALTER TABLE ADD COLUMN），无破坏性变更
