## Context

req-kit 当前请求体处理管道是纯文本的：前端 textarea → JSON.stringify → `/api/proxy` → string body → `fetch()`。`body_type` 选择器（json/text/xml/form/none）仅作为元数据，不参与实际的请求构建。

涉及的文件和管道：
- 前端 `body-editor.js`（UI）、`url-bar.js`（组装请求）、`store.js`（状态）
- 后端 `routes/proxy.ts`（管道编排）、`services/proxy.ts`（fetch 执行）
- 数据库 `body TEXT` + `body_type TEXT` 列（saved_requests、history）
- `import-export.ts`（curl/Postman 导入导出）

## Goals / Non-Goals

**Goals:**
- 支持 multipart/form-data 请求体：键值对编辑器，text + file 字段
- 支持 binary 请求体：文件选择器，自动检测 Content-Type
- 文件内容 base64 编码存入现有 SQLite TEXT 列，零 schema 变更
- 代理端构建 FormData/Buffer，前端只传结构化 JSON
- 导入/导出兼容 curl `-F` 和 Postman `formdata`

**Non-Goals:**
- 文件系统存储方案
- multipart description 元数据
- 文件内容的变量替换
- 大文件分块/流式上传
- 超过 10MB 的文件支持

## Decisions

### D1: 文件内容存储 — Base64 编码存 SQLite

**选择**: 文件内容 base64 编码后以 JSON 存入现有 `body TEXT` 列

**替代方案**: 文件系统存储（数据库只存路径引用）

**理由**: req-kit 定位轻量自托管，测试文件通常 KB 级。Base64 虽有 33% 体积膨胀，但避免了文件生命周期管理（删除、清理孤儿文件）。与现有"一切存 SQLite"模式一致。

**存储格式**:
```
body_type='multipart' → body = {"parts":[{"key":"name","type":"text","value":"alice"},{"key":"file","type":"file","value":"base64...","filename":"a.png","contentType":"image/png"}]}
body_type='binary'    → body = {"data":"base64...","filename":"a.bin","contentType":"application/octet-stream"}
```

### D2: Multipart 构建位置 — 代理路由层

**选择**: 前端发送结构化 JSON（含 base64），代理路由层构建 FormData

**替代方案**: 前端直接构建 multipart 发给代理

**理由**: 保持 API 为纯 JSON（元数据和 body 一起发），变量替换 `{{var}}` 和 Auth 注入在代理端统一处理。前端不碰 HTTP 协议细节。与现有管道（模板替换 → 脚本 → Auth → fetch）契合。

### D3: API 协议 — body 字段扩展为 string | object

**选择**: `/api/proxy` 的 `body` 字段从纯 string 扩展为 string | object

**理由**: 向后兼容。json/text/xml/form 的 body 仍是 string，multipart/binary 的 body 是结构化对象。`body_type` 字段决定如何解析。

### D4: Binary Content-Type — 自动检测

**选择**: 使用 `file.type`（浏览器的 MIME 检测），fallback 为 `application/octet-stream`

**理由**: 用户无需手动设置 Content-Type，覆盖绝大多数场景。

### D5: ProxyRequest.body 类型 — string | FormData | Buffer

**选择**: 扩展 `ProxyService` 的 body 参数类型

**理由**: Bun 的 `fetch()` 原生支持 FormData 和 Buffer 作为 body，`ProxyService` 层几乎不需要改动。构建逻辑放在路由层。

### D6: 前端 Store 扩展 — 新增并行字段

**选择**: tab 新增 `multipartParts` 和 `binaryFile` 字段，与 `body` 并行

**替代方案**: 统一 `body` 字段为联合类型

**理由**: 现有代码大量依赖 `tab.body` 是 string。新增并行字段改动最小，不影响已有逻辑。

## Risks / Trade-offs

- **[大文件内存压力]** → 前端限制 10MB，base64 后约 13MB JSON，可接受
- **[切换 bodyType 丢失数据]** → multipart→json 时 parts 丢失。与 Postman 行为一致，可接受
- **[导入时文件不可用]** → curl `-F @file` 和 Postman file src 指向的本地文件在导入时可能不存在。处理方式：创建 text part 占位符，标记 filename，用户需手动重新选文件
- **[SSE 流式路径兼容]** → `ProxyService.sendRequestStream` 的 body 参数同样传入 FormData/Buffer，Bun fetch 兼容，无需额外处理
