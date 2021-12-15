const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');
const fs = require('fs');
const rpn = require('request-promise-native');

let utils;

const db = require('../../../../src/db');
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
          index: true,
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
    
  });

  describe('stage', () => {
    
  });

});
