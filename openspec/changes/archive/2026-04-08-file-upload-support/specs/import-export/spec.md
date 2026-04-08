## MODIFIED Requirements

### Requirement: 导入 curl 命令

系统 SHALL 提供 `POST /api/import` 端点，支持解析 curl 命令字符串并转换为请求对象。

系统 SHALL 解析 curl 命令中的 `-X`/`--request`（方法）、URL、`-H`/`--header`（请求头）、`-d`/`--data`/`--data-raw`（请求体）、`-F`/`--form`（multipart 表单字段）。

当解析到 `-F`/`--form` 标志时，系统 SHALL：
- `key=value` 格式解析为 text 类型的 multipart 字段
- `key=@filepath` 格式解析为 file 类型的 multipart 字段（value 为文件名占位符，标记 filename）
- 设置 body_type 为 `multipart`

解析成功后系统 SHALL 将请求保存到指定集合中。

#### Scenario: 导入简单 curl 命令
- **WHEN** 客户端发送 `POST /api/import`，body 为 `{ "type": "curl", "content": "curl https://api.example.com/users -H 'Authorization: Bearer token123'", "collection_id": 1 }`
- **THEN** 系统解析 curl 命令，创建 `{ "method": "GET", "url": "https://api.example.com/users", "headers": {"Authorization": "Bearer token123"} }` 并保存到集合 1

#### Scenario: 导入带 POST body 的 curl
- **WHEN** 客户端导入 `curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{"name":"test"}'`
- **THEN** 系统解析出 POST 方法、JSON body 和 Content-Type 头

#### Scenario: 导入带 -F multipart 的 curl
- **WHEN** 客户端导入 `curl -X POST https://api.example.com/upload -F 'username=alice' -F 'avatar=@photo.png'`
- **THEN** 系统解析出 body_type 为 `multipart`，body 为 `{"parts":[{"key":"username","type":"text","value":"alice"},{"key":"avatar","type":"file","value":"","filename":"photo.png","contentType":"application/octet-stream"}]}`

#### Scenario: curl 命令格式无效
- **WHEN** 客户端发送 `{ "type": "curl", "content": "not a valid curl command" }`
- **THEN** 系统返回 HTTP 400，响应体 `{ "error": "无法解析 curl 命令" }`

### Requirement: 导入 Postman Collection

系统 SHALL 支持 `POST /api/import` 端点导入 Postman Collection v2.1 格式的 JSON。

系统 SHALL 将 Collection 中的每个 Item 转换为集合和保存的请求，保留文件夹结构。

当 Postman 请求的 body mode 为 `formdata` 时，系统 SHALL 将其转换为 multipart 格式：
- `type: "text"` 的条目转为 text multipart 字段
- `type: "file"` 的条目转为 file multipart 字段（src 作为 filename 占位符）
- 设置 body_type 为 `multipart`

#### Scenario: 导入 Postman Collection v2.1
- **WHEN** 客户端发送 `POST /api/import`，body 为 `{ "type": "postman", "content": "<Postman Collection v2.1 JSON>" }`
- **THEN** 系统创建对应集合、文件夹和请求，返回创建的集合 ID

#### Scenario: 导入包含 formdata body 的 Postman 请求
- **WHEN** 导入的 Postman 请求 body 为 `{ "mode": "formdata", "formdata": [{"key":"name","value":"alice","type":"text"},{"key":"file","type":"file","src":"/C:/photo.png"}] }`
- **THEN** 系统将 body 转换为 multipart 格式存储，body_type 设为 `multipart`

#### Scenario: 导入非 v2.1 格式
- **WHEN** 客户端发送非 v2.1 格式的 Collection JSON
- **THEN** 系统返回 HTTP 400，响应体 `{ "error": "不支持的 Postman Collection 格式，仅支持 v2.1" }`

### Requirement: 导出为 Postman Collection

系统 SHALL 提供 `GET /api/export/collections/:id` 端点，将集合导出为 Postman Collection v2.1 格式的 JSON。

当保存的请求 body_type 为 `multipart` 时，导出 SHALL 使用 `{ "mode": "formdata", "formdata": [...] }` 格式。

当 body_type 为 `binary` 时，导出 SHALL 使用 `{ "mode": "file", "file": { "content": "base64..." } }` 格式。

#### Scenario: 导出集合
- **WHEN** 客户端请求 `GET /api/export/collections/1`
- **THEN** 系统返回 Postman Collection v2.1 格式的 JSON，包含所有子文件夹和请求

#### Scenario: 导出不存在的集合
- **WHEN** 客户端请求 `GET /api/export/collections/999`
- **THEN** 系统返回 HTTP 404

#### Scenario: 导出 multipart 请求为 Postman 格式
- **WHEN** 导出的请求 body_type 为 `multipart`
- **THEN** body 导出为 `{ "mode": "formdata", "formdata": [{"key":"name","value":"alice","type":"text"},{"key":"file","type":"file","src":"photo.png"}] }`

#### Scenario: 导出 binary 请求为 Postman 格式
- **WHEN** 导出的请求 body_type 为 `binary`
- **THEN** body 导出为 `{ "mode": "file", "file": { "content": "base64..." } }`

### Requirement: 导出为 curl 命令

系统 SHALL 提供 `GET /api/export/requests/:id/curl` 端点，将保存的请求导出为 curl 命令字符串。

当 body_type 为 `multipart` 时，导出 SHALL 使用 `-F 'key=value'` 格式（text 字段）和 `-F 'key=@filename'` 格式（file 字段）。

当 body_type 为 `binary` 时，导出 SHALL 使用 `--data-binary @filename` 格式。

#### Scenario: 导出 GET 请求为 curl
- **WHEN** 客户端请求 `GET /api/export/requests/1/curl`
- **THEN** 系统返回 `curl 'https://api.example.com/users' -H 'Authorization: Bearer token123'` 文本

#### Scenario: 导出 POST 请求为 curl
- **WHEN** 客户端导出一个 POST 请求（text body）
- **THEN** 系统返回包含 `-X POST`、`-H 'Content-Type: ...'`、`-d '...'` 的完整 curl 命令

#### Scenario: 导出 multipart 请求为 curl
- **WHEN** 客户端导出一个 multipart 请求
- **THEN** 系统返回包含 `-F 'username=alice' -F 'avatar=@photo.png'` 格式的 curl 命令

#### Scenario: 导出 binary 请求为 curl
- **WHEN** 客户端导出一个 binary 请求
- **THEN** 系统返回包含 `--data-binary @data.bin` 格式的 curl 命令
