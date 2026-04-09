## ADDED Requirements

### Requirement: 深色/浅色主题切换

系统 SHALL 支持深色和浅色两套主题。通过在 `<html>` 元素上设置 `data-theme` 属性（值为 `"dark"` 或 `"light"`）来切换主题。

系统 SHALL 在界面中提供主题切换按钮，点击后在深色和浅色之间切换。

系统 SHALL 将用户的主题偏好持久化到 `localStorage`（key: `theme`）。页面加载时 SHALL 读取该值并应用对应主题。如果 localStorage 中没有偏好记录，SHALL 默认使用深色主题。

#### Scenario: 切换到浅色主题

- **WHEN** 用户点击主题切换按钮，当前主题为深色
- **THEN** `<html>` 的 `data-theme` 变为 `"light"`，所有使用 CSS 变量的元素自动切换为浅色配色，`localStorage` 中保存 `"light"`

#### Scenario: 切换回深色主题

- **WHEN** 用户点击主题切换按钮，当前主题为浅色
- **THEN** `<html>` 的 `data-theme` 变为 `"dark"`，所有元素恢复深色配色，`localStorage` 中保存 `"dark"`

#### Scenario: 页面刷新后保持主题偏好

- **WHEN** 用户已选择浅色主题并刷新页面
- **THEN** 页面加载后自动应用浅色主题，不需要用户再次切换

#### Scenario: 首次访问默认深色

- **WHEN** 新用户首次访问应用，localStorage 中无 `theme` 记录
- **THEN** 系统使用深色主题

### Requirement: 浅色主题视觉一致性

浅色主题 SHALL 通过 `[data-theme="light"]` 选择器覆盖 `:root` 中的 CSS 变量值来实现。所有使用 CSS 变量的组件 SHALL 在浅色主题下自动适配，无需逐组件修改。

浅色主题的配色 SHALL 与深色主题保持相同的视觉层次结构（背景从浅到深、文本从深到浅），并保持 amber/gold 作为强调色。

#### Scenario: 所有组件在浅色主题下可正常使用

- **WHEN** 应用处于浅色主题
- **THEN** 侧边栏、请求编辑器、响应查看器、运行器面板、模态框等所有组件的文字可读性良好，背景与文字对比度充足，交互元素状态（hover、active、disabled）视觉清晰
