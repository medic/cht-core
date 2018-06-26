const service = require('../../../src/services/bulk-get');
const db = require('../../../src/db-pouch');
const sinon = require('sinon').sandbox.create();
const serverUtils = require('../../../src/server-utils');
require('chai').should();
const authorization = require('../../../src/services/authorization');

let testRes,
    testReq;

describe('Bulk Get service', () => {
  beforeEach(function() {
    testRes = {
      write: sinon.stub(),
      end: sinon.stub(),
      type: sinon.stub()
    };

    testReq = { query: {}, userCtx: { name: 'user' } };

    sinon.stub(authorization, 'getAuthorizationContext').resolves({});
    sinon.stub(authorization, 'allowedDoc').returns(true);
    sinon.stub(authorization, 'getViewResults').callsFake(doc => ({ view: doc }));
    sinon.stub(serverUtils, 'serverError');
    sinon.stub(db.medic, 'bulkGet').resolves({ results: [] });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('invalidRequest', () => {
    it('returns error when body is not set', () => {
      service._invalidRequest(false).should.deep.equal({ error: 'bad_request', reason: 'invalid UTF-8 JSON' });
    });

    it('returns error when body is missing `docs` property', () => {
      service._invalidRequest({ body: {} }).should.deep.equal(
        { error: 'bad_request', reason: 'Missing JSON list of `docs`.' });
    });

    it('returns error when `docs` is not an array', () => {
      service._invalidRequest({ body: { docs: 'alpha' } }).should.deep.equal(
        { error: 'bad_request', reason: '`docs` parameter must be an array.' });
    });
  });

  describe('Filter Offline Request', () => {
    it('catches authorization errors', () => {
      testReq.body = { docs: [] };
      authorization.getAuthorizationContext.rejects({ error: 'something' });

      return service.filterOfflineRequest(testReq, testRes).then(() => {
        serverUtils.serverError.callCount.should.equal(1);
        serverUtils.serverError.args[0][0].should.deep.equal({ error: 'something' });
      });
    });

    it('catches bulk get errors', () => {
      testReq.body = { docs: [] };
      db.medic.bulkGet.rejects({ error: 'something' });

      return service.filterOfflineRequest(testReq, testRes).then(() => {
        serverUtils.serverError.callCount.should.equal(1);
        serverUtils.serverError.args[0][0].should.deep.equal({ error: 'something' });
      });
    });

    it('passes reqest query parameters to the db call', () => {
      testReq.body = { docs: [{ id: 'a', rev: '1-a' }, { id: 'b' }] };
      testReq.query = { revs: 'yes', attachments: 'no', some: 'param' };

      return service.filterOfflineRequest(testReq, testRes).then(() => {
        authorization.getAuthorizationContext.callCount.should.equal(1);
        db.medic.bulkGet.callCount.should.equal(1);
        db.medic.bulkGet.args[0][0].should.deep.equal(
          { docs: testReq.body.docs, revs: 'yes', attachments: 'no', some: 'param' });
      });
    });

    it('filters request docs, excluding error and not allowed docs', () => {
      testReq.body = { docs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }]};
      db.medic.bulkGet
        .withArgs({ docs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }] })
        .resolves({ results:
            [
              { id: 'a', docs: [ { ok: { id: 'a', rev: 1 } }, { error: { id: 'a', rev: 2 } }, { ok: { id: 'a', rev: 3 } } ] },
              { id: 'b', docs: [ { ok: { id: 'b', rev: 1 } }, { ok: { id: 'b', rev: 2 } }, { ok: { id: 'b', rev: 3 } } ] },
              { id: 'c', docs: [ { error: { id: 'c' } } ] },
              { id: 'd', docs: [ { ok: { id: 'd' } } ] },
              { id: 'e', docs: [ { ok: { id: 'e' } } ] },
              { id: 'f', docs: [ { error: { id: 'f' } } ] },
            ]});

      authorization.getAuthorizationContext.withArgs({ name: 'user' }).resolves({ });
      authorization.allowedDoc
        .withArgs('a', sinon.match.any, { view: { id: 'a', rev: 1 }}).returns(false)
        .withArgs('a', sinon.match.any, { view: { id: 'a', rev: 3 }}).returns(false)
        .withArgs('b', sinon.match.any, { view: { id: 'b', rev: 1 }}).returns(true)
        .withArgs('b', sinon.match.any, { view: { id: 'b', rev: 2 }}).returns(true)
        .withArgs('b', sinon.match.any, { view: { id: 'b', rev: 3 }}).returns(false)
        .withArgs('d').returns(true)
        .withArgs('e').returns(false);

      return service
        .filterOfflineRequest(testReq, testRes)
        .then(() => {
          authorization.getAuthorizationContext.callCount.should.equal(1);
          authorization.allowedDoc.callCount.should.equal(7);

          db.medic.bulkGet.callCount.should.equal(1);
          db.medic.bulkGet.args[0][0].should.deep.equal(
            { docs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }]});
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [
              { id: 'b', docs: [ { ok: { id: 'b', rev: 1 } }, { ok: { id: 'b', rev: 2 } } ] },
              { id: 'd', docs: [ { ok: { id: 'd' } } ] }
            ]
          }));
        });
    });

    it('handles requests without a body', () => {
      testReq.body = null;

      return Promise
        .all([
          service.filterOfflineRequest(testReq, testRes),
          Promise.resolve()
        ]).then(() => {
          testRes.type.callCount.should.equal(1);
          testRes.type.args[0][0].should.equal('json');
          authorization.getAuthorizationContext.callCount.should.equal(0);
          testRes.write.callCount.should.equal(1);
          testRes.end.callCount.should.equal(1);
          JSON.parse(testRes.write.args[0][0]).error.should.equal('bad_request');
        });
    });

    it('handles requests without `docs` parameter', () => {
      testReq.body = { some: 'thing' };

      return Promise
        .all([
          service.filterOfflineRequest(testReq, testRes),
          Promise.resolve()
        ]).then(() => {
          authorization.getAuthorizationContext.callCount.should.equal(0);
          testRes.write.callCount.should.equal(1);
          testRes.end.callCount.should.equal(1);
          JSON.parse(testRes.write.args[0][0]).error.should.equal('bad_request');
        });
    });

    it('handles requests when `docs` parameter is not an array', () => {
      testReq.body = { docs: 'something' };

      return Promise
        .all([
          service.filterOfflineRequest(testReq, testRes),
          Promise.resolve()
        ]).then(() => {
          authorization.getAuthorizationContext.callCount.should.equal(0);
          testRes.write.callCount.should.equal(1);
          testRes.end.callCount.should.equal(1);
          JSON.parse(testRes.write.args[0][0]).error.should.equal('bad_request');
        });
    });
  });
});
