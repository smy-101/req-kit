## ADDED Requirements

### Requirement: 响应体文本搜索
系统 SHALL 在响应区域提供搜索功能。用户输入关键字后，系统 SHALL 高亮所有匹配文本，并显示匹配数量和当前定位。

#### Scenario: 搜索响应内容
- **WHEN** 用户在响应区域输入搜索关键字
- **THEN** 系统高亮所有匹配文本，显示"N/N 匹配"计数

#### Scenario: 搜索结果导航
- **WHEN** 用户点击上/下箭头或按 Enter/Shift+Enter
- **THEN** 系统滚动到下一个/上一个匹配位置并高亮当前匹配

#### Scenario: 大响应中的搜索（虚拟滚动）
- **WHEN** 响应体超过 500 行且启用了虚拟滚动
- **THEN** 搜索仍能正确匹配和高亮，不影响虚拟滚动的性能

#### Scenario: 清空搜索
- **WHEN** 用户清空搜索框或关闭搜索栏
- **THEN** 高亮消失，显示恢复正常

### Requirement: 搜索栏触发方式
系统 SHALL 支持通过快捷键 `Ctrl+F`（响应区域聚焦时）和搜索图标触发搜索栏。

#### Scenario: 快捷键触发搜索
- **WHEN** 响应区域聚焦时用户按 Ctrl+F
- **THEN** 搜索栏出现并自动聚焦输入框
