## Why

req-kit 目前仅支持纯文本请求体（JSON/Text/XML/Form URL Encoded），无法测试文件上传接口。作为 API 测试工具，multipart/form-data 和 binary body 是常见需求，缺少这些能力让工具在测试文件上传、二进制提交等场景下不可用。

## What Changes

- 新增 `multipart/form-data` 请求体类型：键值对编辑器，支持 text 字段和 file 字段（通过文件选择器读取并 base64 编码）
- 新增 `binary` 请求体类型：文件选择器，自动检测 Content-Type
- 代理端负责构建 FormData / Buffer，前端只传递结构化数据
- 文件内容以 base64 编码存入现有 SQLite TEXT 列，不改 schema
- 导入/导出支持 curl `-F` 标志和 Postman `formdata` 模式

## Capabilities

### New Capabilities
- `multipart-body`: multipart/form-data 请求体的编辑、传输、代理构建、持久化全链路支持
- `binary-body`: binary（application/octet-stream 等）请求体的文件选择、传输、代理构建、持久化全链路支持

### Modified Capabilities
- `proxy`: ProxyRequest.body 类型从 string 扩展为 string | FormData | Buffer；路由层新增 multipart/binary body 的解析和构建逻辑；变量替换兼容新类型
- `import-export`: curl 导入识别 `-F`/`--form` 标志；Postman 导入识别 `formdata` body 模式；curl/Postman 导出支持 multipart 和 binary 输出

## Impact

- **前端组件**: `body-editor.js` 重构（按 bodyType 切换不同编辑器）；`url-bar.js` 发送逻辑扩展；`sidebar.js` 和 `history-panel.js` 加载逻辑扩展
- **Store**: tab 结构新增 `multipartParts` 和 `binaryFile` 字段
- **后端路由**: `proxy.ts` 路由层新增 multipart FormData 构建和 binary Buffer 构建逻辑
- **后端类型**: `ProxyRequest` 接口 body 字段类型扩展
- **数据库**: 无 schema 变更，复用现有 body TEXT 列存 JSON
- **API 协议**: `/api/proxy` 的 body 字段从 string 扩展为 string | object（向后兼容）

## 非目标

- 不实现文件系统存储方案（全部 base64 入库）
- 不实现 multipart 字段的 description 元数据
- 不实现文件内容的变量替换（仅 text 字段值做 `{{var}}` 替换）
- 不实现 Content-Type 自动设置（multipart 由 FormData 自动处理，binary 自动检测，其余类型维持现状需手动设置）
- 不实现大文件分块上传或流式上传
- 不实现文件大小超过 10MB 的支持
