import { createCipheriv, createDecipheriv } from 'crypto';
import { resolve } from './path';
import { GENERATED_PACKAGE_NAME, LOADER_FILENAME } from './constants';

export interface CryptographicParameters {
  algorithm: string;
  key: string;
  iv: string;
}

export type CryptographicFunction = (data: Buffer) => Buffer;

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
  return resolve(location, LOADER_FILENAME);
}

export function getDefaultIntermediateLocation(): string {
  return resolve(GENERATED_PACKAGE_NAME);
}

export function getDefaultBuildLocation(): string {
  return resolve('node_modules', GENERATED_PACKAGE_NAME);
}
