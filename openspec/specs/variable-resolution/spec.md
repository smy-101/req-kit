## Purpose

Four-level variable resolution capability defining the priority chain for template variable substitution: Runtime -> Collection -> Environment -> Global.

## Requirements

### Requirement: 四级作用域变量解析

系统 SHALL 按 Local (runtime) -> Collection -> Environment -> Global 的优先级顺序解析 `{{variable_name}}` 模板变量。

对于每个 `{{key}}`，系统 SHALL 从最高优先级开始依次查找，返回第一个匹配到的值。所有作用域均无匹配时 SHALL 保持 `{{key}}` 原样。

模板替换 SHALL 应用到请求的 URL、Headers 值、Params 值、Body 中。

系统 SHALL 仅替换 `enabled` 为 `true` 的变量。

#### Scenario: 按优先级解析同名变量
- **WHEN** runtime 变量有 `{ "token": "runtime-val" }`，集合变量有 `{ "token": "coll-val" }`，环境变量有 `{ "token": "env-val" }`，全局变量有 `{ "token": "global-val" }`
- **THEN** `{{token}}` 替换为 `runtime-val`（最高优先级）

#### Scenario: 逐级回退查找变量
- **WHEN** runtime 和集合变量均无 `baseUrl`，环境变量有 `{ "baseUrl": "http://dev.com" }`
- **THEN** `{{baseUrl}}` 替换为 `http://dev.com`

#### Scenario: 全部作用域均无匹配
- **WHEN** 所有作用域均无变量 `unknownVar`
- **THEN** `{{unknownVar}}` 保持原样不替换

### Requirement: Runtime 变量传递

系统 SHALL 支持前端通过 `runtime_vars` 字段传入临时变量（`Record<string, string>`），作为最高优先级参与模板替换。

Runtime 变量 SHALL 仅存在于前端内存中，页面刷新后丢失。

系统 SHALL 不对 runtime 变量做持久化存储。

#### Scenario: 前端传入 runtime 变量
- **WHEN** 前端发送代理请求，body 包含 `"runtime_vars": { "sessionId": "abc123" }`，URL 为 `{{sessionId}}/data`
- **THEN** 系统将 URL 替换为 `abc123/data`

#### Scenario: 无 runtime 变量时不影响其他作用域
- **WHEN** 前端发送代理请求，不包含 `runtime_vars` 字段或为空对象
- **THEN** 系统按 Collection -> Environment -> Global 正常解析变量

### Requirement: 变量解析上下文完整性

代理请求 SHALL 携带完整的变量解析上下文：`collection_id`（请求所属集合）、`environment_id`（当前激活环境）、`runtime_vars`（临时变量）。

当 `collection_id` 缺失时，系统 SHALL 跳过集合变量层，仅从 Environment 和 Global 查找。

当 `environment_id` 缺失时，系统 SHALL 跳过环境变量层，仅从 Collection 和 Global 查找。

#### Scenario: 缺少 collection_id 时的解析
- **WHEN** 代理请求无 `collection_id`，有 `environment_id`，环境变量有 `{ "key": "val" }`
- **THEN** `{{key}}` 从环境变量解析为 `val`

#### Scenario: 缺少 environment_id 时的解析
- **WHEN** 代理请求无 `environment_id`，全局变量有 `{ "key": "val" }`
- **THEN** `{{key}}` 从全局变量解析为 `val`
