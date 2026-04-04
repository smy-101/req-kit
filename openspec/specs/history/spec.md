## Purpose

Request history tracking capability, automatically recording proxy request/response data and providing query and management endpoints.

## Requirements

### Requirement: 记录请求历史

系统 SHALL 在每次代理请求完成后自动将请求和响应信息存入 `history` 表，包含 `method`、`url`、`request_headers`、`request_params`、`request_body`、`status`、`response_headers`、`response_body`、`response_time`、`response_size`。

#### Scenario: 代理请求后自动记录
- **WHEN** 代理请求成功完成
- **THEN** 系统自动在 `history` 表中插入一条记录，包含完整的请求和响应信息

### Requirement: 查询历史列表

系统 SHALL 提供 `GET /api/history` 端点，返回分页的历史记录列表，按时间倒序排列。

系统 SHALL 支持 `page`（默认 1）和 `limit`（默认 50）查询参数。

系统 SHALL 支持可选的 `search` 查询参数，对 URL 进行模糊匹配（LIKE %keyword%）。

系统 SHALL 支持可选的 `method` 查询参数，按 HTTP method 精确过滤。

每条记录 SHALL 包含 `id`、`method`、`url`、`status`、`response_time`、`created_at`，不包含完整的请求/响应体。

#### Scenario: 获取第一页历史
- **WHEN** 客户端请求 `GET /api/history?page=1&limit=20`
- **THEN** 系统返回最新的 20 条历史记录，包含 `{ "items": [...], "total": 150, "page": 1, "limit": 20 }`

#### Scenario: 按 URL 搜索
- **WHEN** 客户端请求 `GET /api/history?search=users`
- **THEN** 系统返回 URL 中包含 "users" 的历史记录

#### Scenario: 按 method 过滤
- **WHEN** 客户端请求 `GET /api/history?method=POST`
- **THEN** 系统返回仅 POST method 的历史记录

#### Scenario: 组合搜索和过滤
- **WHEN** 客户端请求 `GET /api/history?search=api&method=GET&page=1&limit=20`
- **THEN** 系统返回 URL 包含 "api" 且 method 为 GET 的记录，分页返回

#### Scenario: 无历史记录
- **WHEN** 客户端请求 `GET /api/history`，但数据库中无记录
- **THEN** 系统返回 `{ "items": [], "total": 0, "page": 1, "limit": 50 }`

### Requirement: 获取历史详情

系统 SHALL 提供 `GET /api/history/:id` 端点，返回单条历史的完整信息（包含请求体和响应体）。

#### Scenario: 获取存在的历史记录
- **WHEN** 客户端请求 `GET /api/history/1`
- **THEN** 系统返回该条历史的完整信息，包含所有请求和响应字段

#### Scenario: 获取不存在的历史记录
- **WHEN** 客户端请求 `GET /api/history/999`，该 ID 不存在
- **THEN** 系统返回 HTTP 404

### Requirement: 删除历史记录

系统 SHALL 提供 `DELETE /api/history/:id` 端点删除单条历史记录。

系统 SHALL 提供 `DELETE /api/history` 端点清空所有历史记录。

#### Scenario: 删除单条历史
- **WHEN** 客户端发送 `DELETE /api/history/1`
- **THEN** 系统删除该条记录，返回 HTTP 200

#### Scenario: 清空所有历史
- **WHEN** 客户端发送 `DELETE /api/history`
- **THEN** 系统删除所有历史记录，返回 HTTP 200，响应体包含 `{ "deleted": 150 }`
