export interface Variables {
  [key: string]: string | undefined;
}

export interface SecretKeyMapper {
  matches: (key: string) => boolean;
  transform: (key: string) => string;
}

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
