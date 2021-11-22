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

    it('should throw error if no server url is set', () => {
      environment.COUCH_URL = '';
      environment.COUCH_NODE_NAME = '';

      return lib
        .getCredentials()
        .then(() => expect.fail('exception expected'))
        .catch(err => {
          expect(err.message).to.equal('Failed to find the CouchDB server');
        });
    });

    it('should throw error if no node name is set', () => {
      environment.COUCH_URL = 'http://user:pass@server.com/medic';
      environment.COUCH_NODE_NAME = '';

      return lib
        .getCredentials()
        .then(() => expect.fail('exception expected'))
        .catch(err => {
          expect(err.message).to.equal('Failed to find the CouchDB node name');
        });
    });

    it('should throw error from request', () => {
      environment.COUCH_URL = 'http://user:pass@server.com/medic';
      environment.COUCH_NODE_NAME = 'nonode@nohost';
      sinon.stub(request, 'get').rejects({ statusCode: 403, message: 'no perms' });
      
      return lib
        .getCredentials()
        .then(() => expect.fail('exception expected'))
        .catch(err => {
          expect(request.get.callCount).to.equal(1);
          expect(err.message).to.equal('no perms');
        });
    });

    it('should handle when permissions are not defined', () => {
      environment.COUCH_URL = 'http://user:pass@server.com/medic';
      environment.COUCH_NODE_NAME = 'nonode@nohost';
      sinon.stub(request, 'get').rejects({ statusCode: 404 });
      
      return lib
        .getCredentials('mykey')
        .then(actual => {
          expect(actual).to.equal(undefined);
        });
    });

    it('should handle empty credentials', () => {
      environment.COUCH_URL = 'http://user:pass@server.com/medic';
      environment.COUCH_NODE_NAME = 'nonode@nohost';
      sinon.stub(request, 'get').resolves('""\n');
      
      return lib
        .getCredentials('mykey')
        .then(actual => {
          expect(actual).to.equal('');
        });
    });

    it('should parse response format', () => {
      environment.COUCH_URL = 'http://server.com/medic';
      environment.COUCH_NODE_NAME = 'nonode@noname';
      sinon.stub(request, 'get').resolves('"mypass"\n');
      
      return lib
        .getCredentials('mykey')
        .then(actual => {
          expect(actual).to.equal('mypass');
          expect(request.get.callCount).to.equal(1);
          expect(request.get.args[0][0]).to.equal('http://server.com/_node/nonode@noname/_config/medic-credentials/mykey');
        });
    });

  });

  describe('getCouchConfig', () => {

    it('should return the expected value', () => {
      environment.COUCH_URL = 'http://user:pass@localhost:6929/medic';
      environment.COUCH_NODE_NAME = 'nonode@noname';
      sinon.stub(request, 'get').resolves('couch config');

      return lib
        .getCouchConfig('attachments')
        .then(actual => {
          expect(actual).to.equal('couch config');
          expect(request.get.callCount).to.equal(1);
          expect(request.get.args[0][0].url).to.equal('http://user:pass@localhost:6929/_node/nonode@noname/_config/attachments');
        });
    });

  });

  describe('updateAdminPassword', () => {

    it('should save password', () => {
      environment.COUCH_URL = 'http://user:pass@localhost:6929/medic';
      environment.COUCH_NODE_NAME = 'nonode@noname';
      sinon.stub(request, 'put').resolves('-pbkdf2-8266a0adb');

      return lib
        .updateAdminPassword('admin1', 'pass1234')
        .then(result => {
          expect(result).to.equal('-pbkdf2-8266a0adb');
          expect(request.put.callCount).to.equal(1);
          expect(request.put.args[0][0]).to.deep.equal({
            body: '"pass1234"',
            url: 'http://user:pass@localhost:6929/_node/nonode@noname/_config/admins/admin1',
          });
        });
    });

  });
});
