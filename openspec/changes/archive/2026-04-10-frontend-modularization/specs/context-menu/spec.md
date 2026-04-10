## ADDED Requirements

### Requirement: 右键上下文菜单
`context-menu.js` SHALL 导出 `showContextMenu(event, items)` 函数，在指定位置显示上下文菜单，返回 Promise resolves 为选中项的 value 或 null。

`items` 数组中每项 SHALL 包含：
- `label`: 显示文本
- `value`: 选中后返回的值
- `danger`: 可选，为 true 时添加危险样式

#### Scenario: 显示菜单并选择
- **WHEN** 用户右键点击触发 `showContextMenu(e, [{ label: '删除', value: 'delete' }])`
- **THEN** 菜单显示在鼠标位置附近
- **THEN** 用户点击 "删除" 后 Promise resolves 为 `'delete'`

#### Scenario: 点击外部关闭
- **WHEN** 菜单显示后用户点击菜单外部区域
- **THEN** 菜单关闭，Promise resolves 为 `null`

#### Scenario: 边界修正
- **WHEN** 右键位置靠近窗口右边缘或底部
- **THEN** 菜单向左/上偏移，不超出窗口可视区域
