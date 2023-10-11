const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const db = require('../../../src/db');
const getChangesEmitter = (emitter) => {
  emitter.on = sinon.stub().returns(emitter);
  emitter.returns(emitter);
  return emitter;
};

let dbWatcher;

describe('db watcher', () => {
  beforeEach(() => {
    dbWatcher = rewire('../../../src/services/db-watcher');

    getChangesEmitter(sinon.stub(db.medic, 'changes'));
    getChangesEmitter(sinon.stub(db.sentinel, 'changes'));
    getChangesEmitter(sinon.stub(db.users, 'changes'));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should watch and emit medic changes', async () => {
    dbWatcher.__get__('listen')();

    expect(db.medic.changes.args).to.deep.equal([[{ live: true, since: 'now', return_docs: false }]]);
    expect(db.medic.changes.on.callCount).to.equal(2);
    const onChange = db.medic.changes.on.args[0][1];

    const subscriptionCallback = sinon.stub();
    dbWatcher.medic(subscriptionCallback);

    const change = { the: 'change' };
    onChange(change);
    expect(subscriptionCallback.args).to.deep.equal([[change]]);
  });

  it('should watch and emit sentinel changes', async () => {
    dbWatcher.__get__('listen')();

    expect(db.sentinel.changes.args).to.deep.equal([[{ live: true, since: 'now', return_docs: false }]]);
    expect(db.sentinel.changes.on.callCount).to.equal(2);
    const onChange = db.sentinel.changes.on.args[0][1];

    const subscriptionCallback = sinon.stub();
    dbWatcher.sentinel(subscriptionCallback);

    const change = { the: 'change' };
    onChange(change);
    expect(subscriptionCallback.args).to.deep.equal([[change]]);
  });

  it('should watch and emit users changes', async () => {
    dbWatcher.__get__('listen')();

    expect(db.users.changes.args).to.deep.equal([[{ live: true, since: 'now', return_docs: false }]]);
    expect(db.users.changes.on.callCount).to.equal(2);
    const onChange = db.users.changes.on.args[0][1];

    const subscriptionCallback = sinon.stub();
    dbWatcher.users(subscriptionCallback);

    const change = { the: 'change' };
    onChange(change);
    expect(subscriptionCallback.args).to.deep.equal([[change]]);
  });

  // eslint-disable-next-line no-undef
  xit('should terminate process on error', () => {
    sinon.stub(process, 'exit');
    dbWatcher.__get__('listen')();
    expect(process.exit.callCount).to.equal(0);

    db.medic.changes.on.args[1][1]();
    expect(process.exit.args).to.deep.equal([[1]]);
    db.sentinel.changes.on.args[1][1]();
    expect(process.exit.args).to.deep.equal([[1], [1]]);
    db.users.changes.on.args[1][1]();
    expect(process.exit.args).to.deep.equal([[1], [1], [1]]);
  });
});
