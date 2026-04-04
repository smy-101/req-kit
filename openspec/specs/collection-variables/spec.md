## Purpose

Collection-level variables capability for defining key-value pairs scoped to a root collection, with automatic parent traversal for nested folders.

## Requirements

### Requirement: 管理集合变量

系统 SHALL 提供 `GET /api/collections/:id/variables` 端点返回指定集合的变量列表。

系统 SHALL 提供 `PUT /api/collections/:id/variables` 端点批量替换指定集合的变量。请求体为变量数组 `[{ "key": "...", "value": "...", "enabled": true }]`。

更新时系统 SHALL 用请求体完全替换该集合的所有变量（先删后插）。

系统 SHALL 仅替换 `enabled` 为 `true` 的集合变量到模板中。

#### Scenario: 获取集合变量
- **WHEN** 客户端请求 `GET /api/collections/1/variables`
- **THEN** 系统返回集合 1 的变量列表 `[{"id": 1, "collection_id": 1, "key": "userId", "value": "42", "enabled": 1}]`

#### Scenario: 批量替换集合变量
- **WHEN** 客户端发送 `PUT /api/collections/1/variables`，body 为 `[{ "key": "userId", "value": "100" }]`
- **THEN** 系统删除集合 1 的旧变量，插入新变量，返回更新后的列表

#### Scenario: 删除集合级联删除变量
- **WHEN** 客户端发送 `DELETE /api/collections/1`，该集合有 3 个集合变量
- **THEN** 系统删除集合及其所有集合变量

### Requirement: 集合变量作用域绑定

集合变量 SHALL 绑定到根集合级别（即 `parent_id IS NULL` 的集合）。

当请求位于子文件夹中时，系统 SHALL 向上追溯 `parent_id` 直到根集合，使用该根集合的变量。

集合变量在变量解析优先级中高于环境变量和全局变量，低于 runtime 变量。

#### Scenario: 根集合下的请求使用集合变量
- **WHEN** 请求位于集合 A（根集合）中，集合 A 有变量 `{ "resourceId": "99" }`
- **THEN** 请求中的 `{{resourceId}}` 替换为 `99`

#### Scenario: 子文件夹中的请求追溯根集合变量
- **WHEN** 请求位于集合 A -> 文件夹 B -> 文件夹 C 中，集合 A 有变量 `{ "apiVersion": "v2" }`
- **THEN** 系统向上追溯到集合 A，请求中的 `{{apiVersion}}` 替换为 `v2`

#### Scenario: 集合变量覆盖环境变量
- **WHEN** 集合变量包含 `{ "timeout": "3000" }`，环境变量包含 `{ "timeout": "5000" }`
- **THEN** 该集合下请求中的 `{{timeout}}` 替换为 `3000`（集合变量优先）
