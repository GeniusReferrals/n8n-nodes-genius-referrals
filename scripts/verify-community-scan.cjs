'use strict';

const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const {
  readReleaseManifest,
  writeJsonFile,
} = require('./release-controls.cjs');

function parseArgs(argv) {
  const options = {
    manifestPath: 'release-manifest.json',
    summaryFile: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value for ${arg}`);
      }

      return argv[index];
    };

    if (arg === '--manifest') {
      options.manifestPath = next();
    } else if (arg === '--summary-file') {
      options.summaryFile = resolve(next());
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function scanOutputPassed(output) {
  return !String(output).includes('has failed security checks');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = readReleaseManifest(options.manifestPath);
  const command = 'npx';
  const args = ['@n8n/scan-community-package@beta', manifest.package.name];
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const output = `${stdout}${stderr}`;

  if (stdout) {
    process.stdout.write(stdout);
  }

  if (stderr) {
    process.stderr.write(stderr);
  }

  const summary = {
    manifestPath: manifest.manifestPath,
    package: manifest.package,
    command: `${command} ${args.join(' ')}`,
    status: 'started',
  };

  if (result.error) {
    summary.status = 'failed';
    summary.error = result.error.message;
    writeJsonFile(options.summaryFile, summary);
    throw result.error;
  }

  if (result.status !== 0) {
    summary.status = 'failed';
    summary.error = `${summary.command} failed with exit code ${result.status}`;
    writeJsonFile(options.summaryFile, summary);
    throw new Error(summary.error);
  }

  if (!scanOutputPassed(output)) {
    summary.status = 'failed';
    summary.error = 'Community package scanner reported failed security checks';
    writeJsonFile(options.summaryFile, summary);
    throw new Error(summary.error);
  }

  summary.status = 'passed';
  writeJsonFile(options.summaryFile, summary);
  console.log(`Verified community package scan for ${manifest.package.name}@${manifest.package.version}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  scanOutputPassed,
};
