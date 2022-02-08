const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');

let db;
let unitTestEnv;

const env = require('../../src/environment');

describe('db', () => {
  beforeEach(() => {
    unitTestEnv = process.env.UNIT_TEST_ENV;
    delete process.env.UNIT_TEST_ENV;
    sinon.stub(env, 'couchUrl').value('http://admin:pass@couch:5984/medic');
    sinon.stub(env, 'buildsUrl').value('http://admin:pass@builds:5984/builds');
    sinon.stub(env, 'serverUrl').value('http://admin:pass@couch:5984/');

    db = rewire('../../src/db');
  });

  afterEach(() => {
    process.env.UNIT_TEST_ENV = unitTestEnv;
  });

  describe('saveDocs', () => {
    it('should save all docs and return results', async () => {
      const docs = [{ _id: 1 }, { _id: 2 }, { _id: 3 }];
      sinon.stub(db.medicLogs, 'bulkDocs').resolves([{ id: 1, ok: true }, { id: 2, ok: true }, { id: 3, ok: true }]);

      const result = await db.saveDocs(db.medicLogs, docs);

      expect(result).to.deep.equal([{ id: 1, ok: true }, { id: 2, ok: true }, { id: 3, ok: true }]);
      expect(db.medicLogs.bulkDocs.callCount).to.equal(1);
      expect(db.medicLogs.bulkDocs.args[0]).to.deep.equal([docs]);
    });

    it('should do nothing if passed an empty array', async () => {
      sinon.stub(db.medic, 'bulkDocs');
      const result = await db.saveDocs(db.medic, []);

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
        await db.saveDocs(db.medicLogs, docs);
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
        await db.saveDocs(db.medic, docs);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ some: 'err' });
      }
    });
  });
});
