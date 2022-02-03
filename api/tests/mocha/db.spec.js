const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;

const sinon = require('sinon');
const rewire = require('rewire');
const rpn = require('request-promise-native');

const environment = require('../../src/environment');
let db;

const { UNIT_TEST_ENV: originalEnv } = process.env;

describe('db', () => {
  beforeEach(() => {
    delete process.env.UNIT_TEST_ENV;
    db = rewire('../../src/db');
  });
  afterEach(() => {
    process.env.UNIT_TEST_ENV = originalEnv;
    sinon.restore();
  });

  describe('initialize', () => {
    it('should not initialize dbs immediately', () => {
      expect(db.medic).to.equal(undefined);
      expect(db.medicUsersMeta).to.equal(undefined);
      expect(db.medicLogs).to.equal(undefined);
      expect(db.sentinel).to.equal(undefined);
      expect(db.users).to.equal(undefined);
      expect(db.builds).to.equal(undefined);
    });

    it('should initialize dbs', () => {
      const couchUrl = 'https://adm:pas@couch.db/medic';
      sinon.stub(environment, 'couchUrl').get(() => couchUrl);
      sinon.stub(environment, 'serverUrl').get(() => 'https://adm:pas@couch.db/');
      sinon.stub(environment, 'buildsUrl').get(() => 'https://builds.db');

      db.initialize();

      expect(db.medic).to.be.ok;
      expect(db.medic.name).to.equal(couchUrl);
      expect(db.medicUsersMeta).to.be.ok;
      expect(db.medicUsersMeta.name).to.equal(`${couchUrl}-users-meta`);
      expect(db.medicLogs).to.be.ok;
      expect(db.medicLogs.name).to.equal(`${couchUrl}-logs`);
      expect(db.sentinel).to.be.ok;
      expect(db.sentinel.name).to.equal(`${couchUrl}-sentinel`);
      expect(db.users).to.be.ok;
      expect(db.users.name).to.equal('https://adm:pas@couch.db/_users');
      expect(db.builds).to.be.ok;
      expect(db.builds.name).to.equal('https://builds.db');
    });
  });

  describe('get', () => {
    it('should create the database', () => {
      sinon.stub(environment, 'serverUrl').get(() => 'https://couch.db/');
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
      sinon.stub(environment, 'serverUrl').get(() => 'https://couch.db');
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
      await expect(db.activeTasks()).to.be.eventually.rejected;
      expect(rpn.get.callCount).to.equal(1);
    });
  });

  describe('allDbs', () => {
    it('should return all databases', async () => {
      sinon.stub(environment, 'serverUrl').get(() => 'https://couch.db');
      sinon.stub(rpn, 'get').resolves(['db1', 'db2']);

      expect(await db.allDbs()).to.deep.equal(['db1', 'db2']);

      expect(rpn.get.callCount).to.equal(1);
      expect(rpn.get.args[0]).to.deep.equal([{
        url: 'https://couch.db/_all_dbs',
        json: true,
      }]);
    });

    it('should throw error', async () => {
      sinon.stub(rpn, 'get').rejects(new Error('boom'));
      await expect(db.allDbs()).to.be.eventually.rejected;
      expect(rpn.get.callCount).to.equal(1);
    });
  });

});
