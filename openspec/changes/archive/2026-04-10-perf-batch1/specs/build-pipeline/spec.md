## MODIFIED Requirements

### Requirement: 前端构建流程
系统必须提供 `bun run build` 命令，将 CSS 和 JS 打包到 `src/public/dist/` 目录。构建产物 SHALL 经过压缩以最小化体积。

#### Scenario: 构建生成 CSS 产物
- **WHEN** 执行 `bun run build`
- **THEN** 生成 `src/public/dist/bundle.css`，包含所有拆分 CSS 的合并内容
- **THEN** CSS 经过 lightningcss 压缩（去除空白、注释、缩短选择器）

#### Scenario: 构建生成 JS 产物
- **WHEN** 执行 `bun run build`
- **THEN** 生成 `src/public/dist/bundle.js`，包含所有前端 JS 的打包内容
- **THEN** JS 经过 bun build `--minify` 压缩（去除空白、注释、缩短标识符）

#### Scenario: 分别构建 CSS 和 JS
- **WHEN** 执行 `bun run build:css`
- **THEN** 仅生成压缩后的 `src/public/dist/bundle.css`
- **WHEN** 执行 `bun run build:js`
- **THEN** 仅生成压缩后的 `src/public/dist/bundle.js`

## ADDED Requirements

### Requirement: 字体 self-host
系统 SHALL 将 Google Fonts (Outfit、JetBrains Mono) 的 woff2 文件托管在 `src/public/fonts/` 目录下，通过 `@font-face` 声明加载，不依赖外部 CDN。

#### Scenario: 首屏不阻塞渲染
- **WHEN** 页面加载时
- **THEN** 不发起任何外部字体请求，字体通过 `font-display: swap` 异步加载，首屏内容使用系统字体回退立即渲染

#### Scenario: 字体加载完成后显示正确字体
- **WHEN** woff2 字体文件下载完成
- **THEN** 页面文本自动切换为 Outfit（UI 文本）和 JetBrains Mono（代码文本）

#### Scenario: 构建产物包含字体
- **WHEN** 执行 `bun run build`
- **THEN** `src/public/fonts/` 目录下的 woff2 文件可供部署使用
