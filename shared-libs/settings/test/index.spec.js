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

    beforeEach(() => {
      environment.COUCH_URL = 'http://user:pass@server.com/medic';
    });

    it('rejects if no key given', () => {
      sinon.stub(request, 'get').rejects({ statusCode: 403, message: 'no perms' });

      return lib
        .getCredentials()
        .then(() => expect.fail('exception expected'))
        .catch(err => {
          expect(request.get.callCount).to.equal(0);
          expect(err.message).to.equal('You must pass the key for the credentials you want');
        });
    });


    it('should throw error from request', () => {
      sinon.stub(request, 'get').rejects({ statusCode: 403, message: 'no perms' });

      return lib
        .getCredentials('mykey')
        .then(() => expect.fail('exception expected'))
        .catch(err => {
          expect(request.get.callCount).to.equal(1);
          expect(err.message).to.equal('no perms');
        });
    });

    it('should handle when permissions are not defined', () => {
      sinon.stub(request, 'get').rejects({ statusCode: 404 });

      return lib
        .getCredentials('mykey')
        .then(actual => {
          expect(actual).to.be.undefined;
        });
    });

    it('should handle empty credentials', () => {
      sinon.stub(request, 'get').resolves({});

      return lib
        .getCredentials('mykey')
        .then(actual => {
          expect(actual).to.be.undefined;
        });
    });

    it('should fetch the password from the doc', () => {
      environment.COUCH_URL = 'http://server.com/medic';
      sinon.stub(request, 'get').resolves({ password: 'mypass' });

      return lib
        .getCredentials('mykey')
        .then(actual => {
          expect(actual).to.equal('mypass');
          expect(request.get.callCount).to.equal(1);
          expect(request.get.args[0][0]).to.equal('http://server.com/medic-vault/credential:mykey');
        });
    });

  });

  describe('setCredentials', () => {

    beforeEach(() => {
      environment.COUCH_URL = 'http://user:pass@server.com/medic';
    });

    it('rejects if no key given', () => {
      sinon.stub(request, 'get');
      return lib.setCredentials()
        .then(() => expect.fail('exception expected'))
        .catch(err => {
          expect(request.get.callCount).to.equal(0);
          expect(err.message).to.equal('You must pass the key for the credentials you want');
        });
    });

    it('rejects with error from request', () => {
      sinon.stub(request, 'get').rejects({ message: 'down', statusCode: 503 });
      return lib.setCredentials('mykey', 'mypass')
        .then(() => expect.fail('exception expected'))
        .catch(err => {
          expect(request.get.callCount).to.equal(1);
          expect(request.get.args[0][0]).to.equal('http://user:pass@server.com/medic-vault/credential:mykey');
          expect(err.message).to.equal('down');
        });
    });

    it('handles creating doc', () => {
      sinon.stub(request, 'get').rejects({ message: 'missing', statusCode: 404 });
      sinon.stub(request, 'put').resolves();
      return lib.setCredentials('mykey', 'mypass')
        .then(() => {
          expect(request.get.callCount).to.equal(1);
          expect(request.get.args[0][0]).to.equal('http://user:pass@server.com/medic-vault/credential:mykey');
          expect(request.put.callCount).to.equal(1);
          expect(request.put.args[0][0]).to.equal('http://user:pass@server.com/medic-vault/credential:mykey');
          expect(request.put.args[0][1].body).to.deep.equal({ _id: 'credential:mykey', password: 'mypass' });
        });
    });

    it('handles updating doc', () => {
      sinon.stub(request, 'get').resolves({ _id: 'credential:mykey', _rev: '1', password: 'old' });
      sinon.stub(request, 'put').resolves();
      return lib.setCredentials('mykey', 'mypass')
        .then(() => {
          expect(request.get.callCount).to.equal(1);
          expect(request.get.args[0][0]).to.equal('http://user:pass@server.com/medic-vault/credential:mykey');
          expect(request.put.callCount).to.equal(1);
          expect(request.put.args[0][0]).to.equal('http://user:pass@server.com/medic-vault/credential:mykey');
          expect(request.put.args[0][1].body).to.deep.equal({ _id: 'credential:mykey', _rev: '1', password: 'mypass' });
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
