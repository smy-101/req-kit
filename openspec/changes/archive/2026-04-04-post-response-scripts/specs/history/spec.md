## MODIFIED Requirements

### Requirement: 记录请求历史

系统 SHALL 在每次代理请求完成后自动将请求和响应信息存入 `history` 表，包含 `method`、`url`、`request_headers`、`request_params`、`request_body`、`status`、`response_headers`、`response_body`、`response_time`、`response_size`、`post_response_script`。

#### Scenario: 代理请求后自动记录
- **WHEN** 代理请求成功完成
- **THEN** 系统自动在 `history` 表中插入一条记录，包含完整的请求和响应信息，以及 `post_response_script`（如有）

#### Scenario: 记录包含后置脚本
- **WHEN** 代理请求携带 `post_response_script` 字段
- **THEN** 历史记录的 `post_response_script` 列保存该脚本内容
