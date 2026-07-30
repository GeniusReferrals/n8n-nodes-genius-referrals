'use strict';

const { createHash } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { get } = require('node:https');
const { resolve } = require('node:path');

const {
  classifyRegistryVersion,
  readReleaseManifest,
  writeJsonFile,
} = require('./release-controls.cjs');

function parseArgs(argv) {
  const options = {
    manifestPath: 'release-manifest.json',
    registry: 'https://registry.npmjs.org',
    allowMissing: false,
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
    } else if (arg === '--registry') {
      options.registry = next().replace(/\/$/, '');
    } else if (arg === '--allow-missing') {
      options.allowMissing = true;
    } else if (arg === '--summary-file') {
      options.summaryFile = resolve(next());
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function fetchUrl(url, responseType = 'json') {
  return new Promise((resolvePromise, reject) => {
    get(
      url,
      {
        headers: {
          Accept: responseType === 'json' ? 'application/json' : 'application/octet-stream',
          'User-Agent': 'n8n-nodes-genius-referrals-release-verifier',
        },
      },
      (response) => {
        if (response.statusCode === 404) {
          response.resume();
          resolvePromise({ statusCode: 404, body: null });
          return;
        }

        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            reject(new Error(`GET ${url} failed with HTTP ${response.statusCode}: ${Buffer.concat(chunks).toString('utf8')}`));
          });
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          if (responseType === 'buffer') {
            resolvePromise({ statusCode: response.statusCode, body: buffer });
            return;
          }

          try {
            resolvePromise({
              statusCode: response.statusCode,
              body: JSON.parse(buffer.toString('utf8')),
            });
          } catch (error) {
            reject(new Error(`Unable to parse JSON from ${url}: ${error.message}`));
          }
        });
      },
    ).on('error', reject);
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = readReleaseManifest(options.manifestPath);
  const encodedName = encodeURIComponent(manifest.package.name).replace(/^%40/, '@');
  const metadataUrl = `${options.registry}/${encodedName}`;
  const summary = {
    manifestPath: manifest.manifestPath,
    registry: options.registry,
    metadataUrl,
    package: manifest.package,
    source: manifest.source,
    release: manifest.release,
    status: 'started',
  };

  const metadataResponse = await fetchUrl(metadataUrl);
  if (metadataResponse.statusCode === 404) {
    summary.status = 'missing';
    writeJsonFile(options.summaryFile, summary);

    if (options.allowMissing) {
      console.log(`${manifest.package.name} is not present on ${options.registry}`);
      return;
    }

    throw new Error(`${manifest.package.name} is not present on ${options.registry}`);
  }

  const metadata = metadataResponse.body;
  const registryStatus = classifyRegistryVersion(metadata, manifest, options.allowMissing);
  if (registryStatus !== 'published') {
    summary.status = registryStatus.replace('-fail', '');
    writeJsonFile(options.summaryFile, summary);

    if (options.allowMissing) {
      console.log(`${manifest.package.name}@${manifest.package.version} is not present on ${options.registry}`);
      return;
    }

    throw new Error(`${manifest.package.name}@${manifest.package.version} is not present on ${options.registry}`);
  }

  const versionMetadata = metadata.versions[manifest.package.version];
  const dist = versionMetadata.dist || {};
  if (!dist.tarball) {
    throw new Error(`Registry metadata for ${manifest.package.name}@${manifest.package.version} does not include a tarball URL`);
  }

  const tarballResponse = await fetchUrl(dist.tarball, 'buffer');
  const tarballSha256 = createHash('sha256').update(tarballResponse.body).digest('hex');

  summary.status = 'published';
  summary.package = {
    name: versionMetadata.name,
    version: versionMetadata.version,
  };
  summary.dist = {
    integrity: dist.integrity || null,
    shasum: dist.shasum || null,
    tarball: dist.tarball,
    attestations: dist.attestations || null,
  };
  summary.tarball = {
    sha256: tarballSha256,
  };

  if (versionMetadata.name !== manifest.package.name) {
    throw new Error(`Registry package name mismatch. Expected ${manifest.package.name}, got ${versionMetadata.name}`);
  }

  if (versionMetadata.version !== manifest.package.version) {
    throw new Error(`Registry package version mismatch. Expected ${manifest.package.version}, got ${versionMetadata.version}`);
  }

  if (tarballSha256 !== manifest.artifact.sha256) {
    summary.status = 'failed';
    summary.error = `Registry tarball SHA-256 mismatch. Expected ${manifest.artifact.sha256}, got ${tarballSha256}`;
    writeJsonFile(options.summaryFile, summary);
    throw new Error(summary.error);
  }

  if (manifest.artifact.sha512 && dist.integrity && dist.integrity !== manifest.artifact.sha512) {
    summary.status = 'failed';
    summary.error = `Registry integrity mismatch. Expected ${manifest.artifact.sha512}, got ${dist.integrity}`;
    writeJsonFile(options.summaryFile, summary);
    throw new Error(summary.error);
  }

  writeJsonFile(options.summaryFile, summary);
  console.log(`Verified ${manifest.package.name}@${manifest.package.version} on ${options.registry}`);
  console.log(`Registry tarball SHA-256: ${tarballSha256}`);

  if (dist.integrity) {
    console.log(`Registry integrity: ${dist.integrity}`);
  }

  if (dist.attestations) {
    console.log(`Registry attestations: ${JSON.stringify(dist.attestations)}`);
  } else {
    console.log('Registry attestations: unavailable in package metadata');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
