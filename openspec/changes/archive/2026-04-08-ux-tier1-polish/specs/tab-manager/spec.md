## MODIFIED Requirements

### Requirement: Tab 状态扩展
每个 tab 的状态 SHALL 包含以下额外字段：
- `dirty`: boolean，标记是否有未保存的变更（仅对从已保存请求打开的 tab 有效）
- `options`: { timeout?: number, followRedirects?: boolean }，请求级选项

#### Scenario: 打开已保存请求时 dirty 为 false
- **WHEN** 用户从 sidebar 打开一个已保存请求
- **THEN** tab 状态中 dirty 为 false，options 为默认值

#### Scenario: 修改请求配置后 dirty 变为 true
- **WHEN** 用户在已保存请求的 tab 中修改 url 或 headers
- **THEN** tab 状态中 dirty 变为 true
