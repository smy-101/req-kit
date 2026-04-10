## Context

当前前端 CSS 为单文件 `src/public/css/style.css`（3942 行），包含 43 个 section 注释标记的功能区域。JS 约 20 个 ES module 文件由浏览器直接加载，无打包步骤。`package.json` 中有 `build:js` 脚本但未实际使用（且因 JS 中残留 TS 类型注解导致构建失败）。

项目使用 Hono `serveStatic` 从 `src/public/` 目录提供静态文件，构建产物放在 `src/public/dist/` 下可直接被服务。

## Goals / Non-Goals

**Goals:**
- 将 CSS 按功能区域拆分为独立文件，提升可维护性
- 引入 bun build 构建流程，打包 CSS 和 JS 为单一产物
- 构建后零视觉差异、零功能差异

**Non-Goals:**
- 不引入第三方 CSS 预处理器或构建工具
- 不优化 CSS 代码内容（删除未使用样式、合并重复规则等）
- 不改变前端组件架构或 JS 代码结构

## Decisions

### D1: CSS 拆分策略 — 按功能区域中粒度拆分

将 3942 行拆为 ~12 个文件，每个文件对应一个或多个相关功能区域。

**文件划分方案：**

| 文件 | 内容 | 预估行数 |
|------|------|----------|
| `tokens.css` | `:root` 变量 + `[data-theme="light"]` light theme | ~252 |
| `base.css` | body typography + `.hidden` 工具类 + reset | ~25 |
| `sidebar.css` | sidebar + env-selector + global-var-row + cookie-row + collection-tree + tree-items + method-badges + context-menu | ~360 |
| `url-bar.css` | url-bar + send-btn + save-btn | ~183 |
| `request-panel.css` | main-content + request-tab-bar + request/response-split + request-options + panel-resizer + tabs + kv-editor + body/script-editor + multipart-editor + binary-editor + graphql-editor + auth-panel | ~540 |
| `response.css` | response-viewer + json-highlight + response-search-bar + response-format-bar + virtual-scroll + send-spinner | ~510 |
| `modal.css` | modal-overlay + modal + modal-btn + confirm-dialog + env-manager + import/export | ~320 |
| `history.css` | history-panel | ~936 |
| `runner.css` | collection-runner-panel | ~284 |
| `animations.css` | 所有 `@keyframes` 定义 + 动画相关样式 | ~140 |
| `utilities.css` | toast + empty-state + shortcut-hints + scrollbar + utility-classes + loading-spinner + reduced-motion + selection + focus-visible | ~200 |

**选择理由：** 细粒度（每个组件一个文件）对 3942 行总量来说过于碎片化；粗粒度（3-4 个文件）改善有限。中粒度在可维护性和文件数之间取得平衡。

**备选方案：** 组件级拆分（~20 个文件）— 放弃，因为很多 section 之间有共享样式（如 `.hidden`、`.modal-btn`），强行拆分会导致样式归属不清。

### D2: CSS 聚合方式 — `@import` 入口文件

创建 `css/index.css` 作为入口，通过 `@import` 引入所有拆分文件。bun build 会自动内联解析。

**选择理由：** bun build 原生支持 CSS `@import` 打包，零配置。比手动拼接脚本简单。

**备选方案：** shell 脚本 `cat` 拼接 — 放弃，无法处理导入顺序依赖。

### D3: 构建工具 — bun build

使用 bun 内置的 `bun build` 命令，分别打包 CSS 和 JS。

**CSS 打包：**
```sh
bun build src/public/css/index.css --outfile src/public/dist/bundle.css
```

**JS 打包：**
```sh
bun build src/public/js/app.js --outfile src/public/dist/bundle.js --target browser
```

**选择理由：** 项目已使用 bun 运行时，无需引入额外依赖。bun build 对 CSS 和 ES module 的支持足够。

**备选方案：** esbuild / Vite — 放弃，引入额外依赖，对当前规模过度。

### D4: 开发模式 — 源文件直连

`index.html` 始终引用源文件（`css/style.css` 和 `js/app.js`）。`style.css` 通过 `@import` 聚合拆分文件，浏览器原生支持，开发时无需构建。`bun run build` 仅在部署时执行，产物（`dist/bundle.css` + `dist/bundle.js`）可用于生产环境，部署脚本需将 `index.html` 中的引用路径替换为 `/dist/` 路径。

**选择理由：** 保持 `bun run dev` 热重载体验不变。bun 的 `--hot` 对源文件有效，但对构建产物无效。开发时多几个 HTTP 请求对本地工具无影响。

**备选方案：** watch 模式自动构建 — 暂不采用，可在后续按需添加（`bun build --watch`）。

### D5: `.hidden` 和 `@keyframes sendPulse` 位置调整

- `.hidden`（当前在 auth-panel section 第 1601 行）移动到 `base.css`，因其被全局 30+ 处使用
- `@keyframes sendPulse`（当前在 send-button section 第 819 行）移动到 `animations.css`，与其他 keyframes 统一管理

## Risks / Trade-offs

- **[拆分后样式顺序影响特异性]** → CSS 文件通过 `@import` 按顺序合并，保持与原单文件相同的层叠顺序。bun build 按源码顺序输出，不会重排。
- **[JS 打包失败]** → `url-bar.js:77` 有 TS 类型注解需修复。这是唯一阻塞项，修复后即可正常打包。
- **[开发/部署不一致]** → 如果忘记构建就部署，dist 产物可能过期。缓解：可将 `build` 作为 deploy 流程的前置步骤，或在 README 中说明。
