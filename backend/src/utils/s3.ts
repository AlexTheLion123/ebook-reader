import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new S3Client({});

export const getUploadUrl = async (bucket: string, key: string): Promise<string> => {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: 3600 });
};

export const getObject = async (bucket: string, key: string): Promise<Buffer> => {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await client.send(command);
  return Buffer.from(await response.Body!.transformToByteArray());
};

export const putObject = async (bucket: string, key: string, body: Buffer | string, contentType: string = 'text/html'): Promise<void> => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  });
  await client.send(command);
};

export const getPresignedUrl = async (bucket: string, key: string, expiresIn: number = 3600): Promise<string> => {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn });
};
