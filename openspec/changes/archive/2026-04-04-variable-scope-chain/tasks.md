## 1. 数据库 Schema 迁移

- [x] 1.1 在 `src/db/schema.sql` 中新增 `global_variables` 表（id, key UNIQUE, value, enabled）
- [x] 1.2 在 `src/db/schema.sql` 中新增 `collection_variables` 表（id, collection_id FK CASCADE, key, value, enabled）及索引 `idx_coll_vars_coll_id`

## 2. 后端 Service 层

- [x] 2.1 新建 `src/services/variable.ts`，实现 `VariableService` 类，包含全局变量 CRUD 方法（getAllGlobal, replaceGlobal）
- [x] 2.2 在 `VariableService` 中实现集合变量 CRUD 方法（getByCollection, replaceForCollection）
- [x] 2.3 在 `VariableService` 中实现 `getRootCollectionId(collectionId)` 方法（向上追溯 parent_id 到根集合）
- [x] 2.4 在 `VariableService` 中实现 `resolveVariables(text, context)` 核心方法，按 Runtime → Collection → Environment → Global 优先级替换 `{{key}}`
- [x] 2.5 在 `VariableService` 中实现 `resolveAllVars(context)` 方法，返回所有作用域合并后的变量 Map（供脚本和预览使用）

## 3. 后端 Routes 层

- [x] 3.1 新建 `src/routes/global-variables.ts`，注册 `GET /api/global-variables` 和 `PUT /api/global-variables` 端点
- [x] 3.2 在集合路由中新增 `GET /api/collections/:id/variables` 和 `PUT /api/collections/:id/variables` 端点
- [x] 3.3 在 `src/index.ts` 中实例化 `VariableService`，注册新路由

## 4. 请求管道改造

- [x] 4.1 扩展 `ProxyRequest` 接口，新增 `collection_id?: number` 和 `runtime_vars?: Record<string, string>` 字段
- [x] 4.2 改造 `routes/proxy.ts` 模板替换步骤：从 `envService.replaceTemplateValues()` 切换到 `variableService.resolveVariables()`，传入完整上下文（runtime_vars + collection_id + environment_id）
- [x] 4.3 改造脚本执行步骤：构建 `variables` 上下文对象传入沙箱，包含 `get(key)` 和 `set(key, value)` 方法
- [x] 4.4 改造脚本执行步骤：`ScriptResult` 新增 `variables` 字段，收集脚本通过 `variables.set()` 设置的变量
- [x] 4.5 改造代理响应：将 `script_variables` 字段加入响应体，前端可据此更新 runtime 变量

## 5. 脚本沙箱扩展

- [x] 5.1 在 `ScriptService.execute()` 沙箱中注入 `variables` 对象，提供 `get(key)` 按作用域链查找、`set(key, value)` 设置临时变量
- [x] 5.2 `ScriptService` 的 `ScriptContext` 接口新增 `allVars` 字段（合并后的全作用域变量 Map），供 `variables.get()` 使用
- [x] 5.3 `ScriptResult` 接口新增 `variables: Record<string, string>` 字段

## 6. 导入导出扩展

- [x] 6.1 改造 `ImportExportService.exportPostmanCollection()`：导出时查询集合变量，写入 Postman v2.1 格式的顶层 `variable` 字段
- [x] 6.2 改造 `ImportExportService.importPostmanCollection()`：导入时解析顶层 `variable` 字段，写入 `collection_variables` 表

## 7. 集合树 API 扩展

- [x] 7.1 改造 `CollectionService.getTree()`：查询结果中每个集合节点包含 `variables` 字段（集合变量列表）

## 8. 前端 — Store 和 API 层

- [x] 8.1 在 `store.js` 的默认 state 中新增 `runtimeVars: {}` 和 `globalVariables: []` 字段
- [x] 8.2 在 `js/api.js` 中新增全局变量 API 方法（getGlobalVariables, updateGlobalVariables）
- [x] 8.3 在 `js/api.js` 中新增集合变量 API 方法（getCollectionVariables, updateCollectionVariables）
- [x] 8.4 改造代理请求发送逻辑：请求体新增 `collection_id`（从当前 Tab 关联的请求获取）和 `runtime_vars`（从 store 获取）
- [x] 8.5 改造代理响应处理：将响应中的 `script_variables` 合并到 `store.runtimeVars`

## 9. 前端 — 变量预览面板

- [x] 9.1 新建 `js/components/variable-preview.js`，实现"眼睛"图标按钮和弹出面板
- [x] 9.2 面板按作用域分组展示变量（Runtime → Collection → Environment → Global），每组标注来源
- [x] 9.3 被覆盖变量灰色显示并标注"被覆盖"
- [x] 9.4 面板内搜索框实时过滤变量
- [x] 9.5 面板底部"管理全局变量"按钮，点击打开全局变量编辑模态框

## 10. 前端 — 集合编辑器变量 Tab

- [x] 10.1 在集合编辑/右键菜单中新增 "Variables" Tab 或入口
- [x] 10.2 实现集合变量的键值对编辑器（添加/编辑/删除/启用禁用），复用现有 kv-editor 样式
- [x] 10.3 保存时调用集合变量 API 持久化

## 11. 前端 — 全局变量管理

- [x] 11.1 实现全局变量编辑模态框，支持添加/编辑/删除/启用禁用全局变量
- [x] 11.2 保存时调用全局变量 API 持久化

## 12. 前端 — 变量自动补全

- [x] 12.1 新建 `js/components/variable-autocomplete.js`，监听 URL 栏、Headers 值、Body 编辑器的 `input` 事件
- [x] 12.2 检测 `{{` 模式触发补全弹窗，查询所有作用域变量并按 key 过滤
- [x] 12.3 补全项标注来源作用域，被覆盖变量不重复显示
- [x] 12.4 选择补全项完成 `{{key}}` 插入，Escape 关闭弹窗

## 13. 测试

- [x] 13.1 新增 `tests/unit/variable.test.ts`：测试 `VariableService` 的全局变量 CRUD、集合变量 CRUD、`getRootCollectionId` 追溯、`resolveVariables` 四级优先级解析
- [x] 13.2 更新 `tests/unit/proxy.test.ts`：验证代理请求管道传入 `collection_id` 和 `runtime_vars` 后的模板替换行为
- [x] 13.3 新增集成测试：验证 `/api/global-variables` 和 `/api/collections/:id/variables` 端点的完整 CRUD 流程
- [x] 13.4 更新 `tests/unit/script.test.ts`：验证 `variables.get()` 和 `variables.set()` 在沙箱中的行为及 `ScriptResult.variables` 返回
