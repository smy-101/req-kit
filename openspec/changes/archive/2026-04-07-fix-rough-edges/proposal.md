## Why

代码中存在 5 个明显的粗糙点：生产日志噪音、CSS 重复定义和硬编码颜色、前端类型不一致、以及从未被调用的死代码。这些问题虽然不影响核心功能，但会影响可维护性和代码质量。趁项目规模还小，尽早清理。

## What Changes

- 移除 `src/routes/proxy.ts` 中每次代理请求的 `console.log`
- 移除 `src/public/css/style.css` 中 `.history-panel` transition 的重复定义
- 将 `src/public/css/style.css` 中 Test Results 的硬编码颜色替换为 design system 的 CSS 变量
- 统一 `src/public/js/components/global-var-modal.js` 中 `enabled` 字段的类型（统一为 `true`/`false` 布尔值）
- 移除 `src/public/js/utils/template.js` 中从未被使用的 `TemplateHighlighter` 对象

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无 — 本次改动均为代码质量修复，不涉及需求层面的变更）

## Impact

- `src/routes/proxy.ts` — 移除 1 行 console.log
- `src/public/css/style.css` — 删除重复 CSS 块，替换硬编码颜色
- `src/public/js/components/global-var-modal.js` — 修复 enabled 类型
- `src/public/js/utils/template.js` — 删除未使用的 TemplateHighlighter

## 非目标

- 不涉及新功能开发
- 不涉及 API 接口变更
- 不涉及数据库 schema 变更
- 不重构现有功能的实现方式
