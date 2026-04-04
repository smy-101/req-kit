## ADDED Requirements

### Requirement: 管理全局变量

系统 SHALL 提供 `GET /api/global-variables` 端点返回所有全局变量列表。

系统 SHALL 提供 `PUT /api/global-variables` 端点批量替换所有全局变量。请求体为变量数组 `[{ "key": "...", "value": "...", "enabled": true }]`。

更新时系统 SHALL 用请求体完全替换所有全局变量（先删后插）。

全局变量的 `key` SHALL 在全局范围内唯一。

系统 SHALL 仅替换 `enabled` 为 `true` 的全局变量到模板中。

#### Scenario: 获取所有全局变量
- **WHEN** 客户端请求 `GET /api/global-variables`
- **THEN** 系统返回全局变量列表 `[{"id": 1, "key": "timeout", "value": "5000", "enabled": 1}]`

#### Scenario: 批量替换全局变量
- **WHEN** 客户端发送 `PUT /api/global-variables`，body 为 `[{ "key": "timeout", "value": "10000" }, { "key": "retry", "value": "3" }]`
- **THEN** 系统删除所有旧全局变量，插入新变量，返回更新后的列表

#### Scenario: 全局变量 key 唯一
- **WHEN** 客户端发送 `PUT /api/global-variables`，body 包含两个 key 相同的变量
- **THEN** 系统仅保留最后一个出现的变量

### Requirement: 全局变量始终生效

全局变量 SHALL 在所有请求中生效，不受当前激活环境或集合的影响。

全局变量在变量解析优先级中为最低优先级，当其他作用域存在同名变量时 SHALL 被覆盖。

#### Scenario: 无环境选中时全局变量生效
- **WHEN** 当前无激活环境，请求 URL 为 `{{baseUrl}}/users`，全局变量包含 `{ "baseUrl": "https://api.example.com" }`
- **THEN** 系统将 URL 替换为 `https://api.example.com/users`

#### Scenario: 环境变量覆盖全局变量
- **WHEN** 全局变量包含 `{ "baseUrl": "https://prod.example.com" }`，当前激活环境包含 `{ "baseUrl": "http://localhost:3000" }`
- **THEN** 模板替换使用环境变量的值 `http://localhost:3000`
