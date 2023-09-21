const config = require('../../../src/config');
config.initTransitionLib();

const sinon = require('sinon');
const chai = require('chai');
const assert = require('chai').assert;
const db = require('../../../src/db');
const feed = require('../../../src/lib/feed');
const metadata = require('../../../src/lib/metadata');
const logger = require('../../../src/lib/logger');
const tombstoneUtils = require('@medic/tombstone-utils');

describe('feed', () => {

  let handler;

  beforeEach(() => {
    handler = {
      cancel: sinon.stub()
    };
    handler.catch = sinon.stub().returns(handler);
    handler.on = sinon.stub().returns(handler);
    sinon.stub(db.medic, 'changes').returns(handler);
    feed._changeQueue.resume();
  });

  afterEach(() => {
    feed.cancel();
    sinon.restore();
  });

  describe('initialization', () => {

    it('handles missing meta data doc', () => {
      sinon.stub(metadata, 'getTransitionSeq').rejects({ status: 404 });
      return feed.listen().then(() => {
        chai.expect(db.medic.changes.callCount).to.equal(1);
        chai.expect(db.medic.changes.args[0][0]).to.deep.equal({ live: true, since: undefined });
        chai.expect(handler.on.args[0][0]).to.equal('change');
      });
    });

    it('uses existing meta data doc', () => {
      sinon.stub(metadata, 'getTransitionSeq').resolves('123');
      return feed.listen().then(() => {
        chai.expect(db.medic.changes.callCount).to.equal(1);
        chai.expect(db.medic.changes.args[0][0]).to.deep.equal({ live: true, since: '123' });
        chai.expect(handler.on.args[0][0]).to.equal('change');
        chai.expect(handler.on.args[1][0]).to.equal('error');
      });
    });

    it('does not register listener twice', () => {
      sinon.stub(metadata, 'getTransitionSeq').resolves('123');
      return feed.listen()
        .then(() => feed.listen())
        .then(() => {
          chai.expect(db.medic.changes.callCount).to.equal(1);
        });
    });

    it('restarts listener after db error', () => {
      const realSetTimeout = setTimeout;
      const nextTick = () => new Promise(resolve => realSetTimeout(() => resolve()));
      const clock = sinon.useFakeTimers();
      const change = { id: 'some-uuid' };
      sinon.stub(metadata, 'getTransitionSeq')
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
          return nextTick();
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

    it('invokes listener with changes', () => {
      const change = { id: 'some-uuid' };
      sinon.stub(metadata, 'getTransitionSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
      sinon.stub(feed._changeQueue, 'length').returns(0);
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
        });
    });

    it('ignores ddocs', () => {
      const ddoc = { id: '_design/medic' };
      const edoc = { id: 'some-uuid' };
      sinon.stub(metadata, 'getTransitionSeq').resolves('123');
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
      sinon.stub(metadata, 'getTransitionSeq').resolves('123');
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
      sinon.stub(metadata, 'getTransitionSeq').resolves('123');
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
      sinon.stub(metadata, 'getTransitionSeq').resolves('123');
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

    it('should restart the queue', () => {
      feed.cancel();
      sinon.stub(metadata, 'getTransitionSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
      const change = { id: 'some-uuid' };
      sinon.stub(feed._changeQueue, 'push');
      sinon.spy(feed._changeQueue, 'resume');

      return feed
        .listen()
        .then(() => {
          const callbackFn = handler.on.args[0][1];
          callbackFn(change);
        })
        .then(() => {
          chai.expect(feed._changeQueue.resume.callCount).to.equal(1);
          chai.expect(feed._changeQueue.push.callCount).to.equal(1);
          chai.expect(feed._changeQueue.push.args[0][0]).to.deep.equal(change);
        });
    });
  });

  describe('cancel', () => {

    it('cancels the couch request', () => {
      sinon.stub(metadata, 'getTransitionSeq').resolves('123');

      const push = sinon.stub(feed._changeQueue, 'push');
      const change = { id: 'some-uuid' };
      sinon.spy(feed._changeQueue, 'pause');

      return feed
        .listen()
        .then(() => feed.cancel())
        .then(() => {
          chai.expect(feed._changeQueue.pause.callCount).to.equal(1);
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

  describe('changeQueue', () => {
    it('should not resume feed if drain happens while queue is paused', (done) => {
      let resolvePromise;
      const delayedPromise = new Promise(resolve => resolvePromise = resolve);
      sinon.stub(feed._transitionsLib, 'processChange').callsFake((change, cb) => {
        return delayedPromise.then(() => cb());
      });
      sinon.spy(logger, 'debug');
      sinon.spy(feed._changeQueue, 'resume');
      sinon.stub(metadata, 'getTransitionSeq').resolves();
      sinon.stub(metadata, 'setTransitionSeq').resolves();

      feed._enqueue({ id: 'somechange', seq: 65558 });
      feed._changeQueue.process();
      feed.cancel(); // feed is now canceled
      resolvePromise(); // queue is now drained
      setTimeout(() => {
        chai.expect(logger.debug.withArgs('transitions: queue drained').callCount).to.equal(1);
        chai.expect(feed._changeQueue.resume.callCount).to.equal(0);
        chai.expect(metadata.setTransitionSeq.callCount).to.equal(1);
        chai.expect(metadata.setTransitionSeq.args[0]).to.deep.equal([65558]);
        chai.expect(metadata.getTransitionSeq.callCount).to.equal(1); // we get the seq anyway
        chai.expect(db.medic.changes.callCount).to.equal(0); // but we don't restart the watcher
        done();
      });
    });

    it('handles an empty change', done => {
      sinon.stub(feed._changeQueue, 'length').returns(0);
      sinon.stub(metadata, 'setTransitionSeq').resolves();
      sinon.stub(feed._transitionsLib, 'processChange').callsArgWith(1);

      feed._enqueue();

      feed._changeQueue.drain(() => {
        return Promise.resolve().then(() => {
          assert.equal(feed._transitionsLib.processChange.callCount, 0);
          return Promise.resolve().then(() => {
            assert.equal(metadata.setTransitionSeq.callCount, 0);
            done();
          });
        });
      });
    });

    it('processes deleted changes through TombstoneUtils to create tombstones', done => {
      sinon.stub(tombstoneUtils, 'processChange').resolves();
      sinon.stub(metadata, 'setTransitionSeq').resolves();
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
            assert.equal(metadata.setTransitionSeq.callCount, 1);
            assert.equal(metadata.setTransitionSeq.args[0][0], 55);
            done();
          });
        });
      });
    });

    it('does advance metadata document if creating tombstone fails', done => {
      sinon.stub(tombstoneUtils, 'processChange').rejects();
      sinon.stub(metadata, 'setTransitionSeq').resolves();
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
            assert.equal(metadata.setTransitionSeq.callCount, 1);
            done();
          });
        });
      });
    });

    it('runs transitions lib over changes', done => {
      sinon.stub(metadata, 'setTransitionSeq').resolves();
      sinon.stub(feed._transitionsLib, 'processChange').callsArgWith(1);

      feed._enqueue({ id: 'somechange', seq: 55 });

      feed._changeQueue.drain(() => {
        return Promise.resolve().then(() => {
          assert.equal(feed._transitionsLib.processChange.callCount, 1);
          assert.deepEqual(feed._transitionsLib.processChange.args[0][0], { id: 'somechange', seq: 55 });
          return Promise.resolve().then(() => {
            assert.equal(metadata.setTransitionSeq.callCount, 1);
            assert.equal(metadata.setTransitionSeq.args[0][0], 55);
            done();
          });
        });
      });
    });
  });
});
