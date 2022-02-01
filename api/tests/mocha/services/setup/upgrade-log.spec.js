const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');
const fs = require('fs');

const db = require('../../../../src/db');
const env = require('../../../../src/environment');

let upgradeLogService;
let clock;

describe('UpgradeLog service', () => {
  beforeEach(() => {
    clock = sinon.useFakeTimers();
    sinon.stub(env, 'upgradePath').value('upgradePath');
    upgradeLogService = rewire('../../../../src/services/setup/upgrade-log');
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('create', () => {
    it('should create log document and file', async () => {
      clock.tick(5000);
      sinon.stub(db.medicLogs, 'put').resolves({ id: 'id', rev: 'rev', ok: true });
      sinon.stub(fs.promises, 'writeFile').resolves();

      const log = await upgradeLogService.create('action', '4.1.0', '4.0.0', 'anadmin');
      const expected = {
        _id: 'upgrade_log:4.1.0:5000',
        user: 'anadmin',
        action: 'action',
        from_version: '4.0.0',
        to_version: '4.1.0',
        start_date: 5000,
        state_history: [{ state: 'initiated', date: 5000 }],
        state: 'initiated',
        updated_date: 5000,
      };

      expect(log).to.deep.equal(expected);
      expect(db.medicLogs.put.callCount).to.equal(1);
      expect(db.medicLogs.put.args[0]).to.deep.equal([expected]);
      expect(fs.promises.writeFile.callCount).to.equal(1);
      expect(fs.promises.writeFile.args[0]).to.deep.equal([
        'upgradePath/upgrade-log.json',
        JSON.stringify(expected),
      ]);
    });

    it('should work without setting versions', async () => {
      clock.tick(10000);
      sinon.stub(db.medicLogs, 'put').resolves({ id: 'id', rev: 'rev', ok: true });
      sinon.stub(fs.promises, 'writeFile').resolves();

      const log = await upgradeLogService.create();
      const expected = {
        _id: 'upgrade_log::10000',
        user: '',
        action: undefined,
        from_version: '',
        to_version: '',
        start_date: 10000,
        state_history: [{ state: 'initiated', date: 10000 }],
        state: 'initiated',
        updated_date: 10000,
      };

      expect(log).to.deep.equal(expected);
      expect(db.medicLogs.put.callCount).to.equal(1);
      expect(db.medicLogs.put.args[0]).to.deep.equal([expected]);
      expect(fs.promises.writeFile.callCount).to.equal(1);
      expect(fs.promises.writeFile.args[0]).to.deep.equal([
        'upgradePath/upgrade-log.json',
        JSON.stringify(expected),
      ]);
    });

    it('should throw an error if db write fails', async () => {
      clock.tick(10000);
      sinon.stub(db.medicLogs, 'put').rejects({ status: 'error' });
      sinon.stub(fs.promises, 'writeFile').resolves();

      try {
        await upgradeLogService.create('act', 'to', 'from', 'usr');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ status: 'error' });

        expect(db.medicLogs.put.callCount).to.equal(1);
        expect(db.medicLogs.put.args[0]).to.deep.equal([{
          _id: 'upgrade_log:to:10000',
          user: 'usr',
          action: 'act',
          from_version: 'from',
          to_version: 'to',
          start_date: 10000,
          state_history: [{ state: 'initiated', date: 10000 }],
          state: 'initiated',
          updated_date: 10000,
        }]);
        expect(fs.promises.writeFile.callCount).to.equal(0);
      }
    });

    it('should throw an error if fs write fails', async () => {
      clock.tick(10000);
      sinon.stub(db.medicLogs, 'put').rejects({ status: 'error' });
      sinon.stub(fs.promises, 'writeFile').resolves();

      try {
        await upgradeLogService.create('ac', 'to', 'from', 'user');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ status: 'error' });

        expect(db.medicLogs.put.callCount).to.equal(1);
        expect(db.medicLogs.put.args[0]).to.deep.equal([{
          _id: 'upgrade_log:to:10000',
          user: 'user',
          action: 'ac',
          from_version: 'from',
          to_version: 'to',
          start_date: 10000,
          state_history: [{ state: 'initiated', date: 10000 }],
          state: 'initiated',
          updated_date: 10000,
        }]);
        expect(fs.promises.writeFile.callCount).to.equal(0);
      }
    });
  });

  describe('update', () => {
    it('should update the state of the upgrade log file', async () => {
      clock.tick(2000);
      const fsUpgradeLog = { _id: 'upgrade_log_id' };
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
      sinon.stub(db.medicLogs, 'get').resolves(docUpugradeLog);
      sinon.stub(db.medicLogs, 'put');
      sinon.stub(fs.promises, 'readFile').resolves(JSON.stringify(fsUpgradeLog));
      sinon.stub(fs.promises, 'writeFile').resolves();

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
      expect(fs.promises.readFile.callCount).to.equal(1);
      expect(fs.promises.readFile.args[0]).to.deep.equal(['upgradePath/upgrade-log.json', 'utf-8']);
      expect(db.medicLogs.get.callCount).to.equal(1);
      expect(db.medicLogs.get.args[0]).to.deep.equal(['upgrade_log_id']);
      expect(db.medicLogs.put.callCount).to.equal(1);
      expect(db.medicLogs.put.args[0]).to.deep.equal([updatedLog]);
      expect(fs.promises.writeFile.callCount).to.equal(1);
      expect(fs.promises.writeFile.args[0]).to.deep.equal(['upgradePath/upgrade-log.json', JSON.stringify(updatedLog)]);
    });

    it('should work when there is no state history', async () => {
      clock.tick(1500);
      const fsUpgradeLog = { _id: 'upgrade_log_id' };
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
      sinon.stub(db.medicLogs, 'get').resolves(docUpugradeLog);
      sinon.stub(db.medicLogs, 'put');
      sinon.stub(fs.promises, 'readFile').resolves(JSON.stringify(fsUpgradeLog));
      sinon.stub(fs.promises, 'writeFile').resolves();

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
      expect(fs.promises.writeFile.callCount).to.equal(1);
      expect(fs.promises.writeFile.args[0]).to.deep.equal(['upgradePath/upgrade-log.json', JSON.stringify(updatedLog)]);
    });

    it('should do nothing if tracking file is not found', async () => {
      sinon.stub(fs.promises, 'readFile').rejects({ code: 'ENOENT' });

      const result = await upgradeLogService.__get__('update')('state');
      expect(result).to.deep.equal(undefined);
    });

    /*it('should throw an error if fs thrown a different error ', async () => {
      sinon.stub(fs.promises, 'readFile').rejects({ code: 'WHATEVER' });

      try {
        await upgradeLogService.__get__('update')('state');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ code: 'WHATEVER' });
      }
    });*/
  });

  describe('getDeployInfo', () => {
    it('should return info from current log', async () => {
      sinon.stub(fs.promises, 'readFile').resolves(JSON.stringify({
        _id: 'upgrade_log:a:100',
        user: 'a user',
        state: 'whatever',
        from_verson: 'a',
        to_version: 'b',
        start_date: 100,
        updated_date: 200,
      }));

      expect(await upgradeLogService.getDeployInfo()).to.deep.equal({
        user: 'a user',
        upgrade_log_id: 'upgrade_log:a:100',
      });
    });

    it('should return "empty" values when current log is not found', async () => {
      sinon.stub(fs.promises, 'readFile').rejects({ an: 'error' });

      expect(await upgradeLogService.getDeployInfo()).to.deep.equal({
        user: undefined,
        upgrade_log_id: undefined,
      });

      expect(fs.promises.readFile.callCount).to.equal(1);
      expect(fs.promises.readFile.args[0]).to.deep.equal(['upgradePath/upgrade-log.json', 'utf-8']);
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
});
