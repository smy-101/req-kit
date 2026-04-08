## MODIFIED Requirements

### Requirement: 代理转发 HTTP 请求

系统 SHALL 提供 `POST /api/proxy` 端点，接收包含 `url`、`method`、`headers`、`params`、`body`、`body_type`、`collection_id`、`environment_id`、`runtime_vars`、`pre_request_script`、`post_response_script` 的请求体，并在服务端发起对应的 HTTP 请求到目标 URL，将响应返回给客户端。

系统 SHALL 支持所有标准 HTTP 方法：GET、POST、PUT、PATCH、DELETE、HEAD、OPTIONS。

系统 SHALL 正确处理查询参数，将 `params` 字段中的键值对附加到目标 URL 的查询字符串中。

系统 SHALL 根据 `body_type` 字段决定如何处理请求体：
- `json`/`text`/`xml`/`form`/`none`：body 为 string，行为与变更前一致
- `multipart`：body 为 `{ parts: [{ key, type, value, filename?, contentType? }] }`，系统 SHALL 构建 FormData 并发送。对 text 类型字段值进行变量模板替换。
- `binary`：body 为 `{ data, filename, contentType }`，系统 SHALL 将 base64 data 解码为 Buffer 并发送。

系统 SHALL 在发起代理请求前，按 Runtime → Collection → Environment → Global 优先级对所有模板变量进行替换。

`collection_id`、`environment_id`、`runtime_vars` 均为可选字段。缺失时跳过对应作用域。

ProxyRequest 接口的 body 字段类型 SHALL 为 `string | FormData | Buffer | undefined`。

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

#### Scenario: 转发 multipart/form-data 请求
- **WHEN** 客户端发送 `POST /api/proxy`，body_type 为 `multipart`，body 包含 `{ parts: [{ key: "name", type: "text", value: "{{userName}}" }, { key: "file", type: "file", value: "base64...", filename: "a.png", contentType: "image/png" }] }`
- **THEN** 系统对 text 字段值进行变量替换，构建 FormData（text 字段用 append(key, value)，file 字段用 append(key, Blob, filename)），设置 Content-Type 为 multipart/form-data（由 Bun fetch 自动处理 boundary），发起请求

#### Scenario: 转发 binary 请求
- **WHEN** 客户端发送 `POST /api/proxy`，body_type 为 `binary`，body 包含 `{ data: "base64...", filename: "data.bin", contentType: "application/octet-stream" }`
- **THEN** 系统将 base64 解码为 Buffer，作为请求体发送，Content-Type 头默认为 body 中指定的 contentType

#### Scenario: Multipart 请求的变量替换仅作用于 text 字段
- **WHEN** 客户端发送 multipart 请求，text 字段 value 包含 `{{var}}`，file 字段的 filename 包含 `{{var}}`
- **THEN** 系统仅替换 text 字段值中的变量，file 字段的 filename 和 content 不做替换

#### Scenario: Multipart body 记录到历史
- **WHEN** 系统处理 multipart 请求并记录历史
- **THEN** history 表的 request_body 列存储原始 JSON 字符串 `{"parts":[...]}`，body_type 列存储 `multipart`

#### Scenario: Binary body 记录到历史
- **WHEN** 系统处理 binary 请求并记录历史
- **THEN** history 表的 request_body 列存储原始 JSON 字符串 `{"data":"...","filename":"...","contentType":"..."}`，body_type 列存储 `binary`
