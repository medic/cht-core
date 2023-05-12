const sinon = require('sinon');
require('chai').use(require('chai-as-promised'));
const rewire = require('rewire');
const { expect } = require('chai');
const utils = rewire('../../../src/js/bootstrapper/utils');

/** global window  **/

describe('utils', () => {
  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    utils.setOptions({ remote_headers: { head: 'er' } });
    window.location = {
      hostname: 'localhost',
      port: '5984',
      protocol: 'http:',
    };
  });

  describe('fetchJSON', () => {
    it('should return json response when successful', async () => {
      const response = {
        ok: true,
        json: sinon.stub().resolves({ the: 'response' }),
      };
      const fetch = sinon.stub().resolves(response);

      utils.__set__('fetch', fetch);

      const result = await utils.fetchJSON('/the/path');

      expect(result).to.deep.equal({ the: 'response' });
      expect(fetch.args).to.deep.equal([[
        'http://localhost:5984/the/path',
        { credentials: 'same-origin', headers: { head: 'er' } },
      ]]);
    });

    it('should throw json response when failed', async () => {
      const response = {
        json: sinon.stub().resolves({ the: 'error' }),
      };
      const fetch = sinon.stub().resolves(response);
      utils.__set__('fetch', fetch);

      try {
        await utils.fetchJSON('/the/path');
        expect.fail();
      } catch (err) {
        expect(err).to.deep.equal({ the: 'error' });
      }
    });
  });
});
