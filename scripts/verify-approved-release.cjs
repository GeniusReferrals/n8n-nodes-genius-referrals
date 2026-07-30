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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      npm_config_loglevel: 'notice',
    },
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const detail = options.capture
      ? `\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      : '';
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}${detail}`);
  }

  return result;
}

function runCapture(command, args, cwd) {
  return run(command, args, { cwd, capture: true }).stdout.trim();
}

function findRepoRoot() {
  return runCapture('git', ['rev-parse', '--show-toplevel'], process.cwd());
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
    run('git', ['cat-file', '-e', `${manifest.source.commit}^{commit}`], { cwd: repoRoot });
    run('git', ['clone', '--no-hardlinks', '--quiet', repoRoot, sourceDir], { cwd: repoRoot });
    run('git', ['checkout', '--detach', '--quiet', manifest.source.commit], { cwd: sourceDir });

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

    run('npm', ['publish', '--dry-run', '--access', 'public', packSummary.tarballPath], { cwd: sourceDir });
    summary.commands.push('npm publish --dry-run --access public <prepared-tarball>: PASS');

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

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
