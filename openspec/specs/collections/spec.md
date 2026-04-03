## Purpose

Collections capability for organizing saved requests into folder hierarchies with full CRUD operations.

## Requirements

### Requirement: 管理集合（文件夹结构）

系统 SHALL 提供 `POST /api/collections` 端点创建集合或文件夹。通过 `parent_id` 字段指定父级，`parent_id` 为 `null` 表示顶层集合。

系统 SHALL 提供 `PUT /api/collections/:id` 端点更新集合名称。

系统 SHALL 提供 `DELETE /api/collections/:id` 端点删除集合，级联删除子文件夹和子请求。

系统 SHALL 提供 `PATCH /api/collections/:id/move` 端点移动集合到新位置，通过 `parent_id` 和 `sort_order` 指定。

#### Scenario: 创建顶层集合
- **WHEN** 客户端发送 `POST /api/collections`，body 为 `{ "name": "用户接口" }`
- **THEN** 系统创建集合，`parent_id` 为 `null`，返回 `{ "id": 1, "name": "用户接口", "parent_id": null }`

#### Scenario: 创建子文件夹
- **WHEN** 客户端发送 `POST /api/collections`，body 为 `{ "name": "认证", "parent_id": 1 }`
- **THEN** 系统创建子文件夹，返回 `{ "id": 2, "name": "认证", "parent_id": 1 }`

#### Scenario: 删除集合级联删除子项
- **WHEN** 客户端发送 `DELETE /api/collections/1`，该集合下有子文件夹和请求
- **THEN** 系统删除集合及其所有子文件夹和请求，返回 HTTP 200

#### Scenario: 移动集合
- **WHEN** 客户端发送 `PATCH /api/collections/2/move`，body 为 `{ "parent_id": 3, "sort_order": 1 }`
- **THEN** 系统更新集合的 `parent_id` 和 `sort_order`

### Requirement: 获取集合树

系统 SHALL 提供 `GET /api/collections` 端点，返回树形结构的集合列表，每个集合节点包含子集合和保存的请求。

#### Scenario: 获取完整集合树
- **WHEN** 客户端请求 `GET /api/collections`
- **THEN** 系统返回树形结构 `[ { "id": 1, "name": "用户接口", "parent_id": null, "children": [...], "requests": [...] } ]`

### Requirement: 管理集合中的请求

系统 SHALL 提供 `POST /api/collections/:id/requests` 端点往集合中添加请求。

系统 SHALL 提供 `PUT /api/collections/:id/requests/:rid` 端点更新请求的所有字段（name、method、url、headers、params、body、body_type、auth_type、auth_config、pre_request_script）。

系统 SHALL 提供 `DELETE /api/collections/:id/requests/:rid` 端点删除请求。

#### Scenario: 添加请求到集合
- **WHEN** 客户端发送 `POST /api/collections/1/requests`，body 为 `{ "name": "获取用户列表", "method": "GET", "url": "https://api.example.com/users" }`
- **THEN** 系统在集合 1 下创建请求，返回完整请求对象

#### Scenario: 更新请求
- **WHEN** 客户端发送 `PUT /api/collections/1/requests/5`，body 为 `{ "name": "更新后的名称", "url": "https://new.api.com/users" }`
- **THEN** 系统更新请求，`updated_at` 自动更新

#### Scenario: 删除请求
- **WHEN** 客户端发送 `DELETE /api/collections/1/requests/5`
- **THEN** 系统删除请求，返回 HTTP 200
