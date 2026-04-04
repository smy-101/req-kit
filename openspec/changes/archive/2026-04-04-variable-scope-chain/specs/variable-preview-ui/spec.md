## ADDED Requirements

### Requirement: 变量预览面板

系统 SHALL 在界面右上角提供"眼睛"图标按钮，点击后弹出变量预览面板。

面板 SHALL 按作用域分组展示当前所有可用变量，从高到低为：Runtime → Collection → Environment → Global。

每个作用域分组 SHALL 显示作用域名称和来源标识（如集合名称、环境名称）。

#### Scenario: 打开变量预览面板
- **WHEN** 用户点击右上角"眼睛"图标
- **THEN** 弹出变量预览面板，按作用域分组展示所有变量

#### Scenario: 展示所有作用域的变量
- **WHEN** 当前有 runtime 变量 `{ "token": "abc" }`，集合变量 `{ "userId": "42" }`，环境变量 `{ "baseUrl": "http://dev.com" }`，全局变量 `{ "timeout": "5000" }`
- **THEN** 面板分四组展示全部变量，每组标注来源

### Requirement: 变量覆盖关系提示

当低优先级作用域中的变量被高优先级作用域的同名变量覆盖时，系统 SHALL 以灰色样式显示被覆盖的变量，并标注"被覆盖"。

面板 SHALL 同时显示被覆盖变量的来源值和高优先级覆盖值。

#### Scenario: 显示被覆盖的变量
- **WHEN** 全局变量有 `{ "baseUrl": "https://prod.com" }`，环境变量有 `{ "baseUrl": "http://dev.com" }`
- **THEN** 面板中 Environment 组正常显示 `baseUrl = http://dev.com`，Global 组的 `baseUrl` 灰色显示并标注"被覆盖"

### Requirement: 变量预览面板搜索

面板 SHALL 提供搜索输入框，用户输入关键词时实时过滤显示匹配的变量。

#### Scenario: 搜索变量
- **WHEN** 用户在搜索框输入 "url"
- **THEN** 面板仅显示 key 中包含 "url" 的变量（如 `baseUrl`、`apiUrl`），跨所有作用域

### Requirement: 全局变量管理入口

变量预览面板底部 SHALL 提供"管理全局变量"按钮，点击后打开全局变量编辑器。

全局变量编辑器 SHALL 支持添加、编辑、删除、启用/禁用全局变量，并保存到后端。

#### Scenario: 从预览面板打开全局变量编辑器
- **WHEN** 用户在变量预览面板点击"管理全局变量"按钮
- **THEN** 打开全局变量编辑模态框，展示当前所有全局变量，支持编辑
