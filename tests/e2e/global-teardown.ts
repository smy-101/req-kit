import { readFileSync } from 'fs';

export default async function globalTeardown() {
  // 关闭 mock 服务器
  try {
    const mockPid = Number(readFileSync('.mock-server.pid', 'utf-8').trim());
    if (mockPid) {
      process.kill(mockPid, 'SIGTERM');
    }
  } catch {
    // PID 文件不存在或进程已退出
  }

  // app server 由每个 worker 的 fixture 自动清理，这里不再处理
}
