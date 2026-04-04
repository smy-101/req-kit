## MODIFIED Requirements

### Requirement: 模板变量替换

系统 SHALL 在代理请求发送前，将 URL、Headers、Params、Body 中的 `{{variable_name}}` 模板按四级优先级替换：Runtime → Collection → Environment → Global。系统 SHALL 仅替换各作用域中 `enabled` 为 `true` 的变量。

未匹配的 `{{variable_name}}` SHALL 保持原样不替换。

模板替换 SHALL 由 `VariableService` 统一执行，`EnvService` 不再直接参与模板替换。

#### Scenario: 替换 URL 中的变量（多作用域）
- **WHEN** 全局变量有 `{ "baseUrl": "https://prod.com" }`，当前激活环境有 `{ "baseUrl": "http://localhost:3000" }`，请求 URL 为 `{{baseUrl}}/users`
- **THEN** 系统将 URL 替换为 `http://localhost:3000/users`（环境变量优先于全局变量）

#### Scenario: 未匹配的变量保持原样
- **WHEN** 请求 URL 包含 `{{unknown_var}}/path`，所有作用域均无此变量
- **THEN** URL 保持 `{{unknown_var}}/path` 不变

#### Scenario: 仅环境变量时向下兼容
- **WHEN** 代理请求仅包含 `environment_id`，无 `collection_id` 和 `runtime_vars`，环境有 `{ "key": "val" }`
- **THEN** `{{key}}` 替换为 `val`，行为与变更前一致
