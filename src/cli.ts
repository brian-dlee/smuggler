#!/usr/bin/env node

import { constants } from 'fs';
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { Command } from 'commander';
import debug from 'debug';
import * as dotenv from 'dotenv';
import {
  createTransform,
  CryptographicParameters,
  getDefaultBuildLocation,
  getDefaultIntermediateLocation,
} from './crypto';
import {
  asFileSecret,
  extractSecrets,
  FileSecret,
  getFilesAsSecrets,
  mappers,
  Variables,
} from './secrets';
import { resolve, resolveResourceFile } from './path';
import { DATA_FILENAME, DEFAULT_ALGORITHM, LOADER_FILENAME } from './constants';

interface SmugglerConfig {
  encryptionKeyEnvironmentVariable: string;
  encryptionIVEnvironmentVariable: string;
  includeVariablePrefix: string | undefined;
  includeFiles: FileSecret[] | undefined;
  intermediateLocation: string;
  buildLocation: string;
}

interface Options {
  config: string;
  env: string | undefined;
}

interface PrepareOptions extends Options {}

interface GenerateOptions extends Options {
  empty: boolean;
  force: boolean;
  prepare: boolean;
}

interface ReadOptions extends Options {
  contents: boolean;
}

const debugLogger = debug('smuggler:cli');

async function writeDataFile(
  variables: Variables,
  filePath: string,
  parameters: CryptographicParameters
) {
  try {
    debugLogger('Ensuring data file directory exists: %s', dirname(filePath));
    await access(dirname(filePath), constants.F_OK);
  } catch {
    debugLogger('Creating data file parent directory: %s', dirname(filePath));
    await mkdir(dirname(filePath), { recursive: true });
  }

  debugLogger('Generating %s from %s variables', filePath, Object.keys(variables).length);

  return writeFile(
    filePath,
    createTransform('encrypt', parameters)(Buffer.from(JSON.stringify(variables)))
  );
}

async function writeEmptyLoaderFile(loaderFilePath: string) {
  try {
    debugLogger('Ensuring loader file directory exists: %s', dirname(loaderFilePath));
    await access(dirname(loaderFilePath), constants.F_OK);
  } catch {
    debugLogger('Creating loader file parent directory: %s', dirname(loaderFilePath));
    await mkdir(dirname(loaderFilePath), { recursive: true });
  }

  debugLogger('Generating empty loader at %s', loaderFilePath);

  return writeFile(
    loaderFilePath,
    await readFile(resolveResourceFile('resources', 'empty-loader.cjs'))
  );
}

async function writeLoaderFile(dataFilePath: string, loaderFilePath: string) {
  try {
    debugLogger('Ensuring loader file directory exists: %s', dirname(loaderFilePath));
    await access(dirname(loaderFilePath), constants.F_OK);
  } catch {
    debugLogger('Creating loader file parent directory: %s', dirname(loaderFilePath));
    await mkdir(dirname(loaderFilePath), { recursive: true });
  }

  try {
    await access(dataFilePath, constants.R_OK);
  } catch {
    console.error(
      `Unable to generate build file: intermediate file does not exist. Path=${dataFilePath}`
    );
    throw new Error('intermediate file not found');
  }

  const content = await readFile(dataFilePath);
  debugLogger('Read data file: %s, size=%s', dataFilePath, Buffer.byteLength(content));
  const base64 = Buffer.from(content).toString('base64');

  const templateFilePath = resolveResourceFile('resources', 'loader.cjs');
  debugLogger('Generating loader from %s', templateFilePath);

  const source = await readFile(templateFilePath);
  debugLogger('Generating %s', loaderFilePath);

  return writeFile(loaderFilePath, source.toString('utf-8').replace(/%data%/, base64));
}

