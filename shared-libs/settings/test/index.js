const chai = require('chai');
const sinon = require('sinon');
const request = require('request-promise-native');
const rewire = require('rewire');

const lib = rewire('../src/');
const membershipMatcher = sinon.match({ url: sinon.match('membership') });
const configMatcher = sinon.match({ url: sinon.match('config') });

describe('Settings shared lib - getCredentials function', () => {
  'use strict';

  afterEach(() => sinon.restore());

  it('errors if no server url set', () => {
    lib.__set__('process', { env: { } });
    return lib
      .getCredentials()
      .then(() => chai.expect.fail('Should have thrown'))
      .catch(err => {
        chai.expect(err.message).to.equal('Failed to find the CouchDB server');
      });
  });

  it('errors if no node is found', () => {
    lib.__set__('process', { env: { COUCH_URL: 'http://server.com/medic' } });
    sinon.stub(request, 'get').resolves({ all_nodes: [] });
    return lib
      .getCredentials()
      .then(() => chai.expect.fail('Should have thrown'))
      .catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(err.message).to.equal('Failed to find the CouchDB node name');
      });
  });

  it('returns error from request', () => {
    lib.__set__('process', { env: { COUCH_URL: 'http://server.com/medic' } });
    sinon.stub(request, 'get');
    request.get
      .withArgs(membershipMatcher)
      .resolves({ all_nodes: [ 'nonode@noname' ] });
    request.get
      .withArgs(sinon.match('config'))
      .rejects({ statusCode: 403, message: 'no perms' });
    return lib
      .getCredentials('key')
      .then(() => chai.expect.fail('Should have thrown'))
      .catch(err => {
        chai.expect(err.message).to.equal('no perms');
        chai.expect(request.get.callCount).to.equal(2);
        chai.expect(request.get.args).to.deep.equal([
          [{ url: 'http://server.com/_membership', json: true }],
          ['http://server.com/_node/nonode@noname/_config/medic-credentials/key']
        ]);

      });
  });

  it('handles permissions not defined', () => {
    lib.__set__('process', { env: { COUCH_URL: 'http://server.com/medic' } });
    sinon.stub(request, 'get');
    request.get.withArgs(membershipMatcher).resolves({ all_nodes: [ 'nonode@noname' ] });
    request.get.withArgs(sinon.match('config')).rejects({ statusCode: 404 });
    return lib.getCredentials('mykey').then(actual => {
      chai.expect(actual).to.equal(undefined);
    });
  });

  it('handles empty credentials', () => {
    lib.__set__('process', { env: { COUCH_URL: 'http://server.com/medic' } });
    sinon.stub(request, 'get');
    request.get.withArgs(membershipMatcher).resolves({ all_nodes: [ 'nonode@noname' ] });
    request.get.withArgs(sinon.match('config')).resolves('""\n');
    return lib.getCredentials('mykey').then(actual => {
      chai.expect(actual).to.equal('');
    });
  });

  it('parses response format', () => {
    lib.__set__('process', { env: { COUCH_URL: 'http://server.com/medic' } });
    sinon.stub(request, 'get');
    request.get.withArgs(membershipMatcher).resolves({ all_nodes: [ 'nonode@noname' ] });
    request.get.withArgs(sinon.match('config')).resolves('"mypass"\n');
    return lib.getCredentials('mykey').then(actual => {
      chai.expect(actual).to.equal('mypass');
      chai.expect(request.get.callCount).to.equal(2);
      chai.expect(request.get.args[1][0]).to.equal('http://server.com/_node/nonode@noname/_config/medic-credentials/mykey');
    });
  });

});

describe('Settings shared lib - getCouchConfig function', () => {
  afterEach(() => sinon.restore());

  it('returns the expected value', () => {
    lib.__set__('process', { env: { COUCH_URL: 'http://user:pass@localhost:6929' } });
    sinon.stub(request, 'get');
    request.get.withArgs(membershipMatcher).resolves({ all_nodes: [ 'nonode@noname' ] });
    request.get.withArgs(configMatcher).resolves('couch config');
    return lib.getCouchConfig('attachments').then(actual => {
      chai.expect(actual).to.equal('couch config');
      chai.expect(request.get.callCount).to.equal(2);
      chai.expect(request.get.args[1][0].url).to.equal('http://user:pass@localhost:6929/_node/nonode@noname/_config/attachments');
    });
  });
});
