const _ = require('lodash');
const later = require('later');
const sinon = require('sinon');
const assert = require('chai').assert;
const config = require('../../src/config');
const replications = require('../../src/schedule/replications');
const db = require('../../src/db');

describe('replications', () => {
  afterEach(() => sinon.restore());

  it('replications#execute is function', () => {
    assert(_.isFunction(replications.execute));
  });

  it('config with no replications calls callback', done => {
    sinon.stub(config, 'get').returns([]);
    sinon.stub(replications, 'runReplication').throws();
    replications.execute(err => {
      assert.equal(err, null);
      done();
    });
  });

  it('config with invalid replication throws error', done => {
    sinon.stub(config, 'get').returns([{fromSuffix:'x', cron:1, toSuffix:'x'}]);
    const runReplication = sinon.stub(replications, 'runReplication');
    assert.throws(() => replications.execute(), 'Invalid replication config with fromSuffix = \'x\', ' +
      'toSuffix = \'x\', text expression = \'undefined\' and cron = \'1\'');
    assert.equal(runReplication.callCount, 0);
    done();
  });

  it('config with three matching replications calls runReplication thrice', done => {
    sinon.stub(later, 'setInterval').callsArgWith(0).returns({ clear: sinon.stub() });
    sinon.stub(config, 'get').returns([
      {fromSuffix:'x', cron:'x', toSuffix:'x'},
      {fromSuffix:'y', cron:'y', toSuffix:'y'},
      {fromSuffix:'z', cron:'z', toSuffix:'z'}
    ]);
    const runReplication = sinon.stub(replications, 'runReplication');
    replications.execute(err => {
      assert.equal(err, null);
      assert.equal(runReplication.callCount, 3);
      done();
    });
  });

  it('executes runReplication but does not start replicating if no matching dbs', done => {
    sinon.stub(later, 'setInterval').callsArgWith(0).returns({ clear: sinon.stub() });
    sinon.stub(config, 'get').returns([
      {fromSuffix:'x', cron:'y', toSuffix:'z'}
    ]);
    const replicateDbs = sinon.stub(replications, 'replicateDbs');
    replicateDbs.returns(Promise.resolve());
    sinon.stub(db, 'allDbs').resolves(['a-b', 'a-s', 'a-x-1', 'a-x-2']);
    replications.execute(err => {
      assert.equal(err, null);
      assert.equal(replicateDbs.callCount, 1);
      assert.deepEqual(replicateDbs.args[0][0], []);
      done();
    });
  });

  it('executes runReplication starts replicating matching dbs', done => {
    sinon.stub(later, 'setInterval').callsArgWith(0).returns({ clear: sinon.stub() });
    sinon.stub(config, 'get').returns([
      {fromSuffix:'x', cron:'y', toSuffix:'z'}
    ]);
    const replicateDbs = sinon.stub(replications, 'replicateDbs');
    replicateDbs.returns(Promise.resolve());
    sinon.stub(db, 'allDbs').resolves(['medic-b', 'medic-s', `${db.medicDbName}-x-1`, `${db.medicDbName}-x-2`]);
    replications.execute(err => {
      assert.equal(err, null);
      assert.equal(replicateDbs.callCount, 1);
      assert.deepEqual(replicateDbs.args[0][0], [`${db.medicDbName}-x-1`, `${db.medicDbName}-x-2`]);
      assert.equal(replicateDbs.args[0][1], `${db.medicDbName}-z`);
      done();
    });
  });
});
