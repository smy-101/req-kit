## MODIFIED Requirements

### Requirement: 代理转发 HTTP 请求

系统 SHALL 提供 `POST /api/proxy` 端点，接收包含 `url`、`method`、`headers`、`params`、`body`、`collection_id`、`environment_id`、`runtime_vars`、`pre_request_script`、`post_response_script` 的请求体，并在服务端发起对应的 HTTP 请求到目标 URL，将响应返回给客户端。

代理管线 SHALL 按以下顺序执行：模板替换 → 前置脚本 → Auth 注入 → 发送请求 → **后置脚本** → 记录历史。

当请求体包含 `post_response_script` 时（且 `stream` 不为 `true`），系统 SHALL 在收到代理响应后执行后置脚本，将断言结果通过 `script_tests` 字段、日志通过 `post_script_logs` 字段、变量通过 `post_script_variables` 字段附加到响应中。

后置脚本执行失败时（超时、语法错误、运行时错误），系统 SHALL 返回 HTTP 400，响应体包含 `{ "error": "后置脚本执行超时" }` 或具体错误信息。

#### Scenario: 成功转发 GET 请求
- **WHEN** 客户端发送 `POST /api/proxy`，body 为 `{ "url": "https://httpbin.org/get", "method": "GET" }`
- **THEN** 系统向 `https://httpbin.org/get` 发起 GET 请求，返回 `{ "status": 200, "headers": {...}, "body": "...", "time": 150, "size": 1234 }`

#### Scenario: 成功转发 POST 请求带 JSON Body
- **WHEN** 客户端发送 `POST /api/proxy`，body 为 `{ "url": "https://httpbin.org/post", "method": "POST", "body": "{\"name\":\"test\"}", "headers": {"Content-Type": "application/json"} }`
- **THEN** 系统向目标发起 POST 请求并携带请求体，返回目标服务器的响应

#### Scenario: 目标服务器返回错误状态码
- **WHEN** 客户端代理请求到返回 500 的目标 URL
- **THEN** 系统返回 `{ "status": 500, "headers": {...}, "body": "...", "time": ..., "size": ... }`，HTTP 状态码为 200（代理本身成功，目标状态码在响应体中）

#### Scenario: 目标 URL 不可达
- **WHEN** 客户端代理请求到不可达的 URL（如 DNS 解析失败）
- **THEN** 系统返回 HTTP 502，响应体包含 `{ "error": "目标服务器不可达", "detail": "..." }`

#### Scenario: 请求缺少必填字段
- **WHEN** 客户端发送 `POST /api/proxy` 但缺少 `url` 字段
- **THEN** 系统返回 HTTP 400，响应体包含 `{ "error": "缺少必填字段: url" }`

#### Scenario: 使用完整变量上下文解析模板
- **WHEN** 客户端发送 `POST /api/proxy`，body 包含 `"url": "{{baseUrl}}/users/{{userId}}"`、`"collection_id": 1`、`"environment_id": 2`、`"runtime_vars": { "userId": "42" }`
- **THEN** 系统按优先级解析 `baseUrl`（从 Collection/Environment/Global）和 `userId`（从 runtime），替换后发起请求

#### Scenario: 向后兼容无变量上下文的请求
- **WHEN** 客户端发送 `POST /api/proxy`，body 不包含 `collection_id` 和 `runtime_vars`，仅包含 `environment_id`
- **THEN** 系统仅从 Environment 和 Global 解析变量，行为与变更前一致

#### Scenario: 带后置脚本的代理请求
- **WHEN** 客户端发送 `POST /api/proxy`，body 包含 `"post_response_script": "tests['状态码200'] = response.status === 200"`
- **THEN** 系统在收到响应后执行后置脚本，响应体包含 `"script_tests": { "状态码200": true }`

#### Scenario: 后置脚本执行超时
- **WHEN** 客户端发送 `POST /api/proxy`，body 包含 `"post_response_script": "while(true) {}"`
- **THEN** 系统返回 HTTP 400，响应体包含 `{ "error": "后置脚本执行超时" }`