async function readConfig(path: string): Promise<SmugglerConfig> {
  try {
    await access(path, constants.F_OK);
  } catch (e) {
    console.error(`Unable to load config: file does not exist. Path=${path}`);
    throw new Error('no config');
  }

  debugLogger('Loading config from %s', path);

  const {
    encryptionKeyEnvironmentVariable,
    encryptionIVEnvironmentVariable,
    includeVariablePrefix,
    includeFiles,
    intermediateLocation,
    buildLocation,
  } = JSON.parse(await readFile(path, { encoding: 'utf-8' }));

  if (!encryptionKeyEnvironmentVariable) {
    throw new Error('No encryptionKeyEnvironmentVariable defined');
  }

  if (!encryptionIVEnvironmentVariable) {
    throw new Error('No encryptionIVEnvironmentVariable defined');
  }

  if (!includeVariablePrefix && !includeFiles) {
    throw new Error(
      'No required variable parameters are defined: includeVariablePrefix, includeFiles'
    );
  }

  if (includeFiles) {
    if (typeof includeFiles !== 'object' || typeof includeFiles.length !== 'number') {
      throw new Error('Invalid includeFiles: should be an array');
    }

    if ((includeFiles as any[]).some((x) => !asFileSecret(x))) {
      throw new Error(
        'Invalid includeFiles: each entry should be { type: "variable", variable: string } or { type: "file", path: string, variable: string }'
      );
    }
  }

  if (includeVariablePrefix && typeof includeVariablePrefix !== 'string') {
    throw new Error('Invalid includeFiles: should be a string');
  }

  return {
    encryptionKeyEnvironmentVariable,
    encryptionIVEnvironmentVariable,
    includeVariablePrefix,
    includeFiles,
    intermediateLocation: intermediateLocation || getDefaultIntermediateLocation(),
    buildLocation: buildLocation || getDefaultBuildLocation(),
  };
}

function getCryptographicParameters(config: SmugglerConfig): CryptographicParameters {
  debugLogger(
    'Reading key and iv from %s and %s',
    config.encryptionKeyEnvironmentVariable,
    config.encryptionIVEnvironmentVariable
  );

  const [key, iv] = [
    process.env[config.encryptionKeyEnvironmentVariable],
    process.env[config.encryptionIVEnvironmentVariable],
  ];

  if (!key || !iv) {
    console.error('Either key or iv are missing. Cannot continue');
    throw new Error('missing key or iv');
  }

  debugLogger('Using (default) encryption algorithm %s', DEFAULT_ALGORITHM);

  return { algorithm: DEFAULT_ALGORITHM, key, iv };
}

async function generateIntermediateFile(config: SmugglerConfig, env: typeof process.env) {
  const intermediateFilePath = resolve(config.intermediateLocation, DATA_FILENAME);
  debugLogger('Intermediate file path resolved to %s', intermediateFilePath);

  console.info(
    'Creating',
    intermediateFilePath,
    'from variables matching',
    config.includeVariablePrefix
  );

  debugLogger('Loading cryptography parameters');
  const parameters = getCryptographicParameters(config);

  debugLogger('Creating directory for intermediate files: %s', config.intermediateLocation);
  await mkdir(config.intermediateLocation, { recursive: true });

  const secrets: Variables = {
    ...(config.includeVariablePrefix
      ? extractSecrets(mappers.prefix(config.includeVariablePrefix), env)
      : {}),
    ...(config.includeFiles ? await getFilesAsSecrets(config.includeFiles, env) : {}),
  };

  return writeDataFile(secrets, intermediateFilePath, parameters);
}

async function generateBuildFile(config: SmugglerConfig) {
  const intermediateFilePath = resolve(config.intermediateLocation, DATA_FILENAME);
  debugLogger('Intermediate file path resolved to %s', intermediateFilePath);
  const buildFilePath = resolve(config.buildLocation, LOADER_FILENAME);
  debugLogger('Build file path resolved to %s', buildFilePath);

  console.info('Creating', buildFilePath, 'from', intermediateFilePath);

  debugLogger('Creating directory for build files: %s', config.buildLocation);
  await mkdir(config.buildLocation, { recursive: true });

  return writeLoaderFile(intermediateFilePath, buildFilePath);
}

async function buildFileExists(location: string): Promise<boolean> {
  const filePath = resolve(location, LOADER_FILENAME);

  try {
    await access(filePath);
  } catch {
    debugLogger('Build file does not exist: %s', filePath);
    return false;
  }

  debugLogger('Build file exists: %s', filePath);
  return true;
}

