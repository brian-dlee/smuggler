import type { LoaderFunction } from "@remix-run/node"
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { load } from "~/lib/config.server";

interface LoaderData {
  config: Record<string, string>;
  env: Record<string, string | undefined>;
}

export const loader: LoaderFunction = async () => {
  try {
    return json<LoaderData>({ config: await load(), env: process.env }, 200)
  } catch (e) {
    console.error("Failed to load configuation", e)
    return json({ error: "configuration error" }, 500)
  }
}

export default function Index() {
  const { config, env } = useLoaderData<LoaderData>()

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>Smuggler Demo</h1>
      <img src={`data:image/webp;base64,${config.FILE_BASE64}`} />
      <pre>
        {JSON.stringify({ ...env, ...config }, null, 2)}
      </pre>
    </div>
  );
}
