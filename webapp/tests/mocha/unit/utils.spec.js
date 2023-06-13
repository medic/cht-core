const sinon = require('sinon');
require('chai').use(require('chai-as-promised'));
const rewire = require('rewire');
const { expect } = require('chai');
const utils = rewire('../../../src/js/bootstrapper/utils');

describe('utils', () => {

  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    utils.setOptions({ remote_headers: { head: 'er' } });
    utils.__set__('window', { location: {
      hostname: 'localhost',
      port: '5984',
      protocol: 'http:',
    } });
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

  describe('checkApiAccessible', () => {
    it('should return true when successful', async () => {
      const response = {
        ok: true,
      };
      const fetch = sinon.stub().resolves(response);
      utils.__set__('fetch', fetch);

      const result = await utils.checkApiAccessible();

      expect(result).to.equal(true);
      expect(fetch.args).to.deep.equal([[
        'http://localhost:5984/api/info',
        { credentials: 'same-origin' },
      ]]);
    });

    it('should return false when failed', async () => {
      const response = {
        ok: false,
      };
      const fetch = sinon.stub().resolves(response);
      utils.__set__('fetch', fetch);

      const result = await utils.checkApiAccessible();

      expect(result).to.equal(false);
      expect(fetch.args).to.deep.equal([[
        'http://localhost:5984/api/info',
        { credentials: 'same-origin' },
      ]]);
    });
  });
});
