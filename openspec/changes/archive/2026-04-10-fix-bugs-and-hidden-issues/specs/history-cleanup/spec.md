## MODIFIED Requirements

### Requirement: 手动清理历史记录

系统 SHALL 提供 `DELETE /api/history/cleanup` 端点，支持手动触发清理。

系统 SHALL 支持可选的 `limit` 查询参数，指定要保留的最大条数（默认使用系统配置值）。

系统 SHALL 返回被删除的记录数量。

`DELETE /api/history/cleanup` 路由 SHALL 注册在 `DELETE /api/history/:id` 之前，确保 "cleanup" 不会被 `:id` 参数捕获。

#### Scenario: 手动清理到默认上限
- **WHEN** 客户端发送 `DELETE /api/history/cleanup`，当前有 600 条记录，默认上限 500
- **THEN** 系统删除最旧的 100 条记录，返回 `{ "deleted": 100 }`

#### Scenario: 手动清理到自定义上限
- **WHEN** 客户端发送 `DELETE /api/history/cleanup?limit=100`，当前有 600 条记录
- **THEN** 系统删除最旧的 500 条记录，返回 `{ "deleted": 500 }`

#### Scenario: 无需清理
- **WHEN** 客户端发送 `DELETE /api/history/cleanup`，当前有 200 条记录，上限 500
- **THEN** 系统不执行删除，返回 `{ "deleted": 0 }`

#### Scenario: cleanup 路由不被 :id 参数捕获
- **WHEN** 客户端发送 `DELETE /api/history/cleanup`
- **THEN** 请求由 cleanup handler 处理，返回 `{ "deleted": N }`，而非被 `:id` handler 捕获并返回 400 错误
