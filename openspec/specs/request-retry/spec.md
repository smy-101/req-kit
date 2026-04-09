## Purpose

Automatic retry mechanism for failed requests in the collection runner, with configurable retry count and delay.

## Requirements

### Requirement: 集合运行器请求失败自动重试

系统 SHALL 在集合运行器中支持请求失败后的自动重试。客户端可通过 API 请求参数配置重试次数（`retry_count`）和重试间隔（`retry_delay_ms`）。

`retry_count` 的默认值 SHALL 为 0（不重试）。`retry_delay_ms` 的默认值 SHALL 为 1000（1 秒）。

系统 SHALL 仅对以下类型的失败进行重试：网络错误、连接超时、HTTP 5xx 状态码。HTTP 4xx 状态码和脚本断言失败 SHALL NOT 触发重试。

重试期间，系统 SHALL 通过 SSE 推送 `request:retry` 事件，包含当前重试次数和最大重试次数。

如果所有重试均失败，系统 SHALL 标记该请求为失败，在 `request:complete` 事件中包含 `retryCount` 字段表示实际重试次数，并继续执行后续请求。

#### Scenario: 请求网络错误后自动重试

- **WHEN** 运行器执行请求时遇到网络错误，`retry_count` 为 2，`retry_delay_ms` 为 1000
- **THEN** 系统等待 1 秒后重试，推送 `request:retry` 事件 `{ attempt: 1, maxRetries: 2 }`，如果再次失败再等待 1 秒重试，推送 `request:retry` 事件 `{ attempt: 2, maxRetries: 2 }`，如果仍失败则推送 `request:complete` 事件（含 `error` 和 `retryCount: 2`），继续执行后续请求

#### Scenario: HTTP 4xx 不触发重试

- **WHEN** 运行器执行请求返回 HTTP 401 状态码，`retry_count` 为 3
- **THEN** 系统不进行重试，直接推送 `request:complete` 事件（含 `retryCount: 0`）

#### Scenario: HTTP 5xx 触发重试

- **WHEN** 运行器执行请求返回 HTTP 500 状态码，`retry_count` 为 1
- **THEN** 系统进行 1 次重试，推送 `request:retry` 事件 `{ attempt: 1, maxRetries: 1 }`

#### Scenario: 脚本断言失败不触发重试

- **WHEN** 运行器执行请求，请求成功（HTTP 200）但后置脚本断言失败，`retry_count` 为 2
- **THEN** 系统不进行重试，直接推送 `request:complete` 事件（含测试结果和 `retryCount: 0`）

#### Scenario: 默认不重试

- **WHEN** 客户端发送运行请求，未指定 `retry_count` 和 `retry_delay_ms`
- **THEN** 系统使用默认值 `retry_count: 0`、`retry_delay_ms: 1000`，不进行任何重试

#### Scenario: 重试成功则继续

- **WHEN** 运行器执行请求第 1 次失败，第 2 次重试成功，`retry_count` 为 2
- **THEN** 系统推送 `request:retry` 事件 `{ attempt: 1, maxRetries: 2 }`，然后推送 `request:complete` 事件（含成功结果和 `retryCount: 1`），标记为通过
