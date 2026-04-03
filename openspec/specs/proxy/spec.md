## Purpose

Proxy capability for forwarding HTTP requests through the server, supporting all standard HTTP methods with both standard and streaming (SSE) response modes.

## Requirements

### Requirement: 代理转发 HTTP 请求

系统 SHALL 提供 `POST /api/proxy` 端点，接收包含 `url`、`method`、`headers`、`params`、`body` 的请求体，并在服务端发起对应的 HTTP 请求到目标 URL，将响应返回给客户端。

系统 SHALL 支持所有标准 HTTP 方法：GET、POST、PUT、PATCH、DELETE、HEAD、OPTIONS。

系统 SHALL 正确处理查询参数，将 `params` 字段中的键值对附加到目标 URL 的查询字符串中。

系统 SHALL 正确处理请求体，根据 `body_type` 字段设置 `Content-Type` 请求头。

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

### Requirement: 流式代理传输

系统 SHALL 支持通过 SSE (Server-Sent Events) 流式传输代理响应。当请求体包含 `"stream": true` 时，系统 SHALL 使用 SSE 格式推送响应数据。

SSE 事件序列 SHALL 为：
1. `event: headers` — 包含状态码和响应头
2. `event: chunk`（多次）— 包含响应体分块（Base64 编码）
3. `event: done` — 包含总耗时和总大小

当 `stream` 为 `false` 或未设置时，系统 SHALL 使用标准 JSON 响应。

#### Scenario: 流式代理请求
- **WHEN** 客户端发送 `POST /api/proxy`，body 包含 `"stream": true`
- **THEN** 系统返回 `Content-Type: text/event-stream`，依次发送 `headers`、`chunk`、`done` 事件

#### Scenario: 非流式代理请求
- **WHEN** 客户端发送 `POST /api/proxy`，body 不包含 `stream` 或 `stream: false`
- **THEN** 系统返回标准 JSON 响应 `{ "status": ..., "headers": ..., "body": ..., "time": ..., "size": ... }`

### Requirement: 代理请求大小限制

系统 SHALL 限制代理响应体最大为 50MB。超出限制时系统 SHALL 截断响应体并在响应中标记 `truncated: true`。

系统 SHALL 限制代理请求超时为 30 秒。超时后系统 SHALL 返回 HTTP 504。

#### Scenario: 响应体超过大小限制
- **WHEN** 代理目标返回超过 50MB 的响应体
- **THEN** 系统截断响应体，返回 `{ ..., "truncated": true, "size": 52428800 }`

#### Scenario: 代理请求超时
- **WHEN** 代理目标 30 秒内未返回响应
- **THEN** 系统返回 HTTP 504，响应体 `{ "error": "请求超时" }`
