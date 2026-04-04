# req-kit

自托管 API 测试工具，类似 Postman 核心功能。纯 HTML + Vanilla JS 前端，Hono 后端代理，SQLite 持久化，零外部依赖。

## 功能

- **多 Tab 请求** — 同时打开多个请求，每个 Tab 独立持有完整的请求配置和响应数据，切换时不丢失状态
- **代理转发** — 通过服务端代理绕过 CORS，支持 GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS
- **流式传输** — SSE 流式代理，实时接收大响应体
- **请求历史** — 自动记录所有请求，分页浏览、查看详情、删除
- **集合管理** — 树形文件夹结构，保存/加载/组织请求
- **环境变量** — 多环境切换，`{{variable}}` 模板自动替换
- **认证注入** — Bearer Token / Basic Auth / API Key 自动注入
- **预请求脚本** — 在 VM 沙箱中执行 JavaScript，支持 setHeader/setBody/setParam
- **导入导出** — curl 命令和 Postman Collection v2.1 格式

## 技术栈

- **运行时**: Bun
- **后端**: Hono
- **数据库**: bun:sqlite
- **前端**: 纯 HTML + Vanilla JS + CSS

## 快速开始

```sh
bun install
bun run dev
```

打开 http://localhost:3000

## 项目结构

```
src/
├── index.ts                  # Hono 应用入口
├── db/
│   ├── schema.sql            # 建表语句
│   └── index.ts              # SQLite 初始化与封装
├── services/
│   ├── proxy.ts              # 流式代理转发
│   ├── history.ts            # 历史记录管理
│   ├── collection.ts         # 集合与文件夹管理
│   ├── environment.ts        # 环境变量与模板替换
│   ├── auth.ts               # 认证注入
│   ├── script.ts             # VM 沙箱脚本执行
│   └── import-export.ts      # 导入导出转换
├── routes/
│   ├── proxy.ts              # POST /api/proxy
│   ├── history.ts            # /api/history CRUD
│   ├── collections.ts        # /api/collections CRUD
│   ├── environments.ts       # /api/environments CRUD
│   └── import-export.ts      # /api/import, /api/export
└── public/                   # 静态前端文件
    ├── index.html
    ├── css/style.css
    └── js/
        ├── app.js            # 入口
        ├── store.js          # 事件驱动状态管理（多 Tab）
        ├── api.js            # 后端 API 封装
        ├── components/       # UI 组件
        │   ├── tab-bar.js    # 多 Tab 栏
        │   ├── sidebar.js    # 侧边栏集合树
        │   └── ...           # 其他组件
        └── utils/            # 工具函数
```

## API 路由

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/proxy` | 代理转发（支持 SSE 流式） |
| GET | `/api/history` | 分页获取历史 |
| GET | `/api/history/:id` | 获取历史详情 |
| DELETE | `/api/history/:id` | 删除单条历史 |
| DELETE | `/api/history` | 清空历史 |
| GET | `/api/collections` | 获取集合树 |
| POST | `/api/collections` | 创建集合/文件夹 |
| PUT | `/api/collections/:id` | 更新集合 |
| DELETE | `/api/collections/:id` | 删除集合（级联） |
| PATCH | `/api/collections/:id/move` | 移动集合 |
| POST | `/api/collections/:id/requests` | 添加请求 |
| PUT | `/api/collections/:id/requests/:rid` | 更新请求 |
| DELETE | `/api/collections/:id/requests/:rid` | 删除请求 |
| GET | `/api/environments` | 获取所有环境 |
| POST | `/api/environments` | 创建环境 |
| PUT | `/api/environments/:id` | 更新环境 |
| DELETE | `/api/environments/:id` | 删除环境（级联） |
| PUT | `/api/environments/:id/variables` | 批量更新变量 |
| POST | `/api/import` | 导入 curl / Postman Collection |
| GET | `/api/export/collections/:id` | 导出为 Postman Collection v2.1 |
| GET | `/api/export/requests/:id/curl` | 导出为 curl 命令 |
