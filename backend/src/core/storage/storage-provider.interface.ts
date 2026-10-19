// Nenhum código fora do adapter conhece o provedor ativo — quem precisa de
// storage injeta este token, nunca `LocalDiskStorageProvider`/
// `S3StorageProvider` diretamente (ver ADR 0010).
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface StorageProvider {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
