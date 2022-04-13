const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

let startupLog;
let clock;
const logger = require('../../../../src/logger');

describe('StartUp log', () => {
  beforeEach(() => {
    startupLog = rewire('../../../../src/services/setup/startup-log');
    sinon.stub(logger, 'info');
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  it('should save entries, log them, and return when requested', () => {
    clock.tick(1000);
    startupLog.logProgress('thing 1');
    clock.tick(1000);
    startupLog.logProgress('thing 2');
    clock.tick(1984);
    startupLog.logProgress('thing 3');

    expect(logger.info.args).to.deep.equal([['thing 1'], ['thing 2'], ['thing 3']]);

    expect(startupLog.getProgress()).to.deep.equal({
      startupProgress: [
        { action: 'thing 1', date: 1000 },
        { action: 'thing 2', date: 2000 },
        { action: 'thing 3', date: 3984 },
      ],
      indexerProgress: [],
    });
  });

  it('should replace indexer entries and return when requested', () => {
    startupLog.logIndexers(['1', '2', '3']);
    expect(startupLog.getProgress()).to.deep.equal({
      startupProgress: [],
      indexerProgress: ['1', '2', '3'],
    });

    startupLog.logIndexers([4, 5, 6]);
    expect(startupLog.getProgress()).to.deep.equal({
      startupProgress: [],
      indexerProgress: [4, 5, 6],
    });

    startupLog.logIndexers('whatever');
    expect(startupLog.getProgress()).to.deep.equal({
      startupProgress: [],
      indexerProgress: 'whatever'
    });
  });

  it('should return both actions and indexers', () => {
    clock.tick(1000);
    startupLog.logProgress('first action');

    startupLog.logIndexers(['1', '2', '3']);
    expect(startupLog.getProgress()).to.deep.equal({
      startupProgress: [
        { action: 'first action', date: 1000 },
      ],
      indexerProgress: ['1', '2', '3'],
    });

    clock.tick(59854);
    startupLog.logProgress('second action');

    startupLog.logIndexers([4, 5, 6]);
    expect(startupLog.getProgress()).to.deep.equal({
      startupProgress: [
        { action: 'first action', date: 1000 },
        { action: 'second action', date: 60854 },
      ],
      indexerProgress: [4, 5, 6],
    });

    clock.tick(1000);
    startupLog.logProgress('third action');

    startupLog.logIndexers('whatever');
    expect(startupLog.getProgress()).to.deep.equal({
      startupProgress: [
        { action: 'first action', date: 1000 },
        { action: 'second action', date: 60854 },
        { action: 'third action', date: 61854 },
      ],
      indexerProgress: 'whatever',
    });
  });
});
