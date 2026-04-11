import { unlinkSync, existsSync, readFileSync } from 'fs';

const testDbFiles = ['test.db', 'test.db-wal', 'test.db-shm'];

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

  // 关闭测试服务器
  try {
    const pid = Number(readFileSync('.test-server.pid', 'utf-8').trim());
    if (pid) {
      process.kill(pid, 'SIGTERM');
    }
  } catch {
    // PID 文件不存在或进程已退出
  }

  // 清理测试数据库和 PID 文件
  for (const file of [...testDbFiles, '.test-server.pid', '.mock-server.pid']) {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }
}
