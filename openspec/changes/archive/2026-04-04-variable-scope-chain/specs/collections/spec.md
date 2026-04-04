## MODIFIED Requirements

### Requirement: 获取集合树

系统 SHALL 提供 `GET /api/collections` 端点，返回树形结构的集合列表，每个集合节点包含子集合、保存的请求、以及集合变量列表。

#### Scenario: 获取完整集合树
- **WHEN** 客户端请求 `GET /api/collections`
- **THEN** 系统返回树形结构，每个集合节点包含 `"variables": [{"id": 1, "key": "userId", "value": "42", "enabled": 1}]` 字段

## ADDED Requirements

### Requirement: 集合变量导入导出

导出 Postman v2.1 集合格式时，系统 SHALL 在顶层 JSON 中包含 `variable` 字段，内容为集合变量的数组格式 `[{"key": "...", "value": "..."}]`。

导入 Postman v2.1 集合格式时，系统 SHALL 解析顶层 `variable` 字段，将变量写入 `collection_variables` 表。

#### Scenario: 导出包含集合变量
- **WHEN** 客户端请求导出集合 1，该集合有变量 `{ "apiVersion": "v2" }`
- **THEN** 导出 JSON 包含 `"variable": [{"key": "apiVersion", "value": "v2"}]`

#### Scenario: 导入包含集合变量
- **WHEN** 客户端导入 Postman v2.1 JSON，顶层包含 `"variable": [{"key": "retry", "value": "3"}]`
- **THEN** 系统创建集合并将 `retry=3` 写入 `collection_variables` 表
