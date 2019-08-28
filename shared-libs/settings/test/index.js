const chai = require('chai');
const sinon = require('sinon');
const request = require('request-promise-native');
const lib = require('../src/');

describe('Settings shared lib - getCredentials function', () => {
  'use strict';

  afterEach(() => sinon.restore());

  it('errors if no server url set', done => {
    sinon.stub(lib, '_getServerUrl').returns();
    lib.getCredentials()
      .then(() => done(new Error('expected exception to be thrown')))
      .catch(err => {
        chai.expect(lib._getServerUrl.callCount).to.equal(1);
        chai.expect(err.message).to.equal('Failed to find the CouchDB server');
        done();
      });
  });

  it('errors if no node name set', done => {
    sinon.stub(lib, '_getServerUrl').returns('http://server.com');
    sinon.stub(lib, '_getCouchNodeName').returns();
    lib.getCredentials()
      .then(() => done(new Error('expected exception to be thrown')))
      .catch(err => {
        chai.expect(lib._getCouchNodeName.callCount).to.equal(1);
        chai.expect(err.message).to.equal('Failed to find the CouchDB node name');
        done();
      });
  });

  it('returns error from request', done => {
    sinon.stub(lib, '_getServerUrl').returns('http://server.com');
    sinon.stub(lib, '_getCouchNodeName').returns('nonode@noname');
    sinon.stub(request, 'get').rejects({ statusCode: 403, message: 'no perms' });
    lib.getCredentials()
      .then(() => done(new Error('expected exception to be thrown')))
      .catch(err => {
        chai.expect(request.get.callCount).to.equal(1);
        chai.expect(err.message).to.equal('no perms');
        done();
      });
  });

  it('handles permissions not defined', () => {
    sinon.stub(lib, '_getServerUrl').returns('http://server.com');
    sinon.stub(lib, '_getCouchNodeName').returns('nonode@noname');
    sinon.stub(request, 'get').rejects({ statusCode: 404 });
    return lib.getCredentials('mykey').then(actual => {
      chai.expect(actual).to.equal(undefined);
    });
  });

  it('handles empty credentials', () => {
    sinon.stub(lib, '_getServerUrl').returns('http://server.com');
    sinon.stub(lib, '_getCouchNodeName').returns('nonode@noname');
    sinon.stub(request, 'get').resolves('""\n');
    return lib.getCredentials('mykey').then(actual => {
      chai.expect(actual).to.equal('');
    });
  });

  it('parses response format', () => {
    sinon.stub(lib, '_getServerUrl').returns('http://server.com');
    sinon.stub(lib, '_getCouchNodeName').returns('nonode@noname');
    sinon.stub(request, 'get').resolves('"mypass"\n');
    return lib.getCredentials('mykey').then(actual => {
      chai.expect(actual).to.equal('mypass');
      chai.expect(request.get.callCount).to.equal(1);
      chai.expect(request.get.args[0][0]).to.equal('http://server.com/_node/nonode@noname/_config/medic-credentials/mykey');
    });
  });

});
