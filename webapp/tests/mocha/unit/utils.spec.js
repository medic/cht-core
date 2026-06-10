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

    it('should throw an error carrying the status and parsed body when not ok', async () => {
      const response = {
        ok: false,
        status: 413,
        text: sinon.stub().resolves(JSON.stringify({ code: 413, error: 'doc_limit_exceeded' })),
      };
      const fetch = sinon.stub().resolves(response);
      utils.__set__('fetch', fetch);

      try {
        await utils.fetchJSON('/the/path');
        expect.fail();
      } catch (err) {
        expect(err.status).to.equal(413);
        expect(err.body).to.deep.equal({ code: 413, error: 'doc_limit_exceeded' });
      }
    });

    it('should surface the status even when the error body is not JSON', async () => {
      const response = {
        ok: false,
        status: 429,
        text: sinon.stub().resolves('Too Many Requests'),
      };
      const fetch = sinon.stub().resolves(response);
      utils.__set__('fetch', fetch);

      try {
        await utils.fetchJSON('/the/path');
        expect.fail();
      } catch (err) {
        expect(err.status).to.equal(429);
        expect(err.body).to.equal('Too Many Requests');
      }
    });
  });
});
