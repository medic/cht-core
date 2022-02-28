const sinon = require('sinon');
const request = require('request-promise-native');
const chai = require('chai');
const { expect } = chai;

const lib = require('../src/');

describe('Settings Shared Library', () => {
  const environment = {};

  beforeEach(() => {
    sinon
      .stub(process, 'env')
      .value(environment);
  });

  afterEach(() => sinon.restore());

  describe('getCredentials', () => {

    it('should throw error if no server url is set', async () => {
      environment.COUCH_URL = '';

      try {
        await lib.getCredentials();
        expect.fail('exception expected')
      } catch (err) {
        expect(err.message).to.equal('Failed to find the CouchDB server');
      }
    });

    it('should throw error from request', async () => {
      environment.COUCH_URL = 'http://user:pass@server.com/medic';
      sinon.stub(request, 'get').rejects({ statusCode: 403, message: 'no perms' });

      try {
        await lib.getCredentials();
        return expect.fail('exception expected');
      } catch (err) {
        expect(request.get.callCount).to.equal(1);
        expect(err.message).to.equal('no perms');
      }
    });

    it('should handle when permissions are not defined', async () => {
      environment.COUCH_URL = 'http://user:pass@server.com/medic';
      sinon.stub(request, 'get').rejects({ statusCode: 404 });

      const actual = await lib.getCredentials('mykey');
      expect(actual).to.equal(undefined);
    });

    it('should handle empty credentials', async () => {
      environment.COUCH_URL = 'http://user:pass@server.com/medic';
      sinon.stub(request, 'get').resolves({});

      const actual = await lib.getCredentials('mykey');
      expect(actual).to.be.undefined;
    });

    it('should parse response format', async () => {
      environment.COUCH_URL = 'http://server.com/medic';
      sinon.stub(request, 'get').resolves({ password: 'mypass' }); // TODO string or JSON response?

      const actual = await lib.getCredentials('mykey');
      expect(actual).to.equal('mypass');
      expect(request.get.callCount).to.equal(1);
      expect(request.get.args[0][0]).to.equal('http://server.com/medic-vault/mykey');
    });

  });

  describe('getCouchConfig', () => {

    it('should return the expected value', async () => {
      environment.COUCH_URL = 'http://user:pass@localhost:6929/medic';
      environment.COUCH_NODE_NAME = 'nonode@noname';
      sinon.stub(request, 'get').resolves('couch config');

      const actual = await lib.getCouchConfig('attachments');
      expect(actual).to.equal('couch config');
      expect(request.get.callCount).to.equal(1);
      expect(request.get.args[0][0].url).to.equal('http://user:pass@localhost:6929/_node/nonode@noname/_config/attachments');
    });

  });

  describe('updateAdminPassword', () => {

    it('should save password', async () => {
      environment.COUCH_URL = 'http://user:pass@localhost:6929/medic';
      environment.COUCH_NODE_NAME = 'nonode@noname';
      sinon.stub(request, 'put').resolves('-pbkdf2-8266a0adb');

      const result = await lib.updateAdminPassword('admin1', 'pass1234');
      expect(result).to.equal('-pbkdf2-8266a0adb');
      expect(request.put.callCount).to.equal(1);
      expect(request.put.args[0][0]).to.deep.equal({
        body: '"pass1234"',
        url: 'http://user:pass@localhost:6929/_node/nonode@noname/_config/admins/admin1',
      });
    });

  });
});
