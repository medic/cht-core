const request = require('request-promise-native');
const crypto = require('crypto');

const sinon = require('sinon');
const { expect } = require('chai');

const lib = require('../src/');

describe('Settings Shared Library', () => {
  const environment = {
    COUCH_URL: 'http://user:pass@server.com/medic',
    COUCH_NODE_NAME: '_local'
  };

  beforeEach(() => {
    sinon.stub(process, 'env').value(environment);
  });

  afterEach(() => sinon.restore());

  describe('getCredentials', () => {

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

    it('should handle when credentials are not defined', () => {
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
      const iv = crypto.randomBytes(16).toString('hex');
      const encryptedPass = crypto.randomBytes(16).toString('hex');
      const cipher = {
        update: sinon.stub().returns(Buffer.from('start')),
        final: sinon.stub().returns(Buffer.from('end'))
      };
      sinon.stub(request, 'get')
        .withArgs('http://server.com/medic-vault/credential:mykey').resolves({ password: `${iv}:${encryptedPass}` })
        .withArgs('http://server.com/_node/_local/_config/couch_httpd_auth/secret').resolves('mysecret');
      sinon.stub(crypto, 'createDecipheriv').returns(cipher);

      return lib
        .getCredentials('mykey')
        .then(actual => {
          expect(actual).to.equal('startend');
          expect(request.get.callCount).to.equal(2);
          expect(crypto.createDecipheriv.callCount).to.equal(1);
          expect(crypto.createDecipheriv.args[0][0]).to.equal('aes-256-cbc');
          expect(crypto.createDecipheriv.args[0][1].toString()).to.equal('mysecretmysecretmysecretmysecret');
          expect(crypto.createDecipheriv.args[0][2].toString('hex')).to.equal(iv);
          expect(cipher.update.callCount).to.equal(1);
          expect(cipher.update.args[0][0].toString('hex')).to.equal(encryptedPass);
          expect(cipher.final.callCount).to.equal(1);
        });
    });

  });

  describe('setCredentials', () => {

    let cipher;

    beforeEach(() => {
      cipher = {
        update: sinon.stub().returns(Buffer.from('start')),
        final: sinon.stub().returns(Buffer.from('end'))
      };
      sinon.stub(crypto, 'randomBytes').returns('myiv');
      sinon.stub(crypto, 'createCipheriv').returns(cipher);
    });

    it('rejects if no id given', () => {
      sinon.stub(request, 'get')
        .withArgs('http://server.com/medic-vault/credential:mykey').resolves({ password: `oldiv:oldpass` })
        .withArgs('http://server.com/_node/_local/_config/couch_httpd_auth/secret').resolves('mysecret');
      return lib.setCredentials()
        .then(() => expect.fail('exception expected'))
        .catch(err => {
          expect(request.get.callCount).to.equal(1);
          expect(err.message).to.equal('You must pass the key for the credentials you want');
        });
    });

    it('rejects with error from request', () => {
      sinon.stub(request, 'get').rejects({ message: 'down', statusCode: 503 });
      return lib.setCredentials('mykey', 'mypass')
        .then(() => expect.fail('exception expected'))
        .catch(err => {
          expect(request.get.callCount).to.equal(2);
          expect(request.get.args[0][0]).to.equal('http://server.com/medic-vault/credential:mykey');
          expect(err.message).to.equal('down');
        });
    });

    it('handles creating doc', () => {
      sinon.stub(request, 'get')
        .withArgs('http://server.com/medic-vault/credential:mykey').rejects({ message: 'missing', statusCode: 404 })
        .withArgs('http://server.com/_node/_local/_config/couch_httpd_auth/secret').resolves('mysecret');
      sinon.stub(request, 'put').resolves();
      return lib.setCredentials('mykey', 'mypass')
        .then(() => {
          expect(request.get.callCount).to.equal(2);
          expect(request.put.callCount).to.equal(1);
          expect(request.put.args[0][0]).to.equal('http://server.com/medic-vault/credential:mykey');
          expect(request.put.args[0][1].body).to.deep.equal({
            _id: 'credential:mykey',
            password: 'myiv:' + Buffer.from('startend').toString('hex')
          });
          expect(crypto.randomBytes.callCount).to.equal(1);
          expect(crypto.createCipheriv.callCount).to.equal(1);
          expect(crypto.createCipheriv.args[0][0]).to.equal('aes-256-cbc');
          expect(crypto.createCipheriv.args[0][1].toString()).to.equal('mysecretmysecretmysecretmysecret');
          expect(crypto.createCipheriv.args[0][2].toString('hex')).to.equal('myiv');
          expect(cipher.update.callCount).to.equal(1);
          expect(cipher.update.args[0][0]).to.equal('mypass');
          expect(cipher.final.callCount).to.equal(1);
        });
    });

    it('handles updating doc', () => {
      sinon.stub(request, 'get')
        .withArgs('http://server.com/medic-vault/credential:mykey').resolves({ _id: 'credential:mykey', _rev: '1', password: 'old' })
        .withArgs('http://server.com/_node/_local/_config/couch_httpd_auth/secret').resolves('mysecret');
      sinon.stub(request, 'put').resolves();
      return lib.setCredentials('mykey', 'mypass')
        .then(() => {
          expect(request.get.callCount).to.equal(2);
          expect(request.put.callCount).to.equal(1);
          expect(request.put.args[0][0]).to.equal('http://server.com/medic-vault/credential:mykey');
          expect(request.put.args[0][1].body).to.deep.equal({
            _id: 'credential:mykey',
            _rev: '1',
            password: 'myiv:' + Buffer.from('startend').toString('hex')
          });
          expect(crypto.randomBytes.callCount).to.equal(1);
          expect(crypto.createCipheriv.callCount).to.equal(1);
          expect(crypto.createCipheriv.args[0][0]).to.equal('aes-256-cbc');
          expect(crypto.createCipheriv.args[0][1].toString()).to.equal('mysecretmysecretmysecretmysecret');
          expect(crypto.createCipheriv.args[0][2].toString('hex')).to.equal('myiv');
          expect(cipher.update.callCount).to.equal(1);
          expect(cipher.update.args[0][0]).to.equal('mypass');
          expect(cipher.final.callCount).to.equal(1);
        });
    });

  });

  /*
   * Because the crypto module changes frequently and is difficult to integrate with it's worth
   * including these integration tests which don't mock the crypto module.
   */
  describe('crypto integration', () => {

    it('set and get credentials with long secret', () => {
      const secret = 'myreallylongsecret - myreallylongsecret - myreallylongsecret'; // > 32 characters long
      const requestGet = sinon.stub(request, 'get');
      requestGet.onCall(0).rejects({ message: 'missing', statusCode: 404 });
      requestGet.onCall(1).resolves(secret);
      sinon.stub(request, 'put').resolves();
      return lib
        .setCredentials('mykey', 'mypass')
        .then(() => {
          const doc = request.put.args[0][1].body;
          requestGet.onCall(2).resolves(doc);
          requestGet.onCall(3).resolves(secret);
          return lib.getCredentials('mykey');
        })
        .then(pass => {
          expect(pass).to.equal('mypass');
        });
    });

    it('set and get credentials with short secret', () => {
      const secret = 'secret'; // > 6 characters long
      const requestGet = sinon.stub(request, 'get');
      requestGet.onCall(0).rejects({ message: 'missing', statusCode: 404 });
      requestGet.onCall(1).resolves(secret);
      sinon.stub(request, 'put').resolves();
      return lib
        .setCredentials('mykey', 'mypass')
        .then(() => {
          const doc = request.put.args[0][1].body;
          requestGet.onCall(2).resolves(doc);
          requestGet.onCall(3).resolves(secret);
          return lib.getCredentials('mykey');
        })
        .then(pass => {
          expect(pass).to.equal('mypass');
        });
    });

    it('should throw an error when couch secret is empty string', () => {
      const requestGet = sinon.stub(request, 'get');
      requestGet.onCall(0).rejects({ message: 'missing', statusCode: 404 });
      requestGet.onCall(1).resolves('');

      return lib
        .setCredentials('mykey', 'mypass')
        .then(() => expect.fail('Should have thrown'))
        .catch((err) => {
          expect(err.message)
            .to.equal('Invalid cypher. CouchDB Secret needs to be set in order to use secure credentials.');
        });
    });

    it('should handle error gracefully when secret is changed', () => {
      const requestGet = sinon.stub(request, 'get');
      requestGet.onCall(0).rejects({ message: 'missing', statusCode: 404 });
      requestGet.onCall(1).resolves('oldsecret');
      sinon.stub(request, 'put').resolves();
      return lib
        .setCredentials('mykey', 'mypass')
        .then(() => {
          const doc = request.put.args[0][1].body;
          requestGet.onCall(2).resolves(doc);
          requestGet.onCall(3).resolves('newsecret');
          return lib.getCredentials('mykey');
        })
        .catch(err => {
          expect(err.message).to.equal('Error decrypting credential. Try setting the credential again.');
        });
    });

  });


  describe('getCouchConfig', () => {

    it('should return the expected value', () => {
      environment.COUCH_URL = 'http://user:pass@localhost:6929/medic';
      sinon.stub(request, 'get').resolves('couch config');

      return lib
        .getCouchConfig('attachments')
        .then(actual => {
          expect(actual).to.equal('couch config');
          expect(request.get.callCount).to.equal(1);
          expect(request.get.args[0][0].url).to.equal('http://user:pass@localhost:6929/_node/_local/_config/attachments');
        });
    });

    it('should return the expected value when passing nodename', () => {
      environment.COUCH_URL = 'http://user:pass@localhost:6929/medic';
      sinon.stub(request, 'get').resolves('couch config');

      return lib
        .getCouchConfig('attachments', 'nodename')
        .then(actual => {
          expect(actual).to.equal('couch config');
          expect(request.get.callCount).to.equal(1);
          expect(request.get.args[0][0].url).to.equal('http://user:pass@localhost:6929/_node/nodename/_config/attachments');
        });
    });

  });

  describe('updateAdminPassword', () => {

    it('should save password', () => {
      const salt = Buffer.from('randomBytes');
      const derivedKey = Buffer.from('encrypted');
      environment.COUCH_URL = 'http://user:pass@localhost:6929/medic';
      sinon.stub(request, 'put').resolves('-pbkdf2-8266a0adb');
      sinon.stub(request, 'get').resolves({ cluster_nodes: ['a', 'b', 'c'] });
      sinon.stub(crypto, 'randomBytes').returns(salt);
      sinon.stub(crypto, 'pbkdf2').callsArgWith(5, null, derivedKey);

      const expectedPassword = `-pbkdf2-${derivedKey.toString('hex')},${salt.toString('hex')},10`;

      return lib
        .updateAdminPassword('admin1', 'pass1234')
        .then(() => {
          expect(request.get.callCount).to.equal(1);
          expect(request.get.args[0][0]).to.deep.equal({
            url: 'http://user:pass@localhost:6929/_membership',
            json: true,
          });
          expect(request.put.callCount).to.equal(3);
          expect(request.put.args[0][0]).to.deep.equal({
            body: `"${expectedPassword}"`,
            url: 'http://user:pass@localhost:6929/_node/a/_config/admins/admin1?raw=true',
          });
          expect(request.put.args[1][0]).to.deep.equal({
            body: `"${expectedPassword}"`,
            url: 'http://user:pass@localhost:6929/_node/b/_config/admins/admin1?raw=true',
          });
          expect(request.put.args[2][0]).to.deep.equal({
            body: `"${expectedPassword}"`,
            url: 'http://user:pass@localhost:6929/_node/c/_config/admins/admin1?raw=true',
          });
        });
    });

  });
});
