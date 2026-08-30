'use strict';

const { mkdirSync, mkdtempSync, rmSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { basename, join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  assertNoNpmTokenEnv,
  assertSupportedToolchain,
  readReleaseManifest,
  sha256File,
  sha512IntegrityFile,
  writeJsonFile,
} = require('./release-controls.cjs');

function parseArgs(argv) {
  const options = {
    manifestPath: 'release-manifest.json',
    packDestination: null,
    summaryFile: null,
    keepWorkdir: false,
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
    } else if (arg === '--pack-destination') {
      options.packDestination = resolve(next());
    } else if (arg === '--summary-file') {
      options.summaryFile = resolve(next());
    } else if (arg === '--keep-workdir') {
      options.keepWorkdir = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function runRaw(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      npm_config_loglevel: 'notice',
    },
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
}

function commandFailure(command, args, result, capture) {
  const detail = capture
    ? `\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    : '';
  const error = new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}${detail}`);
  error.stdout = result.stdout ?? '';
  error.stderr = result.stderr ?? '';
  error.status = result.status;
  return error;
}

function run(command, args, options = {}) {
  const result = runRaw(command, args, options);

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw commandFailure(command, args, result, options.capture);
  }

  return result;
}

function runCapture(command, args, cwd) {
  return run(command, args, { cwd, capture: true }).stdout.trim();
}

function findRepoRoot() {
  return runCapture('git', ['rev-parse', '--show-toplevel'], process.cwd());
}

function commitExists(cwd, commit) {
  const result = runRaw('git', ['cat-file', '-e', `${commit}^{commit}`], { cwd, capture: true });
  if (result.error || result.status !== 0) {
    return false;
  }

  const treeResult = runRaw('git', ['cat-file', '-e', `${commit}^{tree}`], { cwd, capture: true });

  return !treeResult.error && treeResult.status === 0;
}

function listGitRemotes(cwd) {
  const result = runRaw('git', ['remote'], { cwd, capture: true });

  if (result.error || result.status !== 0) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((remote) => remote.trim())
    .filter(Boolean);
}

function isShallowRepository(cwd) {
  const result = runRaw('git', ['rev-parse', '--is-shallow-repository'], { cwd, capture: true });

  return !result.error && result.status === 0 && result.stdout.trim() === 'true';
}

function summarizeFetchAttempt(args, result) {
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim().replace(/\s+/g, ' ');
  const suffix = output ? `: ${output.slice(0, 240)}` : '';

  return `git ${args.join(' ')} -> ${result.status ?? 'error'}${result.error ? `: ${result.error.message}` : suffix}`;
}

function fetchMissingCommit(cwd, commit) {
  const remotes = listGitRemotes(cwd);
  const attempts = [];

  for (const remote of remotes) {
    const fetchAttempts = [];

    if (isShallowRepository(cwd)) {
      fetchAttempts.push(['fetch', '--no-tags', '--unshallow', remote]);
      fetchAttempts.push(['fetch', '--no-tags', '--deepen=1000', remote]);
    }

    fetchAttempts.push(['fetch', '--no-tags', remote, commit]);
    fetchAttempts.push(['fetch', '--no-tags', remote, `+refs/heads/*:refs/remotes/${remote}/*`]);

    for (const args of fetchAttempts) {
      const result = runRaw('git', args, { cwd, capture: true });
      attempts.push(summarizeFetchAttempt(args, result));

      if (commitExists(cwd, commit)) {
        return {
          fetched: true,
          attempts,
        };
      }
    }
  }

  return {
    fetched: false,
    attempts,
  };
}

function ensureGitCommitAvailable(cwd, commit) {
  if (commitExists(cwd, commit)) {
    return {
      available: true,
      fetched: false,
      attempts: [],
    };
  }

  const result = fetchMissingCommit(cwd, commit);
  if (commitExists(cwd, commit)) {
    return {
      available: true,
      fetched: result.fetched,
      attempts: result.attempts,
    };
  }

  const detail = result.attempts.length > 0
    ? ` Fetch attempts: ${result.attempts.join(' | ')}`
    : ' No Git remotes are configured for source commit recovery.';
  throw new Error(`Release source commit ${commit} is not available in this checkout.${detail}`);
}

function checkoutReleaseSource({ repoRoot, sourceDir, sourceCommit }) {
  const rootAvailability = ensureGitCommitAvailable(repoRoot, sourceCommit);

  run('git', ['clone', '--no-hardlinks', '--quiet', repoRoot, sourceDir], { cwd: repoRoot });
  const sourceAvailability = ensureGitCommitAvailable(sourceDir, sourceCommit);
  run('git', ['checkout', '--detach', '--quiet', sourceCommit], { cwd: sourceDir });

  return {
    rootAvailability,
    sourceAvailability,
  };
}

