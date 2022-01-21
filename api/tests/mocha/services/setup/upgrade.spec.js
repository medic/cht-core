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
    it('should prep and not wait for stage or views indexing when only staging', async () => {
      sinon.stub(install, 'prep').resolves();
      let stage;
      sinon.stub(install, 'stage').returns(new Promise(r => stage = r));
      let indexStagedViews;
      sinon.stub(install, 'indexStagedViews').returns(new Promise(r => indexStagedViews = r));

      const upgradePromise = upgrade.upgrade('theversion', 'admin', true);

      expect(install.prep.callCount).to.equal(1);
      expect(install.prep.args[0]).to.deep.equal(['theversion', 'admin', true]);
      expect(install.stage.callCount).to.equal(0);
      expect(install.indexStagedViews.callCount).to.equal(0);

      await Promise.resolve();

      expect(install.prep.callCount).to.equal(1);
      expect(install.stage.callCount).to.equal(1);
      expect(install.stage.args[0]).to.deep.equal(['theversion']);
      expect(install.indexStagedViews.callCount).to.equal(0);

      await upgradePromise;

      expect(install.indexStagedViews.callCount).to.equal(0);

      await stage();
      expect(install.indexStagedViews.callCount).to.equal(1);
      await indexStagedViews();
    });

    it('should prep and not wait for stage or views indexing when not only staging', async () => {
      sinon.stub(install, 'prep').resolves();
      let stage;
      sinon.stub(install, 'stage').returns(new Promise(r => stage = r));
      let indexStagedViews;
      sinon.stub(install, 'indexStagedViews').returns(new Promise(r => indexStagedViews = r));

      const upgradePromise = upgrade.upgrade('a_version', 'usr', false);

      expect(install.prep.callCount).to.equal(1);
      expect(install.prep.args[0]).to.deep.equal(['a_version', 'usr', false]);
      expect(install.stage.callCount).to.equal(0);
      expect(install.indexStagedViews.callCount).to.equal(0);

      await Promise.resolve();

      expect(install.prep.callCount).to.equal(1);
      expect(install.stage.callCount).to.equal(1);
      expect(install.stage.args[0]).to.deep.equal(['a_version']);
      expect(install.indexStagedViews.callCount).to.equal(0);

      await upgradePromise;

      expect(install.prep.callCount).to.equal(1);
      expect(install.stage.callCount).to.equal(1);
      expect(install.indexStagedViews.callCount).to.equal(0);

      await stage();
      expect(install.indexStagedViews.callCount).to.equal(1);
      await indexStagedViews();
    });

    it('should throw error when version is invalid', async () => {
      try {
        await upgrade.upgrade();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Version is invalid');
      }
    });

    it('should set the upgrade as errored when prep fails', async () => {
      sinon.stub(install, 'prep').rejects({ prep: false });
      sinon.stub(upgradeLogService, 'setErrored').resolves();
      try {
        await upgrade.upgrade('22');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ prep: false });
        expect(upgradeLogService.setErrored.callCount).to.equal(1);
      }
    });

    it('should set the upgrade as errored when staging views fails despite of stage only', async () => {
      sinon.stub(install, 'prep').resolves();
      let stage;
      sinon.stub(install, 'stage').returns(new Promise((res, rej) => stage = rej));
      sinon.stub(install, 'indexStagedViews');
      sinon.stub(upgradeLogService, 'setErrored').resolves();

      const upgradePromise = upgrade.upgrade('v', 'admin', true);

      await Promise.resolve();

      expect(install.prep.callCount).to.equal(1);
      expect(install.stage.callCount).to.equal(1);
      expect(install.indexStagedViews.callCount).to.equal(0);

      await upgradePromise;
      expect(upgradeLogService.setErrored.callCount).to.equal(0);

      stage({ code: 'omg' });
      await Promise.resolve();
      expect(upgradeLogService.setErrored.callCount).to.equal(1);
      expect(install.indexStagedViews.callCount).to.equal(0);
    });

    it('should set the upgrade as errored when indexing views fails despite of stage only', async () => {
      sinon.stub(install, 'prep').resolves();
      sinon.stub(install, 'stage').resolves();
      let indexStagedViews;
      sinon.stub(install, 'indexStagedViews').returns(new Promise((res, rej) => indexStagedViews = rej));
      sinon.stub(upgradeLogService, 'setErrored').resolves();

      const upgradePromise = upgrade.upgrade('aaa', 'admin', true);
      await Promise.resolve(); // prep
      await Promise.resolve(); // stage
      expect(install.prep.callCount).to.equal(1);
      expect(install.stage.callCount).to.equal(1);
      expect(install.indexStagedViews.callCount).to.equal(1);

      await upgradePromise;
      expect(upgradeLogService.setErrored.callCount).to.equal(0);

      indexStagedViews({ code: 'omg' });
      await Promise.resolve();
      expect(upgradeLogService.setErrored.callCount).to.equal(1);
    });
  });

  describe('indexerProgress', () => {
    it('should call indexer progress', () => {
      sinon.stub(viewIndexerProgress, 'query');
      upgrade.indexerProgress();
      expect(viewIndexerProgress.query.callCount).to.equal(1);
    });

    it('should throw any indexer progress errors', async () => {
      sinon.stub(viewIndexerProgress, 'query').rejects({ omg: 'it fails' });
      try {
        await upgrade.indexerProgress();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ omg: 'it fails' });
        expect(viewIndexerProgress.query.callCount).to.equal(1);
      }
    });
  });
});
