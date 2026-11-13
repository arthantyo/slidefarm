import { createHash, createHmac } from 'node:crypto';
import { readR2Settings, validateR2Settings } from './r2-settings';

interface R2Config {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicOrigin: string;
}

async function config(): Promise<R2Config> {
  const settings = await readR2Settings();
  const error = validateR2Settings(settings);
  if (error) throw new Error(error);
  return {
    endpoint: `https://${settings.accountId}.r2.cloudflarestorage.com`,
    bucket: settings.bucket,
    accessKeyId: settings.accessKeyId,
    secretAccessKey: settings.secretAccessKey,
    publicOrigin: new URL(settings.publicOrigin).origin,
  };
}

const sha256 = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');
const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data).digest();

export async function uploadTikTokSlide(key: string, body: Buffer): Promise<string> {
  const settings = await config();
  if (!/^tiktok\/slides\/[a-f0-9-]{36}\.jpg$/.test(key)) throw new Error('Invalid R2 object key.');
  const endpoint = new URL(settings.endpoint);
  const path = `/${settings.bucket}/${key}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const headers = [
    `content-type:image/jpeg`,
    `host:${endpoint.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ];
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['PUT', path, '', `${headers.join('\n')}\n`, signedHeaders, payloadHash].join('\n');
  const scope = `${date}/auto/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonicalRequest)}`;
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${settings.secretAccessKey}`, date), 'auto'), 's3'), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  const response = await fetch(`${settings.endpoint}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/jpeg',
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${settings.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body,
  });
  if (!response.ok) throw new Error(`R2 upload failed (${response.status}). Check the bucket and API token permissions.`);
  return `${settings.publicOrigin}/${key}`;
}
