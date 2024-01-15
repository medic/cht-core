const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const config = require('../../../src/config');
const later = require('later');
const purgeLib = require('../../../src/lib/purging');

let clock;
let scheduler;

describe('Purging Schedule', () => {

  beforeEach(() => {
    clock = sinon.useFakeTimers(new Date());
    scheduler = rewire('../../../src/schedule/purging');
  });

  afterEach(() => {
    clearTimeout(scheduler.__get__('purgeTimeout'));
    sinon.restore();
    clock.restore();
  });

  it('should abort if no purging configuration', () => {
    sinon.stub(config, 'get');
    sinon.stub(later.parse, 'text');
    sinon.stub(later.parse, 'cron');
    sinon.stub(purgeLib, 'purge');
    return scheduler.execute().then(() => {
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(config.get.args[0]).to.deep.equal(['purge']);
      chai.expect(later.parse.text.callCount).to.equal(0);
      chai.expect(later.parse.cron.callCount).to.equal(0);
      chai.expect(purgeLib.purge.callCount).to.equal(0);
    });
  });

  it('should abort if malformed text configuration', () => {
    sinon.stub(config, 'get').returns({ text_expression: 'something' });
    sinon.stub(later.parse, 'text').returns(false);
    sinon.stub(later.parse, 'cron');
    sinon.stub(purgeLib, 'purge');

    return scheduler.execute().then(() => {
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(later.parse.text.callCount).to.equal(1);
      chai.expect(later.parse.text.args[0]).to.deep.equal(['something']);
      chai.expect(later.parse.cron.callCount).to.equal(0);
      chai.expect(purgeLib.purge.callCount).to.equal(0);
    });
  });

  it('should abort if malformed cron configuration', () => {
    sinon.stub(config, 'get').returns({ cron: '* * something' });
    sinon.stub(later.parse, 'text');
    sinon.stub(later.parse, 'cron').returns(false);
    sinon.stub(purgeLib, 'purge');

    return scheduler.execute().then(() => {
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(later.parse.text.callCount).to.equal(0);
      chai.expect(later.parse.cron.callCount).to.equal(1);
      chai.expect(later.parse.cron.args[0]).to.deep.equal(['* * something']);
      chai.expect(purgeLib.purge.callCount).to.equal(0);
    });
  });

  it('should create purge timeout', () => {
    sinon.stub(config, 'get').returns({ cron: '* 1 * * *' });
    sinon.spy(later.parse, 'cron');
    sinon.spy(clock, 'setTimeout');

    return scheduler.execute().then(() => {
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(later.parse.cron.callCount).to.equal(1);
      chai.expect(later.parse.cron.args[0]).to.deep.equal(['* 1 * * *']);
      chai.expect(clock.setTimeout.callCount).to.equal(1);
      chai.expect(clock.setTimeout.args[0][0]).to.equal(purgeLib.purge);
    });
  });

  it('should clear previous timeout when re-running', () => {
    sinon.stub(config, 'get').returns({ cron: '* 1 * * *' });
    sinon.spy(later.parse, 'cron');
    sinon.spy(clock, 'setTimeout');
    sinon.spy(clock, 'clearTimeout');

    return scheduler.execute()
      .then(() => {
        chai.expect(config.get.callCount).to.equal(1);
        chai.expect(later.parse.cron.callCount).to.equal(1);
        chai.expect(later.parse.cron.args[0]).to.deep.equal(['* 1 * * *']);
        chai.expect(clock.setTimeout.callCount).to.equal(1);
        chai.expect(clock.setTimeout.args[0][0]).to.equal(purgeLib.purge);
        chai.expect(clock.clearTimeout.callCount).to.equal(0);
      })
      .then(() => scheduler.execute())
      .then(() => {
        chai.expect(config.get.callCount).to.equal(2);
        chai.expect(later.parse.cron.callCount).to.equal(2);
        chai.expect(later.parse.cron.args[1]).to.deep.equal(['* 1 * * *']);
        chai.expect(clock.setTimeout.callCount).to.equal(2);
        chai.expect(clock.setTimeout.args[1][0]).to.deep.equal(purgeLib.purge);
        chai.expect(clock.clearTimeout.callCount).to.equal(1);
      });
  });
});
