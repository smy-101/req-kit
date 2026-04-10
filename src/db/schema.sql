-- req-kit database schema

-- 环境变量组
CREATE TABLE IF NOT EXISTS environments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
);

-- 环境变量
CREATE TABLE IF NOT EXISTS env_variables (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    environment_id  INTEGER NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    key             TEXT NOT NULL,
    value           TEXT,
    enabled         INTEGER DEFAULT 1
);

-- 集合（支持嵌套文件夹，parent_id 为 NULL 表示顶层）
CREATE TABLE IF NOT EXISTS collections (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    parent_id   INTEGER REFERENCES collections(id),
    sort_order  INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
);

-- 保存的请求模板
CREATE TABLE IF NOT EXISTS saved_requests (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id       INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    method              TEXT DEFAULT 'GET',
    url                 TEXT,
    headers             TEXT,
    params              TEXT,
    body                TEXT,
    body_type           TEXT DEFAULT 'json',
    auth_type           TEXT DEFAULT 'none',
    auth_config         TEXT,
    pre_request_script  TEXT,
    post_response_script TEXT,
    sort_order          INTEGER DEFAULT 0,
    updated_at          TEXT DEFAULT (datetime('now'))
);

-- 请求历史
CREATE TABLE IF NOT EXISTS history (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    method            TEXT NOT NULL,
    url               TEXT NOT NULL,
    request_headers   TEXT,
    request_params    TEXT,
    request_body      TEXT,
    body_type          TEXT DEFAULT 'json',
    pre_request_script TEXT,
    post_response_script TEXT,
    auth_type         TEXT DEFAULT 'none',
    auth_config       TEXT,
    status            INTEGER,
    response_headers  TEXT,
    response_body     TEXT,
    response_time     INTEGER,
    response_size     INTEGER,
    created_at        TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at);

-- 全局变量（始终生效，优先级最低）
CREATE TABLE IF NOT EXISTS global_variables (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    key     TEXT NOT NULL UNIQUE,
    value   TEXT,
    enabled INTEGER DEFAULT 1
);

-- 集合变量（绑定到根集合，跟随集合级联删除）
CREATE TABLE IF NOT EXISTS collection_variables (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id  INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    key            TEXT NOT NULL,
    value          TEXT,
    enabled        INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_coll_vars_coll_id ON collection_variables(collection_id);

-- Cookie Jar
CREATE TABLE IF NOT EXISTS cookies (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    domain      TEXT NOT NULL,
    path        TEXT NOT NULL DEFAULT '/',
    name        TEXT NOT NULL,
    value       TEXT NOT NULL,
    expires_at  TEXT,
    http_only   INTEGER DEFAULT 0,
    secure      INTEGER DEFAULT 0,
    same_site   TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cookies_unique ON cookies(domain, path, name);
