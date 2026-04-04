## ADDED Requirements

### Requirement: 左右分栏布局

环境管理 Modal SHALL 使用左右分栏布局：左侧为环境列表面板，右侧为变量编辑面板。左侧面板 SHALL 占约 200px 宽度，右侧面板 SHALL 占剩余空间。

#### Scenario: 打开环境管理 Modal
- **WHEN** 用户点击侧栏环境选择器旁的管理按钮
- **THEN** Modal 以左右分栏布局打开，左侧显示环境列表，右侧显示提示文字"请选择一个环境"

#### Scenario: Modal 宽度适配
- **WHEN** 环境管理 Modal 打开
- **THEN** Modal 最小宽度为 680px，确保两侧内容可读

### Requirement: 点击环境切换变量

左侧环境列表中，用户 SHALL 能够点击环境名称选中该环境，右侧 SHALL 立即显示该环境的变量编辑器。

当前选中的环境 SHALL 有高亮样式（如背景色变化），与未选中环境视觉区分。

#### Scenario: 点击环境名显示变量
- **WHEN** 用户点击左侧的 "Staging" 环境名
- **THEN** "Staging" 行高亮，右侧立即显示 Staging 的所有变量（key/value/enabled 行）

#### Scenario: 默认状态
- **WHEN** Modal 打开且没有选中任何环境
- **THEN** 左侧无高亮项，右侧显示提示文字"请选择一个环境"

### Requirement: 变量编辑连续性

保存变量后，右侧变量编辑器 SHALL 不重建，保持当前编辑状态。用户 SHALL 能继续编辑而无需重新打开编辑器。

#### Scenario: 保存后继续编辑
- **WHEN** 用户修改一个变量值并点击保存
- **THEN** 保存成功后编辑器保持原位，已修改的值保留，用户可继续编辑其他变量

### Requirement: 未保存修改确认

当用户选中一个环境后修改了变量，再点击另一个环境时，系统 SHALL 弹出确认对话框，提供三个选项：保存、丢弃、取消。

#### Scenario: 有未保存修改时切换环境
- **WHEN** 用户选中 "Development" 并修改了一个变量，然后点击 "Staging"
- **THEN** 系统弹出确认对话框，包含"保存"、"丢弃"、"取消"三个按钮

#### Scenario: 选择保存
- **WHEN** 确认对话框中用户点击"保存"
- **THEN** 系统保存当前环境的变量，然后切换到 "Staging" 并显示其变量

#### Scenario: 选择丢弃
- **WHEN** 确认对话框中用户点击"丢弃"
- **THEN** 系统放弃当前修改，切换到 "Staging" 并显示其变量

#### Scenario: 选择取消
- **WHEN** 确认对话框中用户点击"取消"
- **THEN** 系统不切换环境，右侧仍显示 "Development" 的变量（包含未保存的修改）

#### Scenario: 无修改时直接切换
- **WHEN** 用户选中 "Development" 但未做任何修改，然后点击 "Staging"
- **THEN** 直接切换到 "Staging"，不弹出确认对话框

### Requirement: 环境重命名

左侧环境列表中 SHALL 提供重命名操作入口。用户点击后 SHALL 在 Modal 内弹出输入框或内联编辑区域，允许修改环境名称。

#### Scenario: 重命名环境
- **WHEN** 用户对 "Development" 触发重命名操作，输入新名称 "Dev-Local" 并确认
- **THEN** 左侧列表更新为 "Dev-Local"，右侧变量编辑器标题同步更新

#### Scenario: 重命名为空名称
- **WHEN** 用户清空环境名称并确认
- **THEN** 系统不执行重命名，保持原名称

### Requirement: 环境删除

左侧环境列表中 SHALL 提供删除操作入口。点击后 SHALL 弹出确认对话框，确认后删除环境及其所有变量。删除后若当前选中环境被删除，右侧 SHALL 显示默认提示。

#### Scenario: 删除当前选中的环境
- **WHEN** 用户删除当前在右侧显示变量的 "Staging" 环境
- **THEN** 左侧列表移除 "Staging"，右侧恢复为"请选择一个环境"提示

#### Scenario: 删除非选中环境
- **WHEN** 用户删除未选中的 "Production" 环境，当前选中的是 "Development"
- **THEN** 左侧列表移除 "Production"，右侧继续显示 "Development" 的变量

### Requirement: 新建环境

左侧面板底部 SHALL 提供新建环境的输入区域。创建成功后新环境 SHALL 出现在列表中。

#### Scenario: 创建新环境
- **WHEN** 用户输入 "Testing" 并点击创建
- **THEN** "Testing" 出现在左侧列表中

### Requirement: 变量 Key 重复检测

当变量列表中存在重复的 Key 时，系统 SHALL 对重复的行显示视觉警告（如红色边框或警告图标）。

#### Scenario: 输入重复 Key
- **WHEN** 变量列表中已有 key 为 "base_url" 的变量，用户在另一行输入 key "base_url"
- **THEN** 两行 "base_url" 都显示重复警告样式

#### Scenario: 修正重复后警告消失
- **WHEN** 用户将其中一个 "base_url" 改为 "base_url_v2"
- **THEN** 重复警告消失
