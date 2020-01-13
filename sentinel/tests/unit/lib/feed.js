const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../src/db');
const feed = require('../../../src/lib/feed');
const metadata = require('../../../src/lib/metadata');
const tombstoneUtils = require('@medic/tombstone-utils');

let clock;

describe('feed', () => {

  //let handler;
  const change = { id: 'some-uuid' };
  const tombstone = { id: 'tombstone' };

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    handler = {
      cancel: sinon.stub()
    };
    handler.catch = sinon.stub().returns(handler);
    handler.on = sinon.stub().returns(handler);
    sinon.stub(db.medic, 'changes')
      .withArgs({ live: true, since: '123'}).returns(handler)
      .withArgs({ live: true, since: '007' }).returns(handler)
      .withArgs({ live: true, since: '456' }).returns(handler)

      .withArgs({ limit: 100, since: '123' }).resolves({results: [change]})
      .withArgs({ limit: 100, since: '007' }).resolves({results: []})
      .withArgs({ limit: 100, since: undefined }).resolves({results: [change]})
      .withArgs({ limit: 100, since: '234' }).resolves({results: [tombstone, change]});
  });

  afterEach(() => {
    feed.cancel();
    sinon.restore();
    clock.restore();
  });

  describe('initialization', () => {

    it('handles missing meta data doc', () => {
      sinon.stub(metadata, 'getProcessedSeq').rejects({ status: 404 });
      return feed.fetch().then(() => {
        chai.expect(db.medic.changes.callCount).to.equal(1);
        chai.expect(db.medic.changes.args[0][0]).to.deep.equal({ limit: 100, since: undefined });
      });
    });

    it('uses existing meta data doc', () => {
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      return feed.fetch().then(() => {
        chai.expect(db.medic.changes.callCount).to.equal(1);
        chai.expect(db.medic.changes.args[0][0]).to.deep.equal({ limit: 100, since: '123' });
      });
    });

  });

  describe('fetch', () => {

    it('invokes callback with changes', done => {
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
      feed
        .fetch(c => {
          chai.expect(c).to.equal(change);
          done();
        });
    });

    it('ignores ddocs', done => {
      const ddoc = { id: '_design/medic' };
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
      feed
        .fetch(c => {
          chai.expect(c).to.equal(change);
          done();
        });
    });

    it('ignores info docs', done => {
      const infodoc = { id: 'some-uuid-info' };
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
      feed
        .fetch(c => {
          chai.expect(c).to.equal(change);
          done();
        });
    });

    it('ignores tombstones', done => {
      sinon.stub(metadata, 'getProcessedSeq').resolves('234');
      sinon.stub(tombstoneUtils, 'isTombstoneId')
        .withArgs(tombstone.id).returns(true)
        .withArgs(change.id).returns(false);
      feed
        .fetch(c => {
          chai.expect(c).to.equal(change);
          chai.expect(tombstoneUtils.isTombstoneId.callCount).to.equal(2);
          done();
        });
    });

    it('starts listener if results is empty', done => {
      sinon.stub(metadata, 'getProcessedSeq').resolves('007');
      feed.fetch().then(() => {
        chai.expect(db.medic.changes.callCount).to.equal(2);
        chai.expect(handler.on.args[0][0]).to.equal('change');
        done();
      });
    });

    it('does not register listener twice', done => {
      sinon.stub(metadata, 'getProcessedSeq').resolves('007');
      feed
        .fetch()
        .then(() => feed.fetch())
        .then(() => {
          chai.expect(db.medic.changes.callCount).to.equal(3);
          done();
        });
    });

    it('restarts listener after db error', done => {
      const change = { id: 'some-uuid' };
      sinon.stub(metadata, 'getProcessedSeq')
        .onCall(0).resolves('007')
        .onCall(1).resolves('007')
        .onCall(2).resolves('456');
      feed
        .fetch()
        .then(() => {
          chai.expect(db.medic.changes.callCount).to.equal(2);
          chai.expect(db.medic.changes.args[1][0]).to.deep.equal({ live: true, since: '007' });
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
        .then(async () => {
          await feed.initListen;
          // the feed is recreated later
          chai.expect(db.medic.changes.callCount).to.equal(3);
          chai.expect(db.medic.changes.args[2][0]).to.deep.equal({ live: true, since: '456' });
          
          done();
        });
    });
  });

  describe('cancel', () => {

    it('cancels the couch request', done => {
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
      feed
        .fetch(c => {
          chai.expect(c).to.equal(change);
        })
        .then(() => {
          clock.tick(65000);
          return Promise.resolve();
        })
        .then(async () => {
          await feed.initListen;

          feed.cancel()
        })
        .then(() => {
          chai.expect(feed.initListen).to.equal(undefined);
          chai.expect(feed.initFetch).to.equal(undefined);

          // resume listening
          feed
            .fetch(c => {
              chai.expect(c).to.equal(change);
              done();
            });
        });
    });

  });

});
