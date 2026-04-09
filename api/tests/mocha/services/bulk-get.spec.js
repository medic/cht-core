const sinon = require('sinon');
require('chai').should();
const service = require('../../../src/services/bulk-get');
const db = require('../../../src/db');
const authorization = require('../../../src/services/authorization');

let userCtx;
let query;
let docs;

describe('Bulk Get service', () => {
  beforeEach(function() {
    query = {};
    userCtx = { name: 'user' };

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
      authorization.getAuthorizationContext.rejects(new Error('something'));

      return service
        .filterOfflineRequest(userCtx, query, docs)
        .catch(err => {
          err.message.should.equal('something');
        });
    });

    it('catches bulk get errors', () => {
      db.medic.bulkGet.rejects(new Error('something'));

      return service
        .filterOfflineRequest(userCtx, query, docs)
        .catch(err => {
          err.message.should.equal('something');
        });
    });

    it('passes request query parameters to the db call, except latest param', () => {
      docs = [{ id: 'a', rev: '1-a' }, { id: 'b' }];
      query = { revs: 'yes', attachments: 'no', some: 'param', latest: true };

      return service.filterOfflineRequest(userCtx, query, docs).then(() => {
        authorization.getAuthorizationContext.callCount.should.equal(1);
        db.medic.bulkGet.callCount.should.equal(1);
        db.medic.bulkGet.args[0][0].should.deep.equal(
          { docs: docs, revs: 'yes', attachments: 'no', some: 'param' }
        );
      });
    });

    it('filters request docs, excluding error and not allowed docs', () => {
      docs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }, { id: 'g' }];
      db.medic.bulkGet
        .withArgs({ docs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }, { id: 'g' }] })
        .resolves({ results:
            [
              { id: 'a', docs: [
                { ok: { id: 'a', rev: 1 } }, { error: { id: 'a', rev: 2 } }, { ok: { id: 'a', rev: 3 } }
              ] },
              { id: 'b', docs: [
                { ok: { id: 'b', rev: 1 } }, { ok: { id: 'b', rev: 2 } }, { ok: { id: 'b', rev: 3 } }
              ] },
              { id: 'c', docs: [ { error: { id: 'c' } } ] },
              { id: 'd', docs: [ { ok: { id: 'd' } } ] },
              { id: 'e', docs: [ { ok: { id: 'e' } } ] },
              { id: 'f', docs: [ { error: { id: 'f' } } ] },
              { id: 'g', docs: [ { ok: { id: 'g' } } ] },
            ]});

      authorization.getAuthorizationContext.withArgs({ name: 'user' }).resolves({ });
      authorization.allowedDoc
        .withArgs('a', sinon.match.any, { view: { id: 'a', rev: 1 }}).returns(false)
        .withArgs('a', sinon.match.any, { view: { id: 'a', rev: 3 }}).returns(false)
        .withArgs('b', sinon.match.any, { view: { id: 'b', rev: 1 }}).returns(true)
        .withArgs('b', sinon.match.any, { view: { id: 'b', rev: 2 }}).returns(true)
        .withArgs('b', sinon.match.any, { view: { id: 'b', rev: 3 }}).returns(false)
        .withArgs('d').returns(true)
        .withArgs('e').returns(false)
        .withArgs('g').returns(false);


      return service
        .filterOfflineRequest(userCtx, query, docs)
        .then(result => {
          authorization.getAuthorizationContext.callCount.should.equal(1);
          authorization.allowedDoc.callCount.should.equal(8);

          db.medic.bulkGet.callCount.should.equal(1);
          db.medic.bulkGet.args[0][0].should.deep.equal(
            { docs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }, { id: 'g' }]}
          );

          result.should.deep.equal({
            results: [
              { id: 'b', docs: [ { ok: { id: 'b', rev: 1 } }, { ok: { id: 'b', rev: 2 } } ] },
              { id: 'd', docs: [ { ok: { id: 'd' } } ] },
            ]
          });
        });
    });
  });
});
