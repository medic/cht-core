const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../src/db');
const feed = require('../../../src/lib/feed');
const metadata = require('../../../src/lib/metadata');
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
  });

  afterEach(() => {
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

    it('restarts listener after db error', done => {
      const clock = sinon.useFakeTimers();
      const change = { id: 'some-uuid' };
      sinon.stub(metadata, 'getProcessedSeq')
        .onCall(0).resolves('123')
        .onCall(1).resolves('456');
      feed
        .listen(c => {
          chai.expect(c).to.equal(change);
          clock.restore();
          done();
        })
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
        });
    });

  });

  describe('listener', () => {

    it('invokes callback with changes', done => {
      const change = { id: 'some-uuid' };
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
      feed
        .listen(c => {
          chai.expect(c).to.equal(change);
          done();
        })
        .then(() => {
          const callbackFn = handler.on.args[0][1];
          callbackFn(change);
        });
    });

    it('ignores ddocs', done => {
      const ddoc = { id: '_design/medic' };
      const edoc = { id: 'some-uuid' };
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
      feed
        .listen(change => {
          chai.expect(change).to.equal(edoc);
          done();
        })
        .then(() => {
          const callbackFn = handler.on.args[0][1];
          callbackFn(ddoc);
          callbackFn(edoc);
        });
    });

    it('ignores info docs', done => {
      const infodoc = { id: 'some-uuid-info' };
      const doc = { id: 'some-uuid' };
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
      feed
        .listen(change => {
          chai.expect(change).to.equal(doc);
          done();
        })
        .then(() => {
          const callbackFn = handler.on.args[0][1];
          callbackFn(infodoc);
          callbackFn(doc);
        });
    });

    it('ignores tombstones', done => {
      const tombstone = { id: 'tombstone' };
      const doc = { id: 'some-uuid' };
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      sinon.stub(tombstoneUtils, 'isTombstoneId')
        .withArgs(tombstone.id).returns(true)
        .withArgs(doc.id).returns(false);
      feed
        .listen(change => {
          chai.expect(change).to.equal(doc);
          chai.expect(tombstoneUtils.isTombstoneId.callCount).to.equal(2);
          done();
        })
        .then(() => {
          const callbackFn = handler.on.args[0][1];
          callbackFn(tombstone);
          callbackFn(doc);
        });
    });

  });

  describe('cancel', () => {

    it('cancels the couch request', done => {
      sinon.stub(metadata, 'getProcessedSeq').resolves('123');
      feed
        .listen(() => done(new Error('wrong callback notified')))
        .then(() => feed.cancel())
        .then(() => {
          chai.expect(handler.cancel.callCount).to.equal(1);

          // resume listening
          const change = { id: 'some-uuid' };
          feed
            .listen(c => {
              chai.expect(c).to.equal(change);
              done();
            })
            .then(() => {
              const callbackFn = handler.on.args[0][1];
              callbackFn(change);
            });
        });
    });

  });

});
