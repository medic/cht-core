const sinon = require('sinon').sandbox.create();
require('chai').should();
const service = require('../../../src/services/bulk-get'),
      db = require('../../../src/db-pouch'),
      authorization = require('../../../src/services/authorization');

let testReq;

describe('Bulk Get service', () => {
  beforeEach(function() {
    testReq = { query: {}, userCtx: { name: 'user' } };

    sinon.stub(authorization, 'getAuthorizationContext').resolves({});
    sinon.stub(authorization, 'allowedDoc').returns(true);
    sinon.stub(authorization, 'getViewResults').callsFake(doc => ({ view: doc }));
    sinon.stub(db.medic, 'bulkGet').resolves({ results: [] });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('Filter Offline Request', () => {
    it('throws authorization errors', () => {
      testReq.body = { docs: [] };
      authorization.getAuthorizationContext.rejects(new Error('something'));

      return service
        .filterOfflineRequest(testReq)
        .catch(err => {
          err.message.should.equal('something');
        });
    });

    it('catches bulk get errors', () => {
      testReq.body = { docs: [] };
      db.medic.bulkGet.rejects(new Error('something'));

      return service
        .filterOfflineRequest(testReq)
        .catch(err => {
          err.message.should.equal('something');
        });
    });

    it('passes request query parameters to the db call', () => {
      testReq.body = { docs: [{ id: 'a', rev: '1-a' }, { id: 'b' }] };
      testReq.query = { revs: 'yes', attachments: 'no', some: 'param' };

      return service.filterOfflineRequest(testReq).then(() => {
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
        .filterOfflineRequest(testReq)
        .then(result => {
          authorization.getAuthorizationContext.callCount.should.equal(1);
          authorization.allowedDoc.callCount.should.equal(7);

          db.medic.bulkGet.callCount.should.equal(1);
          db.medic.bulkGet.args[0][0].should.deep.equal(
            { docs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }]});

          result.should.deep.equal({
            results: [
              { id: 'b', docs: [ { ok: { id: 'b', rev: 1 } }, { ok: { id: 'b', rev: 2 } } ] },
              { id: 'd', docs: [ { ok: { id: 'd' } } ] }
            ]
          });
        });
    });
  });
});
