const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');
const fs = require('fs');
const request = require('@medic/couch-request');

const db = require('../../../../src/db');
const upgradeLogService = require('../../../../src/services/setup/upgrade-log');
const env = require('../../../../src/environment');
const { DATABASES } = require('../../../../src/services/setup/databases');
const ddocsService = require('../../../../src/services/setup/ddocs');

let utils;
let clock;
let originalEnv;

const buildInfo = (version, namespace = 'medic', application = 'medic') => ({ version, namespace, application });

const mockDb = (db) => {
  sinon.stub(db, 'allDocs');
  sinon.stub(db, 'bulkDocs');
  sinon.stub(db, 'compact');
  sinon.stub(db, 'viewCleanup');
};

'use strict';

describe('Setup utils', () => {
  beforeEach(() => {
    clock = sinon.useFakeTimers();
    utils = rewire('../../../../src/services/setup/utils');
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
    process.env = originalEnv;
  });

  describe('deleteStagedDdocs', () => {
    beforeEach(() => {
      sinon.stub(ddocsService, 'getStagedDdocs');
      sinon.stub(db, 'saveDocs');
    });

    it('should delete staged ddocs for every database', async () => {
      ddocsService.getStagedDdocs.withArgs(DATABASES[0]).resolves([{ _id: 'one' }]);
      ddocsService.getStagedDdocs.withArgs(DATABASES[1]).resolves([{ _id: 'two' }]);
      ddocsService.getStagedDdocs.withArgs(DATABASES[2]).resolves([{ _id: 'three' }]);
      ddocsService.getStagedDdocs.withArgs(DATABASES[3]).resolves([{ _id: 'four' }]);
      ddocsService.getStagedDdocs.withArgs(DATABASES[4]).resolves([{ _id: 'five' }]);

      db.saveDocs.resolves();

      await utils.__get__('deleteStagedDdocs')();

      expect(ddocsService.getStagedDdocs.callCount).to.equal(5);
      expect(ddocsService.getStagedDdocs.args).to.deep.equal([
        [DATABASES[0]],
        [DATABASES[1]],
        [DATABASES[2]],
        [DATABASES[3]],
        [DATABASES[4]],
      ]);
      expect(db.saveDocs.callCount).to.equal(5);
      expect(db.saveDocs.args).to.deep.equal([
        [DATABASES[0].db, [{ _id: 'one', _deleted: true }]],
        [DATABASES[1].db, [{ _id: 'two', _deleted: true }]],
        [DATABASES[2].db, [{ _id: 'three', _deleted: true }]],
        [DATABASES[3].db, [{ _id: 'four', _deleted: true }]],
        [DATABASES[4].db, [{ _id: 'five', _deleted: true }]],
      ]);
    });

    it('should throw getStagedDdocs errors', async () => {
      ddocsService.getStagedDdocs.withArgs(DATABASES[0]).resolves([{ _id: 'one' }]);
      ddocsService.getStagedDdocs.withArgs(DATABASES[1]).resolves([{ _id: 'two' }]);
      ddocsService.getStagedDdocs.withArgs(DATABASES[2]).rejects({ some: 'error' });

      db.saveDocs.resolves();

      try {
        await utils.__get__('deleteStagedDdocs')();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'error' });
        expect(ddocsService.getStagedDdocs.callCount).to.equal(3);
        expect(ddocsService.getStagedDdocs.args).to.deep.equal([
          [DATABASES[0]],
          [DATABASES[1]],
          [DATABASES[2]],
        ]);
        expect(db.saveDocs.callCount).to.equal(2);
        expect(db.saveDocs.args).to.deep.equal([
          [DATABASES[0].db, [{ _id: 'one', _deleted: true }]],
          [DATABASES[1].db, [{ _id: 'two', _deleted: true }]],
        ]);
      }
    });

    it('should throw deleteDocs errors', async () => {
      ddocsService.getStagedDdocs.withArgs(DATABASES[0]).resolves([{ _id: 'one' }]);
      ddocsService.getStagedDdocs.withArgs(DATABASES[1]).resolves([{ _id: 'two' }]);
      ddocsService.getStagedDdocs.withArgs(DATABASES[2]).resolves([{ _id: 'three' }]);
      ddocsService.getStagedDdocs.withArgs(DATABASES[3]).resolves([{ _id: 'four' }]);

      db.saveDocs.resolves();
      db.saveDocs.withArgs(DATABASES[1].db).rejects({ an: 'err' });

      try {
        await utils.__get__('deleteStagedDdocs')();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'err' });
        expect(ddocsService.getStagedDdocs.callCount).to.equal(2);
        expect(ddocsService.getStagedDdocs.args).to.deep.equal([
          [DATABASES[0]],
          [DATABASES[1]],
        ]);
        expect(db.saveDocs.callCount).to.equal(2);
        expect(db.saveDocs.args).to.deep.equal([
          [DATABASES[0].db, [{ _id: 'one', _deleted: true }]],
          [DATABASES[1].db, [{ _id: 'two', _deleted: true }]],
        ]);
      }
    });

    it('should do nothing when there are no staged ddocs', async () => {
      ddocsService.getStagedDdocs.withArgs(DATABASES[0]).resolves([{ _id: 'one' }]);
      ddocsService.getStagedDdocs.withArgs(DATABASES[1]).resolves([]);
      ddocsService.getStagedDdocs.withArgs(DATABASES[2]).resolves([{ _id: 'three' }]);
      ddocsService.getStagedDdocs.withArgs(DATABASES[3]).resolves([]);
      ddocsService.getStagedDdocs.withArgs(DATABASES[4]).resolves([]);

      db.saveDocs.resolves();

      await utils.__get__('deleteStagedDdocs')();

      expect(ddocsService.getStagedDdocs.callCount).to.equal(5);
      expect(ddocsService.getStagedDdocs.args).to.deep.equal([
        [DATABASES[0]],
        [DATABASES[1]],
        [DATABASES[2]],
        [DATABASES[3]],
        [DATABASES[4]],
      ]);
      expect(db.saveDocs.callCount).to.equal(2);
      expect(db.saveDocs.args).to.deep.equal([
        [DATABASES[0].db, [{ _id: 'one', _deleted: true }]],
        [DATABASES[2].db, [{ _id: 'three', _deleted: true }]],
      ]);
    });
  });

  describe('cleanup', () => {
    it('should start db compact and view cleanup for every database', () => {
      mockDb(db.medic);
      mockDb(db.sentinel);
      mockDb(db.medicLogs);
      mockDb(db.medicUsersMeta);
      mockDb(db.users);

      utils.cleanup();

      expect(db.medic.compact.callCount).to.equal(1);
      expect(db.sentinel.compact.callCount).to.equal(1);
      expect(db.medicLogs.compact.callCount).to.equal(1);
      expect(db.medicUsersMeta.compact.callCount).to.equal(1);
      expect(db.users.compact.callCount).to.equal(1);

      expect(db.medic.viewCleanup.callCount).to.equal(1);
      expect(db.sentinel.viewCleanup.callCount).to.equal(1);
      expect(db.medicLogs.viewCleanup.callCount).to.equal(1);
      expect(db.medicUsersMeta.viewCleanup.callCount).to.equal(1);
      expect(db.users.viewCleanup.callCount).to.equal(1);
    });

    it('should catch errors', async () => {
      mockDb(db.medic);
      mockDb(db.sentinel);
      mockDb(db.medicLogs);
      mockDb(db.medicUsersMeta);
      mockDb(db.users);

      db.sentinel.compact.rejects({ some: 'error' });
      utils.cleanup();

      await Promise.resolve();
    });
  });

  describe('getDdocDefinitions', () => {
    const genDdocsJson = (ddocs) => JSON.stringify({ docs: ddocs });
    const genAttachmentData = (ddocs) => {
      const json = genDdocsJson(ddocs);
      const buffer = Buffer.from(json);
      return buffer.toString('base64');
    };

    beforeEach(() => {
      sinon.stub(db.builds, 'get');
    });

    describe('for local version install', () => {
      it('should get bundled ddocs for every db', async () => {
        sinon.stub(fs.promises, 'readFile');
        sinon.stub(env, 'ddocsPath').value('localDdocs');

        const medicDdocs = [
          { _id: '_design/medic', views: { medic1: {}, medic2: {} } },
          { _id: '_design/medic-client', views: { client1: {}, client2: {} } },
        ];
        const sentinelDdocs = [{ _id: '_design/sentinel', views: { sentinel: {} } }];
        const logsDdocs = [{ _id: '_design/logs', views: { logs1: {}, logs2: {} } }];
        const usersMetaDdocs = [
          { _id: '_design/meta1', views: { usersmeta1: {} } },
          { _id: '_design/meta2', views: { usersmeta2: {} } },
        ];
        const usersDdocs = [{ _id: '_design/users', views: { users1: {} } }];

        fs.promises.readFile.withArgs('localDdocs/medic.json').resolves(genDdocsJson(medicDdocs));
        fs.promises.readFile.withArgs('localDdocs/sentinel.json').resolves(genDdocsJson(sentinelDdocs));
        fs.promises.readFile.withArgs('localDdocs/logs.json').resolves(genDdocsJson(logsDdocs));
        fs.promises.readFile.withArgs('localDdocs/users-meta.json').resolves(genDdocsJson(usersMetaDdocs));
        fs.promises.readFile.withArgs('localDdocs/users.json').resolves(genDdocsJson(usersDdocs));

        const result = await utils.getDdocDefinitions();

        expect(result.size).to.equal(5);
        expect(result.get(DATABASES[0])).to.deep.equal(medicDdocs);
        expect(result.get(DATABASES[1])).to.deep.equal(sentinelDdocs);
        expect(result.get(DATABASES[2])).to.deep.equal(logsDdocs);
        expect(result.get(DATABASES[3])).to.deep.equal(usersMetaDdocs);
        expect(result.get(DATABASES[4])).to.deep.equal(usersDdocs);

        expect(db.builds.get.callCount).to.equal(0);
        expect(fs.promises.readFile.args).to.deep.equal([
          ['localDdocs/medic.json', 'utf-8'],
          ['localDdocs/sentinel.json', 'utf-8'],
          ['localDdocs/logs.json', 'utf-8'],
          ['localDdocs/users-meta.json', 'utf-8'],
          ['localDdocs/users.json', 'utf-8'],
        ]);
      });

      it('should throw error when read fails', async () => {
        sinon.stub(fs.promises, 'readFile');
        sinon.stub(env, 'ddocsPath').value('localDdocs');

        const medicDdocs = [{ _id: 'ddoc1' }];
        const logsDdocs = [{ _id: 'ddoc2' }];
        const sentinelDdocs = [{ _id: 'ddoc3' }];

        fs.promises.readFile.withArgs('localDdocs/medic.json').resolves(genDdocsJson(medicDdocs));
        fs.promises.readFile.withArgs('localDdocs/sentinel.json').resolves(genDdocsJson(sentinelDdocs));
        fs.promises.readFile.withArgs('localDdocs/logs.json').resolves(genDdocsJson(logsDdocs));
        fs.promises.readFile.withArgs('localDdocs/users-meta.json').rejects({ error: 'booom' });

        try {
          await utils.getDdocDefinitions();
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err).to.deep.equal({ error: 'booom' });
          expect(db.builds.get.callCount).to.equal(0);
          expect(fs.promises.readFile.args).to.deep.equal([
            ['localDdocs/medic.json', 'utf-8'],
            ['localDdocs/sentinel.json', 'utf-8'],
            ['localDdocs/logs.json', 'utf-8'],
            ['localDdocs/users-meta.json', 'utf-8'],
          ]);
        }
      });

      it('should throw error when contents is invalid json', async () => {
        sinon.stub(fs.promises, 'readFile');
        sinon.stub(env, 'ddocsPath').value('localDdocs');

        const medicDdocs = [{ _id: 'ddoc1' }];
        const sentinelDdocs = [{ _id: 'ddoc3' }];

        fs.promises.readFile.withArgs('localDdocs/medic.json').resolves(genDdocsJson(medicDdocs));
        fs.promises.readFile.withArgs('localDdocs/sentinel.json').resolves(genDdocsJson(sentinelDdocs));
        fs.promises.readFile.withArgs('localDdocs/logs.json').resolves('definitely not json');

        try {
          await utils.getDdocDefinitions();
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err.message).to.match(/Unexpected token/);
          expect(db.builds.get.callCount).to.equal(0);
          expect(fs.promises.readFile.args).to.deep.equal([
            ['localDdocs/medic.json', 'utf-8'],
            ['localDdocs/sentinel.json', 'utf-8'],
            ['localDdocs/logs.json', 'utf-8'],
          ]);
        }
      });
    });

    describe('for remote version install', () => {
      it('download ddoc definitions', async () => {
        const medicDdocs = [{ _id: 'ddoc1' }];
        const logsDdocs = [{ _id: 'ddoc2' }];
        const sentinelDdocs = [{ _id: 'ddoc3' }];
        const usersDdocs = [{ _id: 'ddoc4' }];

        const version = 'version_number';
        db.builds.get.resolves({
          build_info: buildInfo(version),
          version: version,
          _attachments: {
            'ddocs/medic.json': { data: genAttachmentData(medicDdocs) },
            'ddocs/logs.json': { data: genAttachmentData(logsDdocs) },
            'ddocs/sentinel.json': { data: genAttachmentData(sentinelDdocs) },
            'ddocs/users-meta.json': { data: genAttachmentData(usersDdocs) },
          },
        });

        const result = await utils.getDdocDefinitions(buildInfo(version));

        expect(result.get(DATABASES[0])).to.deep.equal(medicDdocs);
        expect(result.get(DATABASES[1])).to.deep.equal(sentinelDdocs);
        expect(result.get(DATABASES[2])).to.deep.equal(logsDdocs);
        expect(result.get(DATABASES[3])).to.deep.equal(usersDdocs);
        expect(result.size).to.equal(4);

        expect(db.builds.get.callCount).to.equal(1);
        expect(db.builds.get.args[0]).to.deep.equal([`medic:medic:${version}`, { attachments: true }]);
      });

      it('should skip ddocs for new dbs', async () => {
        const version = 'version_number';
        const medicDdocs = [{ _id: 'd1' }];
        const logsDdocs = [{ _id: 'd2' }];
        const sentinelDdocs = [{ _id: 'd3' }];
        const usersDdocs = [{ _id: 'd4' }];
        const newdb = [{ _id: 'd5' }];

        db.builds.get.resolves({
          build_info: buildInfo(version),
          version: version,
          _attachments: {
            'ddocs/medic.json': { data: genAttachmentData(medicDdocs) },
            'ddocs/logs.json': { data: genAttachmentData(logsDdocs) },
            'ddocs/sentinel.json': { data: genAttachmentData(sentinelDdocs) },
            'ddocs/users-meta.json': { data: genAttachmentData(usersDdocs) },
            'ddocs/newdb.json': { data: genAttachmentData(newdb) },
          },
        });

        const result = await utils.getDdocDefinitions(buildInfo(version));
        expect(result.get(DATABASES[0])).to.deep.equal(medicDdocs);
        expect(result.get(DATABASES[1])).to.deep.equal(sentinelDdocs);
        expect(result.get(DATABASES[2])).to.deep.equal(logsDdocs);
        expect(result.get(DATABASES[3])).to.deep.equal(usersDdocs);
        expect(result.size).to.equal(4);

        expect(db.builds.get.callCount).to.equal(1);
        expect(db.builds.get.args[0]).to.deep.equal([`medic:medic:${version}`, { attachments: true }]);
      });

      it('should handle missing dbs', async () => {
        const medicDdocs = [{ _id: 'd1' }];
        const logsDdocs = [{ _id: 'd2' }];
        const version = 'version_number';
        db.builds.get.resolves({
          build_info: buildInfo(version),
          version: version,
          _attachments: {
            'ddocs/medic.json': { data: genAttachmentData(medicDdocs) },
            'ddocs/logs.json': { data: genAttachmentData(logsDdocs) },
          },
        });

        const result = await utils.getDdocDefinitions(buildInfo(version));
        expect(result.get(DATABASES[0])).to.deep.equal(medicDdocs);
        expect(result.get(DATABASES[2])).to.deep.equal(logsDdocs);
        expect(result.size).to.equal(2);
      });

      it('should throw error when staging doc not found', async () => {
        db.builds.get.rejects({ error: 'boom' });

        try {
          await utils.getDdocDefinitions(buildInfo('vers'));
          expect.fail('should have thrown');
        } catch (err) {
          expect(err).to.deep.equal({ error: 'boom' });
        }

        expect(db.builds.get.callCount).to.equal(1);
        expect(db.builds.get.args[0]).to.deep.equal([`medic:medic:vers`, { attachments: true }]);
      });

      it('should throw an error when staging doc has no attachments', async () => {
        const version = '4.0.0';
        db.builds.get.resolves({
          build_info: {},
          version: version,
        });

        try {
          await utils.getDdocDefinitions(buildInfo(version));
          expect.fail('should have thrown');
        } catch (err) {
          expect(err.message).to.equal('Staging ddoc is missing attachments');
        }

        expect(db.builds.get.callCount).to.equal(1);
        expect(db.builds.get.args[0]).to.deep.equal([`medic:medic:4.0.0`, { attachments: true }]);
      });

      it('should throw an error when ddocs are corrupted', async () => {
        const version = 'theversion';
        db.builds.get.resolves({
          build_info: {},
          version: version,
          _attachments: {
            'ddocs/medic.json': { data: genAttachmentData([{ _id: 'aaa' }]) },
            'ddocs/logs.json': { data: 'this is definitely invalid base64 json' },
          },
        });

        try {
          await utils.getDdocDefinitions({ namespace: 'a', application: 'b', version });
          expect.fail('should have thrown');
        } catch (err) {
          expect(err.message).to.match(/Unexpected token/);
        }

        expect(db.builds.get.callCount).to.equal(1);
        expect(db.builds.get.args[0]).to.deep.equal([`a:b:${version}`, { attachments: true }]);
      });
    });
  });

  describe('saveStagedDdocs', () => {
    it('should stage ddocs for every db', async () => {
      const deployInfo = { user: 'usr', upgrade_log_id: 'theid' };
      Object.freeze(deployInfo);
      sinon.stub(upgradeLogService, 'getDeployInfo').resolves(deployInfo);

      const ddocDefinitions = new Map();
      ddocDefinitions.set(DATABASES[0], [
        { _id: '_design/medic', views: { medic1: {}, medic2: {} } },
        { _id: '_design/medic-client', views: { client1: {}, client2: {} } },
      ]);
      ddocDefinitions.set(DATABASES[1], [{ _id: '_design/sentinel', views: { sentinel: {} } }]);
      ddocDefinitions.set(DATABASES[2], [{ _id: '_design/logs', views: { logs1: {}, logs2: {} } }]);
      ddocDefinitions.set(DATABASES[3], [
        { _id: '_design/meta1', views: { usersmeta1: {} } },
        { _id: '_design/meta2', views: { usersmeta2: {} } },
      ]);
      ddocDefinitions.set(DATABASES[4],  [{ _id: '_design/users', views: { users1: {} } }]);

      sinon.stub(db, 'saveDocs').resolves();

      await utils.saveStagedDdocs(ddocDefinitions);

      expect(db.saveDocs.callCount).to.equal(5);
      expect(db.saveDocs.args[0]).to.deep.equal([db.medic, [
        { _id: '_design/:staged:medic', views: { medic1: {}, medic2: {} }, deploy_info: deployInfo },
        { _id: '_design/:staged:medic-client', views: { client1: {}, client2: {} }, deploy_info: deployInfo },
      ]]);
      expect(db.saveDocs.args[1]).to.deep.equal([db.sentinel, [
        { _id: '_design/:staged:sentinel', views: { sentinel: {} }, deploy_info: deployInfo },
      ]]);
      expect(db.saveDocs.args[2]).to.deep.equal([db.medicLogs, [
        { _id: '_design/:staged:logs', views: { logs1: {}, logs2: {} }, deploy_info: deployInfo }
      ]]);
      expect(db.saveDocs.args[3]).to.deep.equal([db.medicUsersMeta, [
        { _id: '_design/:staged:meta1', views: { usersmeta1: {} }, deploy_info: deployInfo },
        { _id: '_design/:staged:meta2', views: { usersmeta2: {} }, deploy_info: deployInfo },
      ]]);
      expect(db.saveDocs.args[4]).to.deep.equal([db.users, [
        { _id: '_design/:staged:users', views: { users1: {} }, deploy_info: deployInfo }
      ]]);
    });

    it('should delete eventual _rev properties', async () => {
      const deployInfo = { user: 'admin', upgrade_log_id: 'theid' };
      Object.freeze(deployInfo);
      sinon.stub(upgradeLogService, 'getDeployInfo').resolves(deployInfo);

      const ddocDefinitions = new Map();
      ddocDefinitions.set(DATABASES[0], [
        { _id: '_design/medic', _rev: 1, views: { medic: {} } },
        { _id: '_design/medic-client', _rev: 2, views: { clienta: {}, clientb: {} } },
      ]);
      ddocDefinitions.set(DATABASES[1], [{ _id: '_design/sentinel', views: { sentinel: {} } }]);
      ddocDefinitions.set(DATABASES[2], [{ _id: '_design/logs', views: { logs: {} } }]);
      ddocDefinitions.set(DATABASES[3], [
        { _id: '_design/meta1', _rev: 100, views: { usersmeta1: {} } },
        { _id: '_design/meta2', _rev: 582, views: { usersmeta2: {} } },
      ]);
      ddocDefinitions.set(DATABASES[4],  [{ _id: '_design/users', views: { users1: {} } }]);

      sinon.stub(db, 'saveDocs').resolves();

      await utils.saveStagedDdocs(ddocDefinitions);

      expect(db.saveDocs.callCount).to.equal(5);
      expect(db.saveDocs.args[0]).to.deep.equal([db.medic, [
        { _id: '_design/:staged:medic', views: { medic: {} }, deploy_info: deployInfo },
        { _id: '_design/:staged:medic-client', views: { clienta: {}, clientb: {} }, deploy_info: deployInfo },
      ]]);
      expect(db.saveDocs.args[1]).to.deep.equal([db.sentinel, [
        { _id: '_design/:staged:sentinel', views: { sentinel: {} }, deploy_info: deployInfo }
      ]]);
      expect(db.saveDocs.args[2]).to.deep.equal([db.medicLogs, [
        { _id: '_design/:staged:logs', views: { logs: {} }, deploy_info: deployInfo }
      ]]);
      expect(db.saveDocs.args[3]).to.deep.equal([db.medicUsersMeta, [
        { _id: '_design/:staged:meta1', views: { usersmeta1: {} }, deploy_info: deployInfo },
        { _id: '_design/:staged:meta2', views: { usersmeta2: {} }, deploy_info: deployInfo },
      ]]);
      expect(db.saveDocs.args[4]).to.deep.equal([db.users, [
        { _id: '_design/:staged:users', views: { users1: {} }, deploy_info: deployInfo }
      ]]);
    });

    it('should work when db has been removed from upgrade', async () => {
      const deployInfo = { user: 'admin', upgrade_log_id: 'anid' };
      Object.freeze(deployInfo);
      sinon.stub(upgradeLogService, 'getDeployInfo').resolves(deployInfo);

      const ddocDefinitions = new Map();
      ddocDefinitions.set(DATABASES[0], [
        { _id: '_design/medic', views: { medic: {} } },
        { _id: '_design/medic-client', views: { clienta: {}, clientb: {} } },
      ]);
      ddocDefinitions.set(DATABASES[2], [{ _id: '_design/logs', views: { logs: {} } }]);
      ddocDefinitions.set(DATABASES[3], [
        { _id: '_design/meta1', views: { usersmeta1: {} } },
        { _id: '_design/meta2', views: { usersmeta2: {} } },
      ]);
      ddocDefinitions.set(DATABASES[4],  [{ _id: '_design/users', views: { users1: {} } }]);

      sinon.stub(db, 'saveDocs').resolves();

      await utils.saveStagedDdocs(ddocDefinitions);

      expect(db.saveDocs.callCount).to.equal(5);
      expect(db.saveDocs.args[0]).to.deep.equal([db.medic, [
        { _id: '_design/:staged:medic', views: { medic: {} }, deploy_info: deployInfo },
        { _id: '_design/:staged:medic-client', views: { clienta: {}, clientb: {} }, deploy_info: deployInfo },
      ]]);
      expect(db.saveDocs.args[1]).to.deep.equal([db.sentinel, []]);
      expect(db.saveDocs.args[2]).to.deep.equal([db.medicLogs, [
        { _id: '_design/:staged:logs', views: { logs: {} }, deploy_info: deployInfo }
      ]]);
      expect(db.saveDocs.args[3]).to.deep.equal([db.medicUsersMeta, [
        { _id: '_design/:staged:meta1', views: { usersmeta1: {} }, deploy_info: deployInfo },
        { _id: '_design/:staged:meta2', views: { usersmeta2: {} }, deploy_info: deployInfo },
      ]]);
      expect(db.saveDocs.args[4]).to.deep.equal([db.users, [
        { _id: '_design/:staged:users', views: { users1: {} }, deploy_info: deployInfo }
      ]]);
    });

    it('should throw error if staging fails', async () => {
      sinon.stub(upgradeLogService, 'getDeployInfo').resolves({});

      const ddocDefinitions = new Map();
      ddocDefinitions.set(DATABASES[0], [
        { _id: '_design/medic', views: { medic: {} } },
        { _id: '_design/medic-client', views: { client: {} } },
      ]);
      ddocDefinitions.set(DATABASES[1], [{ _id: '_design/sentinel', views: { sentinel: {} } }]);
      ddocDefinitions.set(DATABASES[2], [{ _id: '_design/logs', views: { logs: {} } }]);

      sinon.stub(db, 'saveDocs').resolves();
      db.saveDocs.onCall(2).rejects([{ error: 'some error', id: '_design/logs' }]);

      try {
        await utils.saveStagedDdocs(ddocDefinitions);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal([{ error: 'some error', id: '_design/logs' }]);
      }

      expect(db.saveDocs.callCount).to.equal(3);
    });
  });

  describe('getPackagedBuildInfo', () => {
    it('should get the version from the packaged medic ddoc', async () => {
      const medicDdoc = {
        _id: '_design/medic',
        build_info: {
          application: 'medic',
          namespace: 'medic',
          version: 'master',
          base_version: '3.15',
          author: 'grunt',
          build: '3.15.0-master.sometimestamp',
        },
      };
      sinon.stub(env, 'ddoc').value('medic');
      sinon.stub(env, 'ddocsPath').value('ddocsPath');

      sinon.stub(fs.promises, 'readFile').resolves(JSON.stringify({ docs: [medicDdoc] }));

      const buildInfo = await utils.getPackagedBuildInfo();

      expect(buildInfo).to.deep.equal(medicDdoc.build_info);
      expect(fs.promises.readFile.callCount).to.equal(1);
      expect(fs.promises.readFile.args[0]).to.deep.equal(['ddocsPath/medic.json', 'utf-8']);
    });

    it('should throw error if json is not found', async () => {
      sinon.stub(env, 'ddocsPath').value('ddocsPath');
      sinon.stub(env, 'ddoc').value('medic');
      sinon.stub(fs.promises, 'readFile').rejects({ code: 'ENOENT' });

      try {
        await utils.getPackagedBuildInfo();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ code: 'ENOENT' });
      }
    });

    it('should throw error if json has no ddocs', async () => {
      sinon.stub(env, 'ddocsPath').value('ddocsPath');
      sinon.stub(env, 'ddoc').value('medic');
      sinon.stub(fs.promises, 'readFile').resolves(JSON.stringify({}));

      try {
        await utils.getPackagedBuildInfo();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Cannot find medic db ddocs among packaged ddocs.');
      }
    });

    it('should throw error if json is missing medic ddoc', async () => {
      const jsonDdocs = [{ _id: '_design/one' }, { _id: '_design/two' }, { _id: '_design/three' }];
      sinon.stub(env, 'ddocsPath').value('ddocsPath');
      sinon.stub(env, 'ddoc').value('medic');
      sinon.stub(fs.promises, 'readFile').resolves(JSON.stringify({ docs: jsonDdocs }));

      try {
        await utils.getPackagedBuildInfo();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Cannot find medic ddoc among packaged ddocs.');
      }
    });
  });

  describe('freshInstall', () => {
    it('should return true if there is no installed medic ddoc', async () => {
      sinon.stub(env, 'ddoc').value('medic');
      sinon.stub(db.medic, 'get').rejects({ status: 404 });

      expect(await utils.freshInstall()).to.equal(true);
      expect(db.medic.get.callCount).to.equal(1);
      expect(db.medic.get.args[0]).to.deep.equal(['_design/medic']);
    });

    it('should return false if there is a medic ddoc', async () => {
      sinon.stub(env, 'ddoc').value('theddoc');
      sinon.stub(db.medic, 'get').resolves({ _id: '_design/theddoc' });
      expect(await utils.freshInstall()).to.equal(false);
      expect(db.medic.get.callCount).to.equal(1);
      expect(db.medic.get.args[0]).to.deep.equal(['_design/theddoc']);
    });

    it('should throw error when get fails', async () => {
      sinon.stub(db.medic, 'get').rejects({ status: 401 });
      try {
        await utils.freshInstall();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ status: 401 });
      }
    });
  });

  describe('unstageStagedDdocs', () => {
    it('should rename staged ddocs and assign deploy info timestamp', async () => {
      clock.tick(1500);
      const deployInfoNew = { user: 'usr', upgrade_log_id: 'aa' };
      const deployInfoOld = { user: 'old', upgrade_log_id: '11', timestamp: 100 };
      const deployInfoExpected = Object.assign({ timestamp: 1500 }, deployInfoNew);

      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { doc: { _id: '_design/:staged:medic', _rev: '1', new: true, deploy_info: deployInfoNew } },
          { doc: { _id: '_design/:staged:medic-client', _rev: '1', new: true, deploy_info: deployInfoNew } },
          { doc: { _id: '_design/medic', _rev: '2', old: true, deploy_info: deployInfoOld } },
          { doc: { _id: '_design/medic-client', _rev: '3', old: true, deploy_info: deployInfoOld } },
        ]
      }); // all ddocs have match
      sinon.stub(db.sentinel, 'allDocs').resolves({
        rows: [
          { doc: { _id: '_design/:staged:sentinel1', _rev: '1', isnew: true, deploy_info: deployInfoNew } },
          { doc: { _id: '_design/sentinel1', _rev: '2', isOld: true, deploy_info: deployInfoOld } },
          { doc: { _id: '_design/extra', _rev: '3', deploy_info: deployInfoOld } },
        ]
      }); // one extra existent ddoc
      sinon.stub(db.medicLogs, 'allDocs').resolves({
        rows: [
          { doc: { _id: '_design/:staged:logs1', _rev: '1', field: 'a', deploy_info: deployInfoNew } },
          { doc: { _id: '_design/:staged:logs2', _rev: '1', deploy_info: deployInfoNew } },
          { doc: { _id: '_design/logs1', _rev: '3', field: 'b', deploy_info: deployInfoOld } },
        ]
      }); // one extra staged ddoc
      sinon.stub(db.medicUsersMeta, 'allDocs').resolves({ rows: [] }); // no ddocs
      sinon.stub(db.users, 'allDocs').resolves({ rows: [] }); // no ddocs

      sinon.stub(db, 'saveDocs').resolves();

      await utils.unstageStagedDdocs();

      const allDocsArgs = [{ startkey: '_design/', endkey: '_design/\ufff0', include_docs: true }];

      expect(db.medic.allDocs.callCount).to.equal(1);
      expect(db.medic.allDocs.args[0]).to.deep.equal(allDocsArgs);
      expect(db.sentinel.allDocs.callCount).to.equal(1);
      expect(db.sentinel.allDocs.args[0]).to.deep.equal(allDocsArgs);
      expect(db.medicLogs.allDocs.callCount).to.equal(1);
      expect(db.medicLogs.allDocs.args[0]).to.deep.equal(allDocsArgs);
      expect(db.medicUsersMeta.allDocs.callCount).to.equal(1);
      expect(db.medicUsersMeta.allDocs.args[0]).to.deep.equal(allDocsArgs);
      expect(db.users.allDocs.callCount).to.equal(1);
      expect(db.users.allDocs.args[0]).to.deep.equal(allDocsArgs);

      expect(db.saveDocs.callCount).to.equal(5);
      expect(db.saveDocs.args[0]).to.deep.equal([db.medic, [
        { _id: '_design/medic', _rev: '2', new: true, deploy_info: deployInfoExpected },
        { _id: '_design/medic-client', _rev: '3', new: true, deploy_info: deployInfoExpected },
      ]]);
      expect(db.saveDocs.args[1]).to.deep.equal([db.sentinel, [
        { _id: '_design/sentinel1', _rev: '2', isnew: true, deploy_info: deployInfoExpected },
      ]]);
      expect(db.saveDocs.args[2]).to.deep.equal([db.medicLogs, [
        { _id: '_design/logs1', _rev: '3', field: 'a', deploy_info: deployInfoExpected },
        { _id: '_design/logs2', deploy_info: deployInfoExpected },
      ]]);
      expect(db.saveDocs.args[3]).to.deep.equal([db.medicUsersMeta, []]);
      expect(db.saveDocs.args[4]).to.deep.equal([db.users, []]);
    });

    it('should throw an error when getting ddocs fails', async () => {
      clock.tick(2500);
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { doc: { _id: '_design/:staged:medic', _rev: '1', foo: 1, deploy_info: { deploy: 'info' } } },
          { doc: { _id: '_design/medic', _rev: '2', bar: 2, deploy_info: { deploy: 'old' } } },
        ]
      }); // all ddocs have match
      sinon.stub(db.sentinel, 'allDocs').rejects({ the: 'error' });

      sinon.stub(db, 'saveDocs').resolves();

      sinon.stub(upgradeLogService, 'getDeployInfo').resolves();

      try {
        await utils.unstageStagedDdocs();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ the: 'error' });

        expect(db.medic.allDocs.callCount).to.equal(1);
        expect(db.saveDocs.callCount).to.equal(1);
        expect(db.saveDocs.args[0]).to.deep.equal([db.medic, [
          { _id: '_design/medic', _rev: '2', foo: 1, deploy_info: { deploy: 'info', timestamp: 2500 } },
        ]]);
        expect(db.sentinel.allDocs.callCount).to.equal(1);
      }
    });

    it('should throw an error when saving ddocs fails', async () => {
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { doc: { _id: '_design/:staged:medic', _rev: '1', foo: 1, deploy_info: { deploy: 'info' } } },
          { doc: { _id: '_design/medic', _rev: '2', bar: 2, deploy_info: 'omg' } },
        ]
      }); // all ddocs have match
      sinon.stub(db.sentinel, 'allDocs').resolves({
        rows: [
          { doc: { _id: '_design/:staged:sentinel', _rev: '1', foo: 1, deploy_info: { deploy: 'info' } } },
        ]
      });

      sinon.stub(db, 'saveDocs').resolves();
      db.saveDocs.onCall(1).rejects({ error: 'an error' });

      try {
        await utils.unstageStagedDdocs();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ error: 'an error' });

        expect(db.medic.allDocs.callCount).to.equal(1);
        expect(db.sentinel.allDocs.callCount).to.equal(1);
        expect(db.saveDocs.callCount).to.equal(2);
      }
    });
  });

  describe('abortPreviousUpgrade', () => {
    it('should set upgrade log to aborted state', async () => {
      sinon.stub(upgradeLogService, 'setAborted').resolves();
      await utils.abortPreviousUpgrade();
      expect(upgradeLogService.setAborted.callCount).to.equal(1);
    });

    it('should catch errors', async () => {
      sinon.stub(upgradeLogService, 'setAborted').rejects({ the: 'error' });
      await utils.abortPreviousUpgrade();
      expect(upgradeLogService.setAborted.callCount).to.equal(1);
    });
  });

  describe('interruptPreviousUpgrade', () => {
    it('should set upgrade log state to interrupted', async () => {
      sinon.stub(upgradeLogService, 'get').resolves({ _id: 'upgrade_log' });
      sinon.stub(upgradeLogService, 'setInterrupted').resolves();

      await utils.interruptPreviousUpgrade();

      expect(upgradeLogService.get.callCount).to.equal(1);
      expect(upgradeLogService.setInterrupted.callCount).to.equal(1);
    });

    it('should do nothing when there is no upgrade log to update', async () => {
      sinon.stub(upgradeLogService, 'get').resolves();
      await utils.interruptPreviousUpgrade();
    });

    it('should catch get errors', async () => {
      sinon.stub(upgradeLogService, 'get').rejects('boom');
      await utils.interruptPreviousUpgrade();
    });

    it('should catch update errors', async () => {
      sinon.stub(upgradeLogService, 'get').resolves({ _id: 'upgrade_log' });
      sinon.stub(upgradeLogService, 'setInterrupted').rejects('something');

      await utils.interruptPreviousUpgrade();

      expect(upgradeLogService.get.callCount).to.equal(1);
      expect(upgradeLogService.setInterrupted.callCount).to.equal(1);
    });

    it('should not change state if action is stage and views are indexed', async () => {
      sinon.stub(upgradeLogService, 'get').resolves({
        _id: 'upgrade_log',
        action: 'stage',
        state: 'indexed',
      });

      await utils.interruptPreviousUpgrade();

      expect(upgradeLogService.get.callCount).to.equal(1);
    });

    it('should not change state if stage is completing', async () => {
      sinon.stub(upgradeLogService, 'get').resolves({
        _id: 'upgrade_log',
        state: 'completing',
      });

      await utils.interruptPreviousUpgrade();

      expect(upgradeLogService.get.callCount).to.equal(1);
    });
  });

  describe('getUpgradeServicePayload', () => {
    it('should return correctly formatted payload', () => {
      const file1 = Buffer.from('file1').toString('base64');
      const file2 = Buffer.from('file2').toString('base64');
      const stagingDoc = {
        version: '4.0.0',
        _attachments: {
          '_design/medic': { data: 'a' },
          '_design/thing': { data: 'b' },
          'docker-compose/file1.yml': { data: file1 },
          'docker-compose/file2.yml': { data: file2 },
        },
        tags: [
          {
            container_name: 'cht-api',
            image: 'registry/cht-api:4.0.0',
          },
          {
            container_name: 'cht-sentinel',
            image: 'registry/cht-sentinel:4.0.0',
          }
        ],
      };

      expect(utils.getUpgradeServicePayload(stagingDoc)).to.deep.equal({
        containers: [
          {
            container_name: 'cht-api',
            image_tag: 'registry/cht-api:4.0.0',
          },
          {
            container_name: 'cht-sentinel',
            image_tag: 'registry/cht-sentinel:4.0.0',
          }
        ],
        docker_compose: {
          'file1.yml': 'file1',
          'file2.yml': 'file2',
        },
      });
    });

    it('should throw errors when staging doc is malformed', () => {
      const stagingDoc = {
        version: '4.0.0',
        _attachments: 'not an object'
      };

      expect(utils.getUpgradeServicePayload.bind({}, stagingDoc)).to.throw;
    });

    it('should work with no attachments', () => {
      const stagingDoc = {
        version: '4.0.0',
        _attachments: {},
        tags: []
      };

      expect(utils.getUpgradeServicePayload(stagingDoc)).to.deep.equal({
        containers: [],
        docker_compose: {},
      });
    });
  });

  describe('makeUpgradeRequest', () => {
    it('should call default upgrade service url', async () => {
      const payload = { docker_compose: { 'doc.yml': 'payload' }, containers: [] };
      const response = { 'doc.yml': { ok: true } };
      sinon.stub(request, 'post').resolves({ 'doc.yml': { ok: true } });

      expect(await utils.makeUpgradeRequest(payload)).to.deep.equal(response);
      expect(request.post.callCount).to.equal(1);
      expect(request.post.args[0]).to.deep.equal([{
        url: 'http://localhost:5008/upgrade',
        json: true,
        body: payload,
      }]);
    });

    it('should call env upgrade service url', async () => {
      const payload = { containers: [], docker_compose: { 'doc.yml': 'payload' } };
      const response = { 'doc.yml': { ok: true } };
      sinon.stub(request, 'post').resolves(response);
      process.env.UPGRADE_SERVICE_URL = 'http://someurl';
      utils = rewire('../../../../src/services/setup/utils');

      expect(await utils.makeUpgradeRequest(payload)).to.deep.equal(response);
      expect(request.post.callCount).to.equal(1);
      expect(request.post.args[0]).to.deep.equal([{
        url: 'http://someurl/upgrade',
        json: true,
        body: payload,
      }]);
    });

    it('should throw invalid url error', async () => {
      const payload = { containers: [], docker_compose: {} };
      sinon.stub(request, 'post').resolves({});
      process.env.UPGRADE_SERVICE_URL = 'whatever';
      utils = rewire('../../../../src/services/setup/utils');

      await expect(utils.makeUpgradeRequest(payload))
        .to.be.rejectedWith('Invalid UPGRADE_SERVICE_URL: whatever');
    });

    it('should throw request errors', async () => {
      const payload = { containers: [], 'docker-compose': {} };
      sinon.stub(request, 'post').rejects(new Error('boom'));

      await expect(utils.makeUpgradeRequest(payload)).to.be.rejectedWith('boom');
    });

    it('should throw error when response is invalid', async () => {
      const payload = { docker_compose: { 'doc.yml': 'payload' }, containers: {} };
      sinon.stub(request, 'post').resolves();

      await expect(utils.makeUpgradeRequest(payload)).to.be.rejectedWith('No containers were updated');
    });

    it('should throw error when no docker-compose files were updated', async () => {
      const payload = { docker_compose: { 'doc1.yml': 'payload', 'doc2.yml': 'payload' }, containers: [] };
      sinon.stub(request, 'post').resolves({
        'doc1.yml': { ok: false },
        'doc2.yml': { ok: false },
      });

      await expect(utils.makeUpgradeRequest(payload)).to.be.rejectedWith('No containers were updated');
    });

    it('should throw error when no containers were upgraded', async () => {
      const payload = {
        docker_compose: { 'd1.yml': 'p', 'd2.yml': 'p' },
        containers: [{ container_name: 'a' }, { container_name: 'b' }]
      };
      sinon.stub(request, 'post').resolves({
        'a': { ok: false },
        'b': { ok: false },
      });

      await expect(utils.makeUpgradeRequest(payload)).to.be.rejectedWith('No containers were updated');
    });
  });

  describe('upgradeResponseSuccess', () => {
    it('should return false when response is falsy', () => {
      expect(utils.__get__('upgradeResponseSuccess')({}, false)).to.equal(false);
    });

    it('should return false when there are no successful docker-compose file upgrades', () => {
      const payload = { docker_compose: { a: 'a', b: 'b', c: 'c' }, containers: [] };
      const response = { a: { ok: false }, b: { ok: false }, c: { ok: false } };
      expect(utils.__get__('upgradeResponseSuccess')(payload, response)).to.equal(false);
    });

    it('should return false when there are no successful k8s container upgrades', () => {
      const payload = {
        docker_compose: { a: 'a', b: 'b', c: 'c' },
        containers: [{ container_name: 'c1', image: 'a' }, { container_name: 'c2', image: 'b' }]
      };
      const response = { c1: { ok: false }, c2: { ok: false } };
      expect(utils.__get__('upgradeResponseSuccess')(payload, response)).to.equal(false);
    });

    it('should return true when there is at least one successful docker-compose file upgrade', () => {
      const payload = { docker_compose: { a: 'a', b: 'b', c: 'c' }, containers: [] };
      const response = { a: { ok: true }, b: { ok: false }, c: { ok: false } };
      expect(utils.__get__('upgradeResponseSuccess')(payload, response)).to.equal(true);
    });

    it('should return true when there is at least one successful container upgrade', () => {
      const payload = { docker_compose: { a: 'a' }, containers: [{ container_name: 'aa' }, { container_name: 'bb' }] };
      const response = { aa: { ok: true }, bb: { ok: false } };
      expect(utils.__get__('upgradeResponseSuccess')(payload, response)).to.equal(true);
    });
  });
});
