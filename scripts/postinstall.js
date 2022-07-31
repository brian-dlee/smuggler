#!/usr/bin/env node

const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');
const debug = require('debug')('smuggler:postinstall');

const resourcesDir = resolve('resources');
const resourcesFile = resolve(resourcesDir, 'empty-loader.cjs');
const dotSmugglerDir = resolve(process.env.INIT_CWD, 'node_modules', '.smuggler');
const dotSmugglerFile = resolve(dotSmugglerDir, 'index.js');

debug('Checking for existing loader: %s', dotSmugglerFile);
if (existsSync(dotSmugglerFile)) {
  debug('Existing loader found: %s', dotSmugglerFile);
  process.exit(0);
}

debug('Creating .smuggler dir: %s', dotSmugglerDir);
mkdirSync(dotSmugglerDir, { recursive: true });

debug('Copying %s to %s', resourcesFile, dotSmugglerFile);
writeFileSync(dotSmugglerFile, readFileSync(resourcesFile));
