const chai = require('chai');
chai.use(require('chai-exclude'));
const sinon = require('sinon');

const api = require('../api-stub');
const logger = require('../../src/lib/log');
const warnUploadOverwrite = require('../../src/lib/warn-upload-overwrite');
const uploadPrivacyPolicies = require('../../src/fn/upload-privacy-policies');
const environment = require('../../src/lib/environment');
const testProjectDir = './data/upload-privacy-policies/';
const mockTestDir = testDir => sinon.stub(environment, 'pathToProject').get(() => `${testProjectDir}${testDir}`);
const fs = require('fs');

const getDoc = () => api.db.get('privacy-policies', { attachments: true });

describe('upload privacy policies', () => {
  beforeEach(() => {
    sinon.stub(warnUploadOverwrite, 'preUploadDoc');
    sinon.stub(warnUploadOverwrite, 'postUploadDoc');
    sinon.spy(logger, 'info');
    sinon.spy(logger, 'warn');
    return api.start();
  });
  afterEach(() => {
    sinon.restore();
    return api.stop();
  });

  it('should do nothing when no mapping', () => {
    const testDir = `no-mapping`;
    mockTestDir(testDir);
    return uploadPrivacyPolicies
      .execute()
      .then(() => {
        chai.expect(warnUploadOverwrite.preUploadDoc.callCount).to.equal(0);
        chai.expect(warnUploadOverwrite.postUploadDoc.callCount).to.equal(0);
        chai.expect(logger.warn.callCount).to.equal(1);
        const msg = logger.warn.args[0][0];
        chai.expect(msg.startsWith('No policies language mapping file found at path')).to.equal(true);
      })
      .then(() => getDoc())
      .then(() => chai.assert.fail('doc should not exist'))
      .catch(err => {
        chai.expect(err.status).to.equal(404);
      });
  });

  it('should upload no attachments when no attachments folder', () => {
    const testDir = `no-attachments-folder`;
    mockTestDir(testDir);
    warnUploadOverwrite.preUploadDoc.returns(true);
    return uploadPrivacyPolicies
      .execute()
      .then(() => {
        chai.expect(warnUploadOverwrite.preUploadDoc.callCount).to.equal(1);
        chai.expect(warnUploadOverwrite.postUploadDoc.callCount).to.equal(1);
      })
      .then(() => getDoc())
      .then(doc => {
        chai.expect(doc).excluding('_rev').to.deep.equal({
          _id: 'privacy-policies',
          privacy_policies: {},
          _attachments: {},
        });
      });
  });

  it('should overwrite existent file when no attachments', () => {
    const testDir = `no-attachments-folder`;
    mockTestDir(testDir);
    warnUploadOverwrite.preUploadDoc.returns(true);
    const existent = {
      _id: 'privacy-policies',
      privacy_policies: { en: 'att' },
      _attachments: { att: { content_type: 'text/html', data: 'data' } },
    };
    return api.db
      .put(existent)
      .then(() => uploadPrivacyPolicies.execute())
      .then(() => {
        chai.expect(warnUploadOverwrite.preUploadDoc.callCount).to.equal(1);
        chai.expect(warnUploadOverwrite.postUploadDoc.callCount).to.equal(1);
      })
      .then(() => getDoc())
      .then(doc => {
        chai.expect(doc).excluding('_rev').to.deep.equal({
          _id: 'privacy-policies',
          privacy_policies: {},
          _attachments: {},
        });
      });
  });

  it('should work with missing attachments', () => {
    const testDir = `missing-attachments`;
    mockTestDir(testDir);
    warnUploadOverwrite.preUploadDoc.returns(true);
    return uploadPrivacyPolicies
      .execute()
      .then(() => {
        chai.expect(warnUploadOverwrite.preUploadDoc.callCount).to.equal(1);
        chai.expect(warnUploadOverwrite.postUploadDoc.callCount).to.equal(1);
      })
      .then(() => getDoc())
      .then(doc => {
        const en = fs.readFileSync(`${testProjectDir}${testDir}/privacy-policies/attachment.en.html`, 'utf8');
        const ne = fs.readFileSync(`${testProjectDir}${testDir}/privacy-policies/the_ne.html`, 'utf8');
        chai.expect(doc).excludingEvery(['_rev', 'revpos', 'digest']).to.deep.equal({
          _id: 'privacy-policies',
          privacy_policies: {
            en: 'attachment.en.html',
            ne: 'the_ne.html',
          },
          _attachments: {
            'attachment.en.html': {
              content_type: 'text/html',
              data: Buffer.from(en).toString('base64')
            },
            'the_ne.html': {
              content_type: 'text/html',
              data: Buffer.from(ne).toString('base64')
            },
          },
        });
      });
  });

  it('should work with extra attachments', () => {
    const testDir = `extra-attachments`;
    mockTestDir(testDir);
    warnUploadOverwrite.preUploadDoc.returns(true);
    return uploadPrivacyPolicies
      .execute()
      .then(() => {
        chai.expect(warnUploadOverwrite.preUploadDoc.callCount).to.equal(1);
        chai.expect(warnUploadOverwrite.postUploadDoc.callCount).to.equal(1);
      })
      .then(() => getDoc())
      .then(doc => {
        const en = fs.readFileSync(`${testProjectDir}${testDir}/privacy-policies/enen.html`, 'utf8');
        const fr = fs.readFileSync(`${testProjectDir}${testDir}/privacy-policies/frfr.html`, 'utf8');
        const ne = fs.readFileSync(`${testProjectDir}${testDir}/privacy-policies/nene.html`, 'utf8');
        chai.expect(doc).excludingEvery(['_rev', 'revpos', 'digest']).to.deep.equal({
          _id: 'privacy-policies',
          privacy_policies: {
            en: 'enen.html',
            fr: 'frfr.html',
            ne: 'nene.html',
          },
          _attachments: {
            'enen.html': {
              content_type: 'text/html',
              data: Buffer.from(en).toString('base64')
            },
            'frfr.html': {
              content_type: 'text/html',
              data: Buffer.from(fr).toString('base64')
            },
            'nene.html': {
              content_type: 'text/html',
              data: Buffer.from(ne).toString('base64')
            },
          },
        });
      });
  });

  it('should ignore non-html attachments', () => {
    const testDir = `non-html-attachments`;
    mockTestDir(testDir);
    warnUploadOverwrite.preUploadDoc.returns(true);
    return uploadPrivacyPolicies
      .execute()
      .then(() => {
        chai.expect(warnUploadOverwrite.preUploadDoc.callCount).to.equal(1);
        chai.expect(warnUploadOverwrite.postUploadDoc.callCount).to.equal(1);
        chai.expect(logger.warn.callCount).to.equal(2);
        chai.expect(logger.warn.args).to.deep.equal([
          ['Privacy policies attachment files must be of type text/html. Found attachment.fr.txt of type text/plain. Skipping.'],
          ['Privacy policies attachment files must be of type text/html. Found attachment.fr.png of type image/png. Skipping.'],
        ]);
      })
      .then(() => getDoc())
      .then(doc => {
        const en = fs.readFileSync(`${testProjectDir}${testDir}/privacy-policies/attachment.en.html`, 'utf8');
        chai.expect(doc).excludingEvery(['_rev', 'revpos', 'digest']).to.deep.equal({
          _id: 'privacy-policies',
          privacy_policies: {
            en: 'attachment.en.html',
          },
          _attachments: {
            'attachment.en.html': {
              content_type: 'text/html',
              data: Buffer.from(en).toString('base64')
            },
          },
        });
      });
  });

  it('should not upload when no changes', () => {
    const testDir = `non-html-attachments`;
    mockTestDir(testDir);
    warnUploadOverwrite.preUploadDoc.returns(false);
    return uploadPrivacyPolicies
      .execute()
      .then(() => {
        chai.expect(warnUploadOverwrite.preUploadDoc.callCount).to.equal(1);
        chai.expect(warnUploadOverwrite.postUploadDoc.callCount).to.equal(1);
      })
      .then(() => getDoc())
      .then(() => chai.assert.fail('Should have thrown'))
      .catch(err => {
        chai.expect(err.status).to.equal(404);
      });
  });
});
