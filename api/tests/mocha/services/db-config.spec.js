const chai = require('chai'),
      sinon = require('sinon'),
      request = require('request'),
      db = require('../../../src/db-pouch'),
      service = require('../../../src/services/db-config');

describe('db config service', () => {

  let originalServerUrl;

  before(() => {
    originalServerUrl = db.serverUrl;
    db.serverUrl = 'http://admin:pass@somewhere.com';
  });

  after(() => {
    db.serverUrl = originalServerUrl;
  });

  afterEach(() => sinon.restore());

  describe('get', () => {
    
    it('returns errors', () => {
      sinon.stub(request, 'get').callsArgWith(1, 'boom');
      return service.get().catch(actual => {
        chai.expect(actual).to.equal('boom');
      });
    });

    it('gets the whole config when no params', () => {
      const expected = { some_val: true, other_val: 'untrue' };
      const requestGet = sinon.stub(request, 'get').callsArgWith(1, null, null, expected);
      return service.get().then(actual => {
        chai.expect(actual).to.deep.equal(expected);
        chai.expect(requestGet.callCount).to.equal(1);
        chai.expect(requestGet.args[0][0].url).to.equal('http://admin:pass@somewhere.com/_node/nonode@nohost/_config');
        chai.expect(requestGet.args[0][0].json).to.equal(true);
      });
    });

    it('gets the whole config when section only', () => {
      const expected = { some_val: true, other_val: 'untrue' };
      const requestGet = sinon.stub(request, 'get').callsArgWith(1, null, null, expected);
      return service.get('my-section').then(actual => {
        chai.expect(actual).to.deep.equal(expected);
        chai.expect(requestGet.callCount).to.equal(1);
        chai.expect(requestGet.args[0][0].url).to.equal('http://admin:pass@somewhere.com/_node/nonode@nohost/_config/my-section');
        chai.expect(requestGet.args[0][0].json).to.equal(true);
      });
    });

    it('gets the whole config when section and key', () => {
      const expected = 500;
      const requestGet = sinon.stub(request, 'get').callsArgWith(1, null, null, expected);
      return service.get('my-section', 'my-key').then(actual => {
        chai.expect(actual).to.equal(expected);
        chai.expect(requestGet.callCount).to.equal(1);
        chai.expect(requestGet.args[0][0].url).to.equal('http://admin:pass@somewhere.com/_node/nonode@nohost/_config/my-section/my-key');
        chai.expect(requestGet.args[0][0].json).to.equal(true);
      });
    });
  });
});
