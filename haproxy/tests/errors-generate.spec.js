const { expect } = require('chai');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { dir: tmpDir } = require('tmp-promise');

describe('HAProxy error pages generation', () => {
  let tempWorkDir;
  let actualErrorsDir;
  let tempErrorsDir;

  before(async () => {
    const testDir = path.resolve(__dirname, '..');
    actualErrorsDir = path.resolve(testDir, '..', 'haproxy/errors');
    
    tempWorkDir = await tmpDir({ unsafeCleanup: true });
    tempErrorsDir = path.join(tempWorkDir.path, 'haproxy/errors');
    
    await fs.mkdirp(tempErrorsDir);
    await fs.copy(
      path.join(actualErrorsDir, 'generate.sh'), 
      path.join(tempErrorsDir, 'generate.sh')
    );
    await fs.copy(
      path.join(actualErrorsDir, 'template.json'), 
      path.join(tempErrorsDir, 'template.json')
    );
    
    execSync(`chmod +x ${path.join(tempErrorsDir, 'generate.sh')}`);
  });

  after(async () => {
    if (tempWorkDir) {
      await tempWorkDir.cleanup();
    }
  });

  it('errors/generate.sh should be possible to run', () => {
    const result = execSync(`${path.join(tempErrorsDir, 'generate.sh')}`, { encoding: 'utf8' });
    expect(result).to.not.be.undefined;
  });

  it('correct number of http files', () => {
    execSync(`${path.join(tempErrorsDir, 'generate.sh')}`, { stdio: 'ignore' });
    
    const actualFiles = fs.readdirSync(actualErrorsDir).filter(file => file.endsWith('.http'));
    const tempFiles = fs.readdirSync(tempErrorsDir).filter(file => file.endsWith('.http'));
    
    expect(tempFiles.length).to.equal(actualFiles.length);
  });

  it('file content should match for all error files', () => {
    execSync(`${path.join(tempErrorsDir, 'generate.sh')}`, { stdio: 'ignore' });
    
    const actualFiles = fs.readdirSync(actualErrorsDir).filter(file => file.endsWith('.http'));
    
    expect(actualFiles.length).to.be.greaterThan(0);
    
    actualFiles.forEach(filename => {
      const actualContent = fs.readFileSync(path.join(actualErrorsDir, filename), 'utf8');
      const tempContent = fs.readFileSync(path.join(tempErrorsDir, filename), 'utf8');
      expect(tempContent).to.equal(actualContent);
    });
  });
});
