'use strict';

const { createHash } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { get } = require('node:https');
const { resolve } = require('node:path');

const APPROVED_RELEASE = {
    packageName: 'n8n-nodes-genius-referrals',
    version: '0.1.0',
    commit: '54d7cb816186d849acf2056bc35d081424f17565',
    sha256: '71128f5b942cd67777c29576a87a0160e67801ed0ee21f937d904d59d36a95e5',
};

function parseArgs(argv) {
    const options = {
        packageName: APPROVED_RELEASE.packageName,
        version: APPROVED_RELEASE.version,
        sha256: APPROVED_RELEASE.sha256,
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

        if (arg === '--package-name') {
            options.packageName = next();
        } else if (arg === '--version') {
            options.version = next();
        } else if (arg === '--sha256') {
            options.sha256 = next();
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

function assertApprovedIdentity(options) {
    const checks = [
        ['package name', options.packageName, APPROVED_RELEASE.packageName],
        ['version', options.version, APPROVED_RELEASE.version],
        ['sha256', options.sha256, APPROVED_RELEASE.sha256],
    ];

    for (const [label, actual, expected] of checks) {
        if (actual !== expected) {
            throw new Error(`Refusing ${label} mismatch. Expected ${expected}, got ${actual}`);
        }
    }
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

function writeSummary(path, summary) {
    if (path) {
        writeFileSync(path, `${JSON.stringify(summary, null, 2)}\n`);
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    assertApprovedIdentity(options);

    const encodedName = encodeURIComponent(options.packageName).replace(/^%40/, '@');
    const metadataUrl = `${options.registry}/${encodedName}`;
    const summary = {
        approved: APPROVED_RELEASE,
        registry: options.registry,
        metadataUrl,
        status: 'started',
    };

    const metadataResponse = await fetchUrl(metadataUrl);
    if (metadataResponse.statusCode === 404) {
        summary.status = 'missing';
        writeSummary(options.summaryFile, summary);

        if (options.allowMissing) {
            console.log(`${options.packageName} is not present on ${options.registry}`);
            return;
        }

        throw new Error(`${options.packageName} is not present on ${options.registry}`);
    }

    const metadata = metadataResponse.body;
    const versionMetadata = metadata.versions && metadata.versions[options.version];
    if (!versionMetadata) {
        summary.status = 'missing-version';
        writeSummary(options.summaryFile, summary);

        if (options.allowMissing) {
            console.log(`${options.packageName}@${options.version} is not present on ${options.registry}`);
            return;
        }

        throw new Error(`${options.packageName}@${options.version} is not present on ${options.registry}`);
    }

    const dist = versionMetadata.dist || {};
    if (!dist.tarball) {
        throw new Error(`Registry metadata for ${options.packageName}@${options.version} does not include a tarball URL`);
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

    if (versionMetadata.name !== options.packageName) {
        throw new Error(`Registry package name mismatch. Expected ${options.packageName}, got ${versionMetadata.name}`);
    }

    if (versionMetadata.version !== options.version) {
        throw new Error(`Registry package version mismatch. Expected ${options.version}, got ${versionMetadata.version}`);
    }

    if (tarballSha256 !== options.sha256) {
        summary.status = 'failed';
        summary.error = `Registry tarball SHA-256 mismatch. Expected ${options.sha256}, got ${tarballSha256}`;
        writeSummary(options.summaryFile, summary);
        throw new Error(summary.error);
    }

    writeSummary(options.summaryFile, summary);
    console.log(`Verified ${options.packageName}@${options.version} on ${options.registry}`);
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
