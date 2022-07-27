import { writeFileSync } from 'fs';
import { readSync, withDefaultReadOptions } from '@briandlee/smuggler';

export default function () {
  const { VERCEL_ENCRYPTION_IV: iv, VERCEL_ENCRYPTION_KEY: key } = process.env;

  if (!iv || !key) throw new Error('Configuration error');

  const data = readSync(withDefaultReadOptions({ key, iv }));

  writeFileSync('/tmp/db.p12', Buffer.from(data.VERCEL_SECRET__APP_DB_SSL_P12_BASE64, 'base64'));
  writeFileSync(
    '/tmp/db.pem',
    Buffer.from(data.VERCEL_SECRET__APP_DB_SSL_SERVER_CA_BASE64, 'base64')
  );

  process.env.APP_DB_SSL_P12_FILE = '/tmp/db.p12';
  process.env.APP_DB_SSL_SERVER_CA_FILE = '/tmp/db.pem';
}
