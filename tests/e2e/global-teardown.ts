import { unlinkSync, existsSync } from 'fs';

const testDbFiles = ['test.db', 'test.db-wal', 'test.db-shm'];

export default async function globalTeardown() {
  for (const file of testDbFiles) {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }
}
