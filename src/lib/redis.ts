import { createClient } from 'redis';
import { promisify } from 'util';
import zlib from 'zlib';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let client: ReturnType<typeof createClient> | null = null;

export function getRedisClient() {
  if (!client) {
    client = createClient({ url: redisUrl });
    client.on('error', (err) => console.error('Redis Client Error', err));
    client.connect().catch(console.error);
  }
  return client;
}

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export async function setCompressed(key: string, value: unknown, ttlSeconds = 3600) {
  const client = getRedisClient();
  const json = JSON.stringify(value);
  const compressed = await gzip(json);
  await client.set(key, compressed.toString('base64'), { EX: ttlSeconds });
}

export async function getCompressed<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  const data = await client.get(key);
  if (!data) return null;
  const buffer = Buffer.from(data, 'base64');
  const decompressed = await gunzip(buffer);
  return JSON.parse(decompressed.toString());
} 