const { expect } = require('chai');
const { spawnSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

describe('test-shared-libs.sh runner validation', () => {
  const scriptPath = path.resolve(__dirname, '../../../scripts/ci/test-shared-libs.sh');
  const mockLibsDir = path.resolve(__dirname, 'mock-shared-libs');

  beforeEach(async () => {
    // Ensure mock directory is clean
    await fs.remove(mockLibsDir);
    await fs.ensureDir(mockLibsDir);
  });

  after(async () => {
    // Cleanup after all tests
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
      cwd: path.resolve(__dirname, '../../../'),
      env: { 
        ...process.env, 
        LIBS_DIR: 'tests/integration/scripts/mock-shared-libs' 
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
    expect(result.stdout).to.contain('shared-lib \'fail-1\' FAILED');
    expect(result.stderr).to.contain('ERROR: The following 1 shared lib(s) failed');
    expect(result.stdout).to.contain('- tests/integration/scripts/mock-shared-libs/fail-1');
  });

  it('should report multiple failures and return error code', async () => {
    await createMockLib('fail-1', 'exit 1');
    await createMockLib('fail-2', 'exit 2');

    const result = runScript();
    
    expect(result.status).to.not.equal(0);
    expect(result.stderr).to.contain('ERROR: The following 2 shared lib(s) failed');
    expect(result.stdout).to.contain('- tests/integration/scripts/mock-shared-libs/fail-1');
    expect(result.stdout).to.contain('- tests/integration/scripts/mock-shared-libs/fail-2');
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
});
