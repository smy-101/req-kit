## MODIFIED Requirements

### Requirement: 管理集合中的请求

系统 SHALL 提供 `POST /api/collections/:id/requests` 端点往集合中添加请求。

系统 SHALL 提供 `PUT /api/collections/:id/requests/:rid` 端点更新请求的所有字段（name、method、url、headers、params、body、body_type、auth_type、auth_config、pre_request_script）。

系统 SHALL 提供 `DELETE /api/collections/:id/requests/:rid` 端点删除请求。

用户点击侧边栏中已保存的请求时 SHALL 在新的 Tab 中打开该请求。如果该请求已有对应的打开 Tab，SHALL 切换到该 Tab 而非重复打开。

#### Scenario: 添加请求到集合
- **WHEN** 客户端发送 `POST /api/collections/1/requests`，body 为 `{ "name": "获取用户列表", "method": "GET", "url": "https://api.example.com/users" }`
- **THEN** 系统在集合 1 下创建请求，返回完整请求对象

#### Scenario: 更新请求
- **WHEN** 客户端发送 `PUT /api/collections/1/requests/5`，body 为 `{ "name": "更新后的名称", "url": "https://new.api.com/users" }`
- **THEN** 系统更新请求，`updated_at` 自动更新

#### Scenario: 删除请求
- **WHEN** 客户端发送 `DELETE /api/collections/1/requests/5`
- **THEN** 系统删除请求，返回 HTTP 200

#### Scenario: 点击请求在新 Tab 打开
- **WHEN** 用户点击侧边栏中的已保存请求
- **THEN** 系统创建新 Tab 并加载该请求的完整配置，新 Tab 关联该请求 ID，Tab 标题显示请求方法+路径

#### Scenario: 点击已打开的请求切换到现有 Tab
- **WHEN** 用户点击侧边栏中的请求，且该请求已有一个打开的 Tab
- **THEN** 系统切换到该已有 Tab，不创建新 Tab
