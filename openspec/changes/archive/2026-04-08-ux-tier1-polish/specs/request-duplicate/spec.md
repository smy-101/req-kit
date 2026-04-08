## ADDED Requirements

### Requirement: 复制已保存请求
系统 SHALL 支持复制已保存的请求。复制的请求 SHALL 创建一个新的保存记录，包含原请求的所有配置（method、url、headers、params、body、body_type、auth、scripts），名称追加 " (副本)" 后缀，保存在同一 collection 下。

#### Scenario: 从 sidebar 复制请求
- **WHEN** 用户在 sidebar 中对已保存请求点击"复制"
- **THEN** 系统创建一个新的保存请求，所有字段复制自原请求，名称为原名称 + " (副本)"，出现在同一 collection 下

#### Scenario: 复制的请求可独立编辑
- **WHEN** 复制操作完成后
- **THEN** 新请求是一个完全独立的记录，修改不影响原请求

### Requirement: 复制请求的 UI 入口
系统 SHALL 在 sidebar 中已保存请求的上下文菜单（或操作按钮）中提供"复制"选项。

#### Scenario: 右键或操作按钮显示复制选项
- **WHEN** 用户在 sidebar 中对已保存请求触发操作菜单
- **THEN** 菜单中包含"复制"选项
