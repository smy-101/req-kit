## MODIFIED Requirements

### Requirement: 代理转发 HTTP 请求

系统 SHALL 提供 `POST /api/proxy` 端点，接收包含 `url`、`method`、`headers`、`params`、`body`、`collection_id`、`environment_id`、`runtime_vars` 的请求体。

系统 SHALL 在发起代理请求前，按 Runtime → Collection → Environment → Global 优先级对所有模板变量进行替换。

`collection_id`、`environment_id`、`runtime_vars` 均为可选字段。缺失时跳过对应作用域。

#### Scenario: 使用完整变量上下文解析模板
- **WHEN** 客户端发送 `POST /api/proxy`，body 包含 `"url": "{{baseUrl}}/users/{{userId}}"`、`"collection_id": 1`、`"environment_id": 2`、`"runtime_vars": { "userId": "42" }`
- **THEN** 系统按优先级解析 `baseUrl`（从 Collection/Environment/Global）和 `userId`（从 runtime），替换后发起请求

#### Scenario: 向后兼容无变量上下文的请求
- **WHEN** 客户端发送 `POST /api/proxy`，body 不包含 `collection_id` 和 `runtime_vars`，仅包含 `environment_id`
- **THEN** 系统仅从 Environment 和 Global 解析变量，行为与变更前一致
