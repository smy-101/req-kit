import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { Database } from './db/index';
import { ProxyService } from './services/proxy';
import { HistoryService } from './services/history';
import { CollectionService } from './services/collection';
import { EnvService } from './services/environment';
import { ImportExportService } from './services/import-export';
import { ScriptService } from './services/script';
import { VariableService } from './services/variable';
import { createProxyRoutes } from './routes/proxy';
import { createHistoryRoutes } from './routes/history';
import { createCollectionRoutes } from './routes/collections';
import { createEnvironmentRoutes } from './routes/environments';
import { createImportExportRoutes } from './routes/import-export';
import { createGlobalVariableRoutes } from './routes/global-variables';
import { CookieService } from './services/cookie';
import { createCookieRoutes } from './routes/cookies';
import { RunnerService } from './services/runner';
import { createRunnerRoutes } from './routes/runner';
import { errorHandler } from './lib/error-handler';

const db = new Database(process.env.DB_PATH || 'req-kit.db');
db.migrate();

const proxyService = new ProxyService();
const historyService = new HistoryService(db);
const collectionService = new CollectionService(db);
const envService = new EnvService(db);
const variableService = new VariableService(db, envService);
const importExportService = new ImportExportService(db, collectionService, variableService);
const scriptService = new ScriptService();
const cookieService = new CookieService(db);
const runnerService = new RunnerService(collectionService, variableService, historyService, scriptService, proxyService, cookieService);

const app = new Hono();

// Register API routes
app.route('/', createProxyRoutes(proxyService, historyService, variableService, scriptService, cookieService));
app.route('/', createHistoryRoutes(historyService));
app.route('/', createCollectionRoutes(collectionService, variableService));
app.route('/', createEnvironmentRoutes(envService));
app.route('/', createImportExportRoutes(importExportService));
app.route('/', createGlobalVariableRoutes(variableService));
app.route('/', createCookieRoutes(cookieService));
app.route('/', createRunnerRoutes(runnerService));

// 全局错误处理
app.onError(errorHandler);

// Serve static files from src/public (must be last)
app.use('/*', serveStatic({ root: './src/public' }));

const port = process.env.PORT || 3000;
console.log(`req-kit running on http://localhost:${port}`);

// 进程退出时关闭数据库连接，让 SQLite 自动清理 WAL 文件
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    db.close();
    process.exit(0);
  });
}

export default {
  port: Number(port),
  fetch: app.fetch,
};

export { db, app };
