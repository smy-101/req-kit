---
name: req-kit-core
status: exploring
created: 2026-04-03
---

# req-kit — 自托管 API 测试工具

## 概述

构建一个类似 Postman 的 API 测试工具，使用纯 HTML + Vanilla JS 作为前端操作界面，Hono 作为后端代理服务器，SQLite 持久化数据。所有功能自包含，零外部依赖（无需浏览器插件、无需外部服务）。

## 技术栈

- **运行时**: Bun
- **后端**: Hono (HTTP 框架)
- **数据库**: bun:sqlite (SQLite)
- **前端**: 纯 HTML + Vanilla JS + CSS（零框架）
- **前端架构**: 事件驱动 Store + 组件化模块

## 核心架构

```
┌────────────────────────────────────────────────────────────────┐
│  浏览器 (纯 HTML + Vanilla JS)                                  │
│                                                                 │
│  ┌─ Store (事件驱动状态管理) ─────────────────────────────────┐ │
│  │  • 当前请求/响应状态                                        │ │
│  │  • UI 状态 (active tab, active collection, modals)         │ │
│  │  • 环境变量                                                │ │
│  │  store.on('event', handler) → 驱动 UI 更新                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ 组件层 ──────────────────────────────────────────────────┐ │
│  │  UrlBar │ HeadersPanel │ BodyEditor │ ResponseViewer       │ │
│  │  Sidebar(集合树) │ EnvManager │ AuthPanel │ ImportExport   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ API 层 ──────────────────────────────────────────────────┐ │
│  │  api.sendRequest() / api.getCollections() / api.save()     │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
                          │
                          │ fetch('/api/...')
                          ▼
┌────────────────────────────────────────────────────────────────┐
│  Hono 后端                                                      │
│                                                                 │
│  ┌─ 路由 ────────────────────────────────────────────────────┐ │
│  │  /                 → 提供 HTML/CSS/JS 静态文件             │ │
│  │  /api/proxy        → 代理转发（支持流式传输）               │ │
│  │  /api/history      → 请求历史 CRUD                         │ │
│  │  /api/collections  → 集合管理 CRUD                         │ │
│  │  /api/environments → 环境变量 CRUD                         │ │
│  │  /api/import       → 导入 (Postman Collection / curl)      │ │
│  │  /api/export       → 导出 (Postman Collection v2.1)        │ │
│  │  /api/ws           → WebSocket 代理                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ 服务层 ──────────────────────────────────────────────────┐ │
│  │  ProxyService     → 流式代理转发                           │ │
│  │  ScriptService    → Bun VM 沙箱执行预请求脚本              │ │
│  │  HistoryService   → 历史记录管理                           │ │
│  │  CollectionService→ 集合管理                               │ │
│  │  EnvService       → 环境变量 + 变量替换                     │ │
│  │  ImportExportService → 格式转换                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ 数据层 ──────────────────────────────────────────────────┐ │
│  │  bun:sqlite → environments / collections / saved_requests  │ │
│  │              / history / env_variables                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

## 数据模型

```sql
-- 环境变量组
CREATE TABLE environments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE env_variables (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    environment_id  INTEGER NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    key             TEXT NOT NULL,
    value           TEXT,
    enabled         INTEGER DEFAULT 1
);

-- 集合（支持嵌套文件夹，parent_id 为 NULL 表示顶层）
CREATE TABLE collections (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    parent_id   INTEGER REFERENCES collections(id),
    sort_order  INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
);

-- 保存的请求模板
CREATE TABLE saved_requests (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id       INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    method              TEXT DEFAULT 'GET',
    url                 TEXT,
    headers             TEXT,              -- JSON
    params              TEXT,              -- JSON
    body                TEXT,
    body_type           TEXT DEFAULT 'json', -- json | form | text | xml | binary | none
    auth_type           TEXT DEFAULT 'none', -- none | bearer | basic | apikey | oauth2
    auth_config         TEXT,              -- JSON
    pre_request_script  TEXT,              -- JS 代码，服务端执行
    sort_order          INTEGER DEFAULT 0,
    updated_at          TEXT DEFAULT (datetime('now'))
);

