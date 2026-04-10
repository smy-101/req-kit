## Purpose

Modal 栈管理工具，支持多层级 modal 的打开、关闭和替换操作，确保嵌套 modal 场景下内容正确恢复。

## Requirements

### Requirement: Modal 栈支持 open/close/replace 操作
`Modal` 工具 SHALL 提供三个方法管理 `#modal-overlay` / `#modal` DOM：
- `open(html, styles)`: 将当前 modal 内容 push 到内部栈，设置新内容并显示
- `close()`: pop 栈顶内容恢复，若栈空则隐藏 modal
- `replace(html, styles)`: 替换当前 modal 内容，不入栈

#### Scenario: 打开新 modal
- **WHEN** 调用 `Modal.open('<div>content</div>')`
- **THEN** 当前 modal 内容被保存到栈中，modal 显示新内容

#### Scenario: 关闭 modal 恢复上一层
- **WHEN** 连续调用两次 `Modal.open()` 后调用一次 `Modal.close()`
- **THEN** modal 恢复为第一次 open 的内容，overlay 保持显示

#### Scenario: 关闭最后一个 modal
- **WHEN** 调用一次 `Modal.open()` 后调用 `Modal.close()`
- **THEN** modal 内容清空，overlay 隐藏

#### Scenario: replace 不影响栈
- **WHEN** 调用 `Modal.open('A')` 后调用 `Modal.replace('B')` 再调用 `Modal.close()`
- **THEN** modal 完全关闭（栈空），不恢复内容 A

#### Scenario: 样式恢复
- **WHEN** 调用 `Modal.open(html, { maxWidth: '680px' })` 后调用 `Modal.close()`
- **THEN** modal 的 maxWidth 和 width 样式恢复到 open 之前的状态

### Requirement: Dialogs 基于 Modal 栈实现
`Dialogs` 工具 SHALL 内部使用 `Modal.open()` / `Modal.close()` 管理内容，公共 API（`prompt`/`confirm`/`confirmDanger`）的参数签名和返回值 SHALL 不变。

#### Scenario: Dialog 嵌套在自定义 modal 上方
- **WHEN** 组件通过 `Modal.open()` 打开自定义 modal 后调用 `Dialogs.confirm()`
- **THEN** 确认对话框显示在自定义 modal 上方
- **THEN** 用户确认或取消后，自定义 modal 内容自动恢复

#### Scenario: Dialog 关闭后恢复自定义 modal
- **WHEN** 组件通过 `Modal.open()` 打开 env-manager 后触发 `Dialogs.confirm()`
- **THEN** 用户关闭 confirm 对话框后，env-manager 界面完整恢复，无需手动 rebind 事件
