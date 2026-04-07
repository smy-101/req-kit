## 1. 后端日志清理

- [x] 1.1 移除 `src/routes/proxy.ts` 中的 `console.log('[proxy] resolved url: ...')`

## 2. CSS 修复

- [x] 2.1 删除 `src/public/css/style.css` 中 `.history-panel` transition 的重复定义（保留首次出现的位置）
- [x] 2.2 将 Test Results 中 `#22c55e` 替换为 `var(--green)`，`#ef4444` 替换为 `var(--red)`

## 3. 前端类型修复

- [x] 3.1 统一 `src/public/js/components/global-var-modal.js` 中 `enabled` 字段为布尔值 `true`/`false`

## 4. 死代码清理

- [x] 4.1 删除 `src/public/js/utils/template.js` 中未被引用的 `TemplateHighlighter` 对象
