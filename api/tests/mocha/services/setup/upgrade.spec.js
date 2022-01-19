const sinon = require('sinon');
const { expect } = require('chai');

const upgradeLogService = require('../../../../src/services/setup/upgrade-log');
const install = require('../../../../src/services/setup/install');
const viewIndexerProgress = require('../../../../src/services/setup/indexer-progress');
const upgrade = require('../../../../src/services/setup/upgrade');


describe('upgrade service', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('upgrade', () => {
    it('should stage and not wait for views indexing when only staging', async () => {
      sinon.stub(install, 'stage').resolves();
      let indexStagedViews;
      sinon.stub(install, 'indexStagedViews').returns(new Promise(r => indexStagedViews = r));

      const upgradePromise = upgrade.upgrade({ version: 'aaa' }, 'admin', true);
      expect(install.stage.callCount).to.equal(1);
      expect(install.indexStagedViews.callCount).to.equal(0);

      await Promise.resolve();
      expect(install.stage.callCount).to.equal(1);
      expect(install.indexStagedViews.callCount).to.equal(1);

      await upgradePromise;

      indexStagedViews(); // we resolve the index views promise AFTER the call to upgrade was completed
    });

    it('should stage, index views and complete install when not only staging', async () => {
      sinon.stub(install, 'stage').resolves();
      let indexStagedViews;
      sinon.stub(install, 'indexStagedViews').returns(new Promise(r => indexStagedViews = r));

      const upgradePromise = upgrade.upgrade({ version: 'aaa' }, 'admin', false);
      expect(install.stage.callCount).to.equal(1);
      expect(install.indexStagedViews.callCount).to.equal(0);

      await Promise.resolve();
      expect(install.stage.callCount).to.equal(1);
      expect(install.indexStagedViews.callCount).to.equal(1);

      indexStagedViews();
      await Promise.resolve();

      await upgradePromise;
    });

    it('should throw error when build is invalid', async () => {
      try {
        await upgrade.upgrade();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Build is invalid');
      }
    });

    it('should set the upgrade as errored when staging fails', async () => {
      sinon.stub(install, 'stage').rejects({ staging: false });
      sinon.stub(upgradeLogService, 'setErrored').resolves();
      try {
        await upgrade.upgrade({ version: '22' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ staging: false });
        expect(upgradeLogService.setErrored.callCount).to.equal(1);
      }
    });

    it('should set the upgrade as errored when indexing views fails despite of stage only', async () => {
      sinon.stub(install, 'stage').resolves();
      let indexStagedViews;
      sinon.stub(install, 'indexStagedViews').returns(new Promise((res, rej) => indexStagedViews = rej));
      sinon.stub(upgradeLogService, 'setErrored').resolves();

      const upgradePromise = upgrade.upgrade({ version: 'aaa' }, 'admin', true);
      await Promise.resolve();
      expect(install.stage.callCount).to.equal(1);
      expect(install.indexStagedViews.callCount).to.equal(1);


      await upgradePromise;
      expect(upgradeLogService.setErrored.callCount).to.equal(0);

      indexStagedViews({ code: 'omg' });
      await Promise.resolve();
      expect(upgradeLogService.setErrored.callCount).to.equal(1);
    });

    it('should set the upgrade as errored when indexing views fails', async () => {
      sinon.stub(install, 'stage').resolves();
      sinon.stub(install, 'indexStagedViews').rejects({ error: 'bad' });
      sinon.stub(upgradeLogService, 'setErrored').resolves();

      try {
        await upgrade.upgrade({ version: 'aaa' }, 'admin');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ error: 'bad' });
        expect(upgradeLogService.setErrored.callCount).to.equal(1);
      }
    });
  });

  describe('progress', () => {
    it('should call indexer progress', () => {
      sinon.stub(viewIndexerProgress, 'query');
      upgrade.progress();
      expect(viewIndexerProgress.query.callCount).to.equal(1);
    });

    it('should throw any indexer progress errors', async () => {
      sinon.stub(viewIndexerProgress, 'query').rejects({ omg: 'it fails' });
      try {
        await upgrade.progress();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ omg: 'it fails' });
        expect(viewIndexerProgress.query.callCount).to.equal(1);
      }
    });
  });
});
