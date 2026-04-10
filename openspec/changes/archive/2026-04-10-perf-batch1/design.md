## Context

req-kit 前端采用纯 Vanilla JS + 事件驱动 Store 架构。当前存在多处性能浪费：
- `store.setState()` 每次调用都发射 `change` + `tab:update` + 可能的 `tab:title-change`，其中 `tab:update` 无任何订阅者
- `url-bar.js` 发送请求前连续调用 3 次 `setState`，产生 9 次事件发射
- `history-panel.js` 每次收到 `request:complete` 都立即发起网络请求刷新历史
- 构建脚本未启用 minify，CSS 也无压缩
- Google Fonts 通过外部 `<link>` 加载，阻塞首屏渲染

## Goals / Non-Goals

**Goals:**
- 消除无效事件发射，减少 setState 调用次数
- 防止快速操作时的冗余网络请求
- 构建产物体积最小化
- 消除首屏渲染的外部字体依赖

**Non-Goals:**
- 不引入虚拟 DOM 或 diff 算法
- 不重构组件的渲染模式（innerHTML → 增量更新）
- 不优化侧边栏渲染（第二批）
- 不优化 response-viewer 的格式化缓存（第二批）

## Decisions

### D1: 合并 setState 而非批量队列

**选择**: 将 url-bar.js 中的 3 次 `setState` 手动合并为 1 次。

**备选**: 在 store 中实现 `batchSetState(fn)` 批量方法，回调内多次修改只触发一次事件。

**理由**: 手动合并改动最小，只涉及 url-bar.js 一个调用点。批量队列需要修改 store.js 核心逻辑，当前只有一处需要合并，投入产出比不划算。如果未来出现更多需要批量 setState 的场景，再引入也不迟。

### D2: 删除 tab:update 事件而非保留

**选择**: 直接删除 `tab:update` 事件的发射代码。

**备选**: 将 `tab:update` 改为有订阅者时才发射（惰性发射）。

**理由**: 零订阅者的空事件是纯粹的浪费。惰性发射增加了 store 的复杂度，且当前没有任何组件需要这个事件。如果未来需要，从 git 历史找回即可。

### D3: history-panel 使用简单 setTimeout debounce

**选择**: 在 `request:complete` 回调中用 `setTimeout` + `clearTimeout` 实现 500ms debounce。

**备选**: 引入 lodash.debounce 或自建通用 debounce 工具函数。

**理由**: 只有 history-panel 一处需要 debounce，内联实现最简单。500ms 的延迟对用户来说几乎无感知（历史列表不是核心交互路径），但能显著减少快速连续发请求时的网络请求量。

### D4: CSS 压缩使用 lightningcss

**选择**: 构建流程中引入 `lightningcss` 作为 CSS 后处理器。

**备选**: 使用 `csso`、`clean-css`、或 `esbuild --minify-css`。

**理由**: `lightningcss` 是 Bun 官方推荐的 CSS 工具（Bun 内部使用），性能极快，支持现代 CSS 语法，且单二进制无需额外运行时依赖。`csso` 对 CSS Nesting 等新特性支持不如 lightningcss 完善。

### D5: 字体 self-host 而非继续使用 Google Fonts

**选择**: 下载 Outfit 和 JetBrains Mono 的 woff2 文件到 `src/public/fonts/`，用 `@font-face` 声明，删除 Google Fonts `<link>`。

**备选**: 保持 Google Fonts 但改为 `media="print" onload="this.media='all'"` 异步加载。

**理由**: req-kit 是自托管工具，可能在无外网环境使用。Self-host 彻底消除外部依赖和 DNS/TLS 开销。woff2 压缩率最高，配合 `font-display: swap` 保证渲染不阻塞。

## Risks / Trade-offs

- [字体文件增大仓库体积] → woff2 格式体积可控（Outfit ~50KB, JetBrains Mono ~40KB），远小于 Google Fonts 多次请求的总开销
- [lightningcss 新增构建依赖] → lightningcss 是 Bun 生态标准工具，维护活跃，风险低
- [debounce 导致历史列表延迟更新] → 500ms 延迟对用户几乎无感知，且用户手动展开历史面板时会立即加载最新数据
- [删除 tab:update 可能影响未发现的订阅方] → 已通过全局搜索确认零订阅者，风险为零
