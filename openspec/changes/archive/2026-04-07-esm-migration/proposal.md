## Why

前端 20 个 JS 文件通过全局变量（store、api、escapeHtml、Toast 等）隐式耦合，依赖 index.html 中的 script 加载顺序。随着功能增长（已 3150+ 行 JS），维护难度持续上升——依赖关系不可见、组件间通过 `window.xxx` 通信、无法静态分析。迁移到 ES Modules 可以让依赖显式化，为后续重构（提取共享 kv-editor 等）打下基础。

## What Changes

- 将所有前端 JS 文件从 IIFE + 全局变量转为 ES Modules（`import`/`export`）
- index.html 从 20 个 `<script>` 标签改为单一 `<script type="module" src="/js/app.js">`
- 消除所有 `window.xxx` 显式全局赋值（`refreshCollections`、`HistoryPanel`、`refreshGlobalVars`、`showGlobalVarModal`、`showCollectionVarModal`）
- 消除所有隐式全局依赖（`store`、`api`、`escapeHtml`、`Toast`、`Dialogs`、`InputDebounce`、`CollectionTree`、`emptyStateHTML`）
- 删除无消费者的死代码（`JsonFormat`、`CurlParser`、`window.showCollectionVarModal`）
- 添加 `build:js` 生产构建脚本（`bun build`），输出单文件 bundle
- 开发环境使用浏览器原生 ESM，零构建

## Capabilities

### New Capabilities

- `esm-module-system`: 前端 JavaScript 模块化体系——所有文件转为 ES Modules，显式 import/export，消除全局耦合

### Modified Capabilities

- `tab-manager`: store.js 从全局 const 转为 ES Module export，消费方通过 import 获取

## Impact

- **前端全部 JS 文件**（~20 个）：每个文件顶部添加 import 声明，IIFE 解除，export 替代 window 赋值
- **index.html**：script 标签从 20 个减为 1 个 `<script type="module">`
- **package.json**：新增 `build:js` 脚本
- **后端无影响**：变更仅限 `src/public/` 目录
- **浏览器兼容性**：ES Modules 支持所有现代浏览器（Chrome 61+, Firefox 60+, Safari 11+），对本项目无影响
- **开发体验**：改 JS 后刷新浏览器即可生效，与当前体验一致；console 报错指向源文件而非 bundle

## 非目标

- 不重构组件内部逻辑（如 kv-editor 去重、modal 管理等）
- 不拆分 CSS（style.css 保持单文件）
- 不引入前端框架
- 不改变后端代码
- 不添加 HMR 或 live-reload（保持手动刷新）
