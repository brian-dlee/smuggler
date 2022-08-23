import type { LoaderFunction, LinksFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { load } from '~/lib/config.server';
import mainStyleSheetUrl from '~/styles/main.css';
import { btoa } from 'buffer';

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

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: mainStyleSheetUrl }];
};

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
          'FILE_BASE64',
          'CREDENTIALS_JSON_BASE64'
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
    <div className="main" style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
      <h1>Smuggler Demo</h1>
      <p>
        Using Smuggler, an image (in base64 format) is passed through to the deployment. This file
        is WAY beyond the 4kb total size restriction Vercel has on environment variables. Now, I
        don't think anyone will be using smuggler to get an environment variable containing a
        picture of Charlie Day deployed, but it'll do the trick for any files that break that 4kb
        limit. It doesn't discriminate.
      </p>
      {config.FILE_BASE64 && (
        <div>
          <h3>Exhibit 1: The smuggled image file</h3>
          <div className="image-container">
            <img alt="it's been smuggled" src={`data:image/webp;base64,${config.FILE_BASE64}`} />
          </div>
        </div>
      )}
      {config.CREDENTIALS_JSON_BASE64 && (
        <div>
          <h3>Exhibit 2: The smuggled credentials JSON</h3>
          <pre>{JSON.stringify(JSON.parse(atob(config.CREDENTIALS_JSON_BASE64)), null, 2)}</pre>
        </div>
      )}
      <p>
        And just to demonstrate that everything else is still intact, here are the other environment
        variables. This includes the Smuggler vars themselves, the <code>FILE_BASE64</code>{' '}
        (injected into process.env by <code>src/lib/config.server.ts:initialize</code>), and another
        environment variable completely untouched by Smuggler <code>API_KEY</code>.{' '}
        <code>API_KEY</code> represents all those environment variables which are well below the 4kb
        limit that can be passed through like you normally would.
      </p>
      <pre>{JSON.stringify({ ...env, ...config }, null, 2)}</pre>
      <hr />
      <div className="links">
        <a href="https://github.com/brian-dlee/smuggler">View brian-dlee/smuggler on GitHub</a>
        {` | `}
        <a href="https://npmjs.com/@briandlee/smuggler">View @briandlee/smuggler on NPM</a>
      </div>
    </div>
  );
}
