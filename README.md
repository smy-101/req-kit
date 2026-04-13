# req-kit

自托管 API 测试工具，类似 Postman 核心功能。纯 HTML + Vanilla JS 前端，Hono 后端代理，SQLite 持久化，零外部前端依赖。

## 功能

- **多 Tab 请求** — 同时打开多个请求，切换不丢失状态
- **代理转发** — 服务端代理绕过 CORS，支持 GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS
- **SSE 流式传输** — 实时接收大响应体
- **请求历史** — 自动记录，分页浏览、搜索、重放
- **集合管理** — 树形文件夹结构，保存/组织请求
- **四级变量系统** — 全局 → 环境 → 集合 → 运行时，`{{variable}}` 自动替换，带自动补全和预览
- **认证注入** — Bearer Token / Basic Auth / API Key
- **预请求脚本** — VM 沙箱执行 JS，支持 setHeader/setBody/setParam 及变量读写
- **后置脚本（Tests）** — 断言测试与变量提取
- **集合运行器** — 按顺序执行集合内请求，支持重试，SSE 实时推送进度
- **Cookie 管理** — 自动存储代理响应的 Cookie，按域名查询/删除
- **导入导出** — curl 命令和 Postman Collection v2.1 格式

## 快速开始

**前提**：安装 [Bun](https://bun.sh/)

```sh
bun install
bun run dev
```

打开 http://localhost:3000

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 服务端口 |
| `DB_PATH` | `req-kit.db` | SQLite 数据库文件路径 |

### 生产构建

```sh
bun run build   # 构建前端资源到 src/public/dist/
bun run src/index.ts
```

构建会生成压缩后的 `dist/bundle.css` 和 `dist/bundle.js`。

## 技术栈

Bun · Hono · bun:sqlite · 纯 HTML + Vanilla JS + CSS

## 变量系统

四级作用域，高优先级覆盖低优先级：**全局 < 环境 < 集合 < 运行时**

| 作用域 | 管理位置 |
|--------|----------|
| **Global** | URL 栏眼睛图标 → 管理全局变量 |
| **Environment** | 侧边栏环境管理，切换环境时变量随之切换 |
| **Collection** | 集合右键菜单 → 编辑集合变量（绑定根集合） |
| **Runtime** | 预请求脚本中 `variables.set()` 动态设置，仅当前请求生效 |

**引用语法**：在 URL、Headers、Params、Body 中使用 `{{变量名}}`。输入 `{{` 触发自动补全。

**替换流程**：模板替换 → 预请求脚本（可设置运行时变量） → 二次替换 → 认证注入 → 代理转发

**脚本 API**：

| API | 说明 |
|-----|------|
| `variables.get(key)` | 按优先级查找变量值 |
| `variables.set(key, value)` | 设置运行时变量 |
| `environment` | 当前环境变量快照（只读） |

## 项目结构

```
src/
├── index.ts              # 入口：创建 DB、实例化服务、注册路由、serve static
├── db/
│   ├── schema.sql        # 建表语句
│   └── index.ts          # Database 类（query/queryOne/run）
├── services/             # 业务逻辑，封装 SQL
├── routes/               # 薄路由层，委托给 service
└── public/               # 静态前端
    ├── index.html
    ├── css/
    │   ├── index.css       # 入口样式
    │   └── ...             # 按功能拆分的模块样式
    └── js/
        ├── app.js        # 入口 + 快捷键
        ├── store.js      # 事件驱动状态管理（on/off/emit/setState）
        ├── api.js        # 后端 API 封装
        ├── components/   # UI 组件
        └── utils/        # 工具函数
```

**分层**：Routes → Services → Database。路由工厂通过函数参数接收服务实例，无 DI 框架。

## API 路由

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/proxy` | 代理转发（SSE 流式） |
| GET/DELETE | `/api/history[/:id]` | 历史记录查询/删除 |
| * | `/api/collections[/:id][/...]` | 集合树 CRUD、请求管理、集合变量 |
| * | `/api/environments[/:id][/variables]` | 环境 CRUD、变量管理 |
| GET/PUT | `/api/global-variables` | 全局变量 |
| GET/DELETE | `/api/cookies[/:id]` | Cookie 查询/删除 |
| POST | `/api/runners/run` | 集合运行器（SSE 实时进度） |
| POST | `/api/import` | 导入 curl / Postman Collection |
| GET | `/api/export/collections/:id` | 导出 Postman Collection v2.1 |
| GET | `/api/export/requests/:id/curl` | 导出 curl 命令 |

## 测试

```sh
bun test                 # 单元测试 + 集成测试
bun test tests/unit/     # 仅单元测试
bun run test:e2e         # Playwright E2E 测试（自动启停测试服务器）
```
