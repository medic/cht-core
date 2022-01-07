const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');
const fs = require('fs');
const rpn = require('request-promise-native');

let utils;

const db = require('../../../../src/db');
const upgradeLogService = require('../../../../src/services/setup/upgrade-log');
const env = require('../../../../src/environment');

const mockDb = (db) => {
  sinon.stub(db, 'allDocs');
  sinon.stub(db, 'bulkDocs');
  sinon.stub(db, 'compact');
  sinon.stub(db, 'viewCleanup');
};

describe('Setup utils', () => {
  beforeEach(() => {
    sinon.stub(env, 'db').value('thedb');

    utils = rewire('../../../../src/services/setup/utils');
    // mockDb(db.medic);
    // mockDb(db.sentinel);
    // mockDb(db.medicLogs);
    // mockDb(db.medicUsersMeta);
  });

  afterEach(() => {
    sinon.restore();
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
        const errors = [
          'saving 1 failed with conflict',
          'saving 3 failed with unauthorized',
        ];
        expect(err.message).to.equal(`Error while saving docs: ${JSON.stringify(errors)}`);
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

  describe('getDocs', () => {
    it('should do nothing when no ids are passed', async () => {
      sinon.stub(db.sentinel, 'allDocs');
      const result = await utils.__get__('getDocs')({ db: db.sentinel }, []);
      expect(result).to.deep.equal([]);
      expect(db.sentinel.allDocs.callCount).to.equal(0);
    });

    it('should return docs', async () => {
      sinon.stub(db.medicUsersMeta, 'allDocs').resolves({ rows: [
        { id: 1, value: 1, doc: { _id: 1, _rev: 1, field: 'test' } },
        { id: 2, value: 1, doc: { _id: 3, _rev: 1, type: 'reminder' } },
        { id: 3, value: 1, doc: { _id: 3, _rev: 1, type: 'person', parent: 'i' } },
      ]});

      const result = await utils.__get__('getDocs')({ db: db.medicUsersMeta }, [1, 2, 3]);

      expect(db.medicUsersMeta.allDocs.callCount).to.equal(1);
      expect(db.medicUsersMeta.allDocs.args[0]).to.deep.equal([{ keys: [1, 2, 3], include_docs: true }]);
      expect(result).to.deep.equal([
        { _id: 1, _rev: 1, field: 'test' },
        { _id: 3, _rev: 1, type: 'reminder' },
        { _id: 3, _rev: 1, type: 'person', parent: 'i' },
      ]);
    });

    it('should throw allDocs errors', async () => {
      sinon.stub(db.medic, 'allDocs').rejects({ this: 'error' });

      try {
        await utils.__get__('getDocs')({ db: db.medic }, [1, 2, 3]);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ this: 'error' });
        expect(db.medic.allDocs.callCount).to.equal(1);
      }
    });
  });

  describe('getStagedDdocs', () => {
    it('should get the ids and revs of currently staged ddocs', async () => {
      sinon.stub(db.medicLogs, 'allDocs').resolves({
        rows: [
          { id: '_design/:staged:one', value: { rev: '1' } },
          { id: '_design/:staged:two', value: { rev: '2' } },
          { id: '_design/:staged:three', value: { rev: '3' } },
        ],
      });

      const result = await utils.__get__('getStagedDdocs')({ db: db.medicLogs });

      expect(db.medicLogs.allDocs.callCount).to.equal(1);
      expect(db.medicLogs.allDocs.args[0]).to.deep.equal([{
        startkey: '_design/:staged:',
        endkey: '_design/:staged:\ufff0',
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
    it('should start db compact and view cleanup for every database', async () => {
      mockDb(db.medic);
      mockDb(db.sentinel);
      mockDb(db.medicLogs);
      mockDb(db.medicUsersMeta);

      await utils.cleanup();

      expect(db.medic.compact.callCount).to.equal(1);
      expect(db.sentinel.compact.callCount).to.equal(1);
      expect(db.medicLogs.compact.callCount).to.equal(1);
      expect(db.medicUsersMeta.compact.callCount).to.equal(1);

      expect(db.medic.viewCleanup.callCount).to.equal(1);
      expect(db.sentinel.viewCleanup.callCount).to.equal(1);
      expect(db.medicLogs.viewCleanup.callCount).to.equal(1);
      expect(db.medicUsersMeta.viewCleanup.callCount).to.equal(1);
    });

    it('should throw an error when any cleanup task fails', async () => {
      mockDb(db.medic);
      mockDb(db.sentinel);
      mockDb(db.medicLogs);
      mockDb(db.medicUsersMeta);

      db.sentinel.compact.rejects({ some: 'error' });

      try {
        await utils.cleanup();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'error' });
      }
    });
  });

  describe('getDdocs', () => {
    it('should return ddocs without include_docs', async () => {
      sinon.stub(db.sentinel, 'allDocs').resolves({ rows: [
        { id: 'ddoc1', key: 'ddoc1', value: { rev: 'rev1' } },
        { id: 'ddoc2', key: 'ddoc2', value: { rev: 'rev2' } },
      ] });

      const result = await utils.__get__('getDdocs')({ db: db.sentinel });

      expect(result).to.deep.equal([
        { _id: 'ddoc1', _rev: 'rev1' },
        { _id: 'ddoc2', _rev: 'rev2' },
      ]);
      expect(db.sentinel.allDocs.callCount).to.equal(1);
      expect(db.sentinel.allDocs.args[0]).to.deep.equal([{
        startkey: '_design/', endkey: `_design/\ufff0`, include_docs: false,
      }]);
    });

    it('should return ddocs with include_docs', async () => {
      sinon.stub(db.sentinel, 'allDocs').resolves({ rows: [
        { id: 'ddoc1', key: 'ddoc1', value: { rev: 'rev1' }, doc: { _id: 'ddoc1', _rev: 'rev1', field: 'a' }  },
        { id: 'ddoc2', key: 'ddoc2', value: { rev: 'rev2' }, doc: { _id: 'ddoc2', _rev: 'rev2', field: 'b' }, },
      ] });

      const result = await utils.__get__('getDdocs')({ db: db.sentinel }, true);

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
        await utils.__get__('getDdocs')({ db: db.medicLogs });
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
    it('should return an array of function that will start view indexing, if db should be indexed', async () => {
      const ddocsToStage = [
        { _id: '_design/:staged:one' },
        { _id: '_design/:staged:two' },
        { _id: '_design/:staged:three' },
      ];
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [
        { doc: { _id: '_design/:staged:one', views: { 'view1': {}, 'view2': {}, 'view3': {}} } },
        { doc: { _id: '_design/:staged:two' } },
        { doc: { _id: '_design/:staged:three', views: { 'view4': {} }}},
      ] });

      sinon.stub(rpn, 'get').resolves();
      sinon.stub(env, 'serverUrl').value('http://localhost');

      const result = await utils.__get__('getViewsToIndex')({ db: db.medic, name: 'dbname' }, ddocsToStage);

      expect(result.length).to.equal(4);
      result.forEach(item => expect(item).to.be.a('function'));

      expect(db.medic.allDocs.callCount).to.equal(1);
      expect(db.medic.allDocs.args[0]).to.deep.equal([{
        keys: ['_design/:staged:one', '_design/:staged:two', '_design/:staged:three'],
        include_docs: true,
      }]);
      expect(rpn.get.callCount).to.equal(0);

      await Promise.all(result.map(item => item()));

      expect(rpn.get.callCount).to.equal(4);
      expect(rpn.get.args).to.deep.equal([
        [{
          uri: 'http://localhost/dbname/_design/:staged:one/_view/view1',
          json: true,
          qs: { limit: 1 },
          timeout: 2000,
        }],
        [{
          uri: 'http://localhost/dbname/_design/:staged:one/_view/view2',
          json: true,
          qs: { limit: 1 },
          timeout: 2000,
        }],
        [{
          uri: 'http://localhost/dbname/_design/:staged:one/_view/view3',
          json: true,
          qs: { limit: 1 },
          timeout: 2000,
        }],
        [{
          uri: 'http://localhost/dbname/_design/:staged:three/_view/view4',
          json: true,
          qs: { limit: 1 },
          timeout: 2000,
        }],
      ]);
    });

    it('should return empty array if there are no views', async () => {
      const ddocsToStage = [
        { _id: '_design/:staged:one' },
        { _id: '_design/:staged:two' },
        { _id: '_design/:staged:three' },
      ];

      sinon.stub(db.medic, 'allDocs').resolves({ rows: [
        { doc: { _id: '_design/:staged:one', views: {} } },
        { doc: { _id: '_design/:staged:two', views: 'whaaaa' } },
      ] });

      const result = await utils.__get__('getViewsToIndex')({ db: db.medic }, ddocsToStage);
      expect(result).to.deep.equal([]);
    });

    it('should throw an error if getting ddocs throws an error', async () => {
      sinon.stub(db.medic, 'allDocs').rejects({ an: 'error' });

      try {
        await utils.__get__('getViewsToIndex')({ db: db.medic }, [{ _id: '_design/:staged:one' }]);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'error' });
        expect(db.medic.allDocs.callCount).to.equal(1);
        expect(db.medic.allDocs.args[0]).to.deep.equal([{ keys: ['_design/:staged:one'], include_docs: true }]);
      }
    });
  });

  describe('createUpgradeFolder', () => {
    it('should create the staging ddocs folder when it does not exist', async () => {
      sinon.stub(fs.promises, 'access').rejects({ code: 'ENOENT' });
      sinon.stub(fs.promises, 'rmdir');
      sinon.stub(fs.promises, 'mkdir').resolves();
      sinon.stub(env, 'upgradePath').value('upgradePath');

      await utils.__get__('createUpgradeFolder')();

      expect(fs.promises.access.callCount).to.equal(1);
      expect(fs.promises.access.args[0]).to.deep.equal(['upgradePath']);
      expect(fs.promises.rmdir.callCount).to.equal(0);
      expect(fs.promises.mkdir.callCount).to.equal(1);
      expect(fs.promises.mkdir.args[0]).to.deep.equal(['upgradePath']);
    });

    it('should delete existing folder recursively, create new folder, aborting previous upgrade', async () => {
      sinon.stub(fs.promises, 'access').resolves();
      sinon.stub(fs.promises, 'rmdir').resolves();
      sinon.stub(fs.promises, 'mkdir').resolves();
      sinon.stub(env, 'upgradePath').value('upgradePath');
      sinon.stub(upgradeLogService, 'setAborted').resolves();

      await utils.__get__('createUpgradeFolder')();

      expect(fs.promises.access.callCount).to.equal(1);
      expect(fs.promises.access.args[0]).to.deep.equal(['upgradePath']);
      expect(upgradeLogService.setAborted.callCount).to.equal(1);
      expect(fs.promises.rmdir.callCount).to.equal(1);
      expect(fs.promises.rmdir.args[0]).to.deep.equal(['upgradePath', { recursive: true }]);
      expect(fs.promises.mkdir.callCount).to.equal(1);
      expect(fs.promises.mkdir.args[0]).to.deep.equal(['upgradePath']);
    });

    it('should catch abort upgrade errors', async () => {
      sinon.stub(fs.promises, 'access').resolves();
      sinon.stub(fs.promises, 'rmdir').resolves();
      sinon.stub(fs.promises, 'mkdir').resolves();
      sinon.stub(env, 'upgradePath').value('upgradePath');
      sinon.stub(upgradeLogService, 'setAborted').rejects();

      await utils.__get__('createUpgradeFolder')();

      expect(fs.promises.access.callCount).to.equal(1);
      expect(fs.promises.access.args[0]).to.deep.equal(['upgradePath']);
      expect(upgradeLogService.setAborted.callCount).to.equal(1);
      expect(fs.promises.rmdir.callCount).to.equal(1);
      expect(fs.promises.rmdir.args[0]).to.deep.equal(['upgradePath', { recursive: true }]);
      expect(fs.promises.mkdir.callCount).to.equal(1);
      expect(fs.promises.mkdir.args[0]).to.deep.equal(['upgradePath']);
    });

    it('should throw an error when access throws random errors', async () => {
      sinon.stub(fs.promises, 'access').rejects({ code: 'error' });
      sinon.stub(fs.promises, 'rmdir');
      sinon.stub(fs.promises, 'mkdir');
      sinon.stub(env, 'upgradePath').value('upgradePath');

      try {
        await utils.__get__('createUpgradeFolder')();
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
      sinon.stub(fs.promises, 'rmdir').rejects({ code: 'some code' });
      sinon.stub(fs.promises, 'mkdir');
      sinon.stub(env, 'upgradePath').value('upgradePath');

      try {
        await utils.__get__('createUpgradeFolder')();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ code: 'some code' });

        expect(fs.promises.access.callCount).to.equal(1);
        expect(fs.promises.access.args[0]).to.deep.equal(['upgradePath']);
        expect(fs.promises.rmdir.callCount).to.equal(1);
        expect(fs.promises.rmdir.args[0]).to.deep.equal(['upgradePath', { recursive: true }]);
        expect(fs.promises.mkdir.callCount).to.equal(0);
      }
    });

    it('should throw an error when creation fails', async () => {
      sinon.stub(fs.promises, 'access').rejects({ code: 'ENOENT' });
      sinon.stub(fs.promises, 'rmdir');
      sinon.stub(fs.promises, 'mkdir').rejects({ some: 'error' });
      sinon.stub(env, 'upgradePath').value('upgradePath');

      try {
        await utils.__get__('createUpgradeFolder')();
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

      await utils.__get__('downloadDdocDefinitions')(version);

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

      await utils.__get__('downloadDdocDefinitions')(version);

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

      await utils.__get__('downloadDdocDefinitions')(version);

      expect(fs.promises.writeFile.callCount).to.equal(2);
      expect(fs.promises.writeFile.args).to.deep.equal([
        ['upgradePath/medic.json', 'medicdata', 'base64'],
        ['upgradePath/logs.json', 'logsdata', 'base64'],
      ]);
    });

    it('should throw error when staging doc not found', async () => {
      db.builds.get.rejects({ error: 'boom' });

      try {
        await utils.__get__('downloadDdocDefinitions')('vers');
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
        await utils.__get__('downloadDdocDefinitions')(version);
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
        await utils.__get__('downloadDdocDefinitions')(version);
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

  describe('stage', () => {

  });

});
