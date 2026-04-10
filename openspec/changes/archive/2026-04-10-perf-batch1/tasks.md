## 1. Store 事件优化

- [x] 1.1 删除 `store.js` 中 `tab:update` 事件的 emit 调用（第 184 行）
- [x] 1.2 合并 `url-bar.js` 中发送请求后的 3 次 `setState` 为 1 次（runtimeVars + scriptTests + response）
- [x] 1.3 合并 `body-editor.js` 中 body type 切换时的 2 次 `setState` 为 1 次（bodyType + multipartParts）

## 2. History 面板防抖

- [x] 2.1 在 `history-panel.js` 的 `request:complete` 回调中添加 500ms debounce 逻辑（setTimeout + clearTimeout）
- [x] 2.2 确保手动展开 History 面板时立即加载，不受 debounce 影响

## 3. 构建压缩

- [x] 3.1 安装 lightningcss 依赖（`bun add -d lightningcss`）
- [x] 3.2 更新 `package.json` 的 `build:js` 脚本，添加 `--minify` 标志
- [x] 3.3 更新 `package.json` 的 `build:css` 脚本，添加 lightningcss 压缩后处理步骤
- [x] 3.4 验证 `bun run build` 成功生成压缩后的 bundle.css 和 bundle.js

## 4. 字体 Self-host

- [x] 4.1 下载 Outfit 和 JetBrains Mono 的 woff2 文件到 `src/public/fonts/`
- [x] 4.2 在 `src/public/css/base.css` 中添加 `@font-face` 声明（font-display: swap）
- [x] 4.3 删除 `index.html` 中的 Google Fonts `<link>` 和 `<preconnect>` 标签
- [x] 4.4 验证页面字体显示正确，首屏无外部字体请求
