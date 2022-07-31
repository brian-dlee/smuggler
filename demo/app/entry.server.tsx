import type { EntryContext } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import invariant from "invariant";
import { renderToString } from "react-dom/server";
import { initialize } from "./lib/config.server"

initialize()

// While it's a little ridiculous to load an image synchronously during startup...
invariant(process.env.FILE_BASE64, 'The super secret and necessary file is missing')
console.log(`Loaded secret image. Size=${Buffer.byteLength(Buffer.from(process.env.FILE_BASE64, 'base64')) / 1000}kb`)

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  let markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  responseHeaders.set("Content-Type", "text/html");

  return new Response("<!DOCTYPE html>" + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