-- 请求历史
CREATE TABLE history (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    method            TEXT NOT NULL,
    url               TEXT NOT NULL,
    request_headers   TEXT,               -- JSON
    request_params    TEXT,               -- JSON
    request_body      TEXT,
    status            INTEGER,
    response_headers  TEXT,               -- JSON
    response_body     TEXT,
    response_time     INTEGER,            -- 毫秒
    response_size     INTEGER,            -- bytes
    created_at        TEXT DEFAULT (datetime('now'))
);
```

## 代理机制（流式传输）

```
浏览器                         Hono 代理                      目标服务器
  │                               │                               │
  │  POST /api/proxy              │                               │
  │  { url, method, headers,      │                               │
  │    body, stream: true }       │                               │
  │──────────────────────────────▶│                               │
  │                               │  发起 fetch 到目标             │
  │                               │──────────────────────────────▶│
  │                               │                               │
  │  SSE 事件流                   │  ReadableStream               │
  │  event: headers               │◀──────────────────────────────│
  │  data: { status, headers }    │                               │
  │◀──────────────────────────────│                               │
  │                               │                               │
  │  event: chunk                 │  逐块读取                     │
  │  data: { chunk, size }        │                               │
  │◀──────────────────────────────│                               │
  │  ...                          │                               │
  │                               │                               │
  │  event: done                  │                               │
  │  data: { totalTime, size }    │                               │
  │◀──────────────────────────────│                               │
```

代理路由使用 Server-Sent Events (SSE) 向浏览器推送流式数据，同时 Hono 用 `fetch` 的 ReadableStream 逐块读取目标响应。

对于非流式请求（`stream: false` 或普通小请求），回退到一次性 JSON 响应。

## 预请求脚本（Bun VM 沙箱）

```typescript
// 执行模型
import { VM } from 'vm';

// 为脚本提供受控的上下文
const context = {
  // 只读环境变量
  environment: { baseUrl: '...', token: '...' },
  // 请求操作
  request: {
    setHeader(key: string, value: string): void,
    setBody(data: string): void,
    setParam(key: string, value: string): void,
  },
  // 工具函数
  console: { log: (...args) => void },
  // 时间工具
  Date,
  Math,
  JSON,
  // 禁止: require, import, process, globalThis, eval, Function
};
```

脚本在 Bun VM 沙箱中执行，无法访问文件系统、网络或 Node/Bun API，只能通过受限上下文修改请求。

## API 路由设计

### 代理核心

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/proxy` | 转发请求到目标，支持流式 (SSE) 和非流式 |

请求体:
```json
{
  "url": "https://api.example.com/users",
  "method": "GET",
  "headers": { "Authorization": "Bearer ..." },
  "params": { "page": "1" },
  "body": "{ \"name\": \"test\" }",
  "stream": true
}
```

### 请求历史

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/history?page=1&limit=50` | 分页获取历史列表 |
| GET | `/api/history/:id` | 获取单条历史详情 |
| DELETE | `/api/history/:id` | 删除单条 |
| DELETE | `/api/history` | 清空全部历史 |

### 集合管理

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/collections` | 获取所有集合（树形结构） |
| POST | `/api/collections` | 创建集合/文件夹 |
| PUT | `/api/collections/:id` | 更新集合名称等 |
| DELETE | `/api/collections/:id` | 删除集合（级联删除子项） |
| PATCH | `/api/collections/:id/move` | 移动集合（更改 parent_id） |
| POST | `/api/collections/:id/requests` | 往集合添加请求 |
| PUT | `/api/collections/:id/requests/:rid` | 更新请求 |
| DELETE | `/api/collections/:id/requests/:rid` | 删除请求 |

### 环境变量

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/environments` | 获取所有环境 + 变量 |
| POST | `/api/environments` | 创建环境 |
| PUT | `/api/environments/:id` | 更新环境 |
| DELETE | `/api/environments/:id` | 删除环境 |
| PUT | `/api/environments/:id/variables` | 批量更新变量 |

### 导入导出

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/import` | 导入 (Postman Collection v2.1 / curl 命令) |
| GET | `/api/export/collections/:id` | 导出为 Postman Collection v2.1 |
| GET | `/api/export/requests/:id/curl` | 导出为 curl 命令 |

## 前端文件结构

