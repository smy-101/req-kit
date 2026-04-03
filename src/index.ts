import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { Database } from './db/index';
import { ProxyService } from './services/proxy';
import { HistoryService } from './services/history';
import { CollectionService } from './services/collection';
import { EnvService } from './services/environment';
import { ImportExportService } from './services/import-export';
import { ScriptService } from './services/script';
import { createProxyRoutes } from './routes/proxy';
import { createHistoryRoutes } from './routes/history';
import { createCollectionRoutes } from './routes/collections';
import { createEnvironmentRoutes } from './routes/environments';
import { createImportExportRoutes } from './routes/import-export';

const db = new Database('req-kit.db');
db.migrate();

const proxyService = new ProxyService();
const historyService = new HistoryService(db);
const collectionService = new CollectionService(db);
const envService = new EnvService(db);
const importExportService = new ImportExportService(db, collectionService);
const scriptService = new ScriptService();

const app = new Hono();

// Register API routes
app.route('/', createProxyRoutes(proxyService, historyService, envService, scriptService));
app.route('/', createHistoryRoutes(historyService));
app.route('/', createCollectionRoutes(collectionService));
app.route('/', createEnvironmentRoutes(envService));
app.route('/', createImportExportRoutes(importExportService));

// Serve static files from src/public (must be last)
app.use('/*', serveStatic({ root: './src/public' }));

const port = process.env.PORT || 3000;
console.log(`req-kit running on http://localhost:${port}`);

export default {
  port: Number(port),
  fetch: app.fetch,
};

export { db, app };
