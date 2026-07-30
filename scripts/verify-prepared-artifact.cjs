'use strict';

const { existsSync, readdirSync, statSync } = require('node:fs');
const { join, resolve } = require('node:path');

const {
  readReleaseManifest,
  verifyPreparedArtifact,
  writeJsonFile,
} = require('./release-controls.cjs');

function parseArgs(argv) {
  const options = {
    manifestPath: 'release-manifest.json',
    artifactDir: null,
    preparedRunId: null,
    preparedArtifactId: null,
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
    } else if (arg === '--artifact-dir') {
      options.artifactDir = resolve(next());
    } else if (arg === '--prepared-run-id') {
      options.preparedRunId = next();
    } else if (arg === '--prepared-artifact-id') {
      options.preparedArtifactId = next();
    } else if (arg === '--summary-file') {
      options.summaryFile = resolve(next());
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.artifactDir) {
    throw new Error('--artifact-dir is required');
  }

  return options;
}

function findFile(dir, filename) {
  if (!existsSync(dir)) {
    return null;
  }

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      const nested = findFile(fullPath, filename);
      if (nested) {
        return nested;
      }
    } else if (entry === filename) {
      return fullPath;
    }
  }

  return null;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = readReleaseManifest(options.manifestPath);
  const preparationSummaryPath = findFile(options.artifactDir, 'release-preparation.json');
  const result = verifyPreparedArtifact({
    manifest,
    artifactDir: options.artifactDir,
    preparedRunId: options.preparedRunId,
    preparedArtifactId: options.preparedArtifactId,
    preparationSummaryPath,
  });

  writeJsonFile(options.summaryFile, {
    status: 'passed',
    manifestPath: manifest.manifestPath,
    package: manifest.package,
    source: manifest.source,
    release: manifest.release,
    preparedRunId: options.preparedRunId ?? null,
    preparedArtifactId: options.preparedArtifactId ?? null,
    tarball: {
      path: result.tarballPath,
      sha256: result.sha256,
      sha512: result.sha512,
    },
    preparationSummaryPresent: result.summary !== null,
  });

  console.log(`Verified prepared artifact for ${manifest.package.name}@${manifest.package.version}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
