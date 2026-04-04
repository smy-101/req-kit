## 1. 数据库迁移

- [x] 1.1 `saved_requests` 表新增 `post_response_script TEXT` 列（ALTER TABLE + schema.sql）
- [x] 1.2 `history` 表新增 `post_response_script TEXT` 列（ALTER TABLE + schema.sql）

## 2. 后端 — ScriptService 扩展

- [x] 2.1 在 `ScriptService` 中新增 `executePostScript()` 方法，沙箱暴露 `response` 对象（status/headers/body/json()/time/size）和 `tests` Proxy 收集器
- [x] 2.2 定义 `PostScriptResult` 接口，包含 `tests: Record<string, boolean>`、`logs`、`variables`、`error` 字段

## 3. 后端 — 代理管线集成

- [x] 3.1 `routes/proxy.ts` 中在 `proxyService.sendRequest()` 成功返回后插入后置脚本执行步骤
- [x] 3.2 将 `script_tests`、`post_script_logs`、`post_script_variables` 附加到代理响应体中
- [x] 3.3 后置脚本执行失败时返回 HTTP 400 + 错误信息
- [x] 3.4 SSE 流式模式下静默跳过后置脚本（不执行、不报错）
- [x] 3.5 `recordHistory()` 新增 `post_response_script` 参数并写入 history 表

## 4. 后端 — 集合请求保存/加载

- [x] 4.1 `CollectionService` 的 create/update 请求方法支持 `post_response_script` 字段
- [x] 4.2 集合树 API 返回的请求对象包含 `post_response_script` 字段

## 5. 前端 — Store 与 API

- [x] 5.1 `store.js` 中 tab 默认状态新增 `postResponseScript: ''` 和 `scriptTests: null` 字段
- [x] 5.2 `api.js` 发送代理请求时附带 `post_response_script` 字段
- [x] 5.3 收到响应后将 `post_script_variables` 合并到 `store.runtimeVars`，将 `script_tests` 存入 tab 状态

## 6. 前端 — Tests Tab（后置脚本编辑器）

- [x] 6.1 `index.html` 请求面板新增 "Tests" tab 按钮和对应内容区域
- [x] 6.2 新建 `post-script-editor.js` 组件：textarea 编辑器 + 说明文案 + debounced 同步到 store
- [x] 6.3 Tab 切换时正确恢复 `postResponseScript` 状态

## 7. 前端 — Test Results 展示

- [x] 7.1 `index.html` 响应面板新增 "Test Results" tab
- [x] 7.2 新建 `test-results.js` 组件：渲染断言列表（✓/✗ 状态）+ 汇总统计 + 空状态提示
- [x] 7.3 后置脚本日志（`post_script_logs`）展示在 Test Results 面板底部
- [x] 7.4 Tab 切换时根据 tab 的 `scriptTests` 状态刷新展示

## 8. 前端 — 保存/加载联动

- [x] 8.1 保存请求时附带 `postResponseScript` 到 API
- [x] 8.2 加载已保存请求时恢复 `postResponseScript` 到 Tests tab 编辑器
- [x] 8.3 从历史记录恢复时加载 `post_response_script`

## 9. 测试

- [x] 9.1 单元测试：`ScriptService.executePostScript()` 正常执行、超时、tests 收集、变量提取
- [x] 9.2 集成测试：带后置脚本的代理请求端到端验证（断言结果、变量传递、日志输出）
- [x] 9.3 集成测试：后置脚本执行失败返回 400 + 错误信息
