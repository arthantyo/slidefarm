import { createHash, createHmac } from 'node:crypto';

interface R2Config {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicOrigin: string;
}

function config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicUrl = process.env.TIKTOK_VERIFIED_URL_PREFIX;
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !publicUrl) {
    throw new Error('Configure R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and TIKTOK_VERIFIED_URL_PREFIX.');
  }
  if (!/^[a-f0-9]{32}$/i.test(accountId) || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) {
    throw new Error('Invalid R2 account ID or bucket name.');
  }
  let url: URL;
  try { url = new URL(publicUrl); }
  catch { throw new Error('TIKTOK_VERIFIED_URL_PREFIX must be the public HTTPS origin of your R2 bucket.'); }
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('TIKTOK_VERIFIED_URL_PREFIX must be the public HTTPS origin of your R2 bucket.');
  }
  return { endpoint: `https://${accountId}.r2.cloudflarestorage.com`, bucket, accessKeyId, secretAccessKey, publicOrigin: url.origin };
}

const sha256 = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');
const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data).digest();

export async function uploadTikTokSlide(key: string, body: Buffer): Promise<string> {
  const settings = config();
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
