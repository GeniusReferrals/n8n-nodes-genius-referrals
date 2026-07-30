'use strict';

const { createHash } = require('node:crypto');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { basename, join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

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
        commit: APPROVED_RELEASE.commit,
        sha256: APPROVED_RELEASE.sha256,
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

        if (arg === '--package-name') {
            options.packageName = next();
        } else if (arg === '--version') {
            options.version = next();
        } else if (arg === '--commit') {
            options.commit = next();
        } else if (arg === '--sha256') {
            options.sha256 = next();
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

function assertApprovedIdentity(options) {
    const checks = [
        ['package name', options.packageName, APPROVED_RELEASE.packageName],
        ['version', options.version, APPROVED_RELEASE.version],
        ['commit', options.commit, APPROVED_RELEASE.commit],
        ['sha256', options.sha256, APPROVED_RELEASE.sha256],
    ];

    for (const [label, actual, expected] of checks) {
        if (actual !== expected) {
            throw new Error(`Refusing ${label} mismatch. Expected ${expected}, got ${actual}`);
        }
    }
}

function findRepoRoot() {
    return runCapture('git', ['rev-parse', '--show-toplevel'], process.cwd());
}

function sha256File(path) {
    return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function writeSummary(path, summary) {
    if (!path) {
        return;
    }

    require('node:fs').writeFileSync(path, `${JSON.stringify(summary, null, 2)}\n`);
}

function verifyPackageJson(sourceDir, options) {
    const packageJson = JSON.parse(readFileSync(join(sourceDir, 'package.json'), 'utf8'));

    if (packageJson.name !== options.packageName) {
        throw new Error(`package.json name mismatch. Expected ${options.packageName}, got ${packageJson.name}`);
    }

    if (packageJson.version !== options.version) {
        throw new Error(`package.json version mismatch. Expected ${options.version}, got ${packageJson.version}`);
    }
}

function parsePackOutput(stdout, packDir) {
    try {
        const parsed = JSON.parse(stdout);
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;

        if (entry && entry.filename) {
            return join(packDir, entry.filename);
        }
    } catch (error) {
        throw new Error(`Unable to parse npm pack JSON output: ${error.message}`);
    }

    throw new Error('npm pack did not report a tarball filename');
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const summary = {
        approved: APPROVED_RELEASE,
        status: 'started',
        commands: [],
    };

    assertApprovedIdentity(options);

    const repoRoot = findRepoRoot();
    const workRoot = mkdtempSync(join(tmpdir(), 'n8n-approved-release-'));
    const sourceDir = join(workRoot, 'source');
    const packDir = options.packDestination ?? join(workRoot, 'pack');

    try {
        run('git', ['cat-file', '-e', `${options.commit}^{commit}`], { cwd: repoRoot });
        run('git', ['clone', '--no-hardlinks', '--quiet', repoRoot, sourceDir], { cwd: repoRoot });
        run('git', ['checkout', '--detach', '--quiet', options.commit], { cwd: sourceDir });

        const checkedOutCommit = runCapture('git', ['rev-parse', 'HEAD'], sourceDir);
        if (checkedOutCommit !== options.commit) {
            throw new Error(`Checked-out commit mismatch. Expected ${options.commit}, got ${checkedOutCommit}`);
        }

        verifyPackageJson(sourceDir, options);

        run('npm', ['ci', '--include=dev'], { cwd: sourceDir });
        summary.commands.push('npm ci --include=dev: PASS');

        run('npm', ['run', 'build'], { cwd: sourceDir });
        summary.commands.push('npm run build: PASS');

        run('npm', ['run', 'lint'], { cwd: sourceDir });
        summary.commands.push('npm run lint: PASS');

        run('npm', ['test'], { cwd: sourceDir });
        summary.commands.push('npm test: PASS');

        run('mkdir', ['-p', packDir], { cwd: sourceDir });
        const packResult = run('npm', ['pack', '--pack-destination', packDir, '--json'], {
            cwd: sourceDir,
            capture: true,
        });
        summary.commands.push('npm pack --json: PASS');

        const tarballPath = parsePackOutput(packResult.stdout, packDir);
        const computedSha256 = sha256File(tarballPath);

        run('npm', ['publish', '--dry-run', '--access', 'public', tarballPath], { cwd: sourceDir });
        summary.commands.push('npm publish --dry-run --access public <tarball>: PASS');

        summary.tarball = {
            path: tarballPath,
            filename: basename(tarballPath),
            sha256: computedSha256,
        };

        if (computedSha256 !== options.sha256) {
            summary.status = 'failed';
            summary.error = `Package SHA-256 mismatch. Expected ${options.sha256}, got ${computedSha256}`;
            writeSummary(options.summaryFile, summary);
            throw new Error(summary.error);
        }

        summary.status = 'passed';
        writeSummary(options.summaryFile, summary);
        console.log(`Verified ${options.packageName}@${options.version} from ${options.commit}`);
        console.log(`Tarball SHA-256: ${computedSha256}`);
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
