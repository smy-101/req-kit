## MODIFIED Requirements

### Requirement: 四级作用域变量解析

系统 SHALL 按 Local (runtime) -> Collection -> Environment -> Global 的优先级顺序解析 `{{variable_name}}` 模板变量。

对于每个 `{{key}}`，系统 SHALL 从最高优先级开始依次查找，返回第一个匹配到的值。所有作用域均无匹配时 SHALL 保持 `{{key}}` 原样。

模板替换 SHALL 应用到请求的 URL、Headers 值、Params 值、Body 中。

系统 SHALL 仅替换 `enabled` 为 `true` 的变量。

模板变量替换 SHALL 统一由 `VariableService` 提供（`resolveVariables` / `resolveVariablesCached`），不使用 `EnvService.replaceTemplateValues`。

#### Scenario: 按优先级解析同名变量
- **WHEN** runtime 变量有 `{ "token": "runtime-val" }`，集合变量有 `{ "token": "coll-val" }`，环境变量有 `{ "token": "env-val" }`，全局变量有 `{ "token": "global-val" }`
- **THEN** `{{token}}` 替换为 `runtime-val`（最高优先级）

#### Scenario: 逐级回退查找变量
- **WHEN** runtime 和集合变量均无 `baseUrl`，环境变量有 `{ "baseUrl": "http://dev.com" }`
- **THEN** `{{baseUrl}}` 替换为 `http://dev.com`

#### Scenario: 全部作用域均无匹配
- **WHEN** 所有作用域均无变量 `unknownVar`
- **THEN** `{{unknownVar}}` 保持原样不替换
