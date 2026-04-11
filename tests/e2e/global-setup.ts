import { unlinkSync, existsSync, writeFileSync } from 'fs';
import { spawn, execSync } from 'child_process';
import http from 'http';

const testDbFiles = ['test.db', 'test.db-wal', 'test.db-shm'];

function killPortProcess(port: number) {
  try {
    const result = execSync(`fuser ${port}/tcp 2>/dev/null`, { encoding: 'utf-8' }).trim();
    if (result) {
      result.split(/\s+/).forEach(p => {
        try { process.kill(parseInt(p.trim()), 'SIGTERM'); } catch {}
      });
    }
  } catch {
    // 端口未被占用
  }
}

export default async function globalSetup() {
  // 清理残留的测试数据库
  for (const file of testDbFiles) {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }

  // 杀死占用端口的进程
  killPortProcess(4000);
  killPortProcess(3999);

  // 启动 mock 服务器
  const mockServer = spawn('bun', ['run', 'tests/e2e/mock-server.ts'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  mockServer.stdout?.on('data', (d: Buffer) => process.stdout.write(d));
  mockServer.stderr?.on('data', (d: Buffer) => process.stderr.write(d));

  // 等待 mock 服务器就绪
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      mockServer.kill();
      reject(new Error('Mock 服务器启动超时 (30s)'));
    }, 30_000);

    const check = () => {
      http
        .get('http://localhost:4000/', () => {
          clearTimeout(timeout);
          resolve();
        })
        .on('error', () => {
          setTimeout(check, 500);
        });
    };
    check();
  });

  // 将 mock 服务器 PID 写入临时文件
  writeFileSync('.mock-server.pid', String(mockServer.pid!));

  // 启动测试服务器
  const server = spawn('bun', ['run', 'src/index.ts'], {
    env: { ...process.env, DB_PATH: 'test.db', PORT: '3999' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  server.stdout?.on('data', (d: Buffer) => process.stdout.write(d));
  server.stderr?.on('data', (d: Buffer) => process.stderr.write(d));

  // 等待服务器就绪
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.kill();
      reject(new Error('测试服务器启动超时 (30s)'));
    }, 30_000);

    const check = () => {
      http
        .get('http://localhost:3999/', () => {
          clearTimeout(timeout);
          resolve();
        })
        .on('error', () => {
          setTimeout(check, 500);
        });
    };
    check();
  });

  // 将 PID 写入临时文件传递给 teardown
  writeFileSync('.test-server.pid', String(server.pid!));
}
