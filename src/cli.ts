#!/usr/bin/env node

import { constants } from 'fs';
import { access, mkdir, writeFile, readFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import * as dotenv from 'dotenv'
import {
  createTransform,
  CryptographicParameters,
  DEFAULT_ALGORITHM,
  getFilePath,
  getDefaultBuildLocation,
  getDefaultIntermediateLocation,
} from './crypto';
import { extractSecrets, mappers, Variables } from './secrets';

async function decryptFromFile(filePath: string, parameters: CryptographicParameters) {
  return JSON.parse(
    createTransform('decrypt', parameters)(await readFile(filePath)).toString('utf-8')
  );
}

async function encryptToFile(
  variables: Variables,
  filePath: string,
  parameters: CryptographicParameters
) {
  try {
    await access(dirname(filePath), constants.F_OK);
  } catch {
    await mkdir(dirname(filePath), { recursive: true });
  }
  return writeFile(
    filePath,
    createTransform('encrypt', parameters)(Buffer.from(JSON.stringify(variables)))
  );
}

dotenv.config()

const [operation] = process.argv.slice(2);

if (!operation) {
  console.error('No operation supplied');
  process.exit(1);
}

async function readConfig() {
  const {
    encryptionKeyEnvironmentVariable,
    encryptionIVEnvironmentVariable,
    includeVariablePrefix,
    intermediateLocation,
    buildLocation,
  } = JSON.parse(await readFile(resolve('.smuggler.json'), { encoding: 'utf-8' }));

  if (!encryptionKeyEnvironmentVariable) {
    throw new Error('No encryptionKeyEnvironmentVariable defined');
  }

  if (!encryptionIVEnvironmentVariable) {
    throw new Error('No encryptionIVEnvironmentVariable defined');
  }

  if (!includeVariablePrefix) {
    throw new Error('No includeVariablePrefix defined');
  }

  return {
    encryptionKeyEnvironmentVariable,
    encryptionIVEnvironmentVariable,
    includeVariablePrefix,
    intermediateLocation: intermediateLocation || getDefaultIntermediateLocation(),
    buildLocation: buildLocation || getDefaultBuildLocation(),
  };
}

(async () => {
  const config = await readConfig();
  const [intermediateFilePath, buildFilePath] = [
    config.intermediateLocation,
    config.buildLocation,
  ].map(getFilePath);
  const [key, iv] = [
    process.env[config.encryptionKeyEnvironmentVariable],
    process.env[config.encryptionIVEnvironmentVariable],
  ];

  if (!key || !iv) {
    console.debug('No encryption variables are available. Unable to continue.');
    return;
  }

  const parameters: CryptographicParameters = { algorithm: DEFAULT_ALGORITHM, key, iv };

  if (operation === 'create') {
    console.info(
      'Creating',
      intermediateFilePath,
      'from variables matching',
      config.includeVariablePrefix
    );
    await mkdir(config.intermediateLocation, { recursive: true });
    return encryptToFile(
      extractSecrets(mappers.prefix(config.includeVariablePrefix), process.env),
      intermediateFilePath,
      parameters
    );
  }

  if (operation === 'copy') {
    console.info('Creating', buildFilePath, 'from', intermediateFilePath);
    await mkdir(config.buildLocation, { recursive: true });
    return writeFile(buildFilePath, await readFile(resolve(intermediateFilePath)));
  }

  if (operation === 'read') {
    console.info('Reading', intermediateFilePath);
    console.log(await decryptFromFile(intermediateFilePath, parameters));
    return;
  }

  return Promise.reject(new Error(`Unknown operation supplied: ${operation}`));
})().catch((e: unknown) => {
  console.error(e);
});
