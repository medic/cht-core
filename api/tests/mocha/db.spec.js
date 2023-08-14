const sinon = require('sinon');
require('chai').use(require('chai-as-promised'));
const { expect } = require('chai');
const rewire = require('rewire');
const rpn = require('request-promise-native');

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
    sinon.restore();
    process.env.UNIT_TEST_ENV = unitTestEnv;
    sinon.restore();
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

    it('should retry with half the payload if 413 is thrown', async () => {
      sinon.stub(db.medic, 'bulkDocs')
        .rejects({ status: 413 })
        .onCall(1).resolves(['succ1', 'succ2'])
        .onCall(2).resolves(['succ3', 'succ4']);

      const result = await db.saveDocs(db.medic, [{ _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }]);
      expect(result).to.deep.equal(['succ1', 'succ2', 'succ3', 'succ4']);
      expect(db.medic.bulkDocs.args).to.deep.equal([
        [[{ _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }]],
        [[{ _id: 1 }, { _id: 2 }]],
        [[{ _id: 3 }, { _id: 4 }]],
      ]);
    });

    it('should keep retrying with half the payload', async () => {
      sinon.stub(db.medic, 'bulkDocs')
        .rejects({ status: 413 })
        .onCall(3).resolves(['succ1'])
        .onCall(4).resolves(['succ2'])
        .onCall(5).resolves(['succ3'])
        .onCall(6).resolves(['succ4']);

      const result = await db.saveDocs(db.medic, [{ _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }]);
      expect(result).to.deep.equal(['succ1', 'succ2', 'succ3', 'succ4']);
      expect(db.medic.bulkDocs.args).to.deep.equal([
        [[{ _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }]],
        [[{ _id: 1 }, { _id: 2 }]],
        [[{ _id: 3 }, { _id: 4 }]],
        [[{ _id: 1 }]],
        [[{ _id: 2 }]],
        [[{ _id: 3 }]],
        [[{ _id: 4 }]]
      ]);
    });

    it('should work with uneven docs counts', async () => {
      sinon.stub(db.medic, 'bulkDocs')
        .rejects({ status: 413 })
        .onCall(3).resolves(['succ1'])
        .onCall(4).resolves(['succ2'])
        .onCall(5).resolves(['succ3'])
        .onCall(6).resolves(['succ4'])
        .onCall(7).resolves(['succ5']);

      const result = await db.saveDocs(db.medic, [{ _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }, { _id: 5 }]);
      expect(result).to.have.members(['succ1', 'succ2', 'succ3', 'succ4', 'succ5']);
      expect(db.medic.bulkDocs.args).to.deep.equal([
        [[{ _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 }, { _id: 5 }]],
        [[{ _id: 1 }, { _id: 2 }]],
        [[{ _id: 3 }, { _id: 4 }]],
        [[{ _id: 5 }]],
        [[{ _id: 1 }]],
        [[{ _id: 2 }]],
        [[{ _id: 3 }]],
        [[{ _id: 4 }]]
      ]);
    });

    it('should throw final error when getting a 413 with a single doc', async () => {
      const docs = [{ _id: 1 }, { _id: 2 }];
      sinon.stub(db.medic, 'bulkDocs').rejects({ status: 413 });

      try {
        await db.saveDocs(db.medic, docs);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal( { status: 413 });
        expect(db.medic.bulkDocs.args).to.deep.equal([
          [[{ _id: 1 }, { _id: 2 }]],
          [[{ _id: 1 }]],
          [[{ _id: 2 }]],
        ]);
      }
    });
  });

  describe('get', () => {
    it('should create the database', () => {
      sinon.stub(env, 'serverUrl').value('https://couch.db');
      const database = db.get('database');
      expect(database.name).to.equal('https://couch.db/database');
    });
  });

  describe('close', () => {
    it('should call db.close', () => {
      const database = { close: sinon.stub() };
      db.close(database);
      expect(database.close.callCount).to.equal(1);
    });

    it('should not fail when db is not defined', () => {
      db.close();
      db.close({});
    });

    it('should not close when already closed', () => {
      const database = { close: sinon.stub(), _closed: true };
      db.close(database);
      expect(database.close.callCount).to.equal(0);
    });

    it('should not close when destroyed', () => {
      const database = { close: sinon.stub(), _destroyed: true };
      db.close(database);
      expect(database.close.callCount).to.equal(0);
    });

    it('should catch close errors', () => {
      const database = { close: sinon.stub().throws({ error: 'omg' }) };
      db.close(database);
    });
  });

  describe('activeTasks', () => {
    it('should return active tasks', async () => {
      sinon.stub(env, 'serverUrl').value('https://couch.db');
      sinon.stub(rpn, 'get').resolves('active_tasks');

      expect(await db.activeTasks()).to.equal('active_tasks');

      expect(rpn.get.callCount).to.equal(1);
      expect(rpn.get.args[0]).to.deep.equal([{
        url: 'https://couch.db/_active_tasks',
        json: true,
      }]);
    });

    it('should throw error', async () => {
      sinon.stub(rpn, 'get').rejects(new Error('boom'));
      await expect(db.activeTasks()).to.be.rejectedWith('boom');
      expect(rpn.get.callCount).to.equal(1);
    });
  });

  describe('allDbs', () => {
    it('should return all databases', async () => {
      sinon.stub(env, 'serverUrl').value('https://couch.db');
      sinon.stub(rpn, 'get').resolves(['db1', 'db2']);

      expect(await db.allDbs()).to.deep.equal(['db1', 'db2']);

      expect(rpn.get.callCount).to.equal(1);
      expect(rpn.get.args[0]).to.deep.equal([{
        uri: 'https://couch.db/_all_dbs',
        json: true,
      }]);
    });

    it('should throw error', async () => {
      sinon.stub(rpn, 'get').rejects(new Error('boom'));
      await expect(db.allDbs()).to.be.rejectedWith('boom');
      expect(rpn.get.callCount).to.equal(1);
    });
  });

  describe('exists', () => {
    it('should resolve with db object if db exists', async () => {
      const dbObject = {
        info: sinon.stub().resolves({}),
      };
      const pouch = sinon.stub().returns(dbObject);
      db.__set__('PouchDB', pouch);

      const result = await db.exists('thedbname');
      expect(result).to.equal(dbObject);
      expect(pouch.callCount).to.equal(1);
      expect(pouch.args[0][0]).to.equal(`${env.serverUrl}/thedbname`);
      expect(pouch.args[0][1].skip_setup).to.equal(true);
    });

    it('should close db if info request throws', async () => {
      const dbObject = {
        info: sinon.stub().rejects(),
      };
      const pouch = sinon.stub().returns(dbObject);
      db.__set__('PouchDB', pouch);
      sinon.stub(db, 'close');

      const result = await db.exists('thedbname');
      expect(result).to.equal(false);
      expect(db.close.callCount).to.equal(1);
      expect(db.close.args).to.deep.equal([[dbObject]]);
    });

    it('should close db if info request returns an error', async () => {
      const dbObject = {
        info: sinon.stub().resolves({ error: 'something' }),
      };
      const pouch = sinon.stub().returns(dbObject);
      db.__set__('PouchDB', pouch);
      sinon.stub(db, 'close');

      const result = await db.exists('thedbname');
      expect(result).to.equal(false);
      expect(db.close.callCount).to.equal(1);
      expect(db.close.args).to.deep.equal([[dbObject]]);
    });
  });
});
