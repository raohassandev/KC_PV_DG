import {
  appendFileSync,
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

/** Write JSON atomically (temp + fsync + rename) to survive crash mid-write. */
export function writeJsonAtomic(filePath: string, data: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const body = `${JSON.stringify(data, null, 2)}\n`;
  writeFileSync(tmp, body, 'utf8');
  const fd = openSync(tmp, 'r+');
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, filePath);
}

/** Append one JSON line to audit log with fsync (best-effort durability). */
export function appendAuditLine(configDir: string, record: Record<string, unknown>): void {
  mkdirSync(configDir, { recursive: true });
  const path = join(configDir, 'audit.log');
  const line = `${JSON.stringify(record)}\n`;
  const fd = openSync(path, 'a', 0o644);
  try {
    appendFileSync(fd, line);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
