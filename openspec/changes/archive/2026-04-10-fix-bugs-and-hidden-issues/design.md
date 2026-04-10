## Context

req-kit 当前后端约 3,200 行 TypeScript 代码，存在以下隐患：
- 路由注册顺序 Bug：`DELETE /api/history/cleanup` 注册在 `DELETE /api/history/:id` 之后，导致 "cleanup" 被 `:id` 捕获
- `injectAuth()` 对 auth_config 做 JSON.parse 无 try/catch，畸形数据会导致未处理异常
- `recordHistory()` 静默吞掉所有 catch 异常，问题难以排查
- runner.ts 多处 JSON.parse 空 catch 块
- 4 处代码重复：ReplaceVariablesSchema (3个文件)、findCollection (2个文件)、sandbox 构建 (script.ts 2个方法)、fetch 配置 (proxy service 2个方法)
- 前端 2 处工具函数重复：escapeHtml、formatSize
- EnvService.replaceTemplateValues 与 VariableService.replaceWithMap 两套 `{{}}` 替换实现

## Goals / Non-Goals

**Goals:**
- 修复所有已知 Bug 和隐患
- 消除代码重复，提高可维护性
- 所有修改保持行为不变，仅加固错误处理

**Non-Goals:**
- 不做性能优化（索引、查询优化）
- 不重构前端组件结构
- 不改变 API 接口契约
- 不增加新功能

## Decisions

### 1. 路由顺序修复：移动路由注册位置

将 `DELETE /api/history/cleanup` 移到 `DELETE /api/history/:id` 之前。Hono 按注册顺序匹配路由，更具体的路径必须先注册。

**替代方案**：在 `:id` handler 中检查 `id === 'cleanup'` 做特殊处理 — 不采用，因为路由顺序是 Hono 的标准模式，特殊处理会增加认知负担。

### 2. injectAuth 异常处理：try/catch + 返回错误信息

在 `injectAuth()` 中对 `JSON.parse(authConfig)` 包裹 try/catch，解析失败时返回原始 headers/params 不做修改，并通过新增返回字段 `error` 通知调用方。

**替代方案**：抛出异常让上层 catch — 不采用，因为 injectAuth 是纯函数，不应决定上层错误处理策略。返回 error 让管道层决定如何处理更灵活。

**决策调整**：考虑到 injectAuth 在管道中的位置（认证注入步骤），如果 auth 配置畸形，最合理的做法是让管道继续执行但不注入认证信息，同时在日志中记录警告。因此不新增 error 返回字段，改为 console.warn + 原样返回。

### 3. recordHistory 错误日志：console.error

在 catch 块中添加 `console.error('[recordHistory]', err)` 而非静默忽略。保持 try/catch 确保 history 失败不阻塞代理响应。

### 4. runner JSON.parse 日志：console.warn

在 runner.ts 的空 catch 块中添加 `console.warn('[runner] JSON.parse failed:', field, err)`，便于排查数据损坏问题。

### 5. ReplaceVariablesSchema 提取到 lib/validation.ts

从 `global-variables.ts`、`collections.ts`、`environments.ts` 中提取相同的 schema 定义到 `lib/validation.ts`，三个文件改为 import 使用。

### 6. findCollection 提取为共享工具函数

在 `src/lib/tree-utils.ts` 中定义 `findInTree<T>(tree: T[], id: number, idKey = 'id', childrenKey = 'children'): T | null` 泛型函数，runner.ts 和 import-export.ts 均改为调用此函数。

### 7. ProxyService fetch 配置提取

将 `sendRequest` 和 `sendRequestStream` 的公共部分（URL 构建、AbortController 创建、timeout 设置、fetch options 构建）提取为私有方法 `prepareFetch(req): { url, controller, fetchOptions }`，两个方法改为调用此共享方法。

### 8. ScriptService sandbox 提取

将 `execute()` 和 `executePostScript()` 中相同的 sandbox 属性（console、JSON、Date、Math 等 ~15 个属性 + blocked APIs）提取为私有方法 `createBaseSandbox(context)`，返回基础 sandbox 对象。两个方法在此基础上添加各自的特有属性（request / response / tests）。

### 9. EnvService.replaceTemplateValues 移除

`replaceTemplateValues()` 仅使用 O(n) find 查找，而 `VariableService.replaceWithMap()` 使用 O(1) Map 查找。检查所有调用方，统一改用 VariableService。

**需要确认调用方**：`replaceTemplateValues` 当前被谁调用？如果仅被内部使用，直接移除；如果被路由调用，改为使用 VariableService。

### 10. 前端工具函数统一

- `body-editor.js` 中的 `escapeHtml` 改为从 `utils/template.js` import
- `body-editor.js` 中的 `formatSize` 移到 `utils/format.js`，`response-viewer.js` 也改为从此 import

## Risks / Trade-offs

- [提取共享函数增加耦合] → 仅在明显重复（3+ 处或 2 处且逻辑完全相同）时提取，避免过度抽象
- [injectAuth 改为 warn 而非 error 可能漏掉问题] → 当前行为是直接崩溃，warn + 原样返回已是改进；后续可考虑通过管道错误机制通知前端
- [移除 EnvService.replaceTemplateValues 可能影响外部调用方] → 项目是单体应用，无外部 API，所有调用方均在项目内可控
