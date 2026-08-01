const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const config = require('../../../src/config');
const later = require('later');
const archiveLib = require('../../../src/lib/archiving');

let clock;
let scheduler;

describe('Archiving Schedule', () => {
  beforeEach(() => {
    clock = sinon.useFakeTimers({ now: new Date() });
    scheduler = rewire('../../../src/schedule/archiving');
  });

  afterEach(() => {
    clearTimeout(scheduler.__get__('archiveTimeout'));
    sinon.restore();
    clock.restore();
  });

  it('aborts when no archive configuration is present', () => {
    sinon.stub(config, 'get');
    sinon.stub(later.parse, 'text');
    sinon.stub(later.parse, 'cron');
    sinon.stub(archiveLib, 'archive');
    return scheduler.execute().then(() => {
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(config.get.args[0]).to.deep.equal(['archive']);
      chai.expect(later.parse.text.callCount).to.equal(0);
      chai.expect(later.parse.cron.callCount).to.equal(0);
      chai.expect(archiveLib.archive.callCount).to.equal(0);
    });
  });

  it('aborts when the schedule expression is malformed', () => {
    sinon.stub(config, 'get').returns({ cron: '* * nope' });
    sinon.stub(later.parse, 'cron').returns(false);
    sinon.stub(archiveLib, 'archive');

    return scheduler.execute().then(() => {
      chai.expect(later.parse.cron.callCount).to.equal(1);
      chai.expect(archiveLib.archive.callCount).to.equal(0);
    });
  });

  it('schedules an archive run with the parsed duration', async () => {
    sinon.stub(config, 'get').returns({ cron: '* 1 * * *', duration: '4 hours' });
    sinon.stub(archiveLib, 'archive').resolves();
    const setTimeoutSpy = sinon.spy(clock, 'setTimeout');

    await scheduler.execute();

    chai.expect(setTimeoutSpy.callCount).to.equal(1);
    const [callback] = setTimeoutSpy.args[0];

    callback();

    chai.expect(archiveLib.archive.callCount).to.equal(1);
    chai.expect(archiveLib.archive.args[0][0]).to.deep.equal({ duration: 4 * 60 * 60 * 1000 });
  });

  it('passes duration=null when archive.duration is missing', async () => {
    sinon.stub(config, 'get').returns({ cron: '* 1 * * *' });
    sinon.stub(archiveLib, 'archive').resolves();
    const setTimeoutSpy = sinon.spy(clock, 'setTimeout');

    await scheduler.execute();
    setTimeoutSpy.args[0][0]();

    chai.expect(archiveLib.archive.args[0][0]).to.deep.equal({ duration: null });
  });

  it('passes duration=null when archive.duration is malformed', async () => {
    sinon.stub(config, 'get').returns({ cron: '* 1 * * *', duration: 'lots of time' });
    sinon.stub(archiveLib, 'archive').resolves();
    const setTimeoutSpy = sinon.spy(clock, 'setTimeout');

    await scheduler.execute();
    setTimeoutSpy.args[0][0]();

    chai.expect(archiveLib.archive.args[0][0]).to.deep.equal({ duration: null });
  });

  it('clears the previous timeout when re-run', () => {
    sinon.stub(config, 'get').returns({ cron: '* 1 * * *' });
    sinon.stub(archiveLib, 'archive');
    const setTimeoutSpy = sinon.spy(clock, 'setTimeout');
    const clearTimeoutSpy = sinon.spy(clock, 'clearTimeout');

    return scheduler.execute()
      .then(() => {
        chai.expect(setTimeoutSpy.callCount).to.equal(1);
        chai.expect(clearTimeoutSpy.callCount).to.equal(0);
      })
      .then(() => scheduler.execute())
      .then(() => {
        chai.expect(setTimeoutSpy.callCount).to.equal(2);
        chai.expect(clearTimeoutSpy.callCount).to.equal(1);
      });
  });

  describe('parseDuration', () => {
    let parseDuration;
    beforeEach(() => {
      parseDuration = scheduler.__get__('parseDuration');
    });

    it('parses "<number> <unit>" expressions into milliseconds', () => {
      chai.expect(parseDuration('4 hours')).to.equal(4 * 60 * 60 * 1000);
      chai.expect(parseDuration('30 minutes')).to.equal(30 * 60 * 1000);
      chai.expect(parseDuration('1 day')).to.equal(24 * 60 * 60 * 1000);
      chai.expect(parseDuration('  90 seconds  ')).to.equal(90 * 1000);
    });

    it('returns null for missing, malformed, or non-positive durations', () => {
      chai.expect(parseDuration()).to.equal(null);
      chai.expect(parseDuration(null)).to.equal(null);
      chai.expect(parseDuration(42)).to.equal(null);
      chai.expect(parseDuration('forever')).to.equal(null);
      chai.expect(parseDuration('-1 hours')).to.equal(null);
      chai.expect(parseDuration('0 hours')).to.equal(null);
      chai.expect(parseDuration('4 lightyears')).to.equal(null);
    });
  });
});