```
src/
├── index.ts                  # Hono 应用入口 + 路由注册
├── db/
│   ├── index.ts              # SQLite 初始化 + 迁移
│   └── schema.sql            # 建表语句
├── services/
│   ├── proxy.ts              # 代理转发（流式）
│   ├── script.ts             # Bun VM 预请求脚本执行
│   ├── history.ts            # 历史记录 CRUD
│   ├── collection.ts         # 集合管理
│   ├── environment.ts        # 环境变量 + 模板替换 {{var}}
│   └── import-export.ts      # 导入导出转换
├── routes/
│   ├── proxy.ts              # 代理路由
│   ├── history.ts            # 历史路由
│   ├── collections.ts        # 集合路由
│   ├── environments.ts       # 环境变量路由
│   └── import-export.ts      # 导入导出路由
└── public/                   # 静态文件 (Hono serveStatic)
    ├── index.html            # 主页面
    ├── css/
    │   └── style.css         # 全部样式
    └── js/
        ├── app.js            # 入口，初始化所有组件
        ├── store.js          # 事件驱动状态管理
        ├── api.js            # 后端 API 调用封装
        ├── components/
        │   ├── url-bar.js        # URL 输入 + Method 选择 + Send
        │   ├── tab-panel.js      # Headers / Params / Body / Auth 选项卡
        │   ├── headers-editor.js # Key-Value headers 编辑器
        │   ├── body-editor.js    # 请求体编辑（JSON 格式化）
        │   ├── auth-panel.js     # 认证配置面板
        │   ├── response-viewer.js # 响应展示（状态码/头/体/耗时）
        │   ├── sidebar.js        # 集合树 + 文件夹
        │   ├── env-manager.js    # 环境变量管理
        │   ├── import-export.js  # 导入导出对话框
        │   └── script-editor.js  # 预请求脚本编辑
        └── utils/
            ├── json-format.js    # JSON 语法高亮/格式化
            ├── curl-parser.js    # curl 命令解析
            └── template.js       # {{variable}} 替换
```

## 分阶段实施计划

### Phase 1 — 核心代理 + 基础 UI

目标：能发送请求、看到响应

- [ ] SQLite 初始化 + schema 创建 (`src/db/`)
- [ ] 代理服务 `POST /api/proxy`（非流式先行，流式后补） (`src/services/proxy.ts`)
- [ ] Hono 静态文件服务，提供 `public/index.html`
- [ ] 前端基础 UI：URL 栏 + Method 选择 + Send 按钮
- [ ] Headers 编辑器 (Key-Value 对)
- [ ] Body 编辑器（JSON 格式化）
- [ ] 响应面板（状态码 + 响应头 + 格式化响应体 + 耗时）
- [ ] Store 状态管理 + 组件事件绑定

### Phase 2 — 历史记录 + 集合管理

目标：能保存和复用请求

- [ ] 历史记录 API (`GET/DELETE /api/history`)
- [ ] 代理请求自动存入历史
- [ ] 历史列表面板，点击可重新加载到请求编辑器
- [ ] 集合 CRUD API (`/api/collections/*`)
- [ ] 侧边栏集合树（支持文件夹嵌套、拖拽排序）
- [ ] 保存请求到集合 / 从集合加载请求
- [ ] 流式代理传输（SSE）

### Phase 3 — 环境变量 + 认证 + 导入导出

目标：多环境支持和外部协作

- [ ] 环境变量管理 UI + API
- [ ] `{{variable}}` 模板替换（URL、Headers、Body 中）
- [ ] 环境切换下拉框
- [ ] Auth 面板：Bearer Token / Basic Auth / API Key / OAuth2
- [ ] 导入：curl 命令 → 请求
- [ ] 导入：Postman Collection v2.1 → 集合
- [ ] 导出：集合 → Postman Collection v2.1
- [ ] 导出：请求 → curl 命令

### Phase 4 — 高级功能

目标：对齐 Postman 核心体验

- [ ] 预请求脚本编辑器 + Bun VM 沙箱执行
- [ ] Cookie 管理（代理自动携带/存储）
- [ ] WebSocket 代理（`/api/ws`）
- [ ] 代码生成（curl / fetch / axios / httpie）
- [ ] 请求历史搜索/过滤
- [ ] 响应断言/测试（类似 Postman Tests）
