## ADDED Requirements

### Requirement: 请求完成后历史刷新防抖
History 面板在收到 `request:complete` 事件后 SHALL 使用 500ms debounce 延迟刷新历史列表，避免快速连续发请求时产生大量冗余网络请求。

#### Scenario: 单次请求后历史刷新
- **WHEN** 用户发送一个请求并收到响应
- **THEN** History 面板在 500ms 后自动刷新历史列表

#### Scenario: 快速连续请求去重
- **WHEN** 用户在 500ms 内连续发送多个请求
- **THEN** 只在最后一个请求完成后 500ms 触发一次历史刷新，而非每个请求都刷新一次

#### Scenario: 手动展开面板立即加载
- **WHEN** 用户手动展开 History 面板
- **THEN** 立即加载最新历史记录，不受 debounce 影响
