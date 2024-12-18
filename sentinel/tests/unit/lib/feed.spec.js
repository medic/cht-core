const config = require('../../../src/config');
config.initTransitionLib();

const sinon = require('sinon');
const chai = require('chai');
const rewire = require('rewire');

const db = require('../../../src/db');
const metadata = require('../../../src/lib/metadata');
const logger = require('@medic/logger');
const tombstoneUtils = require('@medic/tombstone-utils');
const changeRetryHistory = require('../../../src/lib/change-retry-history');

describe('feed', () => {

  let handler;
  let feed;
  let changeQueue;
  const realSetTimeout = setTimeout;
  const nextTick = () => new Promise(resolve => realSetTimeout(() => resolve()));

  let clock;

  beforeEach(() => {
    handler = {
      cancel: sinon.stub()
    };
    handler.catch = sinon.stub().returns(handler);
    handler.on = sinon.stub().returns(handler);
    sinon.stub(db.medic, 'changes').returns(handler);
    clock = sinon.useFakeTimers();
    feed = rewire('../../../src/lib/feed');
    changeQueue = feed.__get__('changeQueue');
    changeQueue.resume();
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
      const change = { id: 'some-uuid' };
      sinon.stub(metadata, 'getTransitionSeq')
        .onCall(0).resolves('123')
        .onCall(1).resolves('456');

      const push = sinon.stub(changeQueue, 'push');
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
      
      sinon.stub(changeQueue, 'length').returns(0);
      const push = sinon.stub(changeQueue, 'push');

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
      sinon.stub(changeQueue, 'length').returns(0);
      const push = sinon.stub(changeQueue, 'push');
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

      const push = sinon.stub(changeQueue, 'push');
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

      const push = sinon.stub(changeQueue, 'push');
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

    it('should skip docs that should not be retried', () => {
      const doc1 = { id: 'some-uuid' };
      const doc2 = { id: 'other-uuid' };
      sinon.stub(metadata, 'getTransitionSeq').resolves('123');
      sinon.stub(changeRetryHistory, 'shouldProcess')
        .withArgs(doc1).returns(false)
        .withArgs(doc2).returns(true);

      const push = sinon.stub(changeQueue, 'push');
      return feed
        .listen()
        .then(() => {
          const callbackFn = handler.on.args[0][1];
          callbackFn(doc1);
          callbackFn(doc2);
        })
        .then(() => {
          chai.expect(push.callCount).to.equal(1);
          chai.expect(push.args[0][0]).to.deep.equal(doc2);
        });
    });

    it('stops listening when the number of changes in the queue is above the limit', () => {
      const change = { id: 'some-uuid' };
      sinon.stub(metadata, 'getTransitionSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);

      sinon.stub(changeQueue, 'length').returns(101);
      const push = sinon.stub(changeQueue, 'push');

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
      sinon.stub(changeQueue, 'push');
      sinon.spy(changeQueue, 'resume');

      return feed
        .listen()
        .then(() => {
          const callbackFn = handler.on.args[0][1];
          callbackFn(change);
        })
        .then(() => {
          chai.expect(changeQueue.resume.callCount).to.equal(1);
          chai.expect(changeQueue.push.callCount).to.equal(1);
          chai.expect(changeQueue.push.args[0][0]).to.deep.equal(change);
        });
    });
  });

  describe('cancel', () => {

    it('cancels the couch request', () => {
      sinon.stub(metadata, 'getTransitionSeq').resolves('123');
      const changeQueue = feed.__get__('changeQueue');
      sinon.stub(changeQueue, 'push');
      
      const change = { id: 'some-uuid' };
      sinon.spy(changeQueue, 'pause');

      return feed
        .listen()
        .then(() => feed.cancel())
        .then(() => {
          chai.expect(changeQueue.pause.callCount).to.equal(1);
          chai.expect(handler.cancel.callCount).to.equal(1);
          // resume listening
          return feed.listen();
        })
        .then(() => {
          const callbackFn = handler.on.args[0][1];
          callbackFn(change);
        })
        .then(() => {
          chai.expect(changeQueue.push.callCount).to.equal(1);
          chai.expect(changeQueue.push.args[0][0]).to.deep.equal(change);
        });
    });

  });

  describe('toggle', () => {
    beforeEach(() => {
      feed.__set__('cancel', sinon.stub());
      feed.__set__('listen', sinon.stub());
    });

    it('should stop feed if started', () => {
      feed.__set__('processing', true);
      feed.toggle();
      chai.expect(feed.__get__('cancel').called).to.equal(true);
      chai.expect(feed.__get__('listen').called).to.equal(false);
    });

    it('should start feed if stopped', () => {
      feed.toggle();
      chai.expect(feed.__get__('cancel').called).to.equal(false);
      chai.expect(feed.__get__('listen').called).to.equal(true);
    });
  });

  describe('changeQueue', () => {
    it('should not resume feed if drain happens while queue is paused', (done) => {
      let resolvePromise;
      const delayedPromise = new Promise(resolve => resolvePromise = resolve);
      const transitionsLib = feed.__get__('transitionsLib');
      sinon.stub(transitionsLib, 'processChange').callsFake((change, cb) => {
        return delayedPromise.then(() => cb());
      });
      sinon.spy(logger, 'debug');
      sinon.spy(changeQueue, 'resume');
      sinon.stub(metadata, 'getTransitionSeq').resolves();
      sinon.stub(metadata, 'setTransitionSeq').resolves();

      feed.__get__('enqueue')({ id: 'somechange', seq: 65558 });
      changeQueue.process();
      feed.cancel(); // feed is now canceled
      resolvePromise(); // queue is now drained
      realSetTimeout(() => {
        chai.expect(logger.debug.withArgs('transitions: queue drained').callCount).to.equal(1);
        chai.expect(changeQueue.resume.callCount).to.equal(0);
        chai.expect(metadata.setTransitionSeq.callCount).to.equal(1);
        chai.expect(metadata.setTransitionSeq.args[0]).to.deep.equal([65558]);
        chai.expect(metadata.getTransitionSeq.callCount).to.equal(1); // we get the seq anyway
        chai.expect(db.medic.changes.callCount).to.equal(0); // but we don't restart the watcher
        done();
      });
    });

    it('handles an empty change', done => {
      sinon.stub(changeQueue, 'length').returns(0);
      sinon.stub(metadata, 'setTransitionSeq').resolves();
      const transitionsLib = feed.__get__('transitionsLib');
      sinon.stub(transitionsLib, 'processChange').callsArgWith(1);

      feed.__get__('enqueue')();

      changeQueue.drain(async () => {
        await Promise.resolve();
        chai.expect(transitionsLib.processChange.called).to.equal(false);
        await Promise.resolve();
        chai.expect(metadata.setTransitionSeq.called).to.equal(false);
        done();
      });
    });

    it('skips deleted changes ', done => {
      sinon.stub(metadata, 'setTransitionSeq').resolves();
      sinon.stub(db, 'allDbs').resolves([]);

      feed.__get__('enqueue')({ id: 'somechange', seq: 55, deleted: true });

      changeQueue.drain(async () => {
        await Promise.resolve();

        chai.expect(metadata.setTransitionSeq.calledOnce).to.equal(true);
        chai.expect(metadata.setTransitionSeq.args[0][0]).to.deep.equal(55);
        done();
      });
    });

    it('runs transitions lib over changes', done => {
      sinon.stub(metadata, 'setTransitionSeq').resolves();
      sinon.stub(feed.__get__('transitionsLib'), 'processChange').callsArgWith(1);

      feed.__get__('enqueue')({ id: 'somechange', seq: 55 });

      changeQueue.drain(async () => {
        await Promise.resolve();

        chai.expect(feed.__get__('transitionsLib').processChange.calledOnce).to.equal(true);
        chai.expect(feed.__get__('transitionsLib').processChange.args[0][0])
          .to.deep.equal({ id: 'somechange', seq: 55 });

        await Promise.resolve();

        chai.expect(metadata.setTransitionSeq.calledOnce).to.equal(true);
        chai.expect(metadata.setTransitionSeq.args[0][0]).to.deep.equal(55);

        done();
      });
    });
  });
});
