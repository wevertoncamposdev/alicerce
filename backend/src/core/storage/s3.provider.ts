import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider } from './storage-provider.interface';

// Driver de produção — fala com AWS S3, Cloudflare R2 ou MinIO (todos
// implementam o mesmo protocolo S3; `S3_ENDPOINT` troca o destino sem
// nenhum código condicional por provedor). Nunca registrado diretamente no
// container de DI — ver local-disk.provider.ts.
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'STORAGE_DRIVER=s3 exige S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID e S3_SECRET_ACCESS_KEY',
      );
    }

    this.bucket = bucket;
    const endpoint = process.env.S3_ENDPOINT;

    this.client = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      // R2/MinIO exigem path-style (bucket no caminho, não no subdomínio);
      // AWS S3 de verdade (sem endpoint customizado) usa virtual-hosted-style.
      forcePathStyle: Boolean(endpoint),
    });
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
