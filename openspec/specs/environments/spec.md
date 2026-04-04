## Purpose

Environments capability for managing variable groups (e.g., dev, staging, prod) with template variable substitution in requests.

## Requirements

### Requirement: 管理环境变量组

系统 SHALL 提供 `POST /api/environments` 端点创建环境变量组（如 dev、staging、prod），包含 `name` 字段。

系统 SHALL 提供 `PUT /api/environments/:id` 端点更新环境名称。

系统 SHALL 提供 `DELETE /api/environments/:id` 端点删除环境，级联删除其下所有变量。

系统 SHALL 提供 `GET /api/environments` 端点返回所有环境及其变量列表。

#### Scenario: 创建环境
- **WHEN** 客户端发送 `POST /api/environments`，body 为 `{ "name": "dev" }`
- **THEN** 系统创建环境，返回 `{ "id": 1, "name": "dev", "variables": [] }`

#### Scenario: 获取所有环境
- **WHEN** 客户端请求 `GET /api/environments`
- **THEN** 系统返回所有环境列表，每个环境包含其变量 `[ { "id": 1, "name": "dev", "variables": [{"key": "base_url", "value": "http://localhost:3000", "enabled": 1}] } ]`

#### Scenario: 删除环境级联删除变量
- **WHEN** 客户端发送 `DELETE /api/environments/1`，该环境有 5 个变量
- **THEN** 系统删除环境和所有变量

### Requirement: 管理环境变量

系统 SHALL 提供 `PUT /api/environments/:id/variables` 端点批量更新环境变量。请求体为变量数组 `[{ "key": "...", "value": "...", "enabled": true }]`。

更新时系统 SHALL 用请求体完全替换该环境的所有变量（先删后插）。

#### Scenario: 批量替换变量
- **WHEN** 客户端发送 `PUT /api/environments/1/variables`，body 为 `[{ "key": "base_url", "value": "https://api.prod.com" }, { "key": "token", "value": "abc123" }]`
- **THEN** 系统删除环境 1 的旧变量，插入新变量，返回更新后的变量列表

### Requirement: 模板变量替换

系统 SHALL 在代理请求发送前，将 URL、Headers、Params、Body 中的 `{{variable_name}}` 模板按四级优先级替换：Runtime → Collection → Environment → Global。系统 SHALL 仅替换各作用域中 `enabled` 为 `true` 的变量。

未匹配的 `{{variable_name}}` SHALL 保持原样不替换。

模板替换 SHALL 由 `VariableService` 统一执行，`EnvService` 不再直接参与模板替换。

#### Scenario: 替换 URL 中的变量（多作用域）
- **WHEN** 全局变量有 `{ "baseUrl": "https://prod.com" }`，当前激活环境有 `{ "baseUrl": "http://localhost:3000" }`，请求 URL 为 `{{baseUrl}}/users`
- **THEN** 系统将 URL 替换为 `http://localhost:3000/users`（环境变量优先于全局变量）

#### Scenario: 未匹配的变量保持原样
- **WHEN** 请求 URL 包含 `{{unknown_var}}/path`，所有作用域均无此变量
- **THEN** URL 保持 `{{unknown_var}}/path` 不变

#### Scenario: 仅环境变量时向下兼容
- **WHEN** 代理请求仅包含 `environment_id`，无 `collection_id` 和 `runtime_vars`，环境有 `{ "key": "val" }`
- **THEN** `{{key}}` 替换为 `val`，行为与变更前一致
