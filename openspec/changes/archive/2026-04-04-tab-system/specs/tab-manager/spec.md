## ADDED Requirements

### Requirement: Tab 创建
系统 SHALL 在首次加载时自动创建一个空白 Tab。用户 SHALL 能通过点击 "+" 按钮创建新的空白 Tab。每个新 Tab SHALL 获得唯一 ID，初始状态为 GET 方法、空 URL、空 headers/params/body、无 auth、无 script、无 response。

#### Scenario: 首次加载自动创建 Tab
- **WHEN** 页面加载完成
- **THEN** 系统自动创建一个空白 Tab 并将其设为活跃 Tab

#### Scenario: 点击加号创建新 Tab
- **WHEN** 用户点击 Tab Bar 上的 "+" 按钮
- **THEN** 系统创建一个新的空白 Tab 并自动切换到该 Tab

### Requirement: Tab 切换
系统 SHALL 允许用户通过点击 Tab 头部切换活跃 Tab。切换 Tab 时 SHALL 立即恢复该 Tab 的全部状态（method、url、headers、params、body、auth、script、response）。切换 Tab SHALL 不丢失任何 Tab 的未保存编辑内容。

#### Scenario: 点击切换 Tab
- **WHEN** 用户点击一个非活跃的 Tab
- **THEN** 当前 Tab 的编辑状态被保留，目标 Tab 的状态被恢复到所有组件中，目标 Tab 变为活跃状态

#### Scenario: 切换后恢复编辑内容
- **WHEN** 用户在 Tab A 编辑了 URL 和 body，切换到 Tab B，再切换回 Tab A
- **THEN** Tab A 的 URL 和 body 内容与离开时完全一致

### Requirement: Tab 关闭
系统 SHALL 允许用户通过点击 Tab 上的关闭按钮、鼠标中键点击、或 Ctrl+W 快捷键关闭 Tab。关闭当前活跃 Tab 后 SHALL 自动激活相邻 Tab。当关闭最后一个 Tab 时 SHALL 自动创建一个新的空白 Tab。

#### Scenario: 点击关闭按钮
- **WHEN** 用户点击 Tab 头部上的 x 关闭按钮
- **THEN** 该 Tab 被移除，系统自动激活其右侧 Tab（若无右侧则激活左侧）

#### Scenario: 鼠标中键关闭
- **WHEN** 用户在 Tab 头部按下鼠标中键
- **THEN** 该 Tab 被关闭，行为与点击关闭按钮一致

#### Scenario: Ctrl+W 关闭
- **WHEN** 用户按下 Ctrl+W 或 Cmd+W
- **THEN** 当前活跃 Tab 被关闭

#### Scenario: 关闭最后一个 Tab
- **WHEN** 只剩一个 Tab 且用户关闭它
- **THEN** 系统自动创建一个新的空白 Tab 作为活跃 Tab

### Requirement: Tab 标题显示
系统 SHALL 在 Tab 头部显示请求方法 + URL 路径缩略信息（如 "GET /users"）。空白 Tab SHALL 显示 "New Request"。

#### Scenario: 空白 Tab 标题
- **WHEN** Tab 的 URL 为空
- **THEN** Tab 标题显示 "New Request"

#### Scenario: 有 URL 的 Tab 标题
- **WHEN** Tab 的 URL 不为空
- **THEN** Tab 标题显示为 "METHOD path" 格式（如 "POST /api/login"）

#### Scenario: Tab 标题动态更新
- **WHEN** 用户在活跃 Tab 中修改了 method 或 URL
- **THEN** Tab 标题实时更新

### Requirement: Tab 状态隔离
每个 Tab SHALL 独立持有完整的请求配置和响应数据。修改一个 Tab 的状态 SHALL 不影响其他 Tab。

#### Scenario: 独立的请求配置
- **WHEN** 用户在 Tab A 设置了 POST method 和 JSON body，然后切换到 Tab B
- **THEN** Tab B 保持自己的 method 和 body，Tab A 的配置不受影响

#### Scenario: 独立的响应数据
- **WHEN** 用户在 Tab A 发送请求并收到响应，然后切换到 Tab B 再切回 Tab A
- **THEN** Tab A 的响应数据（status、time、size、body、headers）完整保留
