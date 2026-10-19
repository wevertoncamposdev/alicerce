import * as fs from 'fs/promises';
import * as path from 'path';
import type { StorageProvider } from './storage-provider.interface';
import { signLocalKey } from './local-signed-url.util';

// Driver de dev — grava em disco local. Nunca registrado diretamente no
// container de DI: `StorageModule` instancia a classe certa (local ou s3)
// via factory, ver ADR 0010 ("nenhum código fora do adapter conhece o
// provedor").
export class LocalDiskStorageProvider implements StorageProvider {
  private readonly basePath = process.env.STORAGE_LOCAL_PATH ?? './storage';
  private readonly publicUrl = (
    process.env.STORAGE_LOCAL_PUBLIC_URL ?? 'http://localhost:5000'
  ).replace(/\/+$/, '');

  private resolvePath(key: string): string {
    return path.join(this.basePath, key);
  }

  async put(key: string, data: Buffer): Promise<void> {
    const filePath = this.resolvePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  }

  getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const { exp, sig } = signLocalKey(key, expiresInSeconds);
    const params = new URLSearchParams({ exp: String(exp), sig });
    return Promise.resolve(
      `${this.publicUrl}/api/storage/local/${encodeURIComponent(key)}?${params.toString()}`,
    );
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolvePath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
