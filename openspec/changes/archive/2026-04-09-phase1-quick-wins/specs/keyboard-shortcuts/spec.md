## ADDED Requirements

### Requirement: 键盘快捷键覆盖高频操作

系统 SHALL 支持以下键盘快捷键：

| 快捷键 | 操作 |
|--------|------|
| Ctrl+S / Cmd+S | 保存当前请求 |
| Ctrl+Tab | 切换到下一个标签 |
| Ctrl+Shift+Tab | 切换到上一个标签 |
| Ctrl+Shift+N | 新建请求并保存到集合 |
| Ctrl+Enter | 发送请求（已有） |
| Escape | 关闭模态框（已有） |
| Ctrl+W / Cmd+W | 关闭当前标签（已有） |
| Ctrl+T / Cmd+T | 新建空标签（已有） |

系统 SHALL 在输入框（input、textarea）获得焦点时跳过标签切换快捷键（Ctrl+Tab / Ctrl+Shift+Tab），以避免干扰正常的文本编辑操作。

#### Scenario: Ctrl+S 保存当前请求

- **WHEN** 用户在任意标签页按下 Ctrl+S（Mac 为 Cmd+S）
- **THEN** 系统拦截浏览器默认保存行为，触发当前标签的保存操作（更新已有请求或弹出集合选择器保存新请求）

#### Scenario: Ctrl+Tab 切换到下一个标签

- **WHEN** 用户按下 Ctrl+Tab，且当前焦点不在 input 或 textarea 中
- **THEN** 系统切换到下一个标签（循环，最后一个标签之后回到第一个）

#### Scenario: Ctrl+Shift+Tab 切换到上一个标签

- **WHEN** 用户按下 Ctrl+Shift+Tab，且当前焦点不在 input 或 textarea 中
- **THEN** 系统切换到上一个标签（循环，第一个标签之前回到最后一个）

#### Scenario: Ctrl+Shift+N 新建请求并保存到集合

- **WHEN** 用户按下 Ctrl+Shift+N
- **THEN** 系统打开保存请求的集合选择器（与点击保存按钮的行为一致）

#### Scenario: 输入框中不触发标签切换

- **WHEN** 用户在 URL 输入框或请求体编辑器中按下 Ctrl+Tab
- **THEN** 系统不拦截该快捷键，浏览器默认行为正常执行

### Requirement: 快捷键不与已有行为冲突

新增快捷键 SHALL 不改变已有快捷键（Ctrl+Enter、Escape、Ctrl+W、Ctrl+T）的行为。
