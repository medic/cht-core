const { assert, expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const api = rewire('../../src/lib/api');
const environment = require('../../src/lib/environment');
const log = require('../../src/lib/log');

describe('api', () => {
  let mockRequest;
  beforeEach(() => {
    mockRequest = sinon.stub().resolves();
    api.__set__('request', mockRequest);
    sinon.stub(environment, 'apiUrl').get(() => 'http://example.com/db-name');
  });
  afterEach(sinon.restore);

  it('defaults to live requests', async () => {
    await api().version();
    expect(mockRequest.callCount).to.eq(1);
  });

  describe('formsValidate', async () => {

    it('should fail if validate endpoint returns invalid JSON', async () => {
      mockRequest = sinon.stub().resolves('--NOT JSON--');
      api.__set__('request', mockRequest);
      try {
        await api().formsValidate('<xml></xml>');
        assert.fail('Expected assertion');
      } catch (e) {
        expect(e.message).to.eq(
          'Invalid JSON response validating XForm against the API: --NOT JSON--');
      }
    });

    it('should not fail if validate endpoint does not exist', async () => {
      mockRequest = sinon.stub().rejects({name: 'StatusCodeError', statusCode: 404});
      api.__set__('request', mockRequest);
      let result = await api().formsValidate('<xml></xml>');
      expect(result).to.deep.eq({ok: true, formsValidateEndpointFound: false});
      expect(mockRequest.callCount).to.eq(1);
      // second call
      result = await api().formsValidate('<xml>Another XML</xml>');
      expect(result).to.deep.eq({ok: true, formsValidateEndpointFound: false});
      expect(mockRequest.callCount).to.eq(1); // still HTTP client called only once
    });
  });

  describe('archive mode', async () => {
    beforeEach(() => sinon.stub(environment, 'isArchiveMode').get(() => true));
    
    it('does not initiate requests to api', async () => {
      await api().version();
      expect(mockRequest.callCount).to.eq(0);
    });

    it('throws not supported for undefined interfaces', () => {
      expect(api().getAppSettings).to.throw('not supported');
    });
  });

  describe('updateAppSettings', async() => {

    it('changes settings on server', async () => {
      mockRequest.onCall(0).resolves([]);
      mockRequest.onCall(1).resolves({ ok: true });
      const response = await api().updateAppSettings(JSON.stringify({
        transitions: [ 'test' ]
      }));
      expect(response.ok).to.equal(true);
      expect(mockRequest.callCount).to.equal(2);
      expect(mockRequest.args[1][0].body).to.equal('{"transitions":["test"]}');
    });

    it('throws error when server throws', async () => {
      mockRequest.onCall(0).resolves([]);
      mockRequest.onCall(1).rejects({ error: 'random' });
      try {
        await api().updateAppSettings(JSON.stringify({}));
      } catch(err) {
        expect(err.error).to.equal('random');
        expect(mockRequest.callCount).to.equal(1);
      }
    });

    it('logs and continues when using deprecated transitions', async () => {
      sinon.stub(log, 'warn');
      mockRequest.onCall(0).resolves([ {
        name: 'go',
        deprecated: true,
        deprecatedIn: '3.10.0',
        deprecationMessage: 'Use go2 instead'
      } ]);
      mockRequest.onCall(1).resolves({ ok: true });
      await api().updateAppSettings(JSON.stringify({
        transitions: { go: { disable: false } }
      }));
      expect(log.warn.callCount).to.equal(1);
      expect(log.warn.args[0][0]).to.equal('Use go2 instead');
    });

    it('continues when deprecated transitions call throws', async () => {
      sinon.stub(log, 'warn');
      mockRequest.onCall(0).rejects({ statusCode: 500, message: 'some error' });
      mockRequest.onCall(1).resolves({ ok: true });
      await api().updateAppSettings(JSON.stringify({
        transitions: [ 'test' ]
      }));
      expect(log.warn.callCount).to.equal(1);
    });

  });
});
