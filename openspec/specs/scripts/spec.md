## Purpose

Pre-request scripts capability for executing user-defined JavaScript in a sandboxed Bun VM before proxy requests are sent, enabling dynamic request modification.

## Requirements

### Requirement: 预请求脚本执行

系统 SHALL 支持在代理请求发送前执行用户编写的 JavaScript 预请求脚本。脚本在 Bun VM 沙箱中执行，执行超时为 5 秒。

系统 SHALL 为脚本提供以下上下文对象：
- `environment`（只读）：当前激活环境的变量键值对
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

### Requirement: 脚本日志输出

系统 SHALL 收集脚本中 `console.log()` 的输出，并在代理响应中附带 `script_logs` 字段。

#### Scenario: 脚本输出日志
- **WHEN** 预请求脚本为 `console.log('Sending request to', environment.base_url)`
- **THEN** 代理响应包含 `"script_logs": ["Sending request to http://localhost:3000"]`
