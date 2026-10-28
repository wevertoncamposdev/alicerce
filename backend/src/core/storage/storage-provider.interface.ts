// Nenhum código fora do adapter conhece o provedor ativo — quem precisa de
// storage injeta este token, nunca `LocalDiskStorageProvider`/
// `S3StorageProvider` diretamente (ver ADR 0010).
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

// D6 (docs/PLAN-fundacao-ux.md): `GET /files/:id/content` precisa servir o
// arquivo sem expor a URL (absoluta, inalcançável por trás de CSP/rede
// privada) do provider — local devolve os bytes direto; s3 (R2 incluso)
// devolve um redirect de curta duração pro link assinado do bucket.
export type StorageContent =
  | { kind: 'stream'; data: NodeJS.ReadableStream }
  | { kind: 'redirect'; url: string };

export interface StorageProvider {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  getContent(key: string): Promise<StorageContent>;
  delete(key: string): Promise<void>;
}
