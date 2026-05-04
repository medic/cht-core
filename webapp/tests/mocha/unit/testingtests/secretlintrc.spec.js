'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { expect } = require('chai');

const SECRETLINTRC = path.resolve(__dirname, '../../../../../scripts/ci/.secretlintrc.json');
const SECRETLINT = path.resolve(__dirname, '../../../../../node_modules/.bin/secretlint');

const KEYWORDS = ['password', 'passwd', 'pass', 'token', 'secret', 'api_key', 'api-key'];
const SAFE_VALUES = ['***', '[REDACTED]', '****'];

const runSecretlint = (line) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secretlint-test-'));
  try {
    const logFile = path.join(tmpDir, 'test.log');
    fs.writeFileSync(logFile, line + '\n', 'utf8');
    const result = spawnSync(SECRETLINT, ['--secretlintrc', SECRETLINTRC, logFile], { stdio: 'pipe' });
    return { flagged: result.status !== 0, stdout: result.stdout.toString() };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
};

describe('scripts/ci/.secretlintrc.json', () => {
  before(() => {
    expect(fs.existsSync(SECRETLINT), `secretlint binary not found at ${SECRETLINT}`).to.be.true;
  });

  describe('query parameter rule', () => {
    for (const kw of KEYWORDS) {
      it(`flags ?${kw}=realvalue`, () => {
        const { flagged, stdout } = runSecretlint(`2024-01-01 GET /api?${kw}=realvalue123`);
        expect(flagged).to.be.true;
        expect(stdout).to.include('error');
      });
    }
    for (const kw of KEYWORDS) {
      for (const safe of SAFE_VALUES) {
        it(`does not flag ?${kw}=${safe}`, () => {
          expect(runSecretlint(`2024-01-01 GET /api?${kw}=${safe}`).flagged).to.be.false;
        });
      }
    }
    it('flags ?password=* (single asterisk is not a mask)', () => {
      const { flagged, stdout } = runSecretlint('2024-01-01 GET /api?password=*');
      expect(flagged).to.be.true;
      expect(stdout).to.include('error');
    });
  });

  describe('JSON key/value rule', () => {
    for (const kw of KEYWORDS) {
      it(`flags {"${kw}":"realvalue"}`, () => {
        const { flagged, stdout } = runSecretlint(`2024-01-01 INFO: {"${kw}":"realvalue123"}`);
        expect(flagged).to.be.true;
        expect(stdout).to.include('error');
      });
    }
    for (const kw of KEYWORDS) {
      for (const safe of SAFE_VALUES) {
        it(`does not flag {"${kw}":"${safe}"}`, () => {
          expect(runSecretlint(`2024-01-01 INFO: {"${kw}":"${safe}"}`).flagged).to.be.false;
        });
      }
    }
    it('flags {"password":"*"} (single asterisk is not a mask)', () => {
      const { flagged, stdout } = runSecretlint('2024-01-01 INFO: {"password":"*"}');
      expect(flagged).to.be.true;
      expect(stdout).to.include('error');
    });
  });

  describe('user:pass@host URL rule', () => {
    it('flags http://user:pass@couchdb:5984', () => {
      const { flagged, stdout } = runSecretlint('2024-01-01 INFO: http://admin:mysecret@couchdb:5984/medic');
      expect(flagged).to.be.true;
      expect(stdout).to.include('error');
    });
    it('flags couchdb://user:pass@localhost (preset basicauth rule misses localhost)', () => {
      const { flagged, stdout } = runSecretlint('2024-01-01 INFO: couchdb://user:pass@localhost:5984');
      expect(flagged).to.be.true;
      expect(stdout).to.include('error');
    });
    it('does not flag URL without credentials', () => {
      expect(runSecretlint('2024-01-01 INFO: GET http://localhost:5984/medic').flagged).to.be.false;
    });
    it('does not flag URL with user but no password', () => {
      expect(runSecretlint('2024-01-01 INFO: connecting http://admin@host').flagged).to.be.false;
    });
  });

  describe('Authorization header rule', () => {
    it('flags Authorization: Basic token', () => {
      const { flagged, stdout } = runSecretlint('2024-01-01 INFO: Authorization: Basic dXNlcjpwYXNz');
      expect(flagged).to.be.true;
      expect(stdout).to.include('error');
    });
    it('flags Authorization: Token abc123', () => {
      const { flagged, stdout } = runSecretlint('2024-01-01 INFO: Authorization: Token abc123def');
      expect(flagged).to.be.true;
      expect(stdout).to.include('error');
    });
    it('flags Authorization: Bearer *abc (single star is not a mask)', () => {
      const { flagged, stdout } = runSecretlint('2024-01-01 INFO: Authorization: Bearer *abc-real-token');
      expect(flagged).to.be.true;
      expect(stdout).to.include('error');
    });
    it('does not flag Authorization: Bearer *** (masked)', () => {
      expect(runSecretlint('2024-01-01 INFO: Authorization: Bearer ***').flagged).to.be.false;
    });
    it('does not flag Authorization: Bearer **** (4-star mask)', () => {
      expect(runSecretlint('2024-01-01 INFO: Authorization: Bearer ****').flagged).to.be.false;
    });
  });
});
