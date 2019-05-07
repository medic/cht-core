const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../src/db');
const feed = require('../../../src/lib/feed');
const tombstoneUtils = require('@medic/tombstone-utils');

describe('feed', () => {

  let queue;
  let handler;

  beforeEach(() => {
    queue = { push: sinon.stub() };
    handler = { on: sinon.stub().returns({ on: function() {} }) };
    sinon.stub(db.medic, 'changes').returns(handler);
  });

  afterEach(() => sinon.restore());

  it('pushes changes onto the queue', () => {
    feed.followFeed('123', queue);
    chai.expect(db.medic.changes.callCount).to.equal(1);
    chai.expect(db.medic.changes.args[0][0]).to.deep.equal({ live: true, since: '123' });
    chai.expect(handler.on.args[0][0]).to.equal('change');
    const callbackFn = handler.on.args[0][1];
    const change = { id: 'some-uuid' };
    callbackFn(change);
    chai.expect(queue.push.callCount).to.equal(1);
    chai.expect(queue.push.args[0][0]).to.equal(change);
  });

  it('ignores ddocs', () => {
    feed.followFeed('123', queue);
    chai.expect(handler.on.args[0][0]).to.equal('change');
    const callbackFn = handler.on.args[0][1];
    const change = { id: '_design/medic' };
    callbackFn(change);
    chai.expect(queue.push.callCount).to.equal(0);
  });

  it('ignores info docs', () => {
    feed.followFeed('123', queue);
    chai.expect(handler.on.args[0][0]).to.equal('change');
    const callbackFn = handler.on.args[0][1];
    const change = { id: 'some-uuid-info' };
    callbackFn(change);
    chai.expect(queue.push.callCount).to.equal(0);
  });

  it('should ignore tombstones', () => {
    sinon.stub(tombstoneUtils, 'isTombstoneId').withArgs('some-uuid____tombstone').returns(true);
    feed.followFeed('123', queue);
    chai.expect(handler.on.args[0][0]).to.equal('change');
    const callbackFn = handler.on.args[0][1];
    const change = { id: 'some-uuid____tombstone' };
    callbackFn(change);
    chai.expect(queue.push.callCount).to.equal(0);
  });
});
