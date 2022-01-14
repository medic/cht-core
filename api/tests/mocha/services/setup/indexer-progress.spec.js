const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');

const db = require('../../../../src/db');

let viewIndexerProgress;
let clock;

const INTERVAL = 5000;
const HALF_INTERVAL = INTERVAL / 2;

describe('indexer progress', () => {
  beforeEach(() => {
    clock = sinon.useFakeTimers();
    viewIndexerProgress = rewire('../../../../src/services/setup/indexer-progress');
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe('query', () => {
    it('should get db active tasks, calculate progress and return indexers ', async () => {
      sinon.stub(db, 'activeTasks').resolves([
        { database: 'd1', node: 'n1', design_document: ':staged:ddoc1', progress: 3, pid: 'd1-1-1', type: 'indexer' },
        { database: 'd1', node: 'n1', design_document: ':staged:ddoc1', progress: 7, pid: 'd1-1-2', type: 'indexer' },

        { database: 'd1', node: 'n1', design_document: ':staged:ddoc2', progress: 9, pid: 'd1-2-1', type: 'indexer' },
        { database: 'd1', node: 'n1', design_document: ':staged:ddoc2', progress: 21, pid: 'd1-2-2', type: 'indexer' },
        { database: 'd1', node: 'n1', design_document: ':staged:ddoc2', progress: 12, pid: 'd1-2-3', type: 'indexer' },

        { database: 'd2', node: 'n1', design_document: ':staged:ddoc1', progress: 4, pid: 'd2-1-1', type: 'indexer' },
        { database: 'd2', node: 'n1', design_document: ':staged:ddoc1', progress: 12, pid: 'd2-1-2', type: 'indexer' },

        { database: 'd3', node: 'n1', design_document: ':staged:ddoc2', progress: 2, pid: 'd3-2-1', type: 'indexer' },
        { database: 'd3', node: 'n1', design_document: ':staged:ddoc2', progress: 8, pid: 'd3-2-2', type: 'indexer' },
      ]);

      const indexers = await viewIndexerProgress.query([]);

      expect(indexers).to.deep.equal([
        {
          database: 'd1',
          design_document: ':staged:ddoc1',
          tasks: {
            'n1-d1-1-1': 3,
            'n1-d1-1-2': 7,
          },
          progress: 5,
        },
        {
          database: 'd1',
          design_document: ':staged:ddoc2',
          tasks: {
            'n1-d1-2-1': 9,
            'n1-d1-2-2': 21,
            'n1-d1-2-3': 12,
          },
          progress: 14,
        },
        {
          database: 'd2',
          design_document: ':staged:ddoc1',
          tasks: {
            'n1-d2-1-1': 4,
            'n1-d2-1-2': 12,
          },
          progress: 8,
        },
        {
          database: 'd3',
          design_document: ':staged:ddoc2',
          tasks: {
            'n1-d3-2-1': 2,
            'n1-d3-2-2': 8,
          },
          progress: 5,
        },
      ]);
    });

    it('should ignore view warming tasks for ddocs that are not :staged:', async () => {
      sinon.stub(db, 'activeTasks').resolves([
        { database: 'd1', node: 'n1', design_document: ':staged:ddoc1', progress: 12, pid: 'd1-1-1', type: 'indexer' },
        { database: 'd1', node: 'n1', design_document: ':staged:ddoc1', progress: 98, pid: 'd1-1-2', type: 'indexer' },

        { database: 'd1', node: 'n1', design_document: 'ddoc2', progress: 9, pid: 'd1-2-1', type: 'indexer' },
        { database: 'd1', node: 'n1', design_document: 'ddoc2', progress: 21, pid: 'd1-2-2', type: 'indexer' },
        { database: 'd1', node: 'n1', design_document: 'ddoc2', progress: 12, pid: 'd1-2-3', type: 'indexer' },

        { database: 'd3', node: 'n1', design_document: ':staged:ddoc2', progress: 3, pid: 'd3-2-1', type: 'indexer' },
        { database: 'd3', node: 'n1', design_document: ':staged:ddoc2', progress: 54, pid: 'd3-2-2', type: 'indexer' },
      ]);

      const indexers = await viewIndexerProgress.query([]);

      expect(indexers).to.deep.equal([
        {
          database: 'd1',
          design_document: ':staged:ddoc1',
          tasks: {
            'n1-d1-1-1': 12,
            'n1-d1-1-2': 98,
          },
          progress: 55,
        },
        {
          database: 'd3',
          design_document: ':staged:ddoc2',
          tasks: {
            'n1-d3-2-1': 3,
            'n1-d3-2-2': 54,
          },
          progress: 29,
        },
      ]);
    });

    it('should update existing indexer progress if provided', async () => {
      const indexers = [
        {
          database: 'd1',
          design_document: ':staged:ddoc1',
          tasks: {
            'n1-d1-1-1': 12,
            'n1-d1-1-2': 16,
          },
          progress: 14,
        },
        {
          database: 'd1',
          design_document: ':staged:ddoc2',
          tasks: {
            'n1-d1-2-1': 39,
            'n1-d1-2-2': 43,
          },
          progress: 14,
        },
        {
          database: 'd2',
          design_document: ':staged:ddoc1',
          tasks: {
            'n1-d2-1-1': 75,
            'n1-d2-1-2': 88,
          },
          progress: 14,
        },
        {
          database: 'd3',
          design_document: ':staged:ddoc2',
          tasks: {
            'n1-d3-2-1': 25,
            'n1-d3-2-2': 36,
          },
          progress: 31,
        },
      ];

      sinon.stub(db, 'activeTasks').resolves([
        { database: 'd1', node: 'n1', design_document: ':staged:ddoc1', progress: 14, pid: 'd1-1-1', type: 'indexer' },
        { database: 'd1', node: 'n1', design_document: ':staged:ddoc1', progress: 21, pid: 'd1-1-2', type: 'indexer' },

        { database: 'd1', node: 'n1', design_document: ':staged:ddoc2', progress: 59, pid: 'd1-2-1', type: 'indexer' },
        { database: 'd1', node: 'n1', design_document: ':staged:ddoc2', progress: 78, pid: 'd1-2-2', type: 'indexer' },

        { database: 'd3', node: 'n1', design_document: ':staged:ddoc2', progress: 28, pid: 'd3-2-1', type: 'indexer' },
        { database: 'd3', node: 'n1', design_document: ':staged:ddoc2', progress: 54, pid: 'd3-2-2', type: 'indexer' },
      ]);

      const updatedIndexers = await viewIndexerProgress.query(indexers);

      expect(updatedIndexers).to.deep.equal([
        {
          database: 'd1',
          design_document: ':staged:ddoc1',
          tasks: {
            'n1-d1-1-1': 14,
            'n1-d1-1-2': 21,
          },
          progress: 18,
        },
        {
          database: 'd1',
          design_document: ':staged:ddoc2',
          tasks: {
            'n1-d1-2-1': 59,
            'n1-d1-2-2': 78,
          },
          progress: 69,
        },
        {
          database: 'd2',
          design_document: ':staged:ddoc1',
          tasks: {
            'n1-d2-1-1': 100,
            'n1-d2-1-2': 100,
          },
          progress: 100,
        },
        {
          database: 'd3',
          design_document: ':staged:ddoc2',
          tasks: {
            'n1-d3-2-1': 28,
            'n1-d3-2-2': 54,
          },
          progress: 41,
        },
      ]);
    });

    it('should catch errors thrown by active tasks request', async () => {
      sinon.stub(db, 'activeTasks').rejects({ omg: 'thing' });

      const indexers = await viewIndexerProgress.query();
      expect(indexers).to.deep.equal([]);
    });

    it('should catch errors thrown by bad responses from active tasks', async () => {
      sinon.stub(db, 'activeTasks').resolves('not an array');
      const previousIndexers = ['existent', 'indexers'];
      const indexers = await viewIndexerProgress.query(previousIndexers);
      expect(indexers).to.deep.equal(previousIndexers);
    });
  });

  describe('log', () => {
    it('should keep getting indexers until halt call is called', async () => {
      const getIndexers = sinon.stub();
      viewIndexerProgress.__set__('getIndexers', getIndexers);

      const doneIndexing = [
        { database: 'd1', design_document: 'ddoc1', progress: 100 },
        { database: 'd1', design_document: 'ddoc2', progress: 100 },
        { database: 'd2', design_document: 'ddoc1', progress: 100 },
        { database: 'd3', design_document: 'ddoc1', progress: 100 },
      ];
      getIndexers.resolves(doneIndexing);

      getIndexers.onCall(0).resolves([
        { database: 'd1', design_document: 'ddoc1', progress: 20 },
        { database: 'd1', design_document: 'ddoc2', progress: 15 },
        { database: 'd2', design_document: 'ddoc1', progress: 100 },
        { database: 'd3', design_document: 'ddoc1', progress: 52 },
      ]);
      getIndexers.onCall(1).resolves([
        { database: 'd1', design_document: 'ddoc1', progress: 35 },
        { database: 'd1', design_document: 'ddoc2', progress: 28 },
        { database: 'd2', design_document: 'ddoc1', progress: 100 },
        { database: 'd3', design_document: 'ddoc1', progress: 75 },
      ]);

      getIndexers.onCall(2).resolves([
        { database: 'd1', design_document: 'ddoc1', progress: 85 },
        { database: 'd1', design_document: 'ddoc2', progress: 57 },
        { database: 'd2', design_document: 'ddoc1', progress: 100 },
        { database: 'd3', design_document: 'ddoc1', progress: 100 },
      ]);

      const stop = viewIndexerProgress.log();

      expect(getIndexers.callCount).to.equal(1);
      expect(getIndexers.args[0]).to.deep.equal([[]]);
      await Promise.resolve();
      clock.tick(HALF_INTERVAL);

      expect(getIndexers.callCount).to.equal(1);
      clock.tick(HALF_INTERVAL);

      expect(getIndexers.callCount).to.equal(2);
      expect(getIndexers.args[1]).to.deep.equal([[
        { database: 'd1', design_document: 'ddoc1', progress: 20 },
        { database: 'd1', design_document: 'ddoc2', progress: 15 },
        { database: 'd2', design_document: 'ddoc1', progress: 100 },
        { database: 'd3', design_document: 'ddoc1', progress: 52 },
      ]]);
      await Promise.resolve();
      clock.tick(INTERVAL);
      expect(getIndexers.callCount).to.equal(3);
      expect(getIndexers.args[2]).to.deep.equal([[
        { database: 'd1', design_document: 'ddoc1', progress: 35 },
        { database: 'd1', design_document: 'ddoc2', progress: 28 },
        { database: 'd2', design_document: 'ddoc1', progress: 100 },
        { database: 'd3', design_document: 'ddoc1', progress: 75 },
      ]]);
      await Promise.resolve();
      clock.tick(INTERVAL);
      expect(getIndexers.callCount).to.equal(4);
      expect(getIndexers.args[3]).to.deep.equal([[
        { database: 'd1', design_document: 'ddoc1', progress: 85 },
        { database: 'd1', design_document: 'ddoc2', progress: 57 },
        { database: 'd2', design_document: 'ddoc1', progress: 100 },
        { database: 'd3', design_document: 'ddoc1', progress: 100 },
      ]]);
      await Promise.resolve();
      clock.tick(INTERVAL);

      expect(getIndexers.callCount).to.equal(5);
      expect(getIndexers.args[4]).to.deep.equal([doneIndexing]);
      await Promise.resolve();
      clock.tick(INTERVAL);

      expect(getIndexers.callCount).to.equal(6);
      expect(getIndexers.args[5]).to.deep.equal([doneIndexing]);
      await Promise.resolve();
      clock.tick(HALF_INTERVAL);

      stop();

      await Promise.resolve();
      clock.tick(HALF_INTERVAL);
      expect(getIndexers.callCount).to.equal(6);
      await Promise.resolve();
      clock.tick(INTERVAL);
      expect(getIndexers.callCount).to.equal(6);
    });

    it('should not queue next call until view indexer call resolved', async () => {
      const getIndexers = sinon.stub();
      viewIndexerProgress.__set__('getIndexers', getIndexers);

      const doneIndexing = [ { database: 'd1', design_document: 'ddoc1', progress: 100 } ];
      getIndexers.resolves(doneIndexing);

      getIndexers.onCall(0).resolves([ { database: 'd1', design_document: 'ddoc1', progress: 20 } ]);
      getIndexers.onCall(1).resolves([ { database: 'd1', design_document: 'ddoc1', progress: 35 } ]);

      const stop = viewIndexerProgress.log();

      expect(getIndexers.callCount).to.equal(1);
      expect(getIndexers.args[0]).to.deep.equal([[]]);

      clock.tick(INTERVAL);
      expect(getIndexers.callCount).to.equal(1);

      clock.tick(INTERVAL);
      expect(getIndexers.callCount).to.equal(1);

      clock.tick(INTERVAL);
      expect(getIndexers.callCount).to.equal(1);

      await Promise.resolve();
      clock.tick(INTERVAL);

      expect(getIndexers.callCount).to.equal(2);
      expect(getIndexers.args[1]).to.deep.equal([[ { database: 'd1', design_document: 'ddoc1', progress: 20 } ]]);

      clock.tick(INTERVAL);
      expect(getIndexers.callCount).to.equal(2);
      clock.tick(INTERVAL);
      expect(getIndexers.callCount).to.equal(2);
      clock.tick(INTERVAL);
      expect(getIndexers.callCount).to.equal(2);

      await Promise.resolve();
      clock.tick(INTERVAL);
      expect(getIndexers.callCount).to.equal(3);
      expect(getIndexers.args[2]).to.deep.equal([[ { database: 'd1', design_document: 'ddoc1', progress: 35 } ]]);
      stop();
    });
  });

  it('should not crash if indexers are malformed', async () => {
    const getIndexers = sinon.stub();
    viewIndexerProgress.__set__('getIndexers', getIndexers);

    getIndexers.resolves({ not: 'an array' });
    const stop = viewIndexerProgress.log();

    expect(getIndexers.callCount).to.equal(1);

    await Promise.resolve();
    clock.tick(INTERVAL);
    expect(getIndexers.callCount).to.equal(2);

    await Promise.resolve();
    clock.tick(INTERVAL);
    expect(getIndexers.callCount).to.equal(3);

    stop();
  });
});
