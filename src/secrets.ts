import { readFile } from 'fs/promises';

export interface Variables {
  [key: string]: string | undefined;
}

export interface SecretKeyMapper {
  matches: (key: string) => boolean;
  transform: (key: string) => string;
}

export type FileSecretLiteralPath = {
  type: 'file';
  path: string;
  variable: string;
};

export type FileSecretEnvVariable = {
  type: 'variable';
  name: string;
  variable: string | undefined;
};

export type FileSecret = FileSecretLiteralPath | FileSecretEnvVariable;

export const mappers = {
  prefix: (prefix: string) => ({
    matches: (key: string) => key.startsWith(prefix),
    transform: (key: string) => key.slice(prefix.length),
  }),
};

export function extractSecrets(mapper: SecretKeyMapper, env: typeof process.env): Variables {
  return Object.fromEntries(
    Object.entries(env)
      .filter(([key]) => {
        return mapper.matches(key);
      })
      .map(([key, value]) => {
        return [mapper.transform(key), value];
      })
  );
}

type ShapeOf<T> = Partial<Record<keyof T, unknown>>;

export function asFileSecret(obj: unknown): FileSecret | null {
  if (!obj || typeof obj !== 'object' || typeof (obj as { type?: unknown }).type !== 'string')
    return null;

  const secretLike: ShapeOf<FileSecretEnvVariable & FileSecretLiteralPath> = obj;

  switch (secretLike.type) {
    case 'file':
      if (typeof secretLike.path !== 'string') return null;
      if (typeof secretLike.variable !== 'string') return null;
      return {
        type: 'file',
        path: secretLike.path,
        variable: secretLike.variable,
      };
    case 'variable':
      if (typeof secretLike.name !== 'string') return null;
      if (typeof secretLike.variable !== 'undefined' && typeof secretLike.variable !== 'string')
        return null;
      return { type: 'variable', name: secretLike.name, variable: secretLike.variable };
    default:
      return null;
  }
}

export async function getFilesAsSecrets(
  secrets: FileSecret[],
  env: typeof process.env
): Promise<Variables> {
  return Object.fromEntries(
    await Promise.all(
      secrets.map(async (s): Promise<[string, string]> => {
        switch (s.type) {
          case 'file':
            return [s.variable, (await readFile(s.path)).toString('base64')];
          case 'variable':
            return (async (key, value) => {
              if (value) {
                return [key, (await readFile(value)).toString('base64')];
              } else {
                return [key, ''];
              }
            })(s.variable || s.name, env[s.name]);
        }
      })
    )
  );
}
