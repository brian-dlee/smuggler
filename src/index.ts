import {
  createTransform,
  CryptographicParameters,
  DEFAULT_ALGORITHM,
  getDefaultBuildLocation,
  getFilePath,
} from './crypto';
import { accessSync, readFileSync, constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';

interface ReadOptions extends CryptographicParameters {
  path?: string;
}

type RequiredOptionNames = 'key' | 'iv';

type MinimalOptions = Partial<Omit<ReadOptions, RequiredOptionNames>> &
  Pick<ReadOptions, RequiredOptionNames>;

function readInternal(options: ReadOptions, buffer: Buffer): any {
  return JSON.parse(createTransform('decrypt', options)(buffer).toString('utf-8'));
}

export function withDefaultReadOptions(options: MinimalOptions): ReadOptions {
  return {
    ...options,
    path: options.path || getFilePath(getDefaultBuildLocation()),
    algorithm: options.algorithm || DEFAULT_ALGORITHM,
  };
}

export function readSync(options: ReadOptions) {
  const filePath = options.path || getFilePath(getDefaultBuildLocation());

  try {
    accessSync(filePath, constants.F_OK);
  } catch (e) {
    console.error('Could not locate data file:', filePath);
    throw new Error('the file path provided does not exist');
  }

  return readInternal(options, readFileSync(filePath));
}

export async function read(options: ReadOptions) {
  const filePath = options.path || getFilePath(getDefaultBuildLocation());

  try {
    console.error('Could not locate data file:', filePath);
    await access(filePath, constants.F_OK);
  } catch (e) {
    throw new Error('the file path provided does not exist');
  }

  return readInternal(options, await readFile(filePath));
}
