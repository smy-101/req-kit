## Why

项目功能已基本完善，但前端存在多处性能浪费：Store 事件系统有空事件发射和冗余 setState 调用、历史面板无防抖、构建产物未压缩、Google Fonts 阻塞首屏渲染。这些问题在正常使用中会累积感知延迟，且修复成本低。

## What Changes

- 合并 `url-bar.js` 发送请求时的 3 次连续 `setState` 为 1 次，减少 2/3 事件发射
- 删除 `store.js` 中无订阅者的 `tab:update` 事件
- `history-panel.js` 的 `request:complete` 刷新逻辑添加 500ms debounce
- 构建脚本添加 `--minify` 标志压缩 JS，引入 `lightningcss` 压缩 CSS
- Google Fonts 改为 self-host：下载字体文件到本地，使用 `@font-face` 声明，消除外部请求和渲染阻塞

## 非目标

- 不涉及组件级 DOM diff/虚拟 DOM 等大型重构
- 不涉及侧边栏渲染优化（属于第二批）
- 不涉及 response-viewer 缓存优化（属于第二批）
- 不涉及 CSS 动画优化（属于第三批）

## Capabilities

### New Capabilities

_(无新能力)_

### Modified Capabilities

- `tab-manager`: 删除 `tab:update` 空事件，合并 setState 调用模式
- `history-panel-ui`: 添加 debounce 防抖逻辑
- `build-pipeline`: 添加 JS minify 和 CSS minify
- `esm-module-system`: 无变更，仅 index.html 字体引用方式调整

## Impact

- `src/public/js/store.js` — 删除 `tab:update` 事件发射
- `src/public/js/components/url-bar.js` — 合并 setState 调用
- `src/public/js/components/history-panel.js` — 添加 debounce
- `src/public/css/base.css` — 添加 `@font-face` 声明
- `src/public/index.html` — 替换 Google Fonts 为本地字体
- `src/public/fonts/` — 新增字体文件目录
- `package.json` — 构建脚本更新，新增 lightningcss 依赖
