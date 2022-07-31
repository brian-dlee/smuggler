import debug from 'debug';
import { loader } from '.smuggler';
import { CryptographicParameters, getDefaultBuildLocation, getFilePath } from './crypto';
import { DEFAULT_ALGORITHM } from './constants';

interface ReadOptions extends CryptographicParameters {
  path?: string;
}

type RequiredOptionNames = 'key' | 'iv';

type MinimalOptions = Partial<Omit<ReadOptions, RequiredOptionNames>> &
  Pick<ReadOptions, RequiredOptionNames>;

const debugLogger = debug('smuggler:index');

export function withDefaultReadOptions(options: MinimalOptions): ReadOptions {
  return {
    ...options,
    path: options.path || getFilePath(getDefaultBuildLocation()),
    algorithm: options.algorithm || DEFAULT_ALGORITHM,
  };
}

export function read(options: ReadOptions) {
  return loader(options.algorithm, options.key, options.iv);
}
