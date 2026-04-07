## Purpose

前端 JS 代码从 IIFE + 全局变量模式迁移到 ES Modules 模块化体系，通过 import/export 管理依赖，消除全局作用域污染。

## Requirements

### Requirement: 文件导出
每个前端 JS 文件 SHALL 使用 ES Modules 的 `export` 语法导出其对外的接口（函数、常量、类）。文件内部变量 SHALL NOT 泄露到全局作用域。

#### Scenario: 工具函数导出
- **WHEN** `utils/template.js` 定义了 `escapeHtml`、`InputDebounce`、`CollectionTree`、`emptyStateHTML`
- **THEN** 这些函数/常量通过 `export` 关键字导出，而非作为全局变量存在

#### Scenario: 状态管理器导出
- **WHEN** `store.js` 定义了 `store` 对象
- **THEN** `store` 通过 `export const store` 导出

#### Scenario: 组件导出需要跨组件调用的函数
- **WHEN** `sidebar.js` 的 `refreshCollections` 函数被 `import-export.js` 和 `collection-var-editor.js` 调用
- **THEN** 该函数通过 `export function refreshCollections()` 导出，而非 `window.refreshCollections = ...`

### Requirement: 文件导入
每个前端 JS 文件 SHALL 使用 ES Modules 的 `import` 语法声明其依赖。所有 import 路径 SHALL 包含 `.js` 后缀并使用相对路径。

#### Scenario: 组件导入依赖
- **WHEN** `components/sidebar.js` 需要使用 `store`、`api`、`escapeHtml`、`Toast`、`Dialogs`
- **THEN** 文件顶部包含对应的 `import` 语句，路径形如 `'../store.js'`、`'../api.js'`、`'../utils/template.js'`、`'../utils/toast.js'`、`'../utils/dialogs.js'`

#### Scenario: 跨组件导入
- **WHEN** `import-export.js` 需要调用 `refreshCollections()`
- **THEN** 通过 `import { refreshCollections } from './sidebar.js'` 获取，而非访问全局变量

#### Scenario: import 路径包含扩展名
- **WHEN** 任何文件使用 import 语句
- **THEN** 路径以 `.js` 结尾（如 `'../store.js'` 而非 `'../store'`）

### Requirement: IIFE 解除
所有前端 JS 文件 SHALL NOT 使用 IIFE（立即调用函数表达式）封装。ES Module 自身的作用域隔离 SHALL 替代 IIFE 的封装作用。

#### Scenario: 组件文件结构
- **WHEN** 查看 `components/response-viewer.js` 等组件文件
- **THEN** 文件顶层直接包含代码，无 `(function() { ... })()` 包裹

### Requirement: 消除 window 挂载
前端 JS 文件 SHALL NOT 通过 `window.xxx = ...` 向全局作用域暴露接口。

#### Scenario: 无 window 赋值
- **WHEN** 检查所有前端 JS 文件
- **THEN** 不存在 `window.refreshCollections`、`window.HistoryPanel`、`window.refreshGlobalVars`、`window.showGlobalVarModal`、`window.showCollectionVarModal`、`window.Dialogs` 等 window 属性赋值

### Requirement: 入口文件
`app.js` SHALL 作为唯一入口文件，通过 import 初始化所有组件。index.html SHALL 只包含一个 `<script type="module" src="/js/app.js">` 标签加载前端代码。

#### Scenario: 单一 script 标签
- **WHEN** 查看 `index.html`
- **THEN** 前端 JS 只通过一个 `<script type="module" src="/js/app.js">` 加载，不存在其他 `<script src="/js/...">` 标签

#### Scenario: app.js 导入所有组件
- **WHEN** 查看 `app.js`
- **THEN** 文件包含所有组件的 import 语句（如 `import './components/sidebar.js'`），确保所有组件被初始化

### Requirement: 生产构建
项目 SHALL 提供 `build:js` 脚本，使用 `bun build` 将 `app.js` 打包为单文件 bundle 输出到 `src/public/dist/`。

#### Scenario: 执行构建命令
- **WHEN** 运行 `bun run build:js`
- **THEN** 在 `src/public/dist/` 目录生成打包后的 JS 文件，包含所有前端代码

#### Scenario: 构建产物可运行
- **WHEN** index.html 引用构建产物
- **THEN** 所有前端功能正常工作，与开发模式行为一致

### Requirement: 死代码删除
无任何消费者的代码 SHALL 被删除。

#### Scenario: 删除无消费者的模块
- **WHEN** `utils/json-format.js`（`JsonFormat`）和 `utils/curl-parser.js`（`CurlParser`）无任何文件引用
- **THEN** 这些文件被删除，index.html 中对应的 script 标签也被移除
