## Purpose

Multipart/form-data body editing, store integration, request sending, and persistence for file upload support.

## Requirements

### Requirement: Multipart 键值对编辑器

系统 SHALL 在 body-type 选择器中提供 `multipart/form-data` 选项（value: `multipart`）。选中后，body-editor 区域 SHALL 显示键值对编辑器，替代 textarea。

每个键值对行 SHALL 包含：Key 输入框、Type 下拉选择（`text` / `file`）、Value 区域（text 为输入框，file 为文件选择按钮）、删除按钮。

键值对行 SHALL 可通过"添加行"按钮新增。

#### Scenario: 选择 multipart 类型
- **WHEN** 用户在 body-type 下拉框中选择 `multipart/form-data`
- **THEN** textarea 隐藏，显示键值对编辑器，默认包含一行空的 text 类型条目

#### Scenario: 添加和编辑 multipart 字段
- **WHEN** 用户点击"添加行"按钮
- **THEN** 编辑器新增一行，默认 type 为 text，key 和 value 为空

#### Scenario: 切换字段类型为 file
- **WHEN** 用户将某行的 Type 从 text 切换为 file
- **THEN** Value 区域从输入框变为文件选择按钮，点击后弹出系统文件选择器

#### Scenario: 选择文件
- **WHEN** 用户通过文件选择器选择一个文件
- **THEN** 系统使用 FileReader.readAsDataURL() 读取文件内容，提取 base64 部分，存储到 store 的 multipartParts 数组中对应条目。Value 区域显示文件名和大小。

#### Scenario: 删除字段行
- **WHEN** 用户点击某行的删除按钮
- **THEN** 该行从编辑器和 store.multipartParts 中移除

#### Scenario: 文件大小超限
- **WHEN** 用户选择的文件超过 10MB
- **THEN** 系统显示错误提示，不加载该文件

### Requirement: Multipart 数据 Store 集成

系统 SHALL 在 tab 状态中新增 `multipartParts` 字段，类型为数组。每个元素 SHALL 包含 `key`（string）、`type`（`text` | `file`）、`value`（string）、`filename`（string，仅 file 类型）、`contentType`（string，仅 file 类型）。

当 bodyType 为 `multipart` 时，`body` 字段 SHALL 为空字符串，`multipartParts` SHALL 包含编辑器数据。

#### Scenario: Store 初始化 multipart tab
- **WHEN** 创建新 tab 并设置 bodyType 为 `multipart`
- **THEN** tab.multipartParts 为 `[{ key: '', type: 'text', value: '' }]`，tab.body 为空字符串

#### Scenario: 切换 bodyType 到 multipart
- **WHEN** 用户将 bodyType 从其他类型切换到 `multipart`
- **THEN** tab.multipartParts 初始化为包含一行空的 text 条目，tab.body 保留原值但不用于发送

### Requirement: Multipart 请求发送

系统 SHALL 在发送请求时（url-bar.js），当 bodyType 为 `multipart` 时，将 store.multipartParts 序列化为结构化对象通过 `/api/proxy` 发送。

发送的 body 格式 SHALL 为 `{ parts: [{ key, type, value, filename?, contentType? }] }`。

#### Scenario: 发送 multipart 请求
- **WHEN** 用户点击 Send，bodyType 为 `multipart`，multipartParts 包含 text 和 file 字段
- **THEN** 前端将 `{ body_type: "multipart", body: { parts: [...] } }` 发送到 `/api/proxy`

### Requirement: Multipart 数据持久化

系统 SHALL 将 multipart 请求数据以 JSON 字符串存入数据库的 `body` TEXT 列。存储格式为 `{ "parts": [...] }`。

加载保存的请求或历史记录时，当 body_type 为 `multipart` 时，系统 SHALL 将 body 列的 JSON 解析为 multipartParts 数组恢复到 tab。

#### Scenario: 保存 multipart 请求到集合
- **WHEN** 用户保存一个 bodyType 为 `multipart` 的请求到集合
- **THEN** saved_requests 表的 body 列存储 `{"parts":[...]}`，body_type 列存储 `multipart`

#### Scenario: 从集合加载 multipart 请求
- **WHEN** 用户从侧边栏打开一个 body_type 为 `multipart` 的保存请求
- **THEN** 系统解析 body 列的 JSON，恢复 tab.multipartParts 和 tab.bodyType

#### Scenario: 历史记录中的 multipart 请求
- **WHEN** 用户从历史面板加载一个 multipart 请求
- **THEN** 系统解析 request_body 列的 JSON，恢复 tab.multipartParts 和 tab.bodyType
