const { expect } = require('chai');
const { spawnSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('test-shared-libs.sh runner validation', () => {
  const scriptPath = path.resolve(__dirname, '../../../../../scripts/ci/test-shared-libs.sh');
  let mockLibsDir;

  beforeEach(async () => {
    // Use os.tmpdir() to avoid leaving mock dirs in the working tree if a test crashes
    mockLibsDir = path.join(os.tmpdir(), `test-shared-libs-${Date.now()}`);
    await fs.ensureDir(mockLibsDir);
  });

  afterEach(async () => {
    await fs.remove(mockLibsDir);
  });

  const createMockLib = async (name, testScript) => {
    const libPath = path.join(mockLibsDir, name);
    await fs.ensureDir(libPath);
    await fs.writeJson(path.join(libPath, 'package.json'), {
      name: name,
      scripts: {
        test: testScript
      }
    });
  };

  const runScript = () => {
    return spawnSync('bash', [scriptPath], {
      cwd: path.resolve(__dirname, '../../../../../'),
      env: {
        ...process.env,
        LIBS_DIR: mockLibsDir
      },
      encoding: 'utf8'
    });
  };

  it('should exit with 0 when all libraries pass', async () => {
    await createMockLib('pass-1', 'exit 0');
    await createMockLib('pass-2', 'exit 0');

    const result = runScript();

    expect(result.status).to.equal(0);
    expect(result.stdout).to.contain('Starting Shared Libs Unit Tests...');
    expect(result.stdout).to.contain('Shared Libs Test Suite Complete');
    expect(result.stdout).to.not.contain('ERROR: The following');
  });

  it('should exit with non-zero when a library fails', async () => {
    await createMockLib('pass-1', 'exit 0');
    await createMockLib('fail-1', 'exit 1');

    const result = runScript();

    expect(result.status).to.not.equal(0);
    expect(result.stdout).to.contain(`shared-lib 'fail-1' FAILED`);
    expect(result.stderr).to.contain('ERROR: The following 1 shared lib(s) failed');
  });

  it('should report multiple failures and return error code', async () => {
    await createMockLib('fail-1', 'exit 1');
    await createMockLib('fail-2', 'exit 2');

    const result = runScript();

    expect(result.status).to.not.equal(0);
    expect(result.stderr).to.contain('ERROR: The following 2 shared lib(s) failed');
  });

  it('should skip directories without package.json or test script', async () => {
    await fs.ensureDir(path.join(mockLibsDir, 'empty-dir'));
    await fs.ensureDir(path.join(mockLibsDir, 'no-test-script'));
    await fs.writeJson(path.join(mockLibsDir, 'no-test-script', 'package.json'), { name: 'no-test' });

    const result = runScript();

    expect(result.status).to.equal(0);
    expect(result.stdout).to.not.contain('empty-dir');
    expect(result.stdout).to.not.contain('no-test-script');
  });

  it('should parse realistic Mocha failure output and include test name in summary', async () => {
    // This test exercises the sed+awk parsing pipeline (lines 62-87 of the script).
    // The mock lib echoes realistic Mocha-style output to ensure the parser
    // correctly extracts failing test names from the structured output.
    const mochaOutput = [
      '  1 failing',
      '',
      '  1) my suite',
      '       failing test name:',
      '     Error: something went wrong',
      '      at Context.<anonymous> (test.spec.js:10:5)',
    ].join('\\n');

    await createMockLib('mocha-fail', `echo -e "${mochaOutput}"; exit 1`);

    const result = runScript();

    expect(result.status).to.not.equal(0);
    // The awk pipeline should have extracted the test name into the summary
    expect(result.stderr).to.contain('failing test name');
  });

  it('should exit 0 silently when LIBS_DIR does not exist', () => {
    // Documents the behaviour: a non-existent LIBS_DIR causes the glob to expand
    // literally and [[ -d ]] skips it, so the script exits 0 with no work done.
    // This test ensures a future change doesn't accidentally turn it into a hard error.
    const result = spawnSync('bash', [scriptPath], {
      cwd: path.resolve(__dirname, '../../../../../'),
      env: {
        ...process.env,
        LIBS_DIR: '/tmp/this-path-does-not-exist-xyz123'
      },
      encoding: 'utf8'
    });

    expect(result.status).to.equal(0);
    expect(result.stderr).to.not.contain('ERROR');
  });
});
