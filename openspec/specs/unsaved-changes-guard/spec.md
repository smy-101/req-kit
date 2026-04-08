## Purpose

未保存变更检测与保护能力，在 tab 关闭时提醒用户保存修改，防止数据丢失。

## Requirements

### Requirement: 未保存变更检测
系统 SHALL 在 tab 状态中追踪 dirty 标记。当已保存请求的配置发生变更（method、url、headers、params、body、auth、scripts）且未保存时，SHALL 标记 tab 为 dirty。

#### Scenario: 修改已保存请求标记 dirty
- **WHEN** 用户打开一个已保存请求的 tab 并修改了 URL
- **THEN** tab 显示未保存标记（如 ●）

#### Scenario: 保存后清除 dirty
- **WHEN** 用户保存了已修改的请求
- **THEN** dirty 标记被清除，tab 上的未保存标记消失

#### Scenario: 新建 tab 不追踪 dirty
- **WHEN** 用户创建一个全新的空 tab
- **THEN** 不追踪 dirty 状态，关闭时无需确认

### Requirement: 关闭 dirty tab 时确认
当用户关闭一个 dirty tab 时，系统 SHALL 弹出确认对话框，提供"保存"、"不保存"、"取消"三个选项。

#### Scenario: 关闭 dirty tab 选择不保存
- **WHEN** 用户关闭 dirty tab 并选择"不保存"
- **THEN** tab 关闭，丢失未保存的变更

#### Scenario: 关闭 dirty tab 选择取消
- **WHEN** 用户关闭 dirty tab 并选择"取消"
- **THEN** tab 保持打开，不做任何操作
