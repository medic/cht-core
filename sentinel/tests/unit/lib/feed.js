const config = require('../../../src/config');
config.initTransitionLib();

const sinon = require('sinon');
const chai = require('chai');
const assert = require('chai').assert;
const db = require('../../../src/db');
const feed = require('../../../src/lib/feed');
const metadata = require('../../../src/lib/metadata');
const tombstoneUtils = require('@medic/tombstone-utils');

const infodoc = config.getTransitionsLib().infodoc;

describe('feed', () => {

  let handler;

  beforeEach(() => {
    handler = {
      cancel: sinon.stub()
    };
    handler.catch = sinon.stub().returns(handler);
    handler.on = sinon.stub().returns(handler);
    sinon.stub(db.medic, 'changes').returns(handler);
  });

  afterEach(() => {
    feed._changeQueue.kill();
    feed.cancel();
    sinon.restore();
  });

  describe('initialization', () => {

    it('handles missing meta data doc', () => {
      sinon.stub(metadata, 'getProcessedSeq').rejects({ status: 404 });
      return feed.listen().then(() => {
        chai.expect(db.medic.changes.callCount).to.equal(1);
        chai.expect(db.medic.changes.args[0][0]).to.deep.equal({ live: true, since: undefined });
        chai.expect(handler.on.args[0][0]).to.equal('change');
      });
    });

    it('uses existing meta data doc', () => {
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      return feed.listen().then(() => {
        chai.expect(db.medic.changes.callCount).to.equal(1);
        chai.expect(db.medic.changes.args[0][0]).to.deep.equal({ live: true, since: '123' });
        chai.expect(handler.on.args[0][0]).to.equal('change');
        chai.expect(handler.on.args[1][0]).to.equal('error');
      });
    });

    it('does not register listener twice', () => {
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      return feed.listen()
        .then(() => feed.listen())
        .then(() => {
          chai.expect(db.medic.changes.callCount).to.equal(1);
        });
    });

    it('restarts listener after db error', () => {
      const clock = sinon.useFakeTimers();
      const change = { id: 'some-uuid' };
      sinon.stub(metadata, 'getProcessedSeq')
        .onCall(0).resolves('123')
        .onCall(1).resolves('456');

      const push = sinon.stub(feed._changeQueue, 'push');
      return feed
        .listen()
        .then(() => {
          chai.expect(db.medic.changes.callCount).to.equal(1);
          chai.expect(db.medic.changes.args[0][0]).to.deep.equal({ live: true, since: '123' });
          chai.expect(handler.on.args[0][0]).to.equal('change');
          chai.expect(handler.on.args[1][0]).to.equal('error');
          const errorFn = handler.on.args[1][1];
          // something horrible happens
          errorFn({ status: 404 });
        })
        .then(() => {
          clock.tick(65000);
          return Promise.resolve();
        })
        .then(() => {
          // the feed is recreated later
          chai.expect(db.medic.changes.callCount).to.equal(2);
          chai.expect(db.medic.changes.args[1][0]).to.deep.equal({ live: true, since: '456' });
          const callbackFn = handler.on.args[2][1];
          callbackFn(change);
        })
        .then(() => {
          chai.expect(push.callCount).to.equal(1);
          chai.expect(push.args[0][0]).to.deep.equal(change);
        });
    });

  });

  describe('listener', () => {

    it('invokes listener with changes', done => {
      const change = { id: 'some-uuid' };
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
      sinon.stub(feed._changeQueue, 'length').returns(0);
      const push = sinon.stub(feed._changeQueue, 'push');

      feed
        .listen()
        .then(() => {
          const callbackFn = handler.on.args[0][1];
          callbackFn(change);
        })
        .then(() => {
          chai.expect(push.callCount).to.equal(1);
          chai.expect(push.args[0][0]).to.deep.equal(change);
          done();
        });
    });

    it('ignores ddocs', () => {
      const ddoc = { id: '_design/medic' };
      const edoc = { id: 'some-uuid' };
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
      sinon.stub(feed._changeQueue, 'length').returns(0);
      const push = sinon.stub(feed._changeQueue, 'push');
      return feed
        .listen()
        .then(() => {
          const callbackFn = handler.on.args[0][1];
          callbackFn(ddoc);
          callbackFn(edoc);
        })
        .then(() => {
          chai.expect(push.callCount).to.equal(1);
          chai.expect(push.args[0][0]).to.deep.equal(edoc);
        });
    });

    it('ignores info docs', () => {
      const infodoc = { id: 'some-uuid-info' };
      const doc = { id: 'some-uuid' };
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);

      const push = sinon.stub(feed._changeQueue, 'push');
      return feed
        .listen()
        .then(() => {
          const callbackFn = handler.on.args[0][1];
          callbackFn(infodoc);
          callbackFn(doc);
        })
        .then(() => {
          chai.expect(push.callCount).to.equal(1);
          chai.expect(push.args[0][0]).to.deep.equal(doc);
        });
    });

    it('ignores tombstones', () => {
      const tombstone = { id: 'tombstone' };
      const doc = { id: 'some-uuid' };
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId')
        .withArgs(tombstone.id).returns(true)
        .withArgs(doc.id).returns(false);

      const push = sinon.stub(feed._changeQueue, 'push');
      return feed
        .listen()
        .then(() => {
          const callbackFn = handler.on.args[0][1];
          callbackFn(tombstone);
          callbackFn(doc);
        })
        .then(() => {
          chai.expect(push.callCount).to.equal(1);
          chai.expect(push.args[0][0]).to.deep.equal(doc);
          chai.expect(tombstoneUtils.isTombstoneId.callCount).to.equal(2);
        });
    });

    it('stops listening when the number of changes in the queue is above the limit', () => {
      const change = { id: 'some-uuid' };
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);

      sinon.stub(feed._changeQueue, 'length').returns(101);
      const push = sinon.stub(feed._changeQueue, 'push');

      return feed
        .listen()
        .then(() => {
          const callbackFn = handler.on.args[0][1];
          callbackFn(change);
        })
        .then(() => {
          chai.expect(push.callCount).to.equal(1);
          chai.expect(push.args[0][0]).to.deep.equal(change);
          chai.expect(handler.cancel.callCount).to.equal(1);
        });
    });

  });

  describe('cancel', () => {

    it('cancels the couch request', () => {
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');

      const push = sinon.stub(feed._changeQueue, 'push');
      const change = { id: 'some-uuid' };

      return feed
        .listen()
        .then(() => feed.cancel())
        .then(() => {
          chai.expect(handler.cancel.callCount).to.equal(1);
          // resume listening
          return feed.listen();
        })
        .then(() => {
          const callbackFn = handler.on.args[0][1];
          callbackFn(change);
        })
        .then(() => {
          chai.expect(push.callCount).to.equal(1);
          chai.expect(push.args[0][0]).to.deep.equal(change);
        });
    });

  });

  describe('deleteReadDocs', () => {

    it('handles missing read doc', () => {
      db.medicDbName = 'medic';
      const given = { id: 'abc' };
      const metaDb = {
        remove: sinon.stub(),
        allDocs: sinon.stub().resolves({
          rows: [
            { key: 'read:message:abc', error: 'notfound' },
            { key: 'read:report:abc', error: 'notfound' }
          ]
        }),
      };
      sinon.stub(db, 'allDbs').resolves([`${db.medicDbName}-user-gareth-meta`]);
      sinon.stub(db, 'get').returns(metaDb);
      sinon.stub(db, 'close');
      return feed._deleteReadDocs(given).then(() => {
        assert.equal(db.allDbs.callCount, 1);
        assert.equal(db.get.callCount, 1);
        assert.deepEqual(db.get.args[0], [`${db.medicDbName}-user-gareth-meta`]);
        assert.equal(metaDb.allDocs.callCount, 1);
        assert.deepEqual(metaDb.allDocs.args[0], [{ keys: ['read:report:abc', 'read:message:abc'] }]);
        assert.equal(metaDb.remove.callCount, 0);
        assert.equal(db.close.callCount, 1);
        assert.deepEqual(db.close.args[0], [metaDb]);
      });
    });

    it('deletes read doc for all users', () => {
      db.medicDbName = 'medic';
      const given = { id: 'abc' };
      const metaDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { key: 'read:message:abc', error: 'notfound' },
            { key: 'read:report:abc', id: 'read:report:abc', value: { rev: '1-rev' } }
          ]
        }),
        remove: sinon.stub().resolves()
      };
      const list = sinon.stub(db, 'allDbs').resolves([
        `${db.medicDbName}-user-gareth-meta`,
        `${db.medicDbName}-user-jim-meta`,
        db.medicDbName, // not a user db - must be ignored
      ]);
      const use = sinon.stub(db, 'get').returns(metaDb);
      sinon.stub(db, 'close');
      return feed._deleteReadDocs(given).then(() => {
        assert.equal(list.callCount, 1);
        assert.equal(use.callCount, 2);
        assert.equal(use.args[0][0], `${db.medicDbName}-user-gareth-meta`);
        assert.equal(use.args[1][0], `${db.medicDbName}-user-jim-meta`);
        assert.equal(metaDb.allDocs.callCount, 2);
        assert.equal(metaDb.allDocs.args[0][0].keys.length, 2);
        assert.equal(metaDb.allDocs.args[0][0].keys[0], 'read:report:abc');
        assert.equal(metaDb.allDocs.args[0][0].keys[1], 'read:message:abc');
        assert.equal(metaDb.allDocs.args[1][0].keys.length, 2);
        assert.equal(metaDb.allDocs.args[1][0].keys[0], 'read:report:abc');
        assert.equal(metaDb.allDocs.args[1][0].keys[1], 'read:message:abc');
        assert.equal(metaDb.remove.callCount, 2);
        assert.deepEqual(metaDb.remove.args[0], ['read:report:abc', '1-rev']);
        assert.deepEqual(metaDb.remove.args[1], ['read:report:abc', '1-rev']);
        assert.equal(db.close.callCount, 2);
        assert.deepEqual(db.close.args, [[metaDb], [metaDb]]);
      });
    });

  });

  describe('changeQueue', () => {
    it('handles an empty change', done => {
      sinon.stub(feed._changeQueue, 'length').returns(0);
      sinon.stub(metadata, 'update').resolves();
      sinon.stub(feed._transitionsLib, 'processChange').callsArgWith(1);

      feed._enqueue();

      feed._changeQueue.drain(() => {
        return Promise.resolve().then(() => {
          assert.equal(feed._transitionsLib.processChange.callCount, 0);
          return Promise.resolve().then(() => {
            assert.equal(metadata.update.callCount, 0);
            done();
          });
        });
      });
    });

    it('processes deleted changes through TombstoneUtils to create tombstones', done => {
      sinon.stub(tombstoneUtils, 'processChange').resolves();
      sinon.stub(metadata, 'update').resolves();
      sinon.stub(infodoc, 'delete').resolves();
      sinon.stub(db, 'allDbs').resolves([]);

      feed._enqueue({ id: 'somechange', seq: 55, deleted: true });

      feed._changeQueue.drain(() => {
        return Promise.resolve().then(() => {
          assert.equal(tombstoneUtils.processChange.callCount, 1);
          assert.deepEqual(tombstoneUtils.processChange.args[0][2], {
            id: 'somechange',
            seq: 55,
            deleted: true,
          });
          return Promise.resolve().then(() => {
            assert.equal(metadata.update.callCount, 1);
            assert.equal(metadata.update.args[0][0], 55);
            done();
          });
        });
      });
    });

    it('does not advance metadata document if creating tombstone fails', done => {
      sinon.stub(tombstoneUtils, 'processChange').rejects();
      sinon.stub(metadata, 'update').resolves();
      sinon.stub(infodoc, 'delete').resolves();
      sinon.stub(db, 'allDbs').resolves([]);

      feed._enqueue({ id: 'somechange', seq: 55, deleted: true });

      feed._changeQueue.drain(() => {
        return Promise.resolve().then(() => {
          assert.equal(tombstoneUtils.processChange.callCount, 1);
          assert.deepEqual(tombstoneUtils.processChange.args[0][2], {
            id: 'somechange',
            seq: 55,
            deleted: true,
          });
          return Promise.resolve().then(() => {
            assert.equal(metadata.update.callCount, 0);
            done();
          });
        });
      });
    });

    it('runs transitions lib over changes', done => {
      sinon.stub(metadata, 'update').resolves();
      sinon.stub(feed._transitionsLib, 'processChange').callsArgWith(1);

      feed._enqueue({ id: 'somechange', seq: 55 });

      feed._changeQueue.drain(() => {
        return Promise.resolve().then(() => {
          assert.equal(feed._transitionsLib.processChange.callCount, 1);
          assert.deepEqual(feed._transitionsLib.processChange.args[0][0], { id: 'somechange', seq: 55 });
          return Promise.resolve().then(() => {
            assert.equal(metadata.update.callCount, 1);
            assert.equal(metadata.update.args[0][0], 55);
            done();
          });
        });
      });
    });
  });
});
