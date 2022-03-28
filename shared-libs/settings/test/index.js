const chai = require('chai');
const sinon = require('sinon');
const request = require('request-promise-native');
const rewire = require('rewire');

let lib;
let orgProcess;

describe('Settings shared lib - getCredentials function', () => {
  'use strict';

  afterEach(() => {
    sinon.restore();
    lib.__set__('process', orgProcess);
  });

  beforeEach(() => {
    lib = rewire('../src/');
    orgProcess = lib.__get__('process');
  });

  it('errors if no server url set', () => {
    lib.__set__('process', { env: { } });
    return lib
      .getCredentials()
      .then(() => chai.expect.fail('Should have thrown'))
      .catch(err => {
        chai.expect(err.message).to.equal('Failed to find the CouchDB server');
      });
  });

  it('returns error from request', () => {
    lib.__set__('process', { env: { COUCH_URL: 'http://server.com/medic' } });
    sinon.stub(request, 'get').rejects({ statusCode: 403, message: 'no perms' });
    return lib
      .getCredentials('key')
      .then(() => chai.expect.fail('Should have thrown'))
      .catch(err => {
        chai.expect(err.message).to.equal('no perms');
        chai.expect(request.get.args).to.deep.equal([
          ['http://server.com/_node/_local/_config/medic-credentials/key']
        ]);

      });
  });

  it('handles permissions not defined', () => {
    lib.__set__('process', { env: { COUCH_URL: 'http://server.com/medic' } });
    sinon.stub(request, 'get').rejects({ statusCode: 404 });
    return lib.getCredentials('mykey').then(actual => {
      chai.expect(actual).to.equal(undefined);
    });
  });

  it('handles empty credentials', () => {
    lib.__set__('process', { env: { COUCH_URL: 'http://server.com/medic' } });
    sinon.stub(request, 'get').resolves('""\n');
    return lib.getCredentials('mykey').then(actual => {
      chai.expect(actual).to.equal('');
    });
  });

  it('parses response format', () => {
    lib.__set__('process', { env: { COUCH_URL: 'http://server.com/medic' } });
    sinon.stub(request, 'get').resolves('"mypass"\n');
    return lib.getCredentials('mykey').then(actual => {
      chai.expect(actual).to.equal('mypass');
      chai.expect(request.get.callCount).to.equal(1);
      chai.expect(request.get.args[0][0]).to.equal('http://server.com/_node/_local/_config/medic-credentials/mykey');
    });
  });

});

describe('Settings shared lib - getCouchConfig function', () => {
  afterEach(() => {
    sinon.restore();
    lib.__set__('process', orgProcess);
  });
  beforeEach(() => {
    lib = rewire('../src/');
    orgProcess = lib.__get__('process');
  });

  it('returns the expected value', () => {
    lib.__set__('process', { env: { COUCH_URL: 'http://user:pass@localhost:6929' } });
    sinon.stub(request, 'get').resolves('couch config');
    return lib.getCouchConfig('attachments').then(actual => {
      chai.expect(actual).to.equal('couch config');
      chai.expect(request.get.callCount).to.equal(1);
      chai.expect(request.get.args[0][0].url).to.equal('http://user:pass@localhost:6929/_node/_local/_config/attachments');
    });
  });
});
