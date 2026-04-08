## 1. Store 数据模型扩展

- [x] 1.1 在 `store.js` 的 `_createEmptyTab()` 中新增 `multipartParts: [{ key: '', type: 'text', value: '' }]` 和 `binaryFile: null` 字段
- [x] 1.2 在 `store.js` 的 `setState` tabFields 集合中新增 `'multipartParts'` 和 `'binaryFile'`

## 2. 后端类型与代理管道

- [x] 2.1 修改 `src/services/proxy.ts` 的 `ProxyRequest` 接口，`body` 字段类型从 `string` 扩展为 `string | FormData | Buffer`
- [x] 2.2 在 `src/routes/proxy.ts` 路由层添加 multipart body 解析逻辑：从 `body.parts` 构建 FormData（text 字段做变量替换，file 字段从 base64 解码为 Blob）
- [x] 2.3 在 `src/routes/proxy.ts` 路由层添加 binary body 解析逻辑：从 `body.data` 解码 base64 为 Buffer
- [x] 2.4 修改 `src/routes/proxy.ts` 的变量替换逻辑，兼容 multipart（仅替换 text 字段值）和 binary（不替换）
- [x] 2.5 修改 `recordHistory()` 函数，对 multipart/binary 的 request_body 序列化为 JSON 字符串存入 TEXT 列

## 3. 前端 Body Editor UI — Multipart 编辑器

- [x] 3.1 在 `body-editor.js` 的 body-type select 中新增 `<option value="multipart">Multipart Form Data</option>` 和 `<option value="binary">Binary</option>`
- [x] 3.2 重构 `body-editor.js`：添加 `renderBodyEditor(type)` 函数，根据 bodyType 动态切换 textarea / multipart 编辑器 / binary 选择器
- [x] 3.3 实现 multipart 键值对编辑器 UI：Key 输入框 + Type 下拉（text/file）+ Value 区域 + 删除按钮 + 添加行按钮
- [x] 3.4 实现 file 类型字段的文件选择：`<input type="file">` → FileReader.readAsDataURL → 提取 base64 → 存入 multipartParts
- [x] 3.5 添加 10MB 文件大小限制校验，超限显示错误提示
- [x] 3.6 实现 `restoreFromTab()` 对 multipart 的恢复：从 tab.multipartParts 渲染编辑器行

## 4. 前端 Body Editor UI — Binary 选择器

- [x] 4.1 实现 binary 文件选择器 UI：文件选择按钮 + 已选文件显示（文件名、大小）
- [x] 4.2 实现文件读取和 Content-Type 自动检测（file.type，fallback application/octet-stream）
- [x] 4.3 实现 `restoreFromTab()` 对 binary 的恢复：从 tab.binaryFile 渲染文件信息

## 5. 前端请求发送与加载

- [x] 5.1 修改 `url-bar.js` 的发送逻辑：bodyType 为 multipart 时将 multipartParts 序列化为 `{ parts: [...] }`，binary 时将 binaryFile 序列化为 `{ data, filename, contentType }`
- [x] 5.2 修改 `sidebar.js` 的加载逻辑：根据 body_type 反序列化 body 列，恢复 multipartParts 或 binaryFile
- [x] 5.3 修改 `history-panel.js` 的加载逻辑：同上

## 6. 导入/导出扩展

- [x] 6.1 修改 `import-export.ts` 的 curl 解析器：识别 `-F`/`--form` 标志，解析为 multipart parts
- [x] 6.2 修改 `import-export.ts` 的 Postman 导入器：识别 `body.mode === 'formdata'`，转换为 multipart 格式
- [x] 6.3 修改 `import-export.ts` 的 curl 导出器：multipart 请求使用 `-F` 格式输出，binary 使用 `--data-binary` 格式输出
- [x] 6.4 修改 `import-export.ts` 的 Postman 导出器：multipart 请求输出 `formdata` 模式，binary 输出 `file` 模式

## 7. 样式

- [x] 7.1 为 multipart 键值对编辑器添加 CSS 样式（表格布局、文件选择按钮样式、行间距）
- [x] 7.2 为 binary 文件选择器添加 CSS 样式
