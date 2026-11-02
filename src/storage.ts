import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { SafeError } from './errors.js';

async function noLinks(path: string): Promise<void> {
  let part = resolve(path);
  while (true) {
    const info = await lstat(part);
    if (info.isSymbolicLink()) throw new SafeError('UNSAFE_PATH', 'Symbolic links are not allowed in private paths.');
    const parent = dirname(part);
    if (part === parent) break;
    part = parent;
  }
}
// Refuse both regular checkouts (.git directory) and linked worktrees (.git file).
async function outsideGit(directory: string): Promise<void> {
  let ancestor = resolve(directory);
  while (true) {
    const marker = await lstat(join(ancestor, '.git')).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined;
      throw new SafeError('UNSAFE_STORAGE', 'Cannot establish that private storage is outside Git.');
    });
    if (marker) throw new SafeError('UNSAFE_STORAGE', 'Credentials and downloads must be outside every Git checkout.');
    const parent = dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
}

export async function privateFile(path: string): Promise<string> {
  if (!isAbsolute(path)) throw new SafeError('UNSAFE_PATH', 'Credential path must be absolute.');
  await noLinks(path);
  const parent = await lstat(dirname(path));
  if (!parent.isDirectory() || parent.uid !== process.getuid?.() || (parent.mode & 0o077) !== 0) {
    throw new SafeError('UNSAFE_CREDENTIALS', 'Credential parent must be an owner-only directory (0700).');
  }
  await outsideGit(dirname(path));
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.uid !== process.getuid?.() || (stat.mode & 0o077) !== 0 || stat.size > 65536) {
      throw new SafeError('UNSAFE_CREDENTIALS', 'Credential file must be owner-only, regular, and at most 64 KiB.');
    }
    return await file.readFile('utf8');
  } finally { await file.close(); }
}
export async function saveAttachment(root: string, bytes: Uint8Array): Promise<{path: string; bytes: number; sha256: string}> {
  if (!isAbsolute(root)) throw new SafeError('UNSAFE_PATH', 'Download directory must be absolute.');
  await noLinks(root);
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.uid !== process.getuid?.() || (stat.mode & 0o077) !== 0 || await realpath(root) !== resolve(root)) {
    throw new SafeError('UNSAFE_PATH', 'Download directory must be an existing owner-only real directory (0700).');
  }
  await outsideGit(root);
  // No server-supplied filename becomes a filesystem path. O_EXCL prevents overwrite.
  const path = join(root, `attachment-${randomUUID()}.bin`);
  if (dirname(path) !== resolve(root) || basename(path).includes('..')) throw new SafeError('UNSAFE_PATH', 'Invalid output path.');
  const file = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    const current = await lstat(root);
    if (current.dev !== stat.dev || current.ino !== stat.ino) throw new SafeError('UNSAFE_PATH', 'Download directory changed during write.');
    await file.writeFile(bytes);
    await file.sync();
  } finally { await file.close(); }
  return {path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')};
}
