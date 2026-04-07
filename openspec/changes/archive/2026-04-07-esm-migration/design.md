## Context

req-kit 前端由 20 个 JS 文件组成，通过 index.html 中的 `<script>` 标签按固定顺序加载。文件间通信依赖浏览器全局作用域：`store`、`api`、`escapeHtml`、`Toast` 等作为隐式全局变量被 19 个文件共享。6 个函数通过 `window.xxx` 显式挂载以实现跨组件调用。

当前文件分层：

```
utils/       → 定义全局工具函数（escapeHtml、Toast、Dialogs 等）
store.js     → 全局状态管理器（19 个消费者）
api.js       → 后端 API 客户端（8 个消费者）
components/  → UI 组件，每个用 IIFE 封装，读取上方定义的全局变量
app.js       → 入口，绑定键盘快捷键
```

## Goals / Non-Goals

**Goals:**
- 所有 JS 文件转为 ES Modules，依赖关系通过 `import`/`export` 显式声明
- 消除全部全局变量和 `window.xxx` 赋值
- 开发环境使用浏览器原生 ESM（零构建步骤）
- 生产环境通过 `bun build` 打包为单文件
- 迁移后功能完全等价，无行为变化

**Non-Goals:**
- 不重构组件内部逻辑（kv-editor 去重、modal 管理）
- 不拆分 CSS
- 不引入前端框架或构建工具链（webpack/vite 等）
- 不改变后端代码

## Decisions

### D1: 使用浏览器原生 ESM 作为开发模式

**选择**: 开发时 `<script type="module">` + 浏览器原生解析 import

**备选方案**:
- A) 开发也用 bun build watch — 需要管理额外进程，增加开发复杂度
- B) Vite dev server — 引入重依赖，违背项目"零前端依赖"原则

**理由**: 原生 ESM 零配置、即时生效、保持当前开发体验（改 JS → 刷新浏览器）。20+ 个 HTTP 请求在 localhost 下延迟可忽略。console 报错直接指向源文件行号。

### D2: 生产构建使用 Bun 内置 bundler

**选择**: `bun build src/public/js/app.js --outdir src/public/dist --target browser`

**理由**: Bun 已是项目运行时，无需引入新依赖。构建速度快（<50ms），支持 tree-shaking。

### D3: 迁移策略 — 四阶段逐文件推进

**选择**: 按依赖层级从底向上迁移，每阶段可独立验证

```
Phase 1: utils/ (无依赖)
  → 加 export，IIFE 解除

Phase 2: store.js + api.js (依赖 utils)
  → 加 export + import

Phase 3: components/ (依赖 store + api + utils)
  → 加 import，IIFE 解除，window.xxx → export function

Phase 4: 入口整合
  → app.js import 所有组件
  → index.html 改为单一 <script type="module">
```

**备选方案**: 一次性全部转换 — 风险高，无法增量验证

**理由**: 分阶段迁移允许每步验证不破坏功能。Phase 1-2 不影响任何组件（只是加了 export，现有全局变量仍然可用）。Phase 3 可以一个组件一个组件改。

### D4: 跨组件调用方式

**选择**: 直接 import 替代 `window.xxx`

| 当前 | 迁移后 |
|------|--------|
| `window.refreshCollections` (sidebar → import-export) | `import { refreshCollections } from './sidebar.js'` |
| `window.HistoryPanel` (history-panel → sidebar) | `import { HistoryPanel } from './history-panel.js'` |
| `window.refreshGlobalVars` (variable-preview → global-var-modal) | `import { refreshGlobalVars } from './variable-preview.js'` |
| `window.showGlobalVarModal` (global-var-modal → variable-preview) | `import { showGlobalVarModal } from './global-var-modal.js'` |

### D5: 死代码删除

直接删除无消费者的代码：
- `utils/json-format.js` — `JsonFormat` 无任何消费者
- `utils/curl-parser.js` — `CurlParser` 无任何消费者
- `components/collection-var-editor.js` 中 `window.showCollectionVarModal` 无外部消费者（内部自引用改为直接调用）

### D6: CSS 中 `.js` 后缀的文件引用

原生 ESM 的 `import` 路径需要包含 `.js` 后缀（浏览器要求）。所有 import 语句使用相对路径 + `.js` 后缀：

```javascript
import { store } from '../store.js';       // 不是 '../store'
import { api } from '../api.js';           // 不是 '../api'
import { escapeHtml } from '../utils/template.js';
```

## Risks / Trade-offs

**[浏览器兼容性] → 无需缓解**
ES Modules 支持所有现代浏览器。项目无 IE/旧浏览器兼容需求。

**[循环依赖] → 设计中避免**
当前依赖图无环。迁移后由浏览器/构建工具自动检测，若有环会在加载时报错，易于发现。

**[import 路径必须带 .js 后缀] → 编码规范约束**
浏览器原生 ESM 要求路径包含扩展名。通过 tasks 中的迁移步骤逐一确保。bun build 同样支持带后缀路径。

**[20+ HTTP 请求（开发模式）] → 可接受**
localhost 延迟 <1ms/请求，总开销可忽略。生产模式通过 bundle 解决。
