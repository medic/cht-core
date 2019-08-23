const chai = require('chai');
const sinon = require('sinon');

const config = require('../../../src/config');
const later = require('later');
const purgeLib = require('../../../src/lib/purging');
const scheduler = require('../../../src/schedule/purging');

describe('Purging Schedule', () => {
  afterEach(() => sinon.restore());

  it('should abort if no purging configuration', (done) => {
    sinon.stub(config, 'get');
    sinon.stub(later.parse, 'text');
    sinon.stub(later.parse, 'cron');
    sinon.stub(purgeLib, 'purge');
    scheduler.execute(() => {
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(config.get.args[0]).to.deep.equal(['purge']);
      chai.expect(later.parse.text.callCount).to.equal(0);
      chai.expect(later.parse.cron.callCount).to.equal(0);
      chai.expect(purgeLib.purge.callCount).to.equal(0);
      done();
    });
  });

  it('should abort if malformed text configuration', (done) => {
    sinon.stub(config, 'get').returns({ text_expression: 'something' });
    sinon.stub(later.parse, 'text').returns(false);
    sinon.stub(later.parse, 'cron');
    sinon.stub(purgeLib, 'purge');

    scheduler.execute(() => {
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(later.parse.text.callCount).to.equal(1);
      chai.expect(later.parse.text.args[0]).to.deep.equal(['something']);
      chai.expect(later.parse.cron.callCount).to.equal(0);
      chai.expect(purgeLib.purge.callCount).to.equal(0);
      done();
    });
  });

  it('should abort if malformed cron configuration', (done) => {
    sinon.stub(config, 'get').returns({ cron: '* * something' });
    sinon.stub(later.parse, 'text');
    sinon.stub(later.parse, 'cron').returns(false);
    sinon.stub(purgeLib, 'purge');

    scheduler.execute(() => {
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(later.parse.text.callCount).to.equal(0);
      chai.expect(later.parse.cron.callCount).to.equal(1);
      chai.expect(later.parse.cron.args[0]).to.deep.equal(['* * something']);
      chai.expect(purgeLib.purge.callCount).to.equal(0);
      done();
    });
  });

  it('should create purge timeout', (done) => {
    sinon.stub(config, 'get').returns({ cron: '* * something' });
    sinon.stub(later.parse, 'cron').returns('my schedule');
    sinon.stub(later, 'setTimeout');

    scheduler.execute(() => {
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(later.parse.cron.callCount).to.equal(1);
      chai.expect(later.parse.cron.args[0]).to.deep.equal(['* * something']);
      chai.expect(later.setTimeout.callCount).to.equal(1);
      chai.expect(later.setTimeout.args[0]).to.deep.equal([purgeLib.purge, 'my schedule']);
      done();
    });
  });

  it('should clear previous timeout when re-running', (done) => {
    sinon.stub(config, 'get').returns({ cron: '* * something' });
    sinon.stub(later.parse, 'cron').returns('my schedule');
    const timeout = { clear: sinon.stub() };
    sinon.stub(later, 'setTimeout').returns(timeout);

    scheduler.execute(() => {
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(later.parse.cron.callCount).to.equal(1);
      chai.expect(later.parse.cron.args[0]).to.deep.equal(['* * something']);
      chai.expect(later.setTimeout.callCount).to.equal(1);
      chai.expect(later.setTimeout.args[0]).to.deep.equal([purgeLib.purge, 'my schedule']);
      chai.expect(timeout.clear.callCount).to.equal(0);

      scheduler.execute(() => {
        chai.expect(config.get.callCount).to.equal(2);
        chai.expect(later.parse.cron.callCount).to.equal(2);
        chai.expect(later.parse.cron.args[1]).to.deep.equal(['* * something']);
        chai.expect(later.setTimeout.callCount).to.equal(2);
        chai.expect(later.setTimeout.args[1]).to.deep.equal([purgeLib.purge, 'my schedule']);
        chai.expect(timeout.clear.callCount).to.equal(1);
        done();
      });
    });
  });
});
