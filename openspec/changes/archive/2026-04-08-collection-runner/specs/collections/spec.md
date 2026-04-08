## MODIFIED Requirements

### Requirement: 获取集合树

系统 SHALL 提供 `GET /api/collections` 端点，返回树形结构的集合列表，每个集合节点包含子集合、保存的请求、以及集合变量列表。

侧边栏集合项 SHALL 显示 ▶ 运行按钮，点击后打开运行器面板并开始运行该集合。仅当集合（含子集合）内存在至少一个请求时显示运行按钮。

#### Scenario: 获取完整集合树
- **WHEN** 客户端请求 `GET /api/collections`
- **THEN** 系统返回树形结构，每个集合节点包含 `"variables": [{"id": 1, "key": "userId", "value": "42", "enabled": 1}]` 字段

#### Scenario: 含请求的集合显示运行按钮

- **WHEN** 侧边栏渲染集合树，某集合内包含至少一个请求
- **THEN** 该集合项显示 ▶ 运行按钮

#### Scenario: 空集合不显示运行按钮

- **WHEN** 侧边栏渲染集合树，某集合内不包含任何请求
- **THEN** 该集合项不显示运行按钮
