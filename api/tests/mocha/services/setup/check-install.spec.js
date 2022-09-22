const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');

const upgradeUtils = require('../../../../src/services/setup/utils');
const ddocsService = require('../../../../src/services/setup/ddocs');
const databases = require('../../../../src/services/setup/databases');
const upgradeSteps = require('../../../../src/services/setup/upgrade-steps');

let checkInstall;
'use strict';

const doRewire = () => checkInstall = rewire('../../../../src/services/setup/check-install');
const setDatabases = (dbs) => {
  Object.freeze(dbs);
  sinon.stub(databases, 'DATABASES').value(dbs);
  doRewire();
};

describe('Check install service', () => {
  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    doRewire();
  });

  describe('checkInstallForDb', () => {
    it('should be valid when there are no missing or different ddocs', async () => {
      const ddocs = [
        { _id: '_design/one' },
        { _id: '_design/two' },
        { _id: '_design/three' },
      ];
      Object.freeze(ddocs);
      sinon.stub(ddocsService, 'getDdocs').resolves(ddocs);
      sinon.stub(ddocsService, 'isStaged').returns(false);
      sinon.stub(upgradeUtils, 'getBundledDdocs').resolves(ddocs);
      sinon.stub(ddocsService, 'compareDdocs').returns({ missing: [], different: [] });
      const db = { data: 'base' };
      Object.freeze(db);

      const result = await checkInstall.__get__('checkInstallForDb')(db);

      expect(result).to.deep.equal({ upToDate: true, missing: [], different: [] });

      expect(ddocsService.getDdocs.callCount).to.equal(1);
      expect(ddocsService.getDdocs.args[0]).to.deep.equal([db]);
      expect(ddocsService.isStaged.callCount).to.equal(6);
      expect(upgradeUtils.getBundledDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getBundledDdocs.args[0]).to.deep.equal([db]);

      expect(ddocsService.compareDdocs.callCount).to.equal(1);
      expect(ddocsService.compareDdocs.args[0]).to.deep.equal([ddocs, ddocs]);
    });

    it('should be staged when all ddocs are staged', async () => {
      const ddocs = [
        { _id: '_design/one', v: 1 },
        { _id: '_design/two', v: 1 },
        { _id: '_design/three', v: 1 },
        { _id: '_design/:staged:one', v: 2 },
        { _id: '_design/:staged:two', v: 2 },
        { _id: '_design/:staged:three', v: 2 },
      ];
      Object.freeze(ddocs);

      const bundled = [
        { _id: '_design/one', v: 2 },
        { _id: '_design/two', v: 2 },
        { _id: '_design/three', v: 2 },
      ];
      Object.freeze(bundled);

      sinon.stub(ddocsService, 'getDdocs').resolves(ddocs);
      sinon.stub(ddocsService, 'isStaged').callsFake(id => id.includes('staged'));
      sinon.stub(upgradeUtils, 'getBundledDdocs').resolves(bundled);
      sinon.stub(ddocsService, 'compareDdocs');
      ddocsService.compareDdocs.onCall(0).returns({
        missing: [],
        different: ['_design/one', '_design/two', '_design/three'],
      });
      ddocsService.compareDdocs.onCall(1).returns({ missing: [], different: [], });
      const db = { data: 'base' };
      Object.freeze(db);

      const result = await checkInstall.__get__('checkInstallForDb')(db);

      expect(result).to.deep.equal({
        stagedUpgrade: true,
        partialStagedUpgrade: true,
        missing: [],
        different: ['_design/one', '_design/two', '_design/three'],
      });
      expect(ddocsService.getDdocs.callCount).to.equal(1);
      expect(ddocsService.getDdocs.args[0]).to.deep.equal([db]);
      expect(ddocsService.isStaged.callCount).to.equal(12);
      expect(upgradeUtils.getBundledDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getBundledDdocs.args[0]).to.deep.equal([db]);

      expect(ddocsService.compareDdocs.callCount).to.equal(2);
      expect(ddocsService.compareDdocs.args[0]).to.deep.equal([
        bundled,
        [
          { _id: '_design/one', v: 1 },
          { _id: '_design/two', v: 1 },
          { _id: '_design/three', v: 1 },
        ],
      ]);
      expect(ddocsService.compareDdocs.args[1]).to.deep.equal([
        bundled,
        [
          { _id: '_design/:staged:one', v: 2 },
          { _id: '_design/:staged:two', v: 2 },
          { _id: '_design/:staged:three', v: 2 },
        ],
      ]);
    });

    it('should be partially staged when some ddocs are staged', async () => {
      const ddocs = [
        { _id: '_design/one', v: 1 },
        { _id: '_design/two', v: 1 },
        { _id: '_design/:staged:one', v: 2 },
        { _id: '_design/:staged:three', v: 2 },
      ];
      Object.freeze(ddocs);

      const bundled = [
        { _id: '_design/one', v: 2 },
        { _id: '_design/two', v: 2 },
        { _id: '_design/three', v: 2 },
      ];
      Object.freeze(bundled);

      sinon.stub(ddocsService, 'getDdocs').resolves(ddocs);
      sinon.stub(ddocsService, 'isStaged').callsFake(id => id.includes('staged'));
      sinon.stub(upgradeUtils, 'getBundledDdocs').resolves(bundled);
      sinon.stub(ddocsService, 'compareDdocs');
      ddocsService.compareDdocs.onCall(0).returns({
        missing: ['_design/three'],
        different: ['_design/one', '_design/two'],
      });
      ddocsService.compareDdocs.onCall(1).returns({
        missing: ['_design/two'],
        different: [],
      });
      const db = { data: 'base' };
      Object.freeze(db);

      const result = await checkInstall.__get__('checkInstallForDb')(db);

      expect(result).to.deep.equal({
        stagedUpgrade: false,
        partialStagedUpgrade: true,
        missing: ['_design/three'],
        different: ['_design/one', '_design/two'],
      });
      expect(ddocsService.getDdocs.callCount).to.equal(1);
      expect(ddocsService.getDdocs.args[0]).to.deep.equal([db]);
      expect(ddocsService.isStaged.callCount).to.equal(8);
      expect(upgradeUtils.getBundledDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getBundledDdocs.args[0]).to.deep.equal([db]);

      expect(ddocsService.compareDdocs.callCount).to.equal(2);
      expect(ddocsService.compareDdocs.args[0]).to.deep.equal([
        bundled,
        [
          { _id: '_design/one', v: 1 },
          { _id: '_design/two', v: 1 },
        ],
      ]);
      expect(ddocsService.compareDdocs.args[1]).to.deep.equal([
        bundled,
        [
          { _id: '_design/:staged:one', v: 2 },
          { _id: '_design/:staged:three', v: 2 },
        ],
      ]);
    });

    it('should be empty when at least one staged ddoc is different', async () => {
      const ddocs = [
        { _id: '_design/one', v: 1 },
        { _id: '_design/two', v: 1 },
        { _id: '_design/:staged:one', v: 2 },
        { _id: '_design/:staged:three', v: 1 },
      ];
      Object.freeze(ddocs);

      const bundled = [
        { _id: '_design/one', v: 2 },
        { _id: '_design/two', v: 2 },
        { _id: '_design/three', v: 2 },
      ];
      Object.freeze(bundled);

      sinon.stub(ddocsService, 'getDdocs').resolves(ddocs);
      sinon.stub(ddocsService, 'isStaged').callsFake(id => id.includes('staged'));
      sinon.stub(upgradeUtils, 'getBundledDdocs').resolves(bundled);
      sinon.stub(ddocsService, 'compareDdocs');
      ddocsService.compareDdocs.onCall(0).returns({
        missing: ['_design/three'],
        different: ['_design/one', '_design/two'],
      });
      ddocsService.compareDdocs.onCall(1).returns({
        missing: ['_design/two'],
        different: ['_design/three'],
      });
      const db = { data: 'base' };
      Object.freeze(db);

      const result = await checkInstall.__get__('checkInstallForDb')(db);

      expect(result).to.deep.equal({
        stagedUpgrade: false,
        partialStagedUpgrade: false,
        missing: ['_design/three'],
        different: ['_design/one', '_design/two'],
      });
      expect(ddocsService.getDdocs.callCount).to.equal(1);
      expect(ddocsService.getDdocs.args[0]).to.deep.equal([db]);
      expect(ddocsService.isStaged.callCount).to.equal(8);
      expect(upgradeUtils.getBundledDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getBundledDdocs.args[0]).to.deep.equal([db]);

      expect(ddocsService.compareDdocs.callCount).to.equal(2);
      expect(ddocsService.compareDdocs.args[0]).to.deep.equal([
        bundled,
        [
          { _id: '_design/one', v: 1 },
          { _id: '_design/two', v: 1 },
        ],
      ]);
      expect(ddocsService.compareDdocs.args[1]).to.deep.equal([
        bundled,
        [
          { _id: '_design/:staged:one', v: 2 },
          { _id: '_design/:staged:three', v: 1 },
        ],
      ]);
    });

    it('should be empty when there are no staged ddocs', async () => {
      const ddocs = [
        { _id: '_design/one', v: 1 },
        { _id: '_design/two', v: 1 },
      ];
      Object.freeze(ddocs);

      const bundled = [
        { _id: '_design/one', v: 2 },
        { _id: '_design/two', v: 2 },
      ];
      Object.freeze(bundled);

      sinon.stub(ddocsService, 'getDdocs').resolves(ddocs);
      sinon.stub(ddocsService, 'isStaged').callsFake(id => id.includes('staged'));
      sinon.stub(upgradeUtils, 'getBundledDdocs').resolves(bundled);
      sinon.stub(ddocsService, 'compareDdocs');
      ddocsService.compareDdocs.onCall(0).returns({
        missing: [],
        different: ['_design/one', '_design/two'],
      });
      ddocsService.compareDdocs.onCall(1).returns({
        missing: ['_design/two', '_design/one'],
        different: [],
      });
      const db = { data: 'base' };
      Object.freeze(db);

      const result = await checkInstall.__get__('checkInstallForDb')(db);

      expect(result).to.deep.equal({
        stagedUpgrade: false,
        partialStagedUpgrade: false,
        missing: [],
        different: ['_design/one', '_design/two'],
      });
      expect(ddocsService.getDdocs.callCount).to.equal(1);
      expect(ddocsService.getDdocs.args[0]).to.deep.equal([db]);
      expect(ddocsService.isStaged.callCount).to.equal(4);
      expect(upgradeUtils.getBundledDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getBundledDdocs.args[0]).to.deep.equal([db]);

      expect(ddocsService.compareDdocs.callCount).to.equal(2);
      expect(ddocsService.compareDdocs.args[0]).to.deep.equal([
        bundled,
        [
          { _id: '_design/one', v: 1 },
          { _id: '_design/two', v: 1 },
        ],
      ]);
      expect(ddocsService.compareDdocs.args[1]).to.deep.equal([
        bundled,
        [],
      ]);
    });

    it('should throw an error when getting ddocs throws an error', async () => {
      sinon.stub(ddocsService, 'getDdocs').rejects({ the: 'error' });

      try {
        await checkInstall.__get__('checkInstallForDb')('db');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ the: 'error' });
        expect(ddocsService.getDdocs.callCount).to.equal(1);
      }
    });

    it('should throw an error when getting bundled ddocs throws an error', async () => {
      sinon.stub(ddocsService, 'getDdocs').resolves([{ _id: 'ddoc' }]);
      sinon.stub(upgradeUtils, 'getBundledDdocs').rejects({ error: 'boom' });

      try {
        await checkInstall.__get__('checkInstallForDb')('db');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ error: 'boom' });
        expect(ddocsService.getDdocs.callCount).to.equal(1);
        expect(upgradeUtils.getBundledDdocs.callCount).to.equal(1);
      }
    });
  });

  describe('checkInstall', () => {
    it('should do nothing if install is valid', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' }];
      setDatabases(dbs);

      const checkInstallForDb = sinon.stub().resolves({ upToDate: true });
      checkInstall.__set__('checkInstallForDb', checkInstallForDb);
      sinon.stub(upgradeUtils, 'interruptPreviousUpgrade');

      await checkInstall.run();

      expect(checkInstallForDb.callCount).to.equal(3);
      expect(checkInstallForDb.args).to.deep.equal([ [dbs[0]], [dbs[1]], [dbs[2]] ]);
      expect(upgradeUtils.interruptPreviousUpgrade.callCount).to.equal(1);
    });

    it('should complete install if some dbs are staged and some are valid', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' }, { name: 'four' }];
      setDatabases(dbs);

      const checkInstallForDb = sinon.stub();
      checkInstallForDb.onCall(0).resolves({ upToDate: true });
      checkInstallForDb.onCall(1).resolves({ stagedUpgrade: true, partialStagedUpgrade: true });
      checkInstallForDb.onCall(2).resolves({ upToDate: true });
      checkInstallForDb.onCall(3).resolves({ stagedUpgrade: true, partialStagedUpgrade: true });
      checkInstall.__set__('checkInstallForDb', checkInstallForDb);

      sinon.stub(upgradeSteps, 'finalize');

      await checkInstall.run();

      expect(checkInstallForDb.callCount).to.equal(4);
      expect(checkInstallForDb.args).to.deep.equal([ [dbs[0]], [dbs[1]], [dbs[2]], [dbs[3]] ]);
      expect(upgradeSteps.finalize.callCount).to.equal(1);
    });

    it('should complete install if all dbs are staged', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' }];
      setDatabases(dbs);

      const checkInstallForDb = sinon.stub().resolves({ stagedUpgrade: true, partialStagedUpgrade: true });
      checkInstall.__set__('checkInstallForDb', checkInstallForDb);

      sinon.stub(upgradeSteps, 'finalize').resolves();

      await checkInstall.run();

      expect(checkInstallForDb.callCount).to.equal(3);
      expect(checkInstallForDb.args).to.deep.equal([ [dbs[0]], [dbs[1]], [dbs[2]] ]);
      expect(upgradeSteps.finalize.callCount).to.equal(1);
    });

    it('should prep and stage installation, index views and complete install if only some dbs are staged', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' }, { name: 'four' }];
      setDatabases(dbs);

      const checkInstallForDb = sinon.stub();
      checkInstallForDb.onCall(0).resolves({ stagedUpgrade: false });
      checkInstallForDb.onCall(1).resolves({ stagedUpgrade: true, partialStagedUpgrade: true });
      checkInstallForDb.onCall(2).resolves({ stagedUpgrade: false, partialStagedUpgrade: true });
      checkInstallForDb.onCall(3).resolves({ stagedUpgrade: false, partialStagedUpgrade: false });
      checkInstall.__set__('checkInstallForDb', checkInstallForDb);

      let prepResolve;
      let indexViewsResolve;
      let stageResolve;
      sinon.stub(upgradeSteps, 'prep').returns(new Promise(r => prepResolve = r));
      sinon.stub(upgradeSteps, 'stage').returns(new Promise(r => stageResolve = r));
      sinon.stub(upgradeSteps, 'indexStagedViews').returns(new Promise(r => indexViewsResolve = r));
      sinon.stub(upgradeSteps, 'finalize').resolves();

      const checkInstallPromise = checkInstall.run();

      // resolve checking every database
      await Promise.resolve();
      await Promise.all(dbs.map(() => Promise.resolve()));

      expect(checkInstallForDb.callCount).to.equal(4);
      expect(checkInstallForDb.args).to.deep.equal([ [dbs[0]], [dbs[1]], [dbs[2]], [dbs[3]] ]);

      expect(upgradeSteps.prep.callCount).to.equal(0);
      expect(upgradeSteps.stage.callCount).to.equal(0);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(0);
      expect(upgradeSteps.finalize.callCount).to.equal(0);

      await Promise.resolve();

      expect(upgradeSteps.prep.callCount).to.equal(1);
      expect(upgradeSteps.stage.callCount).to.equal(0);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(0);
      expect(upgradeSteps.finalize.callCount).to.equal(0);

      await prepResolve();

      expect(upgradeSteps.prep.callCount).to.equal(1);
      expect(upgradeSteps.stage.callCount).to.equal(1);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(0);
      expect(upgradeSteps.finalize.callCount).to.equal(0);

      await stageResolve();

      expect(upgradeSteps.prep.callCount).to.equal(1);
      expect(upgradeSteps.stage.callCount).to.equal(1);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(1);
      expect(upgradeSteps.finalize.callCount).to.equal(0);

      await indexViewsResolve();

      expect(upgradeSteps.stage.callCount).to.equal(1);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(1);
      expect(upgradeSteps.finalize.callCount).to.equal(1);

      await checkInstallPromise;
    });

    it('should stage installation, index views and complete install if some dbs are partially staged', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' }, { name: 'four' }];
      setDatabases(dbs);

      const checkInstallForDb = sinon.stub();
      checkInstallForDb.onCall(0).resolves({ upToDate: true });
      checkInstallForDb.onCall(1).resolves({ stagedUpgrade: false, partialStagedUpgrade: true });
      checkInstallForDb.onCall(2).resolves({ stagedUpgrade: false, partialStagedUpgrade: true });
      checkInstallForDb.onCall(3).resolves({ stagedUpgrade: false, partialStagedUpgrade: true });
      checkInstall.__set__('checkInstallForDb', checkInstallForDb);

      let prepResolve;
      let stageResolve;
      let indexViewsResolve;
      sinon.stub(upgradeSteps, 'prep').returns(new Promise(r => prepResolve = r));
      sinon.stub(upgradeSteps, 'stage').returns(new Promise(r => stageResolve = r));
      sinon.stub(upgradeSteps, 'indexStagedViews').returns(new Promise(r => indexViewsResolve = r));
      sinon.stub(upgradeSteps, 'finalize').resolves();

      const checkInstallPromise = checkInstall.run();

      // resolve checking every database
      await Promise.resolve();
      await Promise.all(dbs.map(() => Promise.resolve()));

      expect(checkInstallForDb.callCount).to.equal(4);
      expect(checkInstallForDb.args).to.deep.equal([ [dbs[0]], [dbs[1]], [dbs[2]], [dbs[3]] ]);

      expect(upgradeSteps.prep.callCount).to.equal(0);
      expect(upgradeSteps.stage.callCount).to.equal(0);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(0);
      expect(upgradeSteps.finalize.callCount).to.equal(0);

      await Promise.resolve();

      expect(upgradeSteps.prep.callCount).to.equal(1);
      expect(upgradeSteps.stage.callCount).to.equal(0);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(0);
      expect(upgradeSteps.finalize.callCount).to.equal(0);

      await prepResolve();

      expect(upgradeSteps.prep.callCount).to.equal(1);
      expect(upgradeSteps.stage.callCount).to.equal(1);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(0);
      expect(upgradeSteps.finalize.callCount).to.equal(0);

      await stageResolve();

      expect(upgradeSteps.stage.callCount).to.equal(1);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(1);
      expect(upgradeSteps.finalize.callCount).to.equal(0);

      await indexViewsResolve();

      expect(upgradeSteps.stage.callCount).to.equal(1);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(1);
      expect(upgradeSteps.finalize.callCount).to.equal(1);

      await checkInstallPromise;
    });


    it('should stage installation, index views and complete install if none of the dbs are staged', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' } ];
      setDatabases(dbs);

      const checkInstallForDb = sinon.stub().resolves({ stagedUpgrade: false, partialStagedUpgrade: false });
      checkInstall.__set__('checkInstallForDb', checkInstallForDb);

      sinon.stub(upgradeSteps, 'prep').resolves();
      sinon.stub(upgradeSteps, 'stage').resolves();
      sinon.stub(upgradeSteps, 'indexStagedViews').resolves();
      sinon.stub(upgradeSteps, 'finalize').resolves();

      await checkInstall.run();

      expect(checkInstallForDb.callCount).to.equal(3);
      expect(checkInstallForDb.args).to.deep.equal([ [dbs[0]], [dbs[1]], [dbs[2]] ]);

      expect(upgradeSteps.prep.callCount).to.equal(1);
      expect(upgradeSteps.stage.callCount).to.equal(1);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(1);
      expect(upgradeSteps.finalize.callCount).to.equal(1);
    });

    it('should throw an error when checking install fails', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' } ];
      setDatabases(dbs);

      const checkInstallForDb = sinon.stub().resolves({ stagedUpgrade: false, partialStagedUpgrade: false });
      checkInstallForDb.onCall(1).rejects({ an: 'error' });
      checkInstall.__set__('checkInstallForDb', checkInstallForDb);

      try {
        await checkInstall.run();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'error' });
      }

      expect(checkInstallForDb.callCount).to.equal(2);
      expect(checkInstallForDb.args).to.deep.equal([ [dbs[0]], [dbs[1]] ]);
    });

    it('should throw an error when prep fails', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' } ];
      Object.freeze(dbs);
      sinon.stub(databases, 'DATABASES').value(dbs);

      doRewire();

      const checkInstallForDb = sinon.stub().resolves({ stagedUpgrade: false, partialStagedUpgrade: false });
      checkInstall.__set__('checkInstallForDb', checkInstallForDb);

      sinon.stub(upgradeSteps, 'prep').rejects({ boom: false });

      try {
        await checkInstall.run();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ boom: false });
        expect(checkInstallForDb.callCount).to.equal(3);
        expect(upgradeSteps.prep.callCount).to.equal(1);
      }
    });

    it('should throw an error when staging fails', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' } ];
      setDatabases(dbs);

      const checkInstallForDb = sinon.stub().resolves({ stagedUpgrade: false, partialStagedUpgrade: false });
      checkInstall.__set__('checkInstallForDb', checkInstallForDb);

      sinon.stub(upgradeSteps, 'prep').resolves();
      sinon.stub(upgradeSteps, 'stage').rejects({ boom: true });

      try {
        await checkInstall.run();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ boom: true });
        expect(checkInstallForDb.callCount).to.equal(3);
        expect(upgradeSteps.stage.callCount).to.equal(1);
      }
    });

    it('should throw an error when indexing fails', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' } ];
      setDatabases(dbs);

      const checkInstallForDb = sinon.stub().resolves({ stagedUpgrade: false, partialStagedUpgrade: false });
      checkInstall.__set__('checkInstallForDb', checkInstallForDb);

      sinon.stub(upgradeSteps, 'prep').resolves();
      sinon.stub(upgradeSteps, 'stage').resolves();
      sinon.stub(upgradeSteps, 'indexStagedViews').rejects({ code: 500 });

      try {
        await checkInstall.run();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ code: 500 });
        expect(checkInstallForDb.callCount).to.equal(3);
        expect(upgradeSteps.indexStagedViews.callCount).to.equal(1);
      }
    });

    it('should throw an error when completing install fails', async () => {
      const dbs = [{ name: 'one'}, { name: 'two' }, { name: 'three' } ];
      setDatabases(dbs);

      const checkInstallForDb = sinon.stub().resolves({ stagedUpgrade: false, partialStagedUpgrade: false });
      checkInstall.__set__('checkInstallForDb', checkInstallForDb);

      sinon.stub(upgradeSteps, 'prep').resolves();
      sinon.stub(upgradeSteps, 'stage').resolves();
      sinon.stub(upgradeSteps, 'indexStagedViews').resolves();
      sinon.stub(upgradeSteps, 'finalize').rejects({ status: 503 });

      try {
        await checkInstall.run();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ status: 503 });
        expect(checkInstallForDb.callCount).to.equal(3);
        expect(upgradeSteps.stage.callCount).to.equal(1);
        expect(upgradeSteps.indexStagedViews.callCount).to.equal(1);
        expect(upgradeSteps.finalize.callCount).to.equal(1);
      }
    });
  });

  describe('logDdocCheck', () => {
    it('should not crash if ddoc checks are empty', () => {
      const dbs = [{ name: 'one' }, { name: 'two' }, { name: 'three' }];
      setDatabases(dbs);

      checkInstall.__get__('logDdocCheck')({ });
    });

    it('should not crash if ddoc checks are malformed', () => {
      const dbs = [{ name: 'one' }, { name: 'two' }, { name: 'three' }];
      setDatabases(dbs);

      checkInstall.__get__('logDdocCheck')({ one: [] });
      checkInstall.__get__('logDdocCheck')({ one: {}, two: 200, three: 'thing' });
      checkInstall.__get__('logDdocCheck')({ one: { missing: 'omg', different: 100 } });
    });

    it('should not crash if ddoc checks are correct', () => {
      const dbs = [{ name: 'one' }, { name: 'two' }, { name: 'three' }];
      setDatabases(dbs);

      checkInstall.__get__('logDdocCheck')({
        one: {
          different: ['a', 'b', 'c'],
          missing: [],
        },
        two: {
          different: [],
          missing: ['c', 'd', 'e'],
        }
      });

    });
  });
});

