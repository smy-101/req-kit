## MODIFIED Requirements

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
