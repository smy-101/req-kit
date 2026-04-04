## Purpose

Post-response scripts capability for executing user-defined JavaScript after receiving proxy responses, enabling assertion testing and variable extraction.

## Requirements

### Requirement: 后置脚本执行

系统 SHALL 支持在代理请求收到响应后执行用户编写的 JavaScript 后置脚本。脚本在 Bun VM 沙箱中执行，执行超时为 5 秒。

系统 SHALL 为后置脚本提供以下上下文对象：
- `response`：响应数据对象，包含：
  - `status`（number）：HTTP 状态码
  - `headers`（Record<string, string>）：响应头
  - `body`（string）：原始响应体字符串
  - `json()`：解析 `body` 为 JSON 对象的方法
  - `time`（number）：响应耗时（毫秒）
  - `size`（number）：响应体大小（字节）
- `tests`：断言收集对象，通过 `tests["断言名称"] = 布尔表达式` 收集结果
- `variables`：变量操作对象，提供 `get(key)` 和 `set(key, value)` 方法
- `environment`（只读）：当前激活环境的变量键值对
- `console`：日志输出
- `JSON`、`Date`、`Math`：标准工具对象

系统 SHALL 禁止后置脚本访问 `require`、`import`、`process`、`globalThis`、`eval`、`Function`、`fetch`、`XMLHttpRequest`。

SSE 流式模式（`stream: true`）下系统 SHALL 静默忽略 `post_response_script`，不执行也不报错。

#### Scenario: 通过后置脚本断言状态码
- **WHEN** 后置脚本为 `tests["状态码是 200"] = response.status === 200`，响应状态码为 200
- **THEN** 代理响应包含 `"script_tests": { "状态码是 200": true }`

#### Scenario: 通过后置脚本提取响应变量
- **WHEN** 后置脚本为 `variables.set("token", response.json().access_token)`，响应体为 `{ "access_token": "abc123" }`
- **THEN** 代理响应包含 `"post_script_variables": { "token": "abc123" }`

#### Scenario: 通过后置脚本断言响应体结构
- **WHEN** 后置脚本为 `tests["有用户ID"] = response.json().id !== undefined`，响应体为 `{ "id": 42, "name": "test" }`
- **THEN** 代理响应包含 `"script_tests": { "有用户ID": true }`

#### Scenario: 后置脚本超时
- **WHEN** 后置脚本为 `while(true) {}`
- **THEN** 系统 5 秒后终止脚本执行，代理请求返回 HTTP 400，响应体包含 `{ "error": "后置脚本执行超时" }`

#### Scenario: 后置脚本 JSON 解析失败
- **WHEN** 后置脚本为 `response.json()`，但响应体不是合法 JSON
- **THEN** 脚本执行失败，代理响应包含错误信息

#### Scenario: SSE 流式模式忽略后置脚本
- **WHEN** 请求体包含 `"stream": true` 和 `"post_response_script": "tests['ok'] = true"`
- **THEN** 系统不执行后置脚本，响应中不包含 `script_tests` 字段

#### Scenario: 后置脚本日志输出
- **WHEN** 后置脚本为 `console.log('Status:', response.status)`
- **THEN** 代理响应包含 `"post_script_logs": ["Status: 200"]`

#### Scenario: 后置脚本设置多个断言
- **WHEN** 后置脚本为 `tests["状态码200"] = response.status === 200; tests["响应时间<500ms"] = response.time < 500; tests["有body"] = response.body.length > 0`
- **THEN** 代理响应包含 `"script_tests": { "状态码200": true, "响应时间<500ms": true, "有body": true }`

### Requirement: 后置脚本变量传递

后置脚本中通过 `variables.set()` 设置的变量 SHALL 通过 `post_script_variables` 字段返回给前端。

前端接收到 `post_script_variables` 后 SHALL 将其合并到 `store.runtimeVars` 中（与前置脚本的 `script_variables` 合并行为一致）。

#### Scenario: 后置脚本变量合并到 runtimeVars
- **WHEN** 前端收到代理响应的 `post_script_variables` 为 `{ "token": "new-val" }`，当前 `store.runtimeVars` 为 `{ "token": "old-val" }`
- **THEN** `store.runtimeVars` 更新为 `{ "token": "new-val" }`

#### Scenario: 前后置脚本变量同时存在
- **WHEN** 代理响应包含 `script_variables: { "pre": "a" }` 和 `post_script_variables: { "post": "b" }`
- **THEN** 前端将两组变量依次合并到 `store.runtimeVars`，最终为 `{ "pre": "a", "post": "b" }`
