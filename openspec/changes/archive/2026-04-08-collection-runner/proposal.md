## Why

req-kit 已具备完整的单次请求测试能力（脚本系统、变量系统、Cookie 管理等），但缺少**批量执行**能力。用户无法一键运行整个集合来验证 API 端到端流程，也无法利用脚本系统的 `variables.set()` 在请求间传递数据（如登录获取 token → 后续请求携带 token）。集合运行器是 API 测试工具的核心差异化功能，也是让现有脚本系统价值倍增的关键。

## What Changes

- 新增集合运行器服务，支持按 DFS 顺序执行集合内所有请求
- 通过 SSE 实时推送每个请求的执行进度和结果
- 运行时变量在请求间自动传递（`variables.set()` 的值传递给后续请求）
- 侧边栏集合项新增 ▶ 运行按钮
- 新增运行器面板（Modal），展示进度、逐请求结果和测试断言汇总
- 支持停止正在运行的集合
- 提取代理管道核心逻辑为共享函数，供单次请求和运行器复用

## 非目标

- 运行结果持久化到数据库（后续可扩展）
- 请求间延迟/等待配置
- 并行执行请求
- 选择性运行部分请求（只运行勾选的请求）
- CI/CD 命令行运行器

## Capabilities

### New Capabilities
- `collection-runner`: 集合运行器后端服务 — DFS 遍历集合、顺序执行请求、变量传递、SSE 推送、停止控制
- `runner-ui`: 集合运行器前端界面 — 运行器面板 Modal、进度展示、逐请求结果、测试断言展开、停止按钮

### Modified Capabilities
- `proxy`: 提取代理管道核心逻辑为共享函数 `executeRequestPipeline()`，供 `/api/proxy` 和集合运行器共同复用
- `collections`: 侧边栏集合项新增运行按钮入口

## Impact

- **后端新增**: `src/services/runner.ts`、`src/routes/runner.ts`
- **后端修改**: `src/routes/proxy.ts`（提取共享管道函数）、`src/index.ts`（注册新路由）
- **前端新增**: `src/public/js/components/runner-panel.js`
- **前端修改**: `src/public/js/components/sidebar.js`（运行按钮）、`src/public/js/api.js`（新 API）、`src/public/js/app.js`（引入组件）、`src/public/index.html`（引入脚本）
- **无数据库变更**: 运行结果通过 SSE 实时推送，不做持久化
