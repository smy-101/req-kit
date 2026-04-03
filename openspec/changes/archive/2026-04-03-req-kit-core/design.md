## 背景

当前项目是一个空的 Hono + Bun 初始化项目，只有一个 Hello World 路由。需要从零构建一个完整的 API 测试工具（req-kit），包含代理转发、请求管理、环境变量、脚本执行等功能。

核心约束：
- 运行时为 Bun，数据库使用内置的 `bun:sqlite`
- 前端零框架，纯 HTML + Vanilla JS，不引入任何前端构建工具
- 所有数据持久化在 SQLite 中，无外部服务依赖

## 目标 / 非目标

**目标：**
- 提供类似 Postman 核心功能的自托管 API 测试工具
- 通过 Hono 代理绕过浏览器 CORS 限制
- 支持流式响应传输（SSE），处理大响应体和流式 API
- 支持在 Bun VM 沙箱中安全执行预请求脚本
- 支持环境变量管理和 `{{variable}}` 模板替换
- 支持导入/导出 Postman Collection v2.1 格式和 curl 命令
- 所有后端功能通过红绿测试保障

**非目标：**
- 多用户/团队协作功能
- 云端同步
- 移动端适配
- API Mock 服务
- 自动化测试调度（类似 Postman Runner）
- 插件/扩展系统

## 决策

### 1. 代理模式：Hono 全权代理 vs. 仅 CORS 代理

**选择：Hono 全权代理**

所有请求通过 `POST /api/proxy` 发送，Hono 在服务端发起实际 HTTP 请求并返回结果。

理由：
- 完全绕过 CORS，浏览器端无需处理跨域
- 代理层可统一记录历史、注入认证、执行预请求脚本
- 流式传输只需在服务端处理 ReadableStream，浏览器通过 SSE 接收

替代方案：浏览器直接请求 + CORS 代理头。问题：无法控制目标服务器的 CORS 设置。

### 2. 流式传输：SSE vs. WebSocket vs. 分块 JSON

**选择：Server-Sent Events (SSE)**

理由：
- SSE 是单向数据流，天然适合"服务端 → 浏览器"的响应传输场景
- 浏览器原生支持 `EventSource` API，无需额外库
- 比 WebSocket 更轻量，不需要握手和双向通道
- 流式结束后自动关闭连接

替代方案：WebSocket（过重，需要双向通道）／分块 JSON（需要自行解析边界）。

### 3. 前端状态管理：事件发射器 vs. Proxy 观察

**选择：自定义事件发射器 (EventEmitter)**

```javascript
// store.js 核心模式
const store = {
  state: { ... },
  listeners: {},
  on(event, fn) { ... },
  emit(event, data) { ... },
  setState(updates) {
    Object.assign(this.state, updates);
    this.emit('change', this.state);
  }
};
```

理由：
- 零依赖，纯 JS 实现
- 概念简单，所有组件通过 `store.on('event', handler)` 响应变化
- 比 Proxy 观察模式更容易调试

替代方案：`Proxy` 响应式。问题：增加调试难度，且对纯 HTML 项目来说过度设计。

### 4. 预请求脚本执行：Bun VM vs. isolated-vm vs. 受限 DSL

**选择：Bun VM (`node:vm`) 沙箱**

理由：
- Bun 内置支持，无需额外依赖
- 可精确控制沙箱上下文中暴露的 API
- 支持 `timeout` 选项防止无限循环

安全措施：
- 沙箱上下文不暴露 `require`、`import`、`process`、`globalThis`、`eval`、`Function`
- 只提供 `environment`（只读）、`request`（操作对象）、`console`、`JSON`、`Date`、`Math`
- 设置 5 秒执行超时

替代方案：isol-vm（需要 C++ 编译，Bun 兼容性未知）／受限 DSL（灵活度不够）。

### 5. 数据库访问：原始 SQL vs. ORM

**选择：原始 SQL + 轻量封装**

```typescript
// db/index.ts 模式
class Database {
  private db: BunSQLite.Database;

  query<T>(sql: string, params?: unknown[]): T[] { ... }
  run(sql: string, params?: unknown[]): { changes: number } { ... }
}
```

理由：
- `bun:sqlite` API 已经足够简洁，不需要 ORM
- 原始 SQL 性能最优，且表结构简单
- 避免引入额外依赖

替代方案：Drizzle ORM。问题：增加依赖和抽象层，对于 5 张简单表来说过度。

### 6. 文件服务：Hono serveStatic vs. 外部静态服务器

**选择：Hono `serveStatic` 中间件**

理由：
- 开发和生产使用同一套方案
- 不需要额外的静态文件服务器

### 7. 测试策略：路由级集成测试 vs. 服务级单元测试

**选择：服务级单元测试 + 路由级集成测试**

```
测试层次：
├── tests/
│   ├── unit/                    # 服务层单元测试
│   │   ├── proxy.test.ts        # ProxyService
│   │   ├── history.test.ts      # HistoryService
│   │   ├── collection.test.ts   # CollectionService
│   │   ├── environment.test.ts  # EnvService
│   │   ├── script.test.ts       # ScriptService
│   │   └── import-export.test.ts # ImportExportService
│   └── integration/             # 路由级集成测试
│       ├── proxy.test.ts        # POST /api/proxy
│       ├── history.test.ts      # /api/history CRUD
│       ├── collections.test.ts  # /api/collections CRUD
│       ├── environments.test.ts # /api/environments CRUD
│       └── import-export.test.ts # /api/import, /api/export
```

理由：
- 服务层测试隔离业务逻辑，可使用内存 SQLite
- 路由层测试验证 HTTP 行为（状态码、响应格式、参数校验）
- 红绿测试：先写失败测试 → 实现 → 测试通过

## 风险 / 权衡

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Bun VM 沙箱可能存在逃逸漏洞 | 高 | 限制上下文白名单、设置超时、不暴露任何系统 API |
| SSE 流式传输对大响应体（>100MB）可能导致内存压力 | 中 | 设置最大响应大小限制（默认 50MB），超限截断并警告 |
| 纯 HTML 前端代码量增长后难以维护 | 中 | 严格模块化，每个组件独立文件，通过 Store 解耦 |
| SQLite 并发写入（多个请求同时记录历史） | 低 | Bun 单线程模型，SQLite WAL 模式 |
| 导入 Postman Collection 格式兼容性 | 中 | 仅支持 v2.1 格式（最新），不支持 v1.0 旧格式 |
