## ADDED Requirements

### Requirement: 变量自动补全

系统 SHALL 在 URL 输入框、Headers 值输入框、Body 编辑器中检测用户输入 `{{` 时触发变量自动补全弹窗。

弹窗 SHALL 列出当前所有可用变量（按四级作用域解析后），按 key 过滤匹配用户已输入的部分。

每个补全候选项 SHALL 标注变量来源作用域（Global / Environment / Collection / Runtime）。

#### Scenario: 输入 {{ 触发补全
- **WHEN** 用户在 URL 栏输入 `{{base`
- **THEN** 弹出补全弹窗，显示所有 key 以 "base" 开头的变量，每项标注来源（如 `baseUrl [Environment]`）

#### Scenario: 选择补全项完成输入
- **WHEN** 用户从补全弹窗选择 `baseUrl` 变量
- **THEN** 输入框中 `{{base` 被替换为 `{{baseUrl}}`，光标定位到 `}}` 后面

#### Scenario: 无匹配变量时关闭弹窗
- **WHEN** 用户输入 `{{zzzzz`，无任何变量 key 匹配
- **THEN** 补全弹窗不显示

#### Scenario: 按 Escape 关闭补全
- **WHEN** 补全弹窗已打开，用户按 Escape 键
- **THEN** 补全弹窗关闭，保留当前输入内容不变

#### Scenario: 被覆盖变量不重复显示
- **WHEN** 全局变量和环境变量都有 `baseUrl`，环境变量优先级更高
- **THEN** 补全弹窗中 `baseUrl` 仅显示一次，标注来源为 `[Environment]`（实际生效的作用域）
