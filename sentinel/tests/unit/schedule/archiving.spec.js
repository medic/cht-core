const sinon = require('sinon');
const rewire = require('rewire');

const config = require('../../../src/config');
const later = require('later');
const logger = require('@medic/logger');
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

  it('aborts when no archive configuration is present', async () => {
    sinon.stub(config, 'get');
    sinon.stub(later.parse, 'text');
    sinon.stub(later.parse, 'cron');
    sinon.stub(archiveLib, 'archive');

    await scheduler.execute();

    expect(config.get.callCount).to.equal(1);
    expect(config.get.args[0]).to.deep.equal(['archive']);
    expect(later.parse.text.callCount).to.equal(0);
    expect(later.parse.cron.callCount).to.equal(0);
    expect(archiveLib.archive.callCount).to.equal(0);
  });

  it('aborts when the schedule expression is malformed', async () => {
    sinon.stub(config, 'get').returns({ cron: '* * nope' });
    sinon.stub(later.parse, 'cron').returns(false);
    sinon.stub(archiveLib, 'archive');

    await scheduler.execute();

    expect(later.parse.cron.callCount).to.equal(1);
    expect(archiveLib.archive.callCount).to.equal(0);
  });

  it('schedules an archive run with the parsed duration', async () => {
    sinon.stub(config, 'get').returns({ cron: '* 1 * * *', duration: '4 hours' });
    sinon.stub(archiveLib, 'archive').resolves();
    const setTimeoutSpy = sinon.spy(clock, 'setTimeout');

    await scheduler.execute();

    expect(setTimeoutSpy.callCount).to.equal(1);
    const [callback] = setTimeoutSpy.args[0];

    callback();

    expect(archiveLib.archive.callCount).to.equal(1);
    expect(archiveLib.archive.args[0][0]).to.equal(4 * 60 * 60 * 1000);
  });

  it('passes duration=null when archive.duration is missing', async () => {
    sinon.stub(config, 'get').returns({ cron: '* 1 * * *' });
    sinon.stub(archiveLib, 'archive').resolves();
    const setTimeoutSpy = sinon.spy(clock, 'setTimeout');

    await scheduler.execute();
    setTimeoutSpy.args[0][0]();

    expect(archiveLib.archive.args[0][0]).to.equal(null);
  });

  it('does not warn when archive.duration is simply missing', async () => {
    sinon.stub(config, 'get').returns({ cron: '* 1 * * *' });
    sinon.stub(archiveLib, 'archive').resolves();
    sinon.stub(logger, 'warn');

    await scheduler.execute();

    expect(logger.warn.callCount).to.equal(0);
  });

  it('clears the previous timeout when re-run', async () => {
    sinon.stub(config, 'get').returns({ cron: '* 1 * * *' });
    sinon.stub(archiveLib, 'archive');
    const setTimeoutSpy = sinon.spy(clock, 'setTimeout');
    const clearTimeoutSpy = sinon.spy(clock, 'clearTimeout');

    await scheduler.execute();
    expect(setTimeoutSpy.callCount).to.equal(1);
    expect(clearTimeoutSpy.callCount).to.equal(0);

    await scheduler.execute();
    expect(setTimeoutSpy.callCount).to.equal(2);
    expect(clearTimeoutSpy.callCount).to.equal(1);
  });

});
