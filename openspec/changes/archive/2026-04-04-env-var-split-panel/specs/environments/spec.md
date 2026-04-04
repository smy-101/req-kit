## MODIFIED Requirements

### Requirement: 管理环境变量组

系统 SHALL 提供 `POST /api/environments` 端点创建环境变量组（如 dev、staging、prod），包含 `name` 字段。

系统 SHALL 提供 `PUT /api/environments/:id` 端点更新环境名称。

系统 SHALL 提供 `DELETE /api/environments/:id` 端点删除环境，级联删除其下所有变量。

系统 SHALL 提供 `GET /api/environments` 端点返回所有环境及其变量列表。查询 SHALL 使用两次 SQL（一次查环境，一次查所有变量）而非 N+1 模式，变量按 `environment_id` 在应用层分组。

#### Scenario: 创建环境
- **WHEN** 客户端发送 `POST /api/environments`，body 为 `{ "name": "dev" }`
- **THEN** 系统创建环境，返回 `{ "id": 1, "name": "dev", "variables": [] }`

#### Scenario: 获取所有环境
- **WHEN** 客户端请求 `GET /api/environments`
- **THEN** 系统返回所有环境列表，每个环境包含其变量 `[ { "id": 1, "name": "dev", "variables": [{"key": "base_url", "value": "http://localhost:3000", "enabled": 1}] } ]`

#### Scenario: 删除环境级联删除变量
- **WHEN** 客户端发送 `DELETE /api/environments/1`，该环境有 5 个变量
- **THEN** 系统删除环境和所有变量
