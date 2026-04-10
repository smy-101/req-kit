## Why

项目功能已基本完善，但代码中存在若干 Bug 和隐患：一个路由注册顺序 Bug 导致历史清理 API 不可用，`injectAuth()` 缺少异常处理可能导致代理管道崩溃，多处静默吞掉错误使问题难以排查，以及变量解析函数重复实现导致维护风险。这些问题虽然不影响核心流程，但在边界情况下会触发异常或导致功能不可用。

## What Changes

- 修复 `routes/history.ts` 路由注册顺序：将 `DELETE /api/history/cleanup` 移到 `DELETE /api/history/:id` 之前，使清理 API 可达
- 为 `injectAuth()` 的 `JSON.parse` 添加 try/catch，避免畸形 auth_config 导致管道崩溃
- 为 `recordHistory()` 添加错误日志（`console.error`），不再静默吞掉异常
- 修复 `runner.ts` 中多处 `JSON.parse` 的空 `catch {}` 块，添加 `console.warn` 日志
- 统一 `ReplaceVariablesSchema`：提取到 `lib/validation.ts` 共享，消除 3 处重复定义
- 提取 `findCollection` 树搜索为共享工具函数，消除 `runner.ts` 和 `import-export.ts` 的重复实现
- 消除 `ProxyService` 中 `sendRequest` / `sendRequestStream` 的公共 fetch 配置重复代码
- 消除 `ScriptService` 中 `execute()` / `executePostScript()` 的 sandbox 对象重复构建
- 前端：消除 `escapeHtml` 和 `formatSize` 的重复定义，统一使用共享工具函数

## 非目标

- 不做性能优化（索引、查询优化等留到后续）
- 不重构前端组件结构
- 不添加新功能
- 不改变任何 API 接口契约
- 不修改测试策略或增加测试覆盖率

## Capabilities

### New Capabilities

（无新能力）

### Modified Capabilities

- `proxy`: injectAuth 异常处理加固，recordHistory 错误日志
- `history-cleanup`: 路由注册顺序修复，使清理 API 可达
- `variable-resolution`: 消除 EnvService.replaceTemplateValues 与 VariableService.replaceWithMap 的重复实现
- `input-validation`: 提取共享 ReplaceVariablesSchema

## Impact

- `src/routes/history.ts` — 路由注册顺序调整
- `src/services/auth.ts` — injectAuth 添加异常处理
- `src/routes/proxy.ts` — recordHistory 添加错误日志
- `src/services/runner.ts` — JSON.parse catch 块添加日志
- `src/services/proxy.ts` — 提取公共 fetch 配置方法
- `src/services/script.ts` — 提取共享 sandbox 构建方法
- `src/services/import-export.ts` — 使用共享 findCollection
- `src/lib/validation.ts` — 新增 ReplaceVariablesSchema 导出
- `src/services/environment.ts` — 移除 replaceTemplateValues，统一使用 VariableService
- `src/public/js/components/response-viewer.js` — 使用共享 formatSize
- `src/public/js/components/body-editor.js` — 移除本地 escapeHtml/formatSize，使用共享版本
