## ADDED Requirements

### Requirement: Binary 文件选择器

系统 SHALL 在 body-type 选择器中提供 `Binary` 选项（value: `binary`）。选中后，body-editor 区域 SHALL 显示文件选择器，替代 textarea。

文件选择器 SHALL 包含一个文件选择按钮和已选文件的显示区域（文件名、大小）。

选择文件后，系统 SHALL 使用 FileReader.readAsDataURL() 读取文件，提取纯 base64 内容，自动检测 Content-Type（使用 file.type，fallback 为 `application/octet-stream`）。

#### Scenario: 选择 binary 类型
- **WHEN** 用户在 body-type 下拉框中选择 `Binary`
- **THEN** textarea 隐藏，显示文件选择器，显示"选择文件"按钮

#### Scenario: 选择 binary 文件
- **WHEN** 用户通过文件选择器选择 `image.png`（23KB）
- **THEN** 文件选择器显示"image.png (23 KB)"，Content-Type 自动设为 `image/png`

#### Scenario: 替换已选文件
- **WHEN** 用户已选择一个文件后再次点击选择另一个文件
- **THEN** 新文件替换旧文件

#### Scenario: 文件大小超限
- **WHEN** 用户选择的文件超过 10MB
- **THEN** 系统显示错误提示，不加载该文件

#### Scenario: 自动检测 Content-Type
- **WHEN** 用户选择 `.json` 文件
- **THEN** Content-Type 自动设为 `application/json`
- **WHEN** 用户选择未知类型文件
- **THEN** Content-Type 默认为 `application/octet-stream`

### Requirement: Binary 数据 Store 集成

系统 SHALL 在 tab 状态中新增 `binaryFile` 字段，类型为 `{ data: string, filename: string, contentType: string } | null`。

当 bodyType 为 `binary` 时，`body` 字段 SHALL 为空字符串。

#### Scenario: Store 初始化 binary tab
- **WHEN** 创建新 tab 并设置 bodyType 为 `binary`
- **THEN** tab.binaryFile 为 null，tab.body 为空字符串

### Requirement: Binary 请求发送

系统 SHALL 在发送请求时，当 bodyType 为 `binary` 时，将 store.binaryFile 序列化为 `{ data, filename, contentType }` 通过 `/api/proxy` 发送。

#### Scenario: 发送 binary 请求
- **WHEN** 用户点击 Send，bodyType 为 `binary`，binaryFile 已选择文件
- **THEN** 前端将 `{ body_type: "binary", body: { data: "base64...", filename: "a.bin", contentType: "application/octet-stream" } }` 发送到 `/api/proxy`

#### Scenario: 未选择文件时发送
- **WHEN** 用户点击 Send，bodyType 为 `binary`，但 binaryFile 为 null
- **THEN** 请求不包含 body 字段

### Requirement: Binary 数据持久化

系统 SHALL 将 binary 请求数据以 JSON 字符串存入数据库的 `body` TEXT 列。存储格式为 `{ "data": "...", "filename": "...", "contentType": "..." }`。

加载保存的请求或历史记录时，当 body_type 为 `binary` 时，系统 SHALL 将 body 列的 JSON 解析为 binaryFile 对象恢复到 tab。

#### Scenario: 保存 binary 请求到集合
- **WHEN** 用户保存一个 bodyType 为 `binary` 的请求到集合
- **THEN** saved_requests 表的 body 列存储 `{"data":"base64...","filename":"a.bin","contentType":"..."}`，body_type 列存储 `binary`

#### Scenario: 从集合加载 binary 请求
- **WHEN** 用户从侧边栏打开一个 body_type 为 `binary` 的保存请求
- **THEN** 系统解析 body 列的 JSON，恢复 tab.binaryFile 和 tab.bodyType
