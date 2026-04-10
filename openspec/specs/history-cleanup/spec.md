## Purpose

Automatic and manual cleanup of request history records, including configurable retention limits and post-write cleanup feedback.

## Requirements

### Requirement: 自动清理历史记录

系统 SHALL 在每次写入新历史记录后，检查总记录数是否超过配置的最大保留条数（默认 500）。超过时 SHALL 自动删除最旧的记录，使总条数回落到最大保留条数。

#### Scenario: 记录数未超限不触发清理
- **WHEN** 历史记录总条数为 300，写入一条新记录后变为 301
- **THEN** 系统不执行清理操作

#### Scenario: 记录数超限触发清理
- **WHEN** 历史记录总条数为 500，写入一条新记录后变为 501，最大保留条数为 500
- **THEN** 系统自动删除最旧的 1 条记录，总条数回落到 500

#### Scenario: 大量超限批量清理
- **WHEN** 最大保留条数为 500，当前记录数为 800，写入一条新记录
- **THEN** 系统自动删除最旧的 301 条记录，总条数回落到 500

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

### Requirement: 写入后返回清理信息

系统 SHALL 在 `create()` 方法返回值中包含本次自动清理删除的记录数（可能为 0）。

#### Scenario: 写入时触发了清理
- **WHEN** 写入新记录时自动清理了 5 条旧记录
- **THEN** 返回值包含 `cleaned: 5`

#### Scenario: 写入时未触发清理
- **WHEN** 写入新记录时无需清理
- **THEN** 返回值包含 `cleaned: 0`
