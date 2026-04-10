## MODIFIED Requirements

### Requirement: 各路由 Zod Schema 定义
每个路由文件 SHALL 在文件顶部定义该路由使用的 Zod schema，schema SHALL 与现有 `c.req.json<T>()` 的泛型类型保持一致。

多个路由文件共享相同 schema 时（如 `ReplaceVariablesSchema`），SHALL 将共享 schema 提取到 `lib/validation.ts` 中统一导出，各路由文件通过 import 引用，消除重复定义。

#### Scenario: Schema 覆盖所有路由
- **WHEN** 检查所有 8 个路由文件
- **THEN** 每个 `c.req.json()` 调用都有对应的 Zod schema，每个 URL 参数和 query 参数都有校验逻辑

#### Scenario: ReplaceVariablesSchema 统一导出
- **WHEN** `global-variables.ts`、`collections.ts`、`environments.ts` 需要使用 `ReplaceVariablesSchema`
- **THEN** 三个文件均从 `lib/validation.ts` import 该 schema，不存在重复定义