function verifyPackageJson(sourceDir, manifest) {
  const packageJson = JSON.parse(readFileSync(join(sourceDir, 'package.json'), 'utf8'));

  if (packageJson.name !== manifest.package.name) {
    throw new Error(`package.json name mismatch. Expected ${manifest.package.name}, got ${packageJson.name}`);
  }

  if (packageJson.version !== manifest.package.version) {
    throw new Error(`package.json version mismatch. Expected ${manifest.package.version}, got ${packageJson.version}`);
  }

  if (packageJson.scripts?.lint !== 'n8n-node lint') {
    throw new Error('Release source must enforce real n8n lint with "n8n-node lint"');
  }
}

function parsePackOutput(stdout, packDir) {
  const parsed = JSON.parse(stdout);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;

  if (!entry?.filename) {
    throw new Error('npm pack did not report a tarball filename');
  }

  return {
    tarballPath: join(packDir, entry.filename),
    files: Array.isArray(entry.files) ? entry.files : [],
    integrity: entry.integrity ?? null,
    shasum: entry.shasum ?? null,
    unpackedSize: entry.unpackedSize ?? null,
    packedSize: entry.size ?? null,
  };
}

function isAlreadyPublishedDryRunError(error, manifest) {
  const output = `${error?.message ?? ''}\n${error?.stdout ?? ''}\n${error?.stderr ?? ''}`;

  return (
    output.includes('You cannot publish over the previously published versions') &&
    output.includes(manifest.package.version)
  );
}

function parseNpmViewDist(stdout) {
  const parsed = JSON.parse(stdout);

  return {
    integrity: parsed['dist.integrity'] ?? parsed.integrity ?? null,
    tarball: parsed['dist.tarball'] ?? parsed.tarball ?? null,
  };
}

