import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { load } from '~/lib/config.server';

interface LoaderData {
  config: Record<string, string>;
  env: Record<string, string | undefined>;
}

function pick(
  obj: Record<string, string | undefined>,
  ...keys: string[]
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => {
      return keys.includes(key);
    })
  );
}

export const loader: LoaderFunction = async () => {
  try {
    return json<LoaderData>(
      {
        config: await load(),
        env: pick(
          process.env,
          'SMUGGLER_ENCRYPTION_KEY',
          'SMUGGLER_ENCRYPTION_IV',
          'API_KEY',
          'FILE_BASE64'
        ),
      },
      200
    );
  } catch (e) {
    return json({ error: 'configuration error' }, 500);
  }
};

export default function Index() {
  const { config, env } = useLoaderData<LoaderData>();

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
      <h1>Smuggler Demo</h1>
      {config.FILE_BASE64 && <img src={`data:image/webp;base64,${config.FILE_BASE64}`} />}
      <pre>{JSON.stringify({ ...env, ...config }, null, 2)}</pre>
    </div>
  );
}
