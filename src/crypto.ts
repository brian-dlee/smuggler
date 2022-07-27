import { createDecipheriv, createCipheriv } from 'crypto';
import { resolve } from 'node:path';

export interface CryptographicParameters {
  algorithm: string;
  key: string;
  iv: string;
}

export type CryptographicFunction = (data: Buffer) => Buffer;

export const DEFAULT_ALGORITHM = 'aes-128-cbc';

export function createTransform(
  type: 'encrypt' | 'decrypt',
  encryption: CryptographicParameters
): CryptographicFunction {
  const make = () => {
    switch (type) {
      case 'encrypt':
        return createCipheriv(encryption.algorithm, encryption.key, encryption.iv);
      case 'decrypt':
        return createDecipheriv(encryption.algorithm, encryption.key, encryption.iv);
    }
  };
  return (content: Buffer) => {
    const cipher = make();
    const result = cipher.update(content);
    return Buffer.concat([result, cipher.final()]);
  };
}

export function getFilePath(location: string): string {
  return resolve(location, 'data.enc');
}

export function getDefaultIntermediateLocation(): string {
  return resolve('.smuggler');
}

export function getDefaultBuildLocation(): string {
  return resolve('node_modules', '.smuggler');
}
