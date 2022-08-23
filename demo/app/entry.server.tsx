import type { EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import invariant from 'invariant';
import { renderToString } from 'react-dom/server';
import { initialize } from './lib/config.server';

initialize();

// While it's a little ridiculous to load an image synchronously during startup...
invariant(process.env.FILE_BASE64, 'The super secret and necessary file is missing');
console.log(
  `Loaded secret image. Size=${
    Buffer.byteLength(Buffer.from(process.env.FILE_BASE64, 'base64')) / 1000
  }kb`
);

invariant(process.env.CREDENTIALS_JSON_BASE64, 'The fake credentials file is missing');
console.log(
  `Loaded credentials file. (Displaying first 128 chracters) ${JSON.stringify(
    JSON.parse(Buffer.from(process.env.CREDENTIALS_JSON_BASE64, 'base64').toString('utf-8')),
    null,
    2
  ).slice(0, 128)}...`
);

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  let markup = renderToString(<RemixServer context={remixContext} url={request.url} />);

  responseHeaders.set('Content-Type', 'text/html');

  return new Response('<!DOCTYPE html>' + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
