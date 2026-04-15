import fs from 'node:fs';
import path from 'node:path';
import { buildSnapshot } from './fixtures';
import type { ApiSnapshotResponse } from '../api_contract';

export type DeviceServiceStorage = {
  rootDir: string;
  stateFile: string;
  load(): ApiSnapshotResponse;
  save(snapshot: ApiSnapshotResponse): ApiSnapshotResponse;
  reset(): ApiSnapshotResponse;
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function createDeviceServiceStorage(rootDir = path.join(process.cwd(), 'state')): DeviceServiceStorage {
  const stateFile = path.join(rootDir, 'device-state.json');
  return {
    rootDir,
    stateFile,
    load() {
      try {
        return JSON.parse(fs.readFileSync(stateFile, 'utf8')) as ApiSnapshotResponse;
      } catch {
        return buildSnapshot();
      }
    },
    save(snapshot) {
      ensureDir(rootDir);
      fs.writeFileSync(stateFile, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
      return snapshot;
    },
    reset() {
      const snapshot = buildSnapshot();
      ensureDir(rootDir);
      fs.writeFileSync(stateFile, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
      return snapshot;
    },
  };
}

