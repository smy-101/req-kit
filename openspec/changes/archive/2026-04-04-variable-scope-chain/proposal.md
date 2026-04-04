## Why

当前 req-kit 的变量系统只有单一的环境变量层（`environments` + `env_variables`），模板替换只从当前激活环境中查找。这限制了实际使用场景：无法在全局范围共享公共变量（如 `baseUrl`），无法让集合内多个请求共享变量（如 `userId`），也无法在脚本中动态提取响应值并传递给后续请求。对标 Postman 的变量作用域模型是 API 测试工具的核心能力之一，也是后续实现测试断言和 Collection Runner 的基础。

## What Changes

- 新增全局变量存储（`global_variables` 表），始终生效，优先级最低
- 新增集合变量存储（`collection_variables` 表），绑定到集合级别，跟随集合导入导出
- 扩展模板替换逻辑，按 Postman 标准四级优先级解析：Local（临时/runtime）→ Collection → Environment → Global
- 新增临时变量（runtime variables）机制，仅存于前端内存，用于脚本动态设值，页面刷新丢失
- 新增变量预览面板（"眼睛"图标），展示当前所有作用域变量的解析结果和覆盖关系
- 集合编辑面板新增 "Variables" Tab，管理集合级变量
- 新增全局变量管理入口
- 新增 `{{` 输入自动补全，列出所有可用变量并标注来源作用域
- **BREAKING**: 模板替换接口从 `replaceTemplateValues(text, environmentId)` 变为接收完整解析上下文（collectionId + runtimeVars + environmentId + global）

## 非目标

- 不做文件夹级变量（Postman 没有此概念）
- 不做变量版本控制或历史记录
- 不做跨设备变量同步
- 不做变量加密存储
- Post-response script 的变量提取能力属于独立功能，不在本次范围内（但本次设计的 runtime variable 机制会为它预留接口）

## Capabilities

### New Capabilities

- `global-variables`: 全局变量的 CRUD 管理、持久化存储、模板替换集成
- `collection-variables`: 集合级变量的 CRUD 管理、持久化存储、模板替换集成
- `variable-resolution`: 四级作用域变量解析引擎（Local → Collection → Environment → Global），统一的变量查找和模板替换
- `variable-preview-ui`: 变量预览面板（眼睛图标），展示所有作用域变量的解析结果和覆盖关系
- `variable-autocomplete`: `{{` 触发的变量自动补全，按作用域分组显示

### Modified Capabilities

- `environments`: 模板替换接口变更，environment 变量在解析链中的位置从"唯一来源"变为"中间层"
- `scripts`: pre-request script 需支持通过 `pm.variables.set()` 设置临时变量（runtime），脚本沙箱需注入变量操作 API
- `collections`: 集合数据模型扩展，需支持关联的变量列表；导入导出需包含集合变量
- `proxy`: 请求管道需传入完整变量解析上下文（collection_id + runtime_vars），而非仅 environment_id

## Impact

- **数据库**: 新增 `global_variables` 和 `collection_variables` 两张表；schema 迁移需在 `db.migrate()` 中处理
- **后端服务**: `EnvService` 重构/扩展为更通用的变量解析器；新增全局变量和集合变量的 Service + Routes
- **请求管道**: `routes/proxy.ts` 的模板替换步骤需接收并传递完整变量上下文
- **前端**: 新增变量预览组件、集合编辑器扩展、全局变量管理 UI、自动补全组件
- **API**: 新增 `/api/global-variables` 和 `/api/collections/:id/variables` 端点
- **导入导出**: 集合导出需包含集合变量，导入时需处理变量合并
