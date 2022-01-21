const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');
const fs = require('fs');
const rpn = require('request-promise-native');

const db = require('../../../../src/db');
const upgradeLogService = require('../../../../src/services/setup/upgrade-log');
const env = require('../../../../src/environment');

let utils;
let clock;

const mockDb = (db) => {
  sinon.stub(db, 'allDocs');
  sinon.stub(db, 'bulkDocs');
  sinon.stub(db, 'compact');
  sinon.stub(db, 'viewCleanup');
};

'use strict';

describe('Setup utils', () => {
  beforeEach(() => {
    sinon.stub(env, 'db').value('thedb');
    clock = sinon.useFakeTimers();

    utils = rewire('../../../../src/services/setup/utils');
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe('DATABASES', () => {
    it('should export correct databases', () => {
      expect(utils.DATABASES).to.deep.equal([
        {
          name: 'thedb',
          db: db.medic,
          jsonFileName: 'medic.json',
        },
        {
          name: 'thedb-sentinel',
          db: db.sentinel,
          jsonFileName: 'sentinel.json',
        },
        {
          name: 'thedb-logs',
          db: db.medicLogs,
          jsonFileName: 'logs.json',
        },
        {
          name: 'thedb-users-meta',
          db: db.medicUsersMeta,
          jsonFileName: 'users-meta.json',
        }
      ]);
    });
  });

  describe('saveDocs', () => {
    it('should save all docs and return results', async () => {
      const docs = [{ _id: 1 }, { _id: 2 }, { _id: 3 }];
      sinon.stub(db.medicLogs, 'bulkDocs').resolves([{ id: 1, ok: true }, { id: 2, ok: true }, { id: 3, ok: true }]);

      const result = await utils.__get__('saveDocs')({ db: db.medicLogs }, docs);

      expect(result).to.deep.equal([{ id: 1, ok: true }, { id: 2, ok: true }, { id: 3, ok: true }]);
      expect(db.medicLogs.bulkDocs.callCount).to.equal(1);
      expect(db.medicLogs.bulkDocs.args[0]).to.deep.equal([docs]);
    });

    it('should do nothing if passed an empty array', async () => {
      sinon.stub(db.medic, 'bulkDocs');
      const result = await utils.__get__('saveDocs')({ db: db.medic }, []);

      expect(result).to.deep.equal([]);

      expect(db.medic.bulkDocs.callCount).to.equal(0);
    });

    it('should throw errors if saving any doc fails', async () => {
      const docs = [{ _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }];
      sinon.stub(db.medicLogs, 'bulkDocs').resolves([
        { id: 1, error: 'conflict' },
        { id: 2, ok: true },
        { id: 3, error: 'unauthorized' },
        { id: 4, ok: true },
      ]);

      try {
        await utils.__get__('saveDocs')({ db: db.medicLogs }, docs);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal(
          'Error while saving docs: saving 1 failed with conflict, saving 3 failed with unauthorized'
        );
        expect(db.medicLogs.bulkDocs.callCount).to.equal(1);
        expect(db.medicLogs.bulkDocs.args[0]).to.deep.equal([docs]);
      }
    });

    it('should throw an error if bulkDocs call fails', async () => {
      const docs = [{ _id: 1 }, { _id: 2 }, { _id: 3 }];
      sinon.stub(db.medic, 'bulkDocs').rejects({ some: 'err' });

      try {
        await utils.__get__('saveDocs')({ db: db.medic }, docs);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'err' });
      }
    });
  });

  describe('deleteDocs', () => {
    it('should do nothing if passed an empty array', async () => {
      utils.__set__('saveDocs', sinon.stub());
      const result = await utils.__get__('deleteDocs')({ db: db.sentinel }, []);

      expect(result).to.deep.equal([]);

      expect(utils.__get__('saveDocs').callCount).to.equal(0);
    });

    it('should save docs ', async () => {
      utils.__set__('saveDocs', sinon.stub().resolves([{ id: 3, ok: true }]));
      const docs = [
        { _id: 1, _rev: 1, field: 3 },
        { _id: 2, _rev: 1, type: 'data_record' },
        { _id: 3, _rev: 1, contact: { _id: 'person' } },
      ];

      const result = await utils.__get__('deleteDocs')({ db: db.medicLogs }, docs);

      expect(result).to.deep.equal([{ id: 3, ok: true }]);
      expect(utils.__get__('saveDocs').callCount).to.equal(1);
      expect(utils.__get__('saveDocs').args[0]).to.deep.equal([
        { db: db.medicLogs },
        [
          { _id: 1, _rev: 1, field: 3, _deleted: true },
          { _id: 2, _rev: 1, type: 'data_record', _deleted: true },
          { _id: 3, _rev: 1, contact: { _id: 'person' }, _deleted: true },
        ]
      ]);
    });

    it('should throw save docs errors', async () => {
      utils.__set__('saveDocs', sinon.stub().rejects({ some: 'error' }));
      try {
        await utils.__get__('deleteDocs')({ db: db.medicLogs }, [{ _id: 1 }]);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'error' });
        expect(utils.__get__('saveDocs').callCount).to.equal(1);
      }
    });
  });

  describe('getStagedDdocs', () => {
    it('should currently staged ddocs', async () => {
      sinon.stub(db.medicLogs, 'allDocs').resolves({
        rows: [
          { doc: { _id: '_design/:staged:one', _rev: '1' } },
          { doc: { _id: '_design/:staged:two', _rev: '2' } },
          { doc: { _id: '_design/:staged:three', _rev: '3' } },
        ],
      });

      const result = await utils.__get__('getStagedDdocs')({ db: db.medicLogs });

      expect(db.medicLogs.allDocs.callCount).to.equal(1);
      expect(db.medicLogs.allDocs.args[0]).to.deep.equal([{
        startkey: '_design/:staged:',
        endkey: '_design/:staged:\ufff0',
        include_docs: true,
      }]);
      expect(result).to.deep.equal([
        { _id: '_design/:staged:one', _rev: '1' },
        { _id: '_design/:staged:two', _rev: '2' },
        { _id: '_design/:staged:three', _rev: '3' },
      ]);
    });

    it('should throw allDocs errors', async () => {
      sinon.stub(db.sentinel, 'allDocs').rejects({ this: 'error' });

      try {
        await utils.__get__('getStagedDdocs')({ db: db.sentinel });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ this: 'error' });
        expect(db.sentinel.allDocs.callCount).to.equal(1);
      }
    });
  });

  describe('deleteStagedDdocs', () => {
    beforeEach(() => {
      utils.__set__('getStagedDdocs', sinon.stub());
      utils.__set__('deleteDocs', sinon.stub());
    });

    it('should delete staged ddocs for every database', async () => {
      utils.__get__('getStagedDdocs').withArgs(utils.DATABASES[0]).resolves(['one']);
      utils.__get__('getStagedDdocs').withArgs(utils.DATABASES[1]).resolves(['two']);
      utils.__get__('getStagedDdocs').withArgs(utils.DATABASES[2]).resolves(['three']);
      utils.__get__('getStagedDdocs').withArgs(utils.DATABASES[3]).resolves(['four']);

      utils.__get__('deleteDocs').resolves();

      await utils.__get__('deleteStagedDdocs')();

      expect(utils.__get__('getStagedDdocs').callCount).to.equal(4);
      expect(utils.__get__('getStagedDdocs').args).to.deep.equal([
        [utils.DATABASES[0]],
        [utils.DATABASES[1]],
        [utils.DATABASES[2]],
        [utils.DATABASES[3]],
      ]);
      expect(utils.__get__('deleteDocs').callCount).to.equal(4);
      expect(utils.__get__('deleteDocs').args).to.deep.equal([
        [utils.DATABASES[0], ['one']],
        [utils.DATABASES[1], ['two']],
        [utils.DATABASES[2], ['three']],
        [utils.DATABASES[3], ['four']],
      ]);
    });

    it('should throw getStagedDdocs errors', async () => {
      utils.__get__('getStagedDdocs').withArgs(utils.DATABASES[0]).resolves(['one']);
      utils.__get__('getStagedDdocs').withArgs(utils.DATABASES[1]).resolves(['two']);
      utils.__get__('getStagedDdocs').withArgs(utils.DATABASES[2]).rejects({ some: 'error' });

      utils.__get__('deleteDocs').resolves();

      try {
        await utils.__get__('deleteStagedDdocs')();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'error' });
        expect(utils.__get__('getStagedDdocs').callCount).to.equal(3);
        expect(utils.__get__('getStagedDdocs').args).to.deep.equal([
          [utils.DATABASES[0]],
          [utils.DATABASES[1]],
          [utils.DATABASES[2]],
        ]);
        expect(utils.__get__('deleteDocs').callCount).to.equal(2);
        expect(utils.__get__('deleteDocs').args).to.deep.equal([
          [utils.DATABASES[0], ['one']],
          [utils.DATABASES[1], ['two']],
        ]);
      }
    });

    it('should throw deleteDocs errors', async () => {
      utils.__get__('getStagedDdocs').withArgs(utils.DATABASES[0]).resolves(['one']);
      utils.__get__('getStagedDdocs').withArgs(utils.DATABASES[1]).resolves(['two']);
      utils.__get__('getStagedDdocs').withArgs(utils.DATABASES[2]).resolves(['three']);
      utils.__get__('getStagedDdocs').withArgs(utils.DATABASES[3]).resolves(['four']);

      utils.__get__('deleteDocs').resolves();
      utils.__get__('deleteDocs').withArgs(utils.DATABASES[1]).rejects({ an: 'err' });

      try {
        await utils.__get__('deleteStagedDdocs')();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'err' });
        expect(utils.__get__('getStagedDdocs').callCount).to.equal(2);
        expect(utils.__get__('getStagedDdocs').args).to.deep.equal([
          [utils.DATABASES[0]],
          [utils.DATABASES[1]],
        ]);
        expect(utils.__get__('deleteDocs').callCount).to.equal(2);
        expect(utils.__get__('deleteDocs').args).to.deep.equal([
          [utils.DATABASES[0], ['one']],
          [utils.DATABASES[1], ['two']],
        ]);
      }
    });
  });

  describe('cleanup', () => {
    it('should start db compact and view cleanup for every database', () => {
      mockDb(db.medic);
      mockDb(db.sentinel);
      mockDb(db.medicLogs);
      mockDb(db.medicUsersMeta);
      sinon.stub(fs.promises, 'access').resolves();

      utils.cleanup();

      expect(db.medic.compact.callCount).to.equal(1);
      expect(db.sentinel.compact.callCount).to.equal(1);
      expect(db.medicLogs.compact.callCount).to.equal(1);
      expect(db.medicUsersMeta.compact.callCount).to.equal(1);

      expect(db.medic.viewCleanup.callCount).to.equal(1);
      expect(db.sentinel.viewCleanup.callCount).to.equal(1);
      expect(db.medicLogs.viewCleanup.callCount).to.equal(1);
      expect(db.medicUsersMeta.viewCleanup.callCount).to.equal(1);
    });

    it('should catch errors', async () => {
      mockDb(db.medic);
      mockDb(db.sentinel);
      mockDb(db.medicLogs);
      mockDb(db.medicUsersMeta);

      db.sentinel.compact.rejects({ some: 'error' });
      utils.cleanup();

      await Promise.resolve();
    });
  });

  describe('getDdocs', () => {
    it('should return ddocs', async () => {
      sinon.stub(db.sentinel, 'allDocs').resolves({ rows: [
        { id: 'ddoc1', key: 'ddoc1', value: { rev: 'rev1' }, doc: { _id: 'ddoc1', _rev: 'rev1', field: 'a' }  },
        { id: 'ddoc2', key: 'ddoc2', value: { rev: 'rev2' }, doc: { _id: 'ddoc2', _rev: 'rev2', field: 'b' }, },
      ] });

      const result = await utils.getDdocs({ db: db.sentinel });

      expect(result).to.deep.equal([
        { _id: 'ddoc1', _rev: 'rev1', field: 'a' },
        { _id: 'ddoc2', _rev: 'rev2', field: 'b' },
      ]);
      expect(db.sentinel.allDocs.callCount).to.equal(1);
      expect(db.sentinel.allDocs.args[0]).to.deep.equal([{
        startkey: '_design/', endkey: `_design/\ufff0`, include_docs: true,
      }]);
    });

    it('should throw error on allDocs error', async () => {
      sinon.stub(db.medicLogs, 'allDocs').rejects({ the: 'err' });

      try {
        await utils.getDdocs({ db: db.medicLogs });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ the: 'err' });
      }
    });
  });

  describe('indexView', () => {
    it('should query the view with a timeout', async () => {
      sinon.stub(rpn, 'get').resolves();
      sinon.stub(env, 'serverUrl').value('http://localhost');

      await utils.__get__('indexView')('medic', '_design/:staged:medic', 'contacts');

      expect(rpn.get.callCount).to.equal(1);
      expect(rpn.get.args[0]).to.deep.equal([{
        uri: 'http://localhost/medic/_design/:staged:medic/_view/contacts',
        json: true,
        qs: { limit: 1 },
        timeout: 2000,
      }]);
    });

    it('should retry if the error is a timeout error', async () => {
      sinon.stub(env, 'serverUrl').value('http://localhost');
      sinon.stub(rpn, 'get').rejects({ error: { code: 'ESOCKETTIMEDOUT' } });
      rpn.get.onCall(20).resolves();

      await utils.__get__('indexView')('other', '_design/mydesign', 'viewname');

      expect(rpn.get.callCount).to.equal(21);
      const params = {
        uri: 'http://localhost/other/_design/mydesign/_view/viewname',
        json: true,
        qs: { limit: 1 },
        timeout: 2000,
      };
      expect(rpn.get.args).to.deep.equal(Array.from({ length: 21 }).map(() => [params]));
    });

    it('should terminate when other errors are thrown', async () => {
      sinon.stub(env, 'serverUrl').value('http://localhost');
      sinon.stub(rpn, 'get').rejects({ error: { code: 'ESOCKETTIMEDOUT' } });
      rpn.get.onCall(10).rejects({ name: 'error' });

      try {
        await utils.__get__('indexView')('other', '_design/mydesign', 'viewname');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ name: 'error' });
        expect(rpn.get.callCount).to.equal(11);
      }
    });
  });

  describe('getViewsToIndex', () => {
    it('should return an array of function that will start view indexing', async () => {
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { doc: { _id: '_design/:staged:one', views: { view1: {}, view2: {}, view3: {}} } },
          { doc: { _id: '_design/:staged:three', views: { view4: {} }} },
        ]
      });
      sinon.stub(db.sentinel, 'allDocs').resolves({ rows: [] });
      sinon.stub(db.medicLogs, 'allDocs').resolves({ rows: [{ doc: { _id: '_design/:staged:two' } }] });
      sinon.stub(db.medicUsersMeta, 'allDocs').resolves({
        rows: [
          { doc: { _id: '_design/:staged:four', views: { view: {} }} },
        ],
      });

      sinon.stub(rpn, 'get').resolves();
      sinon.stub(env, 'serverUrl').value('http://localhost');

      const result = await utils.getViewsToIndex();

      expect(result.length).to.equal(5);
      result.forEach(item => expect(item).to.be.a('function'));

      expect(rpn.get.callCount).to.equal(0);

      await Promise.all(result.map(item => item()));

      expect(rpn.get.callCount).to.equal(5);
      expect(rpn.get.args).to.deep.equal([
        [{
          uri: 'http://localhost/thedb/_design/:staged:one/_view/view1',
          json: true,
          qs: { limit: 1 },
          timeout: 2000,
        }],
        [{
          uri: 'http://localhost/thedb/_design/:staged:one/_view/view2',
          json: true,
          qs: { limit: 1 },
          timeout: 2000,
        }],
        [{
          uri: 'http://localhost/thedb/_design/:staged:one/_view/view3',
          json: true,
          qs: { limit: 1 },
          timeout: 2000,
        }],
        [{
          uri: 'http://localhost/thedb/_design/:staged:three/_view/view4',
          json: true,
          qs: { limit: 1 },
          timeout: 2000,
        }],
        [{
          uri: 'http://localhost/thedb-users-meta/_design/:staged:four/_view/view',
          json: true,
          qs: { limit: 1 },
          timeout: 2000,
        }],
      ]);
    });
  });

  describe('createUpgradeFolder', () => {
    it('should create the staging ddocs folder when it does not exist', async () => {
      sinon.stub(fs.promises, 'access').rejects({ code: 'ENOENT' });
      sinon.stub(fs.promises, 'rmdir');
      sinon.stub(fs.promises, 'mkdir').resolves();
      sinon.stub(env, 'upgradePath').value('upgradePath');

      await utils.createUpgradeFolder();

      expect(fs.promises.access.callCount).to.equal(1);
      expect(fs.promises.access.args[0]).to.deep.equal(['upgradePath']);
      expect(fs.promises.rmdir.callCount).to.equal(0);
      expect(fs.promises.mkdir.callCount).to.equal(1);
      expect(fs.promises.mkdir.args[0]).to.deep.equal(['upgradePath']);
    });

    it('should delete existing folder recursively, create new folder, aborting previous upgrade', async () => {
      sinon.stub(fs.promises, 'access').resolves();
      sinon.stub(fs.promises, 'readdir').resolves(['one', 'two']);
      sinon.stub(fs.promises, 'unlink').resolves();
      sinon.stub(fs.promises, 'rmdir').resolves();
      sinon.stub(fs.promises, 'mkdir').resolves();
      sinon.stub(env, 'upgradePath').value('upgradePath');
      sinon.stub(upgradeLogService, 'setAborted').resolves();

      await utils.createUpgradeFolder();

      expect(fs.promises.access.callCount).to.equal(1);
      expect(fs.promises.access.args[0]).to.deep.equal(['upgradePath']);
      expect(upgradeLogService.setAborted.callCount).to.equal(1);
      expect(fs.promises.readdir.callCount).to.equal(1);
      expect(fs.promises.readdir.args[0]).to.deep.equal(['upgradePath']);
      expect(fs.promises.unlink.callCount).to.equal(2);
      expect(fs.promises.unlink.args[0]).to.deep.equal(['upgradePath/one']);
      expect(fs.promises.unlink.args[1]).to.deep.equal(['upgradePath/two']);
      expect(fs.promises.rmdir.callCount).to.equal(1);
      expect(fs.promises.rmdir.args[0]).to.deep.equal(['upgradePath']);
      expect(fs.promises.mkdir.callCount).to.equal(1);
      expect(fs.promises.mkdir.args[0]).to.deep.equal(['upgradePath']);
    });

    it('should catch abort upgrade errors', async () => {
      sinon.stub(fs.promises, 'access').resolves();
      sinon.stub(fs.promises, 'readdir').resolves([]);
      sinon.stub(fs.promises, 'rmdir').resolves();
      sinon.stub(fs.promises, 'mkdir').resolves();
      sinon.stub(env, 'upgradePath').value('upgradePath');
      sinon.stub(upgradeLogService, 'setAborted').rejects();

      await utils.createUpgradeFolder(true);

      expect(fs.promises.access.callCount).to.equal(1);
      expect(fs.promises.access.args[0]).to.deep.equal(['upgradePath']);
      expect(upgradeLogService.setAborted.callCount).to.equal(1);
      expect(fs.promises.readdir.callCount).to.equal(1);
      expect(fs.promises.readdir.args[0]).to.deep.equal(['upgradePath']);
      expect(fs.promises.rmdir.callCount).to.equal(1);
      expect(fs.promises.rmdir.args[0]).to.deep.equal(['upgradePath']);
      expect(fs.promises.mkdir.callCount).to.equal(1);
      expect(fs.promises.mkdir.args[0]).to.deep.equal(['upgradePath']);
    });

    it('should throw an error when access throws random errors', async () => {
      sinon.stub(fs.promises, 'access').rejects({ code: 'error' });
      sinon.stub(fs.promises, 'rmdir');
      sinon.stub(fs.promises, 'mkdir');
      sinon.stub(env, 'upgradePath').value('upgradePath');

      try {
        await utils.createUpgradeFolder();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ code: 'error' });

        expect(fs.promises.access.callCount).to.equal(1);
        expect(fs.promises.access.args[0]).to.deep.equal(['upgradePath']);
        expect(fs.promises.rmdir.callCount).to.equal(0);
        expect(fs.promises.mkdir.callCount).to.equal(0);
      }
    });

    it('should throw an error when deletion throws an error', async () => {
      sinon.stub(fs.promises, 'access').resolves();
      sinon.stub(upgradeLogService, 'setAborted').resolves();
      sinon.stub(fs.promises, 'readdir').resolves([]);
      sinon.stub(fs.promises, 'rmdir').rejects({ code: 'some code' });
      sinon.stub(fs.promises, 'mkdir');
      sinon.stub(env, 'upgradePath').value('upgradePath');

      try {
        await utils.createUpgradeFolder();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ code: 'some code' });

        expect(fs.promises.access.callCount).to.equal(1);
        expect(fs.promises.access.args[0]).to.deep.equal(['upgradePath']);
        expect(fs.promises.rmdir.callCount).to.equal(1);
        expect(fs.promises.rmdir.args[0]).to.deep.equal(['upgradePath']);
        expect(fs.promises.mkdir.callCount).to.equal(0);
      }
    });

    it('should throw an error if read thrown an error', async () => {
      sinon.stub(fs.promises, 'access').resolves();
      sinon.stub(upgradeLogService, 'setAborted').resolves();
      sinon.stub(fs.promises, 'readdir').rejects({ code: 'some code' });
      sinon.stub(fs.promises, 'rmdir');
      sinon.stub(fs.promises, 'mkdir');
      sinon.stub(env, 'upgradePath').value('upgradePath');

      try {
        await utils.createUpgradeFolder();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ code: 'some code' });

        expect(fs.promises.access.callCount).to.equal(1);
        expect(fs.promises.access.args[0]).to.deep.equal(['upgradePath']);
        expect(fs.promises.readdir.callCount).to.equal(1);
        expect(fs.promises.readdir.args[0]).to.deep.equal(['upgradePath']);
        expect(fs.promises.rmdir.callCount).to.equal(0);
        expect(fs.promises.mkdir.callCount).to.equal(0);
      }
    });

    it('should throw an error when creation fails', async () => {
      sinon.stub(fs.promises, 'access').rejects({ code: 'ENOENT' });
      sinon.stub(fs.promises, 'readdir').resolves([]);
      sinon.stub(fs.promises, 'rmdir');
      sinon.stub(fs.promises, 'mkdir').rejects({ some: 'error' });
      sinon.stub(env, 'upgradePath').value('upgradePath');

      try {
        await utils.createUpgradeFolder();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'error' });
      }
    });
  });

  describe('downloadDdocDefinitions', () => {
    beforeEach(() => {
      sinon.stub(fs.promises, 'writeFile');
      sinon.stub(db.builds, 'get');
      sinon.stub(env, 'upgradePath').value('upgradePath');
    });

    it('should create staging folder, download and save ddoc definitions', async () => {
      fs.promises.writeFile.resolves();
      const version = 'version_number';
      db.builds.get.resolves({
        build_info: { },
        version: version,
        _attachments: {
          'ddocs/medic.json': { data: 'medicdata' },
          'ddocs/logs.json': { data: 'logsdata' },
          'ddocs/sentinel.json': { data: 'sentineldata' },
          'ddocs/users-meta.json': { data: 'usersmetadata' },
        },
      });

      await utils.downloadDdocDefinitions(version);

      expect(db.builds.get.callCount).to.equal(1);
      expect(db.builds.get.args[0]).to.deep.equal([`medic:medic:${version}`, { attachments: true }]);
      expect(fs.promises.writeFile.callCount).to.equal(4);
      expect(fs.promises.writeFile.args).to.deep.equal([
        ['upgradePath/medic.json', 'medicdata', 'base64'],
        ['upgradePath/sentinel.json', 'sentineldata', 'base64'],
        ['upgradePath/logs.json', 'logsdata', 'base64'],
        ['upgradePath/users-meta.json', 'usersmetadata', 'base64'],
      ]);
    });

    it('should skip ddocs for new dbs', async () => {
      fs.promises.writeFile.resolves();
      const version = 'version_number';
      db.builds.get.resolves({
        build_info: { },
        version: version,
        _attachments: {
          'ddocs/medic.json': { data: 'medicdata' },
          'ddocs/logs.json': { data: 'logsdata' },
          'ddocs/sentinel.json': { data: 'sentineldata' },
          'ddocs/users-meta.json': { data: 'usersmetadata' },
          'ddocs/newdb.json': { data: 'newdbdata' },
        },
      });

      await utils.downloadDdocDefinitions(version);

      expect(db.builds.get.callCount).to.equal(1);
      expect(db.builds.get.args[0]).to.deep.equal([`medic:medic:${version}`, { attachments: true }]);
      expect(fs.promises.writeFile.callCount).to.equal(4);
      expect(fs.promises.writeFile.args).to.deep.equal([
        ['upgradePath/medic.json', 'medicdata', 'base64'],
        ['upgradePath/sentinel.json', 'sentineldata', 'base64'],
        ['upgradePath/logs.json', 'logsdata', 'base64'],
        ['upgradePath/users-meta.json', 'usersmetadata', 'base64'],
      ]);
    });

    it('should handle missing dbs', async () => {
      fs.promises.writeFile.resolves();
      const version = 'version_number';
      db.builds.get.resolves({
        build_info: { },
        version: version,
        _attachments: {
          'ddocs/medic.json': { data: 'medicdata' },
          'ddocs/logs.json': { data: 'logsdata' },
        },
      });

      await utils.downloadDdocDefinitions(version);

      expect(fs.promises.writeFile.callCount).to.equal(2);
      expect(fs.promises.writeFile.args).to.deep.equal([
        ['upgradePath/medic.json', 'medicdata', 'base64'],
        ['upgradePath/logs.json', 'logsdata', 'base64'],
      ]);
    });

    it('should throw error when staging doc not found', async () => {
      db.builds.get.rejects({ error: 'boom' });

      try {
        await utils.downloadDdocDefinitions('vers');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ error: 'boom' });
      }

      expect(db.builds.get.callCount).to.equal(1);
      expect(db.builds.get.args[0]).to.deep.equal([`medic:medic:vers`, { attachments: true }]);
      expect(fs.promises.writeFile.callCount).to.equal(0);
    });

    it('should throw an error when staging doc has no attachments', async () => {
      fs.promises.writeFile.resolves();
      const version = '4.0.0';
      db.builds.get.resolves({
        build_info: { },
        version: version,
      });

      try {
        await utils.downloadDdocDefinitions(version);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Staging ddoc is missing attachments');
      }

      expect(db.builds.get.callCount).to.equal(1);
      expect(db.builds.get.args[0]).to.deep.equal([`medic:medic:4.0.0`, { attachments: true }]);
      expect(fs.promises.writeFile.callCount).to.equal(0);
    });

    it('should throw an error when saving ddoc files fails', async () => {
      fs.promises.writeFile.rejects({ error: 'omg' });
      const version = 'theversion';
      db.builds.get.resolves({
        build_info: { },
        version: version,
        _attachments: {
          'ddocs/medic.json': { data: 'medicdata' },
          'ddocs/logs.json': { data: 'logsdata' },
          'ddocs/sentinel.json': { data: 'sentineldata' },
          'ddocs/users-meta.json': { data: 'usersmetadata' },
          'ddocs/newdb.json': { data: 'newdbdata' },
        },
      });

      try {
        await utils.downloadDdocDefinitions(version);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ error: 'omg' });
      }

      expect(db.builds.get.callCount).to.equal(1);
      expect(db.builds.get.args[0]).to.deep.equal([`medic:medic:${version}`, { attachments: true }]);
      expect(fs.promises.writeFile.callCount).to.equal(1);
      expect(fs.promises.writeFile.args).to.deep.equal([
        ['upgradePath/medic.json', 'medicdata', 'base64'],
      ]);
    });
  });

  describe('saveStagedDdocs', () => {
    it('should stage ddocs for every db for packaged version', async () => {
      sinon.stub(fs.promises, 'readFile');
      sinon.stub(env, 'ddocsPath').value('localDdocs');
      const deployInfo = { user: 'usr', upgrade_log_id: 'theid' };
      Object.freeze(deployInfo);
      sinon.stub(upgradeLogService, 'getDeployInfo').resolves(deployInfo);
      const medicDdocs = {
        docs: [
          { _id: '_design/medic', views: { medic1: {}, medic2: {} } },
          { _id: '_design/medic-client', views: { client1: {}, client2: {} } },
        ],
      };
      const sentinelDdocs = { docs: [{ _id: '_design/sentinel', views: { sentinel: {} } }] };
      const logsDdocs = { docs: [{ _id: '_design/logs', views: { logs1: {}, logs2: {} } }] };
      const usersMetaDdocs = {
        docs: [
          { _id: '_design/meta1', views: { usersmeta1: {} } },
          { _id: '_design/meta2', views: { usersmeta2: {} } },
        ]
      };

      fs.promises.readFile.withArgs('localDdocs/medic.json').resolves(JSON.stringify(medicDdocs));
      fs.promises.readFile.withArgs('localDdocs/sentinel.json').resolves(JSON.stringify(sentinelDdocs));
      fs.promises.readFile.withArgs('localDdocs/logs.json').resolves(JSON.stringify(logsDdocs));
      fs.promises.readFile.withArgs('localDdocs/users-meta.json').resolves(JSON.stringify(usersMetaDdocs));

      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      sinon.stub(db.sentinel, 'bulkDocs').resolves([]);
      sinon.stub(db.medicLogs, 'bulkDocs').resolves([]);
      sinon.stub(db.medicUsersMeta, 'bulkDocs').resolves([]);

      await utils.saveStagedDdocs('local');

      expect(db.medic.bulkDocs.callCount).to.equal(1);
      expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/:staged:medic', views: { medic1: {}, medic2: {} }, deploy_info: deployInfo },
        { _id: '_design/:staged:medic-client', views: { client1: {}, client2: {} }, deploy_info: deployInfo },
      ]]);
      expect(db.sentinel.bulkDocs.callCount).to.equal(1);
      expect(db.sentinel.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/:staged:sentinel', views: { sentinel: {} }, deploy_info: deployInfo },
      ]]);
      expect(db.medicLogs.bulkDocs.callCount).to.equal(1);
      expect(db.medicLogs.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/:staged:logs', views: { logs1: {}, logs2: {} }, deploy_info: deployInfo }
      ]]);
      expect(db.medicUsersMeta.bulkDocs.callCount).to.equal(1);
      expect(db.medicUsersMeta.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/:staged:meta1', views: { usersmeta1: {} }, deploy_info: deployInfo },
        { _id: '_design/:staged:meta2', views: { usersmeta2: {} }, deploy_info: deployInfo },
      ]]);
      expect(fs.promises.readFile.args).to.deep.equal([
        ['localDdocs/medic.json', 'utf-8'],
        ['localDdocs/sentinel.json', 'utf-8'],
        ['localDdocs/logs.json', 'utf-8'],
        ['localDdocs/users-meta.json', 'utf-8']
      ]);
    });

    it('should stage ddocs for every db for upgrade version', async () => {
      sinon.stub(fs.promises, 'readFile');
      sinon.stub(env, 'upgradePath').value('upgradeDdocs');
      const deployInfo = { user: 'admin', upgrade_log_id: 'theid' };
      Object.freeze(deployInfo);
      sinon.stub(upgradeLogService, 'getDeployInfo').resolves(deployInfo);

      const medicDdocs = {
        docs: [
          { _id: '_design/medic', views: { medic: {} } },
          { _id: '_design/medic-client', views: { clienta: {}, clientb: {} } },
        ],
      };
      const sentinelDdocs = { docs: [{ _id: '_design/sentinel', views: { sentinel: {} } }] };
      const logsDdocs = { docs: [{ _id: '_design/logs', views: { logs: {} } }] };
      const usersMetaDdocs = {
        docs: [
          { _id: '_design/meta1', views: { usersmeta1: {} } },
          { _id: '_design/meta2', views: { usersmeta2: {} } },
        ]
      };

      fs.promises.readFile.withArgs('upgradeDdocs/medic.json').resolves(JSON.stringify(medicDdocs));
      fs.promises.readFile.withArgs('upgradeDdocs/sentinel.json').resolves(JSON.stringify(sentinelDdocs));
      fs.promises.readFile.withArgs('upgradeDdocs/logs.json').resolves(JSON.stringify(logsDdocs));
      fs.promises.readFile.withArgs('upgradeDdocs/users-meta.json').resolves(JSON.stringify(usersMetaDdocs));

      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      sinon.stub(db.sentinel, 'bulkDocs').resolves([]);
      sinon.stub(db.medicLogs, 'bulkDocs').resolves([]);
      sinon.stub(db.medicUsersMeta, 'bulkDocs').resolves([]);

      await utils.saveStagedDdocs('3.14');

      expect(db.medic.bulkDocs.callCount).to.equal(1);
      expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/:staged:medic', views: { medic: {} }, deploy_info: deployInfo },
        { _id: '_design/:staged:medic-client', views: { clienta: {}, clientb: {} }, deploy_info: deployInfo },
      ]]);
      expect(db.sentinel.bulkDocs.callCount).to.equal(1);
      expect(db.sentinel.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/:staged:sentinel', views: { sentinel: {} }, deploy_info: deployInfo }
      ]]);
      expect(db.medicLogs.bulkDocs.callCount).to.equal(1);
      expect(db.medicLogs.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/:staged:logs', views: { logs: {} }, deploy_info: deployInfo }
      ]]);
      expect(db.medicUsersMeta.bulkDocs.callCount).to.equal(1);
      expect(db.medicUsersMeta.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/:staged:meta1', views: { usersmeta1: {} }, deploy_info: deployInfo },
        { _id: '_design/:staged:meta2', views: { usersmeta2: {} }, deploy_info: deployInfo },
      ]]);
      expect(fs.promises.readFile.args).to.deep.equal([
        ['upgradeDdocs/medic.json', 'utf-8'],
        ['upgradeDdocs/sentinel.json', 'utf-8'],
        ['upgradeDdocs/logs.json', 'utf-8'],
        ['upgradeDdocs/users-meta.json', 'utf-8']
      ]);
    });

    it('should work when db has been removed from upgrade', async () => {
      sinon.stub(fs.promises, 'readFile');
      sinon.stub(env, 'upgradePath').value('upgradeDdocs');
      const deployInfo = { user: 'admin', upgrade_log_id: 'anid' };
      Object.freeze(deployInfo);
      sinon.stub(upgradeLogService, 'getDeployInfo').resolves(deployInfo);

      const medicDdocs = {
        docs: [
          { _id: '_design/medic', views: { medic: {} } },
          { _id: '_design/medic-client', views: { clienta: {}, clientb: {} } },
        ],
      };
      const logsDdocs = { docs: [{ _id: '_design/logs', views: { logs: {} } }] };
      const usersMetaDdocs = {
        docs: [
          { _id: '_design/meta1', views: { usersmeta1: {} } },
          { _id: '_design/meta2', views: { usersmeta2: {} } },
        ]
      };

      fs.promises.readFile.withArgs('upgradeDdocs/medic.json').resolves(JSON.stringify(medicDdocs));
      fs.promises.readFile.withArgs('upgradeDdocs/sentinel.json').rejects({ code: 'ENOENT' });
      fs.promises.readFile.withArgs('upgradeDdocs/logs.json').resolves(JSON.stringify(logsDdocs));
      fs.promises.readFile.withArgs('upgradeDdocs/users-meta.json').resolves(JSON.stringify(usersMetaDdocs));

      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      sinon.stub(db.medicLogs, 'bulkDocs').resolves([]);
      sinon.stub(db.medicUsersMeta, 'bulkDocs').resolves([]);

      await utils.saveStagedDdocs('someversion');

      expect(db.medic.bulkDocs.callCount).to.equal(1);
      expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/:staged:medic', views: { medic: {} }, deploy_info: deployInfo },
        { _id: '_design/:staged:medic-client', views: { clienta: {}, clientb: {} }, deploy_info: deployInfo },
      ]]);
      expect(db.medicLogs.bulkDocs.callCount).to.equal(1);
      expect(db.medicLogs.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/:staged:logs', views: { logs: {} }, deploy_info: deployInfo }
      ]]);
      expect(db.medicUsersMeta.bulkDocs.callCount).to.equal(1);
      expect(db.medicUsersMeta.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/:staged:meta1', views: { usersmeta1: {} }, deploy_info: deployInfo },
        { _id: '_design/:staged:meta2', views: { usersmeta2: {} }, deploy_info: deployInfo },
      ]]);
      expect(fs.promises.readFile.args).to.deep.equal([
        ['upgradeDdocs/medic.json', 'utf-8'],
        ['upgradeDdocs/sentinel.json', 'utf-8'],
        ['upgradeDdocs/logs.json', 'utf-8'],
        ['upgradeDdocs/users-meta.json', 'utf-8']
      ]);
    });

    it('should throw error if reading files throws errors', async () => {
      sinon.stub(fs.promises, 'readFile');
      sinon.stub(env, 'upgradePath').value('upgradeDdocs');
      const deployInfo = { user: '', upgrade_log_id: '' };
      Object.freeze(deployInfo);
      sinon.stub(upgradeLogService, 'getDeployInfo').resolves(deployInfo);

      const medicDdocs = {
        docs: [
          { _id: '_design/medic', views: { medic: {} } },
          { _id: '_design/medic-client', views: { client: {} } },
        ],
      };

      fs.promises.readFile.withArgs('upgradeDdocs/medic.json').resolves(JSON.stringify(medicDdocs));
      fs.promises.readFile.withArgs('upgradeDdocs/sentinel.json').rejects({ code: 'someerror' });

      sinon.stub(db.medic, 'bulkDocs').resolves([]);

      try {
        await utils.saveStagedDdocs('a version');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ code: 'someerror' });
      }

      expect(fs.promises.readFile.args).to.deep.equal([
        ['upgradeDdocs/medic.json', 'utf-8'],
        ['upgradeDdocs/sentinel.json', 'utf-8'],
      ]);

      expect(db.medic.bulkDocs.callCount).to.equal(1);
      expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/:staged:medic', views: { medic: {} }, deploy_info: deployInfo },
        { _id: '_design/:staged:medic-client', views: { client: {} }, deploy_info: deployInfo },
      ]]);
    });

    it('should throw error if staging fails', async () => {
      sinon.stub(fs.promises, 'readFile');
      sinon.stub(env, 'upgradePath').value('upgradeDdocs');
      sinon.stub(upgradeLogService, 'getDeployInfo').resolves({});

      const medicDdocs = {
        docs: [
          { _id: '_design/medic', views: { medic: {} } },
          { _id: '_design/medic-client', views: { client: {} } },
        ],
      };
      const sentinelDocs = {
        docs: [{ _id: '_design/sentinel', views: { sentinel: {} } }],
      };
      const logsDocs = {
        docs: [{ _id: '_design/logs', views: { logs: {} } }],
      };

      fs.promises.readFile.withArgs('upgradeDdocs/medic.json').resolves(JSON.stringify(medicDdocs));
      fs.promises.readFile.withArgs('upgradeDdocs/sentinel.json').resolves(JSON.stringify(sentinelDocs));
      fs.promises.readFile.withArgs('upgradeDdocs/logs.json').resolves(JSON.stringify(logsDocs));

      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      sinon.stub(db.sentinel, 'bulkDocs').resolves([]);
      sinon.stub(db.medicLogs, 'bulkDocs').resolves([{ error: 'some error', id: '_design/logs' }]);

      try {
        await utils.saveStagedDdocs('a version');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Error while saving docs: saving _design/logs failed with some error');
      }

      expect(fs.promises.readFile.args).to.deep.equal([
        ['upgradeDdocs/medic.json', 'utf-8'],
        ['upgradeDdocs/sentinel.json', 'utf-8'],
        ['upgradeDdocs/logs.json', 'utf-8'],
      ]);

      expect(db.medic.bulkDocs.callCount).to.equal(1);
      expect(db.sentinel.bulkDocs.callCount).to.equal(1);
      expect(db.medicLogs.bulkDocs.callCount).to.equal(1);
    });
  });

  describe('getPackagedVersion', () => {
    it('should get the version from the packaged medic ddoc', async () => {
      const medicDdoc = {
        _id: '_design/medic',
        version: '4.0.0',
      };
      sinon.stub(env, 'ddoc').value('medic');
      sinon.stub(env, 'ddocsPath').value('ddocsPath');
      sinon.stub(fs.promises, 'readFile').resolves(JSON.stringify({ docs: [medicDdoc] }));

      const version = await utils.getPackagedVersion();

      expect(version).to.equal('4.0.0');
      expect(fs.promises.readFile.callCount).to.equal(1);
      expect(fs.promises.readFile.args[0]).to.deep.equal(['ddocsPath/medic.json', 'utf-8']);
    });

    it('should throw error if json is not found', async () => {
      sinon.stub(env, 'ddocsPath').value('ddocsPath');
      sinon.stub(env, 'ddoc').value('medic');
      sinon.stub(fs.promises, 'readFile').rejects({ code: 'ENOENT' });

      try {
        await utils.getPackagedVersion();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Cannot find medic db ddocs among packaged ddocs.');
      }
    });

    it('should throw error if json is missing medic ddoc', async () => {
      const jsonDdocs = [ { _id: '_design/one' }, { _id: '_design/two' }, { _id: '_design/three' } ];
      sinon.stub(env, 'ddocsPath').value('ddocsPath');
      sinon.stub(env, 'ddoc').value('medic');
      sinon.stub(fs.promises, 'readFile').resolves(JSON.stringify({ docs: jsonDdocs }));

      try {
        await utils.getPackagedVersion();
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

  describe('indexViewsFn', () => {
    it('should call all indexView functions', async () => {
      const viewToIndexFunctions = [
        sinon.stub().resolves('a'),
        sinon.stub().resolves('b'),
        sinon.stub().resolves('c'),
        sinon.stub().resolves('d'),
      ];
      sinon.stub(upgradeLogService, 'setIndexing');
      sinon.stub(upgradeLogService, 'setIndexed');

      const promise = utils.indexViews(viewToIndexFunctions);

      viewToIndexFunctions.forEach(indexFn => expect(indexFn.called).to.equal(false));
      expect(upgradeLogService.setIndexing.callCount).to.equal(1);
      expect(upgradeLogService.setIndexed.callCount).to.equal(0);

      const result = await promise;

      viewToIndexFunctions.forEach(indexFn => {
        expect(indexFn.callCount).to.equal(1);
        expect(indexFn.args[0]).to.deep.equal([]);
      });
      expect(upgradeLogService.setIndexing.callCount).to.equal(1);
      expect(upgradeLogService.setIndexed.callCount).to.equal(1);

      expect(result).to.deep.equal(['a', 'b', 'c', 'd']);
    });

    it('should throw error if indexing fails', async () => {
      const viewToIndexFunctions = [
        sinon.stub().resolves('a'),
        sinon.stub().resolves('b'),
        sinon.stub().rejects({ an: 'error' }),
      ];
      sinon.stub(upgradeLogService, 'setIndexing');
      sinon.stub(upgradeLogService, 'setIndexed');

      try {
        await utils.indexViews(viewToIndexFunctions);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'error' });
      }
    });

    it('should do nothing if passed param is not an array', async () => {
      sinon.stub(upgradeLogService, 'setIndexed');
      await utils.indexViews('something');
      expect(upgradeLogService.setIndexed.callCount).to.equal(1);
    });
  });

  describe('unstageStagedDdocs', () => {
    it('should rename staged ddocs and assign deploy info timestamp', async () => {
      clock.tick(1500);
      const deployInfoNew = { user: 'usr', upgrade_log_id: 'aa' };
      const deployInfoOld = { user: 'old', upgrade_log_id: '11', timestamp: 100 };
      const deployInfoExpected = Object.assign({ timestamp: 1500 }, deployInfoNew);

      sinon.stub(db.medic, 'allDocs').resolves({ rows: [
        { doc: { _id: '_design/:staged:medic', _rev: '1', new: true, deploy_info: deployInfoNew } },
        { doc: { _id: '_design/:staged:medic-client', _rev: '1', new: true, deploy_info: deployInfoNew } },
        { doc: { _id: '_design/medic', _rev: '2', old: true, deploy_info: deployInfoOld } },
        { doc: { _id: '_design/medic-client', _rev: '3', old: true, deploy_info: deployInfoOld } },
      ] }); // all ddocs have match
      sinon.stub(db.sentinel, 'allDocs').resolves({ rows: [
        { doc: { _id: '_design/:staged:sentinel1', _rev: '1', isnew: true, deploy_info: deployInfoNew } },
        { doc: { _id: '_design/sentinel1', _rev: '2', isOld: true, deploy_info: deployInfoOld } },
        { doc: { _id: '_design/extra', _rev: '3', deploy_info: deployInfoOld } },
      ] }); // one extra existent ddoc
      sinon.stub(db.medicLogs, 'allDocs').resolves({ rows: [
        { doc: { _id: '_design/:staged:logs1', _rev: '1', field: 'a', deploy_info: deployInfoNew } },
        { doc: { _id: '_design/:staged:logs2', _rev: '1', deploy_info: deployInfoNew } },
        { doc: { _id: '_design/logs1', _rev: '3', field: 'b', deploy_info: deployInfoOld } },
      ] }); // one extra staged ddoc
      sinon.stub(db.medicUsersMeta, 'allDocs').resolves({ rows: [] }); // no ddocs

      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      sinon.stub(db.sentinel, 'bulkDocs').resolves([]);
      sinon.stub(db.medicLogs, 'bulkDocs').resolves([]);

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

      expect(db.medic.bulkDocs.callCount).to.equal(1);
      expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/medic', _rev: '2', new: true, deploy_info: deployInfoExpected },
        { _id: '_design/medic-client', _rev: '3', new: true, deploy_info: deployInfoExpected },
      ]]);
      expect(db.sentinel.bulkDocs.callCount).to.equal(1);
      expect(db.sentinel.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/sentinel1', _rev: '2', isnew: true, deploy_info: deployInfoExpected },
      ]]);
      expect(db.medicLogs.bulkDocs.callCount).to.equal(1);
      expect(db.medicLogs.bulkDocs.args[0]).to.deep.equal([[
        { _id: '_design/logs1', _rev: '3', field: 'a', deploy_info: deployInfoExpected },
        { _id: '_design/logs2', deploy_info: deployInfoExpected },
      ]]);
    });

    it('should throw an error when getting ddocs fails', async () => {
      clock.tick(2500);
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [
        { doc: { _id: '_design/:staged:medic', _rev: '1', foo: 1, deploy_info: { deploy: 'info' } } },
        { doc: { _id: '_design/medic', _rev: '2', bar: 2, deploy_info: { deploy: 'old' } } },
      ] }); // all ddocs have match
      sinon.stub(db.sentinel, 'allDocs').rejects({ the: 'error' });
      sinon.stub(db.medic, 'bulkDocs').resolves([]);

      sinon.stub(upgradeLogService, 'getDeployInfo').resolves();

      try {
        await utils.unstageStagedDdocs();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ the: 'error' });

        expect(db.medic.allDocs.callCount).to.equal(1);
        expect(db.medic.bulkDocs.callCount).to.equal(1);
        expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id: '_design/medic', _rev: '2', foo: 1, deploy_info: { deploy: 'info', timestamp: 2500 }},
        ]]);
        expect(db.sentinel.allDocs.callCount).to.equal(1);
      }
    });

    it('should throw an error when saving ddocs fails', async () => {
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [
        { doc: { _id: '_design/:staged:medic', _rev: '1', foo: 1, deploy_info: { deploy: 'info' } } },
        { doc: { _id: '_design/medic', _rev: '2', bar: 2, deploy_info: 'omg' } },
      ] }); // all ddocs have match
      sinon.stub(db.sentinel, 'allDocs').resolves({ rows: [
        { doc: { _id: '_design/:staged:sentinel', _rev: '1', foo: 1, deploy_info: { deploy: 'info' } } },
      ]});
      sinon.stub(db.medic, 'bulkDocs').resolves([]);
      sinon.stub(db.sentinel, 'bulkDocs').rejects({ error: 'an error' });

      try {
        await utils.unstageStagedDdocs();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ error: 'an error' });

        expect(db.medic.allDocs.callCount).to.equal(1);
        expect(db.medic.bulkDocs.callCount).to.equal(1);
        expect(db.sentinel.allDocs.callCount).to.equal(1);
        expect(db.sentinel.bulkDocs.callCount).to.equal(1);
      }
    });
  });

  describe('compareDdocs', () => {
    it('should return empty lists when all bundled are uploaded', () => {
      const bundled = [
        { _id: '_design/one', version: '4.0.1-thing' },
        { _id: '_design/two', version: '4.0.1-thing' },
        { _id: '_design/three', version: '4.0.1-thing' },
      ];
      const uploaded = [
        { _id: '_design/two', version: '4.0.1-thing' },
        { _id: '_design/one', version: '4.0.1-thing' },
        { _id: '_design/three', version: '4.0.1-thing' },
      ];

      expect(utils.compareDdocs(bundled, uploaded)).to.deep.equal({ missing: [], different: [] });
    });

    it('should return empty lists when all bundled are staged', () => {
      const bundled = [
        { _id: '_design/one', version: '4.0.1-thing' },
        { _id: '_design/two', version: '4.0.1-thing' },
        { _id: '_design/three', version: '4.0.1-thing' },
      ];
      const uploaded = [
        { _id: '_design/:staged:two', version: '4.0.1-thing' },
        { _id: '_design/:staged:one', version: '4.0.1-thing' },
        { _id: '_design/:staged:three', version: '4.0.1-thing' },
      ];

      expect(utils.compareDdocs(bundled, uploaded)).to.deep.equal({ missing: [], different: [] });
    });

    it('should return missing ddocs', () => {
      const bundled = [
        { _id: '_design/one', version: '4.0.1-thing' },
        { _id: '_design/two', version: '4.0.1-thing' },
        { _id: '_design/three', version: '4.0.1-thing' },
      ];
      const uploaded = [
        { _id: '_design/:staged:two', version: '4.0.1-thing' },
        { _id: '_design/:staged:three', version: '4.0.1-thing' },
      ];

      expect(utils.compareDdocs(bundled, uploaded)).to.deep.equal({ missing: ['_design/one'], different: [] });
    });

    it('should return different ddocs, comparing version', () => {
      const bundled = [
        { _id: '_design/one', version: '4.0.1-thing' },
        { _id: '_design/two', version: '4.0.1-thing' },
        { _id: '_design/three', version: '4.0.1-thing' },
      ];
      const uploaded = [
        { _id: '_design/:staged:two', version: '4.0.1-thing' },
        { _id: '_design/:staged:one', version: '4.0.2-thing' },
        { _id: '_design/:staged:three', version: '4.0.3-thing' },
      ];

      expect(utils.compareDdocs(bundled, uploaded)).to.deep.equal({
        different: ['_design/one', '_design/three'],
        missing: [],
      });
    });
  });
});
