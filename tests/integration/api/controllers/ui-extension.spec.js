const { expect } = require('chai');
const utils = require('@utils');

describe('UI Extension', () => {
  after(async () => {
    await utils.revertDb([], true);
  });

  describe('GET /ui-extension', () => {
    it('returns 200 with list of extensions', async () => {
      await utils.saveDocs([
        {
          _id: 'ui-extension:integration-test-ext',
          name: 'Integration Test Extension',
          version: '1.0'
        },
        { _id: 'ui-extension:another-ext' }
      ]);
      
      const response = await utils.request({ path: '/ui-extension' });
      expect(response).to.deep.equal([
        { id: 'another-ext' },
        {
          id: 'integration-test-ext',
          name: 'Integration Test Extension',
          version: '1.0'
        }
      ]);
    });
  });

  describe('GET /ui-extension/:name', () => {
    it('returns 404 for unknown extension', async () => {
      await expect(utils.request({ path: '/ui-extension/unknown-ext' })).to.eventually.be.rejectedWith({
        code: 404,
        error: 'Not Found',
      });
    });

    it('returns 200 and script data for known extension', async () => {
      const scriptContent = 'console.log("integration-test-ext");';
      await utils.saveDoc({
        _id: 'ui-extension:integration-test-ext-script',
        _attachments: {
          'extension.js': {
            content_type: 'application/javascript',
            data: Buffer.from(scriptContent).toString('base64')
          }
        }
      });
      
      const response = await utils.request({
        path: '/ui-extension/integration-test-ext-script',
        headers: { Accept: 'application/javascript' }
      });
      expect(response).to.equal(scriptContent);
    });
  });
});
