import { unlinkSync, existsSync, writeFileSync, readdirSync } from 'fs';
import { spawn, execSync } from 'child_process';
import http from 'http';

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
  // 清理残留的 worker 测试数据库
  for (const file of readdirSync('.')) {
    if (/^test-worker-\d+\.db(-wal|-shm)?$/.test(file)) {
      try { unlinkSync(file); } catch {}
    }
  }

  // 杀死可能残留的进程：mock(4000) + app servers(4001-4020)
  killPortProcess(4000);
  for (let i = 4001; i <= 4020; i++) {
    killPortProcess(i);
  }

  // 启动 mock 服务器（全局共享，无状态）
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

  writeFileSync('.mock-server.pid', String(mockServer.pid!));
}
