## 1. 删除死代码

- [x] 1.1 删除 `src/public/js/utils/json-format.js`，移除 index.html 中对应 script 标签
- [x] 1.2 删除 `src/public/js/utils/curl-parser.js`，移除 index.html 中对应 script 标签

## 2. 迁移工具层（utils/）

- [x] 2.1 迁移 `utils/template.js`：去掉顶层函数/const，改为 `export function escapeHtml`、`export const InputDebounce`、`export const CollectionTree`、`export function emptyStateHTML`
- [x] 2.2 迁移 `utils/toast.js`：IIFE 解除，改为 `export const Toast`
- [x] 2.3 迁移 `utils/dialogs.js`：IIFE 解除，去掉 `window.Dialogs =`，改为 `export const Dialogs`
- [x] 2.4 迁移 `utils/panel-resizer.js`：改为 export 初始化函数

## 3. 迁移核心层

- [x] 3.1 迁移 `store.js`：去掉顶层 `const store`，改为 `export const store`；去掉文件末尾 `store.createTab()` 自动调用（移至 app.js）
- [x] 3.2 迁移 `api.js`：去掉顶层 `const api`，改为 `export const api`

## 4. 迁移组件层

- [x] 4.1 迁移 `components/tab-bar.js`：加 import（store），去掉 IIFE
- [x] 4.2 迁移 `components/url-bar.js`：加 import（store, api, InputDebounce），去掉 IIFE
- [x] 4.3 迁移 `components/tab-panel.js`：加 import（store），去掉 IIFE
- [x] 4.4 迁移 `components/headers-editor.js`：加 import（store, InputDebounce, escapeHtml），去掉 IIFE
- [x] 4.5 迁移 `components/body-editor.js`：加 import（store, InputDebounce, Toast），去掉 IIFE
- [x] 4.6 迁移 `components/response-viewer.js`：加 import（store, escapeHtml, emptyStateHTML），去掉 IIFE
- [x] 4.7 迁移 `components/history-panel.js`：加 import（api, store, Dialogs, escapeHtml, Toast），去掉 IIFE，`window.HistoryPanel` → `export const HistoryPanel`
- [x] 4.8 迁移 `components/sidebar.js`：加 import（store, api, escapeHtml, Toast, Dialogs, HistoryPanel），去掉 IIFE，`window.refreshCollections` → `export function refreshCollections`
- [x] 4.9 迁移 `components/env-manager.js`：加 import（api, store, escapeHtml, Toast），去掉 IIFE
- [x] 4.10 迁移 `components/auth-panel.js`：加 import（store, InputDebounce, escapeHtml），去掉 IIFE
- [x] 4.11 迁移 `components/import-export.js`：加 import（api, store, escapeHtml, Toast, refreshCollections），去掉 IIFE
- [x] 4.12 迁移 `components/script-editor.js`：加 import（store, InputDebounce），去掉 IIFE
- [x] 4.13 迁移 `components/post-script-editor.js`：加 import（store, InputDebounce），去掉 IIFE
- [x] 4.14 迁移 `components/test-results.js`：加 import（store, escapeHtml），去掉 IIFE
- [x] 4.15 迁移 `components/variable-preview.js`：加 import（store, api, escapeHtml, CollectionTree），去掉 IIFE，`window.refreshGlobalVars` → `export async function refreshGlobalVars`
- [x] 4.16 迁移 `components/global-var-modal.js`：加 import（api, store, escapeHtml, Toast, refreshGlobalVars），去掉 IIFE，`window.showGlobalVarModal` → `export function showGlobalVarModal`
- [x] 4.17 迁移 `components/collection-var-editor.js`：加 import（api, escapeHtml, Toast, refreshCollections），去掉 IIFE，去掉 `window.showCollectionVarModal`
- [x] 4.18 迁移 `components/variable-autocomplete.js`：加 import（store, escapeHtml, CollectionTree），去掉 IIFE

## 5. 入口整合

- [x] 5.1 重写 `app.js`：import 所有组件和工具模块，调用 `store.createTab()` 初始化首 Tab，保留键盘快捷键绑定
- [x] 5.2 更新 `index.html`：移除所有 `<script src="/js/...">` 标签，改为单一 `<script type="module" src="/js/app.js">`

## 6. 生产构建

- [x] 6.1 在 `package.json` 添加 `build:js` 脚本：`bun build src/public/js/app.js --outdir src/public/dist --target browser`
- [x] 6.2 验证构建产物：运行 `bun run build:js`，确认输出文件生成且功能正常
