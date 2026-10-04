import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { nodeFileSystem } from './file-system';

let directory: string | null = null;

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe('node file system', () => {
  it('writes through a temp file and leaves only the target behind', async () => {
    directory = await mkdtemp(join(tmpdir(), 'korev-'));
    const path = join(directory, 'nested', 'settings.json');
    await nodeFileSystem.writeAtomic(path, '{"repos":[]}');
    expect((await nodeFileSystem.read(path))?.toString()).toBe('{"repos":[]}');
    expect(await readdir(join(directory, 'nested'))).toEqual(['settings.json']);
  });

  it('reads a missing file as null', async () => {
    expect(await nodeFileSystem.read('/definitely/missing/file')).toBeNull();
  });
});
