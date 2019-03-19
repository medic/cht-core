var _ = require('underscore'),
    later = require('later'),
    sinon = require('sinon'),
    assert = require('chai').assert,
    config = require('../../src/config'),
    replications = require('../../src/schedule/replications');

describe('replications', () => {
  afterEach(() => sinon.restore());

  beforeEach(() => { process.env.TEST_ENV = true; });

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

  it('config with invalid replication calls callback with error', done => {
    sinon.stub(config, 'get').returns([{from:'x', cron:1, to:'x'}]);
    const runReplication = sinon.stub(replications, 'runReplication');
    replications.execute(err => {
      assert.equal(err, `Invalid replication config with text expression = 'undefined' and cron = '1'`);
      assert.equal(runReplication.callCount, 0);
      done();
    });
  });

  it('config with three matching replications calls runReplication thrice', done => {
      sinon.stub(later, 'setInterval').callsArgWith(0);
      sinon.stub(config, 'get').returns([
          {from:'x', cron:'x', to:'x'},
          {from:'y', cron:'y', to:'y'},
          {from:'z', cron:'z', to:'z'}
      ]);
      const runReplication = sinon.stub(replications, 'runReplication');
      replications.execute(err => {
          assert.equal(err, null);
          assert.equal(runReplication.callCount, 3);
          done();
      });
  });
});