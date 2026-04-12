import { test as base, expect } from '@playwright/test';
import { spawn } from 'child_process';
import { unlinkSync, existsSync } from 'fs';
import http from 'http';

const MAX_WORKERS = 20;

function waitForServer(port: number, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Worker server on port ${port} failed to start within ${timeoutMs}ms`));
    }, timeoutMs);

    const check = () => {
      http
        .get(`http://localhost:${port}/`, () => {
          clearTimeout(timer);
          resolve();
        })
        .on('error', () => {
          setTimeout(check, 300);
        });
    };
    check();
  });
}

function cleanupDb(dbPath: string) {
  for (const ext of ['', '-wal', '-shm']) {
    const file = `${dbPath}${ext}`;
    if (existsSync(file)) {
      try { unlinkSync(file); } catch {}
    }
  }
}

// Worker-scoped fixture：每个 worker 启动独立 app server
const test = base.extend({
  _workerServer: [async ({}, use, workerInfo) => {
    const workerIndex = workerInfo.workerIndex;
    const port = 4001 + workerIndex;
    const dbPath = `test-worker-${workerIndex}.db`;

    const server = spawn('bun', ['run', 'src/index.ts'], {
      env: { ...process.env, DB_PATH: dbPath, PORT: String(port) },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    server.stdout?.on('data', (d: Buffer) => process.stderr.write(d));
    server.stderr?.on('data', (d: Buffer) => process.stderr.write(d));

    await waitForServer(port);

    await use({ url: `http://localhost:${port}`, server, dbPath });

    // 清理 app server 和 DB 文件
    server.kill();
    cleanupDb(dbPath);
  }, { scope: 'worker' }],

  // Test-scoped：透传 worker server URL 给 baseURL
  baseURL: async ({ _workerServer }, use) => {
    await use(_workerServer.url);
  },
});

export { test, expect };
