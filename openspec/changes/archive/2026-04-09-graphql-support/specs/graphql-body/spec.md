## ADDED Requirements

### Requirement: GraphQL body 类型选项
Body 编辑器的类型下拉列表 SHALL 包含 "GraphQL" 选项。用户选择 GraphQL 类型时，SHALL 渲染 query textarea 和 variables textarea 两个输入区域，并隐藏通用的 body textarea。

#### Scenario: 选择 GraphQL 类型
- **WHEN** 用户在 body-type-select 下拉框中选择 "GraphQL"
- **THEN** 隐藏通用 body textarea，显示 query textarea（placeholder: "GraphQL Query..."）和 variables textarea（placeholder: '{"key": "value"}'），显示 "Format Variables" 按钮（格式化 variables JSON）

#### Scenario: 切换回其他类型
- **WHEN** 用户从 GraphQL 类型切换到其他 body 类型
- **THEN** 隐藏 query 和 variables textarea，显示对应的编辑器

### Requirement: GraphQL 请求发送
发送请求时，系统 SHALL 将 query 和 variables 序列化为 JSON body `{ "query": "...", "variables": {...}, "operationName": "..." }`，Content-Type 设置为 application/json，通过现有 proxy 路由发送。

#### Scenario: 发送包含 query 和 variables 的 GraphQL 请求
- **WHEN** 用户填写 query 为 `query { users { id name } }`，variables 为 `{"limit": 10}`，然后发送请求
- **THEN** 请求 body 为 `{"query":"query { users { id name } }","variables":{"limit":10}}`，Content-Type 为 application/json

#### Scenario: variables 为空时省略 variables 字段
- **WHEN** 用户填写了 query 但 variables textarea 为空
- **THEN** 请求 body 为 `{"query":"..."}` ，不包含 variables 字段

#### Scenario: operationName 为空时省略
- **WHEN** 用户未填写 operationName
- **THEN** 请求 body 中不包含 operationName 字段

### Requirement: GraphQL 请求保存与加载
系统 SHALL 将 GraphQL 请求的 query、variables、operationName 序列化为 JSON 字符串存入 saved_requests.body 字段。加载时根据 body_type 为 graphql 反序列化并分别填充到对应 textarea。

#### Scenario: 保存 GraphQL 请求
- **WHEN** 用户将一个 GraphQL 类型的请求保存到集合
- **THEN** body 字段存储 `JSON.stringify({ query, variables, operationName })`，body_type 字段为 "graphql"

#### Scenario: 加载已保存的 GraphQL 请求
- **WHEN** 用户从集合中加载一个 body_type 为 "graphql" 的请求
- **THEN** body-type-select 显示 "GraphQL"，query textarea 显示 query 内容，variables textarea 显示 variables 内容

### Requirement: GraphQL 变量模板替换
系统 SHALL 对 variables textarea 中的内容执行 `{{variable}}` 模板替换（与现有变量解析逻辑一致）。query textarea 不做模板替换（GraphQL 语法中 `{{` 为合法语法）。

#### Scenario: variables 中使用环境变量
- **WHEN** variables textarea 内容为 `{"token": "{{auth_token}}"}`，且环境变量 auth_token 值为 "abc123"
- **THEN** 发送时 variables 解析为 `{"token": "abc123"}`

#### Scenario: query 中不替换变量
- **WHEN** query textarea 包含 `{{ ... }}` 格式的 GraphQL 内联片段
- **THEN** query 内容原样发送，不执行模板替换
