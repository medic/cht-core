const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');

const db = require('../../../../src/db');

let upgradeLogService;
let clock;

const buildInfo = (version) => ({
  application: 'medic',
  namespace: 'medic',
  base_version: '3.15',
  version: version,
  author: 'grunt',
  build: `3.15.0-${version}`,
});

describe('UpgradeLog service', () => {
  'use strict';

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    upgradeLogService = rewire('../../../../src/services/setup/upgrade-log');
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('create', () => {
    it('should create log document', async () => {
      clock.tick(5000);
      sinon.stub(db.medicLogs, 'put').resolves({ id: 'id', rev: 'rev', ok: true });

      const log = await upgradeLogService.create('action', buildInfo('4.1.0'), buildInfo('4.0.0'), 'anadmin');
      const expected = {
        _id: 'upgrade_log:5000:4.1.0',
        user: 'anadmin',
        action: 'action',
        from: buildInfo('4.0.0'),
        to: buildInfo('4.1.0'),
        start_date: 5000,
        state_history: [{ state: 'initiated', date: 5000 }],
        state: 'initiated',
        updated_date: 5000,
      };

      expect(log).to.deep.equal(expected);
      expect(db.medicLogs.put.callCount).to.equal(1);
      expect(db.medicLogs.put.args[0]).to.deep.equal([expected]);
    });

    it('should work without from build', async () => {
      clock.tick(10000);
      sinon.stub(db.medicLogs, 'put').resolves({ id: 'id', rev: 'rev', ok: true });

      const log = await upgradeLogService.create(undefined, buildInfo('4.0.1'));
      const expected = {
        _id: 'upgrade_log:10000:4.0.1',
        user: '',
        action: undefined,
        from: undefined,
        to: buildInfo('4.0.1'),
        start_date: 10000,
        state_history: [{ state: 'initiated', date: 10000 }],
        state: 'initiated',
        updated_date: 10000,
      };

      expect(log).to.deep.equal(expected);
      expect(db.medicLogs.put.callCount).to.equal(1);
      expect(db.medicLogs.put.args[0]).to.deep.equal([expected]);
    });

    it('should throw an error if db write fails', async () => {
      clock.tick(10000);
      sinon.stub(db.medicLogs, 'put').rejects({ status: 'error' });

      try {
        await upgradeLogService.create('act', buildInfo('to'), buildInfo('from'), 'usr');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ status: 'error' });

        expect(db.medicLogs.put.callCount).to.equal(1);
        expect(db.medicLogs.put.args[0]).to.deep.equal([{
          _id: 'upgrade_log:10000:to',
          user: 'usr',
          action: 'act',
          from: buildInfo('from'),
          to: buildInfo('to'),
          start_date: 10000,
          state_history: [{ state: 'initiated', date: 10000 }],
          state: 'initiated',
          updated_date: 10000,
        }]);
      }
    });

    it('should throw an error if fs write fails', async () => {
      clock.tick(10000);
      sinon.stub(db.medicLogs, 'put').rejects({ status: 'error' });

      try {
        await upgradeLogService.create('ac', buildInfo('to'), buildInfo('from'), 'user');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ status: 'error' });

        expect(db.medicLogs.put.callCount).to.equal(1);
        expect(db.medicLogs.put.args[0]).to.deep.equal([{
          _id: 'upgrade_log:10000:to',
          user: 'user',
          action: 'ac',
          from: buildInfo('from'),
          to: buildInfo('to'),
          start_date: 10000,
          state_history: [{ state: 'initiated', date: 10000 }],
          state: 'initiated',
          updated_date: 10000,
        }]);
      }
    });
  });

  describe('get', () => {
    it('should get the latest non-final upgrade', async () => {
      const log = {
        _id: 'upgrade_log:1234:4.1.3',
        state: 'indexing',
      };
      Object.freeze(log);
      clock.tick(1500);

      upgradeLogService.__set__('isFinalState', sinon.stub().returns(false));
      sinon.stub(db.medicLogs, 'allDocs').resolves({ rows: [{ doc: log }] });

      const result = await upgradeLogService.get();

      expect(result).to.deep.equal(log);
      expect(db.medicLogs.allDocs.callCount).to.equal(1);
      expect(db.medicLogs.allDocs.args[0]).to.deep.equal([{
        startkey: `upgrade_log:1500:`,
        endkey: `upgrade_log:0:`,
        descending: true,
        limit: 1,
        include_docs: true
      }]);
      expect(upgradeLogService.__get__('isFinalState').args).to.deep.equal([[log.state]]);
    });

    it('should return nothing if no docs are found', async () => {
      const log = {
        _id: 'upgrade_log:1234:4.1.3',
        state: 'aborted',
      };
      Object.freeze(log);
      clock.tick(5984);

      upgradeLogService.__set__('currentUpgradeLogId', undefined);
      sinon.stub(db.medicLogs, 'allDocs').resolves({ rows: [] });

      const result = await upgradeLogService.get();

      expect(result).to.deep.equal(undefined);
      expect(db.medicLogs.allDocs.callCount).to.equal(1);
      expect(db.medicLogs.allDocs.args[0]).to.deep.equal([{
        startkey: `upgrade_log:5984:`,
        endkey: `upgrade_log:0:`,
        descending: true,
        limit: 1,
        include_docs: true
      }]);
    });

    it('should return nothing if latest doc is in a final state', async () => {
      const log = {
        _id: 'upgrade_log:1234:4.1.3',
        state: 'aborted',
      };
      Object.freeze(log);
      clock.tick(89451321);

      upgradeLogService.__set__('currentUpgradeLogId', undefined);
      upgradeLogService.__set__('isFinalState', sinon.stub().returns(true));
      sinon.stub(db.medicLogs, 'allDocs').resolves({ rows: [{ doc: log }] });

      const result = await upgradeLogService.get();

      expect(result).to.deep.equal(undefined);
      expect(db.medicLogs.allDocs.callCount).to.equal(1);
      expect(db.medicLogs.allDocs.args[0]).to.deep.equal([{
        startkey: `upgrade_log:89451321:`,
        endkey: `upgrade_log:0:`,
        descending: true,
        limit: 1,
        include_docs: true
      }]);
      expect(upgradeLogService.__get__('isFinalState').args).to.deep.equal([[log.state]]);
    });

    it('should throw all docs errors', async () => {
      clock.tick(5984);
      sinon.stub(db.medicLogs, 'allDocs').rejects({ an: 'error' });

      try {
        await upgradeLogService.get();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'error' });
      }
    });
  });

  describe('final states', () => {
    it('finalized should be final', () => {
      expect(upgradeLogService.__get__('isFinalState')('finalized')).to.equal(true);
    });

    it('aborted should be final', () => {
      expect(upgradeLogService.__get__('isFinalState')('aborted')).to.equal(true);
    });

    it('errored should be final', () => {
      expect(upgradeLogService.__get__('isFinalState')('errored')).to.equal(true);
    });

    it('initiated, staged, indexing, indexed, completing, complete should not be final', () => {
      expect(upgradeLogService.__get__('isFinalState')('initiated')).to.equal(false);
      expect(upgradeLogService.__get__('isFinalState')('staged')).to.equal(false);
      expect(upgradeLogService.__get__('isFinalState')('indexing')).to.equal(false);
      expect(upgradeLogService.__get__('isFinalState')('indexed')).to.equal(false);
      expect(upgradeLogService.__get__('isFinalState')('completing')).to.equal(false);
      expect(upgradeLogService.__get__('isFinalState')('complete')).to.equal(false);
      expect(upgradeLogService.__get__('isFinalState')('aborting')).to.equal(false);
    });
  });

  describe('update', () => {
    it('should update the state of the upgrade log', async () => {
      clock.tick(2000);
      const docUpugradeLog = {
        _id: 'upgrade_log_id',
        _rev: '1',
        user: 'usr',
        from_version: 'a',
        to_version: 'b',
        start_date: 1000,
        state: 'initiated',
        updated_date: 1000,
        state_history: [{ state: 'initiated', date: 1000 }],
      };
      sinon.stub(upgradeLogService, 'get').resolves(docUpugradeLog);
      sinon.stub(db.medicLogs, 'put');

      const updatedLog = await upgradeLogService.__get__('update')('new state');

      expect(updatedLog).to.deep.equal({
        _id: 'upgrade_log_id',
        _rev: '1',
        user: 'usr',
        from_version: 'a',
        to_version: 'b',
        start_date: 1000,
        state: 'new state',
        updated_date: 2000,
        state_history: [
          { state: 'initiated', date: 1000 },
          { state: 'new state', date: 2000 },
        ],
      });
      expect(db.medicLogs.put.callCount).to.equal(1);
      expect(db.medicLogs.put.args[0]).to.deep.equal([updatedLog]);
    });

    it('should work when there is no state history', async () => {
      clock.tick(1500);
      const docUpugradeLog = {
        _id: 'upgrade_log_id',
        _rev: '1',
        user: 'usr',
        from_version: '4.0',
        to_version: '4.1',
        start_date: 1000,
        state: 'initiated',
        updated_date: 1000,
      };
      sinon.stub(upgradeLogService, 'get').resolves(docUpugradeLog);
      upgradeLogService.__set__('isFinalState', sinon.stub().returns(false));
      sinon.stub(db.medicLogs, 'put');

      const updatedLog = await upgradeLogService.__get__('update')('state');

      expect(updatedLog).to.deep.equal({
        _id: 'upgrade_log_id',
        _rev: '1',
        user: 'usr',
        from_version: '4.0',
        to_version: '4.1',
        start_date: 1000,
        state: 'state',
        updated_date: 1500,
        state_history: [
          { state: 'state', date: 1500 },
        ],
      });
      expect(db.medicLogs.put.callCount).to.equal(1);
      expect(db.medicLogs.put.args[0]).to.deep.equal([updatedLog]);
      expect(upgradeLogService.__get__('isFinalState').args).to.deep.equal([['initiated']]);
    });

    it('should update to final state', async () => {
      clock.tick(1500);
      const docUpugradeLog = {
        _id: 'upgrade_log_id',
        _rev: '1',
        user: 'usr',
        from_version: '4.0',
        to_version: '4.1',
        start_date: 1000,
        state: 'initiated',
        updated_date: 1000,
      };
      sinon.stub(upgradeLogService, 'get').resolves(docUpugradeLog);
      upgradeLogService.__set__('currentUpgradeLogId', docUpugradeLog._id);
      const isFinalState = sinon.stub().returns(false);
      isFinalState.withArgs('errored').returns(true);
      upgradeLogService.__set__('isFinalState', isFinalState);
      sinon.stub(db.medicLogs, 'put');

      const updatedLog = await upgradeLogService.__get__('update')('errored');

      expect(updatedLog).to.deep.equal({
        _id: 'upgrade_log_id',
        _rev: '1',
        user: 'usr',
        from_version: '4.0',
        to_version: '4.1',
        start_date: 1000,
        state: 'errored',
        updated_date: 1500,
        state_history: [
          { state: 'errored', date: 1500 },
        ],
      });
      expect(db.medicLogs.put.callCount).to.equal(1);
      expect(db.medicLogs.put.args[0]).to.deep.equal([updatedLog]);
      expect(upgradeLogService.__get__('isFinalState').args).to.deep.equal([['initiated']]);
    });

    it('should do nothing if tracking doc is not found', async () => {
      sinon.stub(upgradeLogService, 'get').resolves();

      const result = await upgradeLogService.__get__('update')('state');
      expect(result).to.deep.equal(undefined);
    });

    it('should do nothing if tracking doc is in finalized state', async () => {
      const doc = { state: 'finalized' };

      upgradeLogService.__set__('isFinalState', sinon.stub().returns(true));
      sinon.stub(upgradeLogService, 'get').resolves(doc);

      const result = await upgradeLogService.__get__('update')('state');
      expect(result).to.deep.equal(undefined);

      expect(upgradeLogService.__get__('isFinalState').args).to.deep.equal([[doc.state]]);
    });

    it('should do nothing if tracking doc is in desired state', async () => {
      const doc = { state: 'desired' };

      upgradeLogService.__set__('isFinalState', sinon.stub().returns(false));
      sinon.stub(upgradeLogService, 'get').resolves(doc);

      const result = await upgradeLogService.__get__('update')('desired');
      expect(result).to.deep.equal(undefined);
    });
  });

  describe('getDeployInfo', () => {
    it('should return info from current log', async () => {
      const doc = {
        _id: 'upgrade_log:a:100',
        user: 'a user',
        state: 'whatever',
        from_verson: 'a',
        to_version: 'b',
        start_date: 100,
        updated_date: 200,
      };
      sinon.stub(upgradeLogService, 'get').resolves(doc);

      expect(await upgradeLogService.getDeployInfo()).to.deep.equal({
        user: 'a user',
        upgrade_log_id: 'upgrade_log:a:100',
      });
    });

    it('should return "empty" values when current log is not found', async () => {
      sinon.stub(upgradeLogService, 'get').resolves();

      expect(await upgradeLogService.getDeployInfo()).to.deep.equal({
        user: undefined,
        upgrade_log_id: undefined,
      });
    });
  });

  it('should set status to staged', async () => {
    const update = sinon.stub().resolves();
    upgradeLogService.__set__('update', update);

    await upgradeLogService.setStaged();
    expect(update.callCount).to.equal(1);
    expect(update.args[0]).to.deep.equal(['staged']);
  });

  it('should set status to indexing', async () => {
    const update = sinon.stub().resolves();
    upgradeLogService.__set__('update', update);

    await upgradeLogService.setIndexing();
    expect(update.callCount).to.equal(1);
    expect(update.args[0]).to.deep.equal(['indexing']);
  });

  it('should set status to indexed', async () => {
    const update = sinon.stub().resolves();
    upgradeLogService.__set__('update', update);

    await upgradeLogService.setIndexed();
    expect(update.callCount).to.equal(1);
    expect(update.args[0]).to.deep.equal(['indexed']);
  });

  it('should set status to completing', async () => {
    const update = sinon.stub().resolves();
    upgradeLogService.__set__('update', update);

    await upgradeLogService.setCompleting();
    expect(update.callCount).to.equal(1);
    expect(update.args[0]).to.deep.equal(['completing']);
  });

  it('should set status to complete', async () => {
    const update = sinon.stub().resolves();
    upgradeLogService.__set__('update', update);

    await upgradeLogService.setComplete();
    expect(update.callCount).to.equal(1);
    expect(update.args[0]).to.deep.equal(['complete']);
  });

  it('should set status to finalizing', async () => {
    const update = sinon.stub().resolves();
    upgradeLogService.__set__('update', update);

    await upgradeLogService.setFinalizing();
    expect(update.callCount).to.equal(1);
    expect(update.args[0]).to.deep.equal(['finalizing']);
  });

  it('should set status to finalized', async () => {
    const update = sinon.stub().resolves();
    upgradeLogService.__set__('update', update);

    await upgradeLogService.setFinalized();
    expect(update.callCount).to.equal(1);
    expect(update.args[0]).to.deep.equal(['finalized']);
  });

  it('should set status to aborting', async () => {
    const update = sinon.stub().resolves();
    upgradeLogService.__set__('update', update);

    await upgradeLogService.setAborting();
    expect(update.callCount).to.equal(1);
    expect(update.args[0]).to.deep.equal(['aborting']);
  });

  it('should set status to aborted', async () => {
    const update = sinon.stub().resolves();
    upgradeLogService.__set__('update', update);

    await upgradeLogService.setAborted();
    expect(update.callCount).to.equal(1);
    expect(update.args[0]).to.deep.equal(['aborted']);
  });

  it('should set status to errored', async () => {
    const update = sinon.stub().resolves();
    upgradeLogService.__set__('update', update);

    await upgradeLogService.setErrored();
    expect(update.callCount).to.equal(1);
    expect(update.args[0]).to.deep.equal(['errored']);
  });

  it('should set status to interrupted', async () => {
    const update = sinon.stub().resolves();
    upgradeLogService.__set__('update', update);

    await upgradeLogService.setInterrupted();
    expect(update.callCount).to.equal(1);
    expect(update.args[0]).to.deep.equal(['interrupted']);
  });
});
