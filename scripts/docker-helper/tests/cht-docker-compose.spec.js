'use strict';

const { spawnSync, spawn } = require('child_process');
const { expect } = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '../cht-docker-compose.sh');

const run = (args = []) => spawnSync('bash', [SCRIPT, ...args], { encoding: 'utf8' });

describe('cht-docker-compose.sh', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cht-docker-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const spawnInTmp = (args) => spawn(
    'bash',
    [SCRIPT, ...args],
    { cwd: tmpDir, env: { ...process.env, HOME: tmpDir } }
  );

  describe('--help / -h flags', () => {
    it('--help exits 0 and documents --project-name and --cht-version', () => {
      const result = run(['--help']);
      expect(result.status).to.equal(0);
      expect(result.stdout).to.include('--project-name');
      expect(result.stdout).to.include('--cht-version');
    });

    it('-h exits 0 and documents --project-name and --cht-version', () => {
      const result = run(['-h']);
      expect(result.status).to.equal(0);
      expect(result.stdout).to.include('--project-name');
      expect(result.stdout).to.include('--cht-version');
    });
  });

  describe('unknown flag', () => {
    it('exits 1 and prints Unknown option', () => {
      const result = run(['--unknown-flag']);
      expect(result.status).to.equal(1);
      expect(result.stdout + result.stderr).to.include('Unknown option');
    });
  });

  describe('positional .env file (backwards compatibility)', () => {
    it('shows filename in error when file does not exist', () => {
      const result = run(['doesnotexist.env']);
      expect(result.stdout + result.stderr).to.include('doesnotexist.env');
    });
  });

  describe('--project-name flag', () => {
    it('creates env file named after the project', (done) => {
      const child = spawnInTmp(['--project-name', 'newproject']);
      setTimeout(() => {
        child.kill();
        expect(fs.existsSync(path.join(tmpDir, 'newproject.env'))).to.be.true;
        done();
      }, 5000);
    }).timeout(10000);

    it('env file contains expected CHT fields', (done) => {
      const child = spawnInTmp(['--project-name', 'fieldtest']);
      setTimeout(() => {
        child.kill();
        const envFile = path.join(tmpDir, 'fieldtest.env');
        expect(fs.existsSync(envFile)).to.be.true;
        const content = fs.readFileSync(envFile, 'utf8');
        expect(content).to.include('CHT_COMPOSE_PROJECT_NAME=fieldtest');
        expect(content).to.include('NGINX_HTTP_PORT');
        expect(content).to.include('COUCHDB_USER=medic');
        done();
      }, 5000);
    }).timeout(10000);

    it('sanitizes uppercase and special characters in project name', (done) => {
      const child = spawnInTmp(['--project-name', 'My-Test']);
      setTimeout(() => {
        child.kill();
        expect(fs.existsSync(path.join(tmpDir, 'my_test.env'))).to.be.true;
        done();
      }, 5000);
    }).timeout(10000);

    it('-n short form creates env file', (done) => {
      const child = spawnInTmp(['-n', 'shortform']);
      setTimeout(() => {
        child.kill();
        expect(fs.existsSync(path.join(tmpDir, 'shortform.env'))).to.be.true;
        done();
      }, 5000);
    }).timeout(10000);

    it('does not overwrite an existing env file', (done) => {
      const envPath = path.join(tmpDir, 'existing.env');
      fs.writeFileSync(envPath, 'EXISTING=yes\n');
      const child = spawnInTmp(['--project-name', 'existing']);
      setTimeout(() => {
        child.kill();
        expect(fs.readFileSync(envPath, 'utf8')).to.equal('EXISTING=yes\n');
        done();
      }, 3000);
    }).timeout(8000);
  });

  describe('--cht-version / -V flag', () => {
    it('--project-name with --cht-version creates env file', (done) => {
      const child = spawnInTmp(['--project-name', 'vtest', '--cht-version', '4.10.0']);
      setTimeout(() => {
        child.kill();
        expect(fs.existsSync(path.join(tmpDir, 'vtest.env'))).to.be.true;
        done();
      }, 5000);
    }).timeout(10000);

    it('-V short form accepted alongside --project-name', (done) => {
      const child = spawnInTmp(['--project-name', 'vshort', '-V', '4.10.0']);
      setTimeout(() => {
        child.kill();
        expect(fs.existsSync(path.join(tmpDir, 'vshort.env'))).to.be.true;
        done();
      }, 5000);
    }).timeout(10000);
  });
});
