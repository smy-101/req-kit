## Purpose

请求记录数据解析与序列化工具，负责后端请求记录与前端 tab 数据格式之间的双向转换。

## Requirements

### Requirement: 请求记录解析
`request-data.js` SHALL 导出 `parseRequestRecord(record)` 函数，将后端返回的请求记录对象转换为前端 tab 数据格式。

输入 `record` SHALL 包含以下字段（部分可选）：
- `method`, `url`, `headers`（JSON 字符串）, `params`（JSON 字符串）
- `body`, `body_type`, `auth_type`, `auth_config`（JSON 字符串）
- `pre_request_script`, `post_response_script`
- `id`, `collection_id`, `history_id`

返回值 SHALL 为完整的 tabData 对象，其中：
- `headers` 和 `params` 为 `[{ key, value, enabled }]` 数组
- `auth_config` 为解析后的对象
- `multipart`/`binary`/`graphql` body 类型 SHALL 被解析为对应的 tabData 字段

#### Scenario: 解析普通 JSON 请求
- **WHEN** 输入 `record` 的 `headers` 为 `'{"Content-Type":"application/json"}'`
- **THEN** 返回的 `headers` 为 `[{ key: "Content-Type", value: "application/json", enabled: true }]`

#### Scenario: 解析 multipart body
- **WHEN** 输入 `record` 的 `body_type` 为 `'multipart'`，`body` 为 `'{"parts":[{"key":"file","type":"file","value":"abc"}]}'`
- **THEN** 返回的 `multipartParts` 为 `[{ key: "file", type: "file", value: "abc" }]`，`body` 为空字符串

#### Scenario: 解析 graphql body
- **WHEN** 输入 `record` 的 `body_type` 为 `'graphql'`，`body` 为 `'{"query":"{ users { id } }","variables":"{}"}'`
- **THEN** 返回的 `graphqlQuery` 为 `'{ users { id } }'`，`graphqlVariables` 为 `'{}'`

### Requirement: 请求体序列化
`request-data.js` SHALL 导出 `serializeRequestBody(tab)` 函数，将 tab 数据中的 body 字段序列化为后端需要的格式。

#### Scenario: 序列化 multipart body
- **WHEN** 输入 tab 的 `bodyType` 为 `'multipart'`，`multipartParts` 为 `[{ key: "f", type: "text", value: "v" }]`
- **THEN** 返回 `'{"parts":[{"key":"f","type":"text","value":"v"}]}'`

#### Scenario: 序列化普通 JSON body
- **WHEN** 输入 tab 的 `bodyType` 为 `'json'`，`body` 为 `'{"key":"value"}'`
- **THEN** 直接返回 `'{"key":"value"}'`

### Requirement: KV 数组转对象
`request-data.js` SHALL 导出 `kvToArray(rows)` 函数，将 key-value 行数组转换为对象，跳过 disabled 或空 key 的行。

#### Scenario: 过滤 disabled 和空 key
- **WHEN** 输入为 `[{ key: "a", value: "1", enabled: true }, { key: "", value: "2", enabled: true }, { key: "b", value: "3", enabled: false }]`
- **THEN** 返回 `{ a: "1" }`