async function intermediateFileExists(location: string): Promise<boolean> {
  const filePath = resolve(location, DATA_FILENAME);

  try {
    await access(filePath);
  } catch {
    debugLogger('Intermediate file does not exist: %s', filePath);
    return false;
  }

  debugLogger('Intermediate file exists: %s', filePath);
  return true;
}

function summarizeContents(data: Variables): Variables {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (value) {
        return [key, `<length ${value.length}>`];
      } else {
        return [key, `<undefined>`];
      }
    })
  );
}

async function prepare(options: PrepareOptions) {
  debugLogger('Loading dotenv from %s', options.env || '<default>');
  dotenv.config({ path: options.env });

  const config = await readConfig(options.config);

  await generateIntermediateFile(config, process.env);
}

async function generate(options: GenerateOptions) {
  debugLogger('Loading dotenv from %s', options.env || '<default>');
  dotenv.config({ path: options.env });

  const config = await readConfig(options.config);

  if (options.empty) {
    const fileExists = await buildFileExists(config.buildLocation);

    if (options.force || fileExists) {
      const loaderFilePath = resolve(config.buildLocation, LOADER_FILENAME);

      if (options.force && fileExists) {
        debugLogger('Overwriting loader file with empty loader (--force)');
      } else if (!fileExists) {
        debugLogger('The required loader files do not exist: %s', config.buildLocation);
      }

      await writeEmptyLoaderFile(loaderFilePath);
    }
    return;
  }

  const fileExists = await intermediateFileExists(config.intermediateLocation);

  if ((options.force || fileExists) && options.prepare) {
    if (options.force && fileExists) {
      debugLogger('Overwriting intermediate files (--force)');
    } else if (!fileExists) {
      debugLogger('The required intermediate files do not exist: %s', config.intermediateLocation);
    }

    await generateIntermediateFile(config, options.empty ? {} : process.env);
  } else if (!fileExists && !options.prepare) {
    console.error(
      'The required intermediate files do not exist and --no-prepare was supplied. Aborting.'
    );
    throw new Error('no intermediate file');
  }

  await generateBuildFile(config);
}

async function read(options: ReadOptions) {
  debugLogger('Loading dotenv from %s', options.env || '<default>');
  dotenv.config({ path: options.env });

  const config = await readConfig(options.config);

  if (!(await intermediateFileExists(config.intermediateLocation))) {
    debugLogger('Intermediate files do not exist: %s', config.intermediateLocation);
    console.error('Intermediate file does not exist. Aborting.');
    throw new Error('no intermediate file');
  }

  const intermediateFilePath = resolve(config.intermediateLocation, DATA_FILENAME);
  const decrypted = JSON.parse(
    createTransform(
      'decrypt',
      getCryptographicParameters(config)
    )(await readFile(intermediateFilePath)).toString('utf-8')
  );
  const data = options.contents ? decrypted : summarizeContents(decrypted);

  console.debug(`Reading ${intermediateFilePath}`);
  console.log(JSON.stringify(data, null, 2));
}

function attachBaseOptions(command: Command) {
  command.option('--config', 'The smuggler config file to use.', resolve('.smuggler.json'));

  command.option('--env', 'The path to a dotenv file to load.');

  return command;
}

function actionErrorHandler<T>(fn: (options: T) => Promise<void>) {
  return async (options: T) => {
    try {
      await fn(options);
    } catch (e) {
      console.error(`${e}`);
      process.exit(1);
    }
  };
}

const program = new Command('smuggler');

program.description('Smuggle encrypted files into your deployment');

attachBaseOptions(program.command('prepare'))
  .description(
    'Generate the encrypted data and store in an intermediate location in preparation for build.'
  )
  .action(actionErrorHandler(prepare));

attachBaseOptions(program.command('generate'))
  .option(
    '--empty',
    'Generate an empty library (necessary for startup when using smuggler).',
    false
  )
  .option('--force', 'Overwrite any existing smuggler library files')
  .option('--no-prepare', 'Disable data preparation if the data does not already exist.')
  .description(
    'Generate the encrypted data, if it is not staged, and inject it into your application.'
  )
  .action(actionErrorHandler(generate));

attachBaseOptions(program.command('read'))
  .option('--contents', 'Display the contents of each variable.', false)
  .description('Read a prepared smuggler file')
  .action(actionErrorHandler(read));

program.parse();
