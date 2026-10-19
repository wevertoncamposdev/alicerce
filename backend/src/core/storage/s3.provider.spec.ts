type CommandInput = Record<string, unknown>;
type FakeCommand = { input: CommandInput; __type: string };

const sendMock = jest.fn<Promise<FakeCommand>, [FakeCommand]>();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn<FakeCommand, [CommandInput]>((input) => ({
    input,
    __type: 'Put',
  })),
  DeleteObjectCommand: jest.fn<FakeCommand, [CommandInput]>((input) => ({
    input,
    __type: 'Delete',
  })),
  GetObjectCommand: jest.fn<FakeCommand, [CommandInput]>((input) => ({
    input,
    __type: 'Get',
  })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest
    .fn()
    .mockResolvedValue('https://bucket.s3.example.com/signed'),
}));

import { S3StorageProvider } from './s3.provider';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BASE_ENV = {
  S3_BUCKET: 'my-bucket',
  S3_REGION: 'us-east-1',
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
};

describe('S3StorageProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, ...BASE_ENV };
    delete process.env.S3_ENDPOINT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws if required env vars are missing', () => {
    delete process.env.S3_BUCKET;
    expect(() => new S3StorageProvider()).toThrow(/STORAGE_DRIVER=s3 exige/);
  });

  it('put() envia PutObjectCommand com bucket/key/contentType certos', async () => {
    const provider = new S3StorageProvider();
    const data = Buffer.from('fake-image-bytes');

    await provider.put('abc.png', data, 'image/png');

    expect(sendMock).toHaveBeenCalledTimes(1);
    const sentCommand = sendMock.mock.calls[0][0];
    expect(sentCommand.input).toMatchObject({
      Bucket: 'my-bucket',
      Key: 'abc.png',
      Body: data,
      ContentType: 'image/png',
    });
  });

  it('getSignedUrl() delega pro presigner do SDK', async () => {
    const provider = new S3StorageProvider();

    const url = await provider.getSignedUrl('abc.png', 120);

    expect(url).toBe('https://bucket.s3.example.com/signed');
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: { Bucket: 'my-bucket', Key: 'abc.png' },
      }),
      { expiresIn: 120 },
    );
  });

  it('delete() envia DeleteObjectCommand com bucket/key certos', async () => {
    const provider = new S3StorageProvider();

    await provider.delete('abc.png');

    expect(sendMock).toHaveBeenCalledTimes(1);
    const sentCommand = sendMock.mock.calls[0][0];
    expect(sentCommand.input).toMatchObject({
      Bucket: 'my-bucket',
      Key: 'abc.png',
    });
  });

  it('usa forcePathStyle quando S3_ENDPOINT está definido (R2/MinIO)', () => {
    process.env.S3_ENDPOINT = 'http://localhost:9000';
    const { S3Client } = jest.requireMock<{ S3Client: jest.Mock }>(
      '@aws-sdk/client-s3',
    );

    new S3StorageProvider();

    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        forcePathStyle: true,
        endpoint: 'http://localhost:9000',
      }),
    );
  });
});
