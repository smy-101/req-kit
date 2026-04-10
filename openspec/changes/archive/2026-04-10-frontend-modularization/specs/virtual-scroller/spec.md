## ADDED Requirements

### Requirement: VirtualScroller 类
`virtual-scroller.js` SHALL 导出 `VirtualScroller` 类，用于大文本（如 API 响应 body）的虚拟滚动渲染。

构造函数: `new VirtualScroller(container, lines, highlightFn)`
- `container`: 挂载 DOM 元素
- `lines`: 字符串数组，每行一个元素
- `highlightFn(line)`: 行内容转换函数（如语法高亮），返回 HTML 字符串

#### Scenario: 渲染可见行
- **WHEN** 创建 VirtualScroller 且 lines 有 10000 行
- **THEN** DOM 中仅渲染可视区域 ± 缓冲区的行（约 60-90 个 div 元素）

#### Scenario: 滚动更新
- **WHEN** 用户滚动容器
- **THEN** 通过 requestAnimationFrame 节流更新可见行，不重新渲染整个列表

#### Scenario: 行缓存
- **WHEN** 同一行滚动出可视区域再滚回来
- **THEN** 使用缓存的 highlightFn 结果，不重新计算

#### Scenario: destroy 清理
- **WHEN** 调用 `destroy()` 方法
- **THEN** 移除所有 DOM 元素、取消 requestAnimationFrame、断开 ResizeObserver 和 scroll 监听
