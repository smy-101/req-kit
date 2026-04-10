## 1. Bug 修复

- [x] 1.1 修复 `routes/history.ts` 路由注册顺序：将 `DELETE /api/history/cleanup` 移到 `DELETE /api/history/:id` 之前
- [x] 1.2 为 `services/auth.ts` 的 `injectAuth()` 添加 JSON.parse try/catch，失败时 console.warn + 原样返回
- [x] 1.3 为 `routes/proxy.ts` 的 `recordHistory()` catch 块添加 `console.error('[recordHistory]', err)`
- [x] 1.4 为 `routes/proxy.ts` 的 `streamProxyResponse` 中 historyService.create 的空 catch 块添加 `console.error`

## 2. Runner 错误处理加固

- [x] 2.1 修复 `services/runner.ts` 中 headers JSON.parse 的空 catch 块，添加 console.warn
- [x] 2.2 修复 `services/runner.ts` 中 params JSON.parse 的空 catch 块，添加 console.warn
- [x] 2.3 修复 `services/runner.ts` 中 auth_config JSON.parse 的空 catch 块，添加 console.warn

## 3. 代码去重 — 后端共享模块

- [x] 3.1 提取 `ReplaceVariablesSchema` 到 `lib/validation.ts`，更新 `routes/global-variables.ts`、`routes/collections.ts`、`routes/environments.ts` 的 import
- [x] 3.2 创建 `lib/tree-utils.ts`，定义 `findInTree<T>()` 泛型函数，更新 `services/runner.ts` 和 `services/import-export.ts` 使用共享版本
- [x] 3.3 提取 `ProxyService` 的公共 fetch 配置为私有方法 `prepareFetch()`，消除 `sendRequest` 和 `sendRequestStream` 的重复代码
- [x] 3.4 提取 `ScriptService` 的 sandbox 基础对象为私有方法 `createBaseSandbox()`，消除 `execute()` 和 `executePostScript()` 的重复构建

## 4. 代码去重 — 前端工具函数

- [x] 4.1 从 `components/body-editor.js` 移除本地 `escapeHtml`，改为从 `utils/template.js` import
- [x] 4.2 创建 `utils/format.js` 导出 `formatSize()`，更新 `components/response-viewer.js` 和 `components/body-editor.js` 使用共享版本

## 5. 清理死代码

- [x] 5.1 移除 `EnvService.replaceTemplateValues()` 方法（已无生产代码调用），删除对应的单元测试
- [x] 5.2 移除 `style.css`（与 `index.css` 内容完全重复，仅 `index.css` 被使用）

## 6. 验证

- [x] 6.1 运行全部测试确认通过：`bun test`
- [x] 6.2 手动验证 `DELETE /api/history/cleanup` 路由可达
- [x] 6.3 手动验证畸形 auth_config 不中断代理请求
