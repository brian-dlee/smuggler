import { read, readSync, withDefaultReadOptions } from "@briandlee/smuggler";
import invariant from "invariant"

export function initialize(): Record<string, string> {
  invariant(process.env.SMUGGLER_ENCRYPTION_KEY, "Smuggler encryption key is empty")
  invariant(process.env.SMUGGLER_ENCRYPTION_IV, "Smuggler encryption iv is empty")

  const config = readSync(withDefaultReadOptions({
    key: process.env.SMUGGLER_ENCRYPTION_KEY,
    iv: process.env.SMUGGLER_ENCRYPTION_IV,
  }))

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string") {
      process.env[key] = value
    }
  }

  return config
}

export async function load(): Promise<Record<string, string>> {
  invariant(process.env.SMUGGLER_ENCRYPTION_KEY, "Smuggler encryption key is empty")
  invariant(process.env.SMUGGLER_ENCRYPTION_IV, "Smuggler encryption iv is empty")

  return read(withDefaultReadOptions({
    key: process.env.SMUGGLER_ENCRYPTION_KEY,
    iv: process.env.SMUGGLER_ENCRYPTION_IV,
  }))
}