function verifyAlreadyPublishedRegistryState({ manifest, computedSha512, sourceDir }) {
  const viewResult = run(
    'npm',
    ['view', `${manifest.package.name}@${manifest.package.version}`, 'dist.integrity', 'dist.tarball', '--json'],
    {
      cwd: sourceDir,
      capture: true,
    },
  );
  const dist = parseNpmViewDist(viewResult.stdout);

  if (!dist.integrity) {
    throw new Error(`Registry metadata for ${manifest.package.name}@${manifest.package.version} is missing dist.integrity`);
  }

  if (dist.integrity !== computedSha512) {
    throw new Error(
      `Registry integrity mismatch for already published ${manifest.package.name}@${manifest.package.version}. ` +
        `Expected prepared tarball ${computedSha512}, got ${dist.integrity}`,
    );
  }

  if (manifest.artifact.sha512 && dist.integrity !== manifest.artifact.sha512) {
    throw new Error(
      `Registry integrity mismatch for manifest ${manifest.package.name}@${manifest.package.version}. ` +
        `Expected ${manifest.artifact.sha512}, got ${dist.integrity}`,
    );
  }

  return dist;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  assertNoNpmTokenEnv(process.env);

  const nodeVersion = process.version;
  const npmVersion = runCapture('npm', ['--version'], process.cwd());
  assertSupportedToolchain(nodeVersion, npmVersion);

  const manifest = readReleaseManifest(options.manifestPath);
  const summary = {
    manifestPath: manifest.manifestPath,
    status: 'started',
    package: manifest.package,
    source: manifest.source,
    release: manifest.release,
    toolchain: {
      node: nodeVersion,
      npm: npmVersion,
    },
    workflow: {
      repository: process.env.GITHUB_REPOSITORY ?? null,
      sha: process.env.GITHUB_SHA ?? null,
      runId: process.env.GITHUB_RUN_ID ?? null,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
      artifactId: process.env.PREPARED_ARTIFACT_ID ?? null,
    },
    commands: [],
  };

  const repoRoot = findRepoRoot();
  const workRoot = mkdtempSync(join(tmpdir(), 'n8n-release-prepare-'));
  const sourceDir = join(workRoot, 'source');
  const packDir = options.packDestination ?? join(workRoot, 'pack');

  try {
    const checkoutAvailability = checkoutReleaseSource({
      repoRoot,
      sourceDir,
      sourceCommit: manifest.source.commit,
    });
    if (checkoutAvailability.rootAvailability.fetched) {
      summary.commands.push('git fetch missing source commit: PASS');
    }
    if (checkoutAvailability.sourceAvailability.fetched) {
      summary.commands.push('git fetch source commit into release workdir: PASS');
    }

    const checkedOutCommit = runCapture('git', ['rev-parse', 'HEAD'], sourceDir);
    if (checkedOutCommit !== manifest.source.commit) {
      throw new Error(`Checked-out commit mismatch. Expected ${manifest.source.commit}, got ${checkedOutCommit}`);
    }

    verifyPackageJson(sourceDir, manifest);

    run('npm', ['ci', '--include=dev'], { cwd: sourceDir });
    summary.commands.push('npm ci --include=dev: PASS');

    run('npm', ['run', 'build'], { cwd: sourceDir });
    summary.commands.push('npm run build: PASS');

    run('npm', ['run', 'lint'], { cwd: sourceDir });
    summary.commands.push('npm run lint: PASS');

    run('npm', ['test'], { cwd: sourceDir });
    summary.commands.push('npm test: PASS');

    mkdirSync(packDir, { recursive: true });
    const packResult = run('npm', ['pack', '--pack-destination', packDir, '--json'], {
      cwd: sourceDir,
      capture: true,
    });
    summary.commands.push('npm pack --json: PASS');

    const packSummary = parsePackOutput(packResult.stdout, packDir);
    const computedSha256 = sha256File(packSummary.tarballPath);
    const computedSha512 = sha512IntegrityFile(packSummary.tarballPath);

    summary.tarball = {
      path: packSummary.tarballPath,
      filename: basename(packSummary.tarballPath),
      sha256: computedSha256,
      sha512: computedSha512,
      npmIntegrity: packSummary.integrity,
      npmShasum: packSummary.shasum,
      packedSize: packSummary.packedSize,
      unpackedSize: packSummary.unpackedSize,
    };
    summary.files = packSummary.files;

    if (computedSha256 !== manifest.artifact.sha256) {
      summary.status = 'failed';
      summary.error = `Package SHA-256 mismatch. Expected ${manifest.artifact.sha256}, got ${computedSha256}`;
      writeJsonFile(options.summaryFile, summary);
      throw new Error(summary.error);
    }

    if (manifest.artifact.sha512 && computedSha512 !== manifest.artifact.sha512) {
      summary.status = 'failed';
      summary.error = `Package SHA-512 mismatch. Expected ${manifest.artifact.sha512}, got ${computedSha512}`;
      writeJsonFile(options.summaryFile, summary);
      throw new Error(summary.error);
    }

    try {
      const dryRunResult = run('npm', ['publish', '--dry-run', '--access', 'public', packSummary.tarballPath], {
        cwd: sourceDir,
        capture: true,
      });
      if (dryRunResult.stdout) {
        process.stdout.write(dryRunResult.stdout);
      }
      if (dryRunResult.stderr) {
        process.stderr.write(dryRunResult.stderr);
      }
      summary.commands.push('npm publish --dry-run --access public <prepared-tarball>: PASS');
    } catch (error) {
      if (!isAlreadyPublishedDryRunError(error, manifest)) {
        throw error;
      }

      const registryDist = verifyAlreadyPublishedRegistryState({
        manifest,
        computedSha512,
        sourceDir,
      });
      summary.commands.push('npm publish --dry-run --access public <prepared-tarball>: SKIPPED_ALREADY_PUBLISHED');
      summary.registry = {
        status: 'published',
        integrity: registryDist.integrity,
        tarball: registryDist.tarball,
      };
    }

    summary.status = 'passed';
    writeJsonFile(options.summaryFile, summary);
    console.log(`Prepared ${manifest.package.name}@${manifest.package.version} from ${manifest.source.commit}`);
    console.log(`Tarball SHA-256: ${computedSha256}`);
    console.log(`Tarball SHA-512: ${computedSha512}`);
  } catch (error) {
    if (summary.status === 'started') {
      summary.status = 'failed';
      summary.error = error.message;
      writeJsonFile(options.summaryFile, summary);
    }

    throw error;
  } finally {
    if (options.keepWorkdir) {
      console.log(`Kept release workdir: ${workRoot}`);
    } else if (!options.packDestination) {
      rmSync(workRoot, { recursive: true, force: true });
    } else {
      rmSync(sourceDir, { recursive: true, force: true });
    }
  }
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
  checkoutReleaseSource,
  commitExists,
  ensureGitCommitAvailable,
  isAlreadyPublishedDryRunError,
  parseNpmViewDist,
  verifyAlreadyPublishedRegistryState,
};
