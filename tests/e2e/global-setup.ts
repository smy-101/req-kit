import { unlinkSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import http from 'http';

const testDbFiles = ['test.db', 'test.db-wal', 'test.db-shm'];

export default async function globalSetup() {
  // 清理残留的测试数据库
  for (const file of testDbFiles) {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }

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
  const { writeFileSync } = await import('fs');
  writeFileSync('.test-server.pid', String(server.pid!));
}
