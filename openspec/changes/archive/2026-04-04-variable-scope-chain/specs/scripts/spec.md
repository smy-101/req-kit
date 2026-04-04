## MODIFIED Requirements

### Requirement: 预请求脚本执行

系统 SHALL 支持在代理请求发送前执行用户编写的 JavaScript 预请求脚本。脚本在 Bun VM 沙箱中执行，执行超时为 5 秒。

系统 SHALL 为脚本提供以下上下文对象：
- `environment`（只读）：当前激活环境的变量键值对
- `variables`：变量操作对象，提供 `get(key)` 和 `set(key, value)` 方法
- `request`：操作对象，提供 `setHeader(key, value)`、`setBody(data)`、`setParam(key, value)` 方法
- `console`：日志输出
- `JSON`、`Date`、`Math`：标准工具对象

系统 SHALL 禁止脚本访问 `require`、`import`、`process`、`globalThis`、`eval`、`Function`、`fetch`、`XMLHttpRequest`。

#### Scenario: 通过脚本设置请求头
- **WHEN** 预请求脚本为 `request.setHeader('X-Timestamp', Date.now().toString())`
- **THEN** 代理请求自动携带 `X-Timestamp` 请求头，值为当前时间戳

#### Scenario: 通过脚本读取环境变量
- **WHEN** 预请求脚本为 `request.setHeader('Authorization', 'Bearer ' + environment.token)`
- **THEN** 代理请求使用环境变量 `token` 的值设置 Authorization 头

#### Scenario: 脚本执行超时
- **WHEN** 预请求脚本为 `while(true) {}`（无限循环）
- **THEN** 系统 5 秒后终止脚本执行，代理请求返回 HTTP 400，响应体 `{ "error": "预请求脚本执行超时" }`

#### Scenario: 脚本访问禁止 API
- **WHEN** 预请求脚本为 `const fs = require('fs')`
- **THEN** 脚本执行失败，代理请求返回 HTTP 400，响应体包含错误信息

#### Scenario: 通过 variables.get 按作用域链获取变量
- **WHEN** 预请求脚本为 `request.setHeader('X-Token', variables.get('token'))`，runtime 变量有 `{ "token": "rt-val" }`，环境变量有 `{ "token": "env-val" }`
- **THEN** `variables.get('token')` 返回 `rt-val`（最高优先级），请求头设置为 `X-Token: rt-val`

#### Scenario: 通过 variables.set 设置 runtime 变量
- **WHEN** 预请求脚本为 `variables.set('extractedId', '42')`
- **THEN** 脚本结果包含 `"variables": { "extractedId": "42" }`，前端将该值写入 `store.runtimeVars`

## ADDED Requirements

### Requirement: 脚本变量返回值

`ScriptResult` SHALL 新增 `variables` 字段（`Record<string, string>`），包含脚本通过 `variables.set()` 设置的所有变量。

代理响应 SHALL 包含 `script_variables` 字段，值与 `ScriptResult.variables` 一致。

前端接收到 `script_variables` 后 SHALL 将其合并到 `store.runtimeVars` 中。

#### Scenario: 脚本设置变量并返回
- **WHEN** 预请求脚本为 `variables.set('nextPageToken', 'abc'); variables.set('count', '10')`
- **THEN** 代理响应包含 `"script_variables": { "nextPageToken": "abc", "count": "10" }`

#### Scenario: 前端合并脚本变量到 runtimeVars
- **WHEN** 前端收到代理响应的 `script_variables` 为 `{ "token": "new-val" }`，当前 `store.runtimeVars` 为 `{ "token": "old-val", "userId": "42" }`
- **THEN** `store.runtimeVars` 更新为 `{ "token": "new-val", "userId": "42" }`（合并覆盖）
