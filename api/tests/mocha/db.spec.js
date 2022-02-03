const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;

const sinon = require('sinon');
const rewire = require('rewire');
const rpn = require('request-promise-native');

const environment = require('../../src/environment');
let dbService;

const { UNIT_TEST_ENV: originalEnv } = process.env;

describe('db', () => {
  beforeEach(() => {
    delete process.env.UNIT_TEST_ENV;
    dbService = rewire('../../src/db');
  });
  afterEach(() => {
    process.env.UNIT_TEST_ENV = originalEnv;
    sinon.restore();
  });

  describe('initialize', () => {
    it('should not initialize dbs immediately', () => {
      expect(dbService.medic).to.equal(undefined);
      expect(dbService.medicUsersMeta).to.equal(undefined);
      expect(dbService.medicLogs).to.equal(undefined);
      expect(dbService.sentinel).to.equal(undefined);
      expect(dbService.users).to.equal(undefined);
      expect(dbService.builds).to.equal(undefined);
    });

    it('should initialize dbs', () => {
      const couchUrl = 'https://couch.db/medic';
      sinon.stub(environment, 'couchUrl').get(() => couchUrl);
      sinon.stub(environment, 'serverUrl').get(() => 'https://couch.db');
      sinon.stub(environment, 'buildsUrl').get(() => 'https://builds.db');

      dbService.initialize();

      expect(dbService.medic).to.be.ok;
      expect(dbService.medic.name).to.equal(couchUrl);
      expect(dbService.medicUsersMeta).to.be.ok;
      expect(dbService.medicUsersMeta.name).to.equal(`${couchUrl}-users-meta`);
      expect(dbService.medicLogs).to.be.ok;
      expect(dbService.medicLogs.name).to.equal(`${couchUrl}-logs`);
      expect(dbService.sentinel).to.be.ok;
      expect(dbService.sentinel.name).to.equal(`${couchUrl}-sentinel`);
      expect(dbService.users).to.be.ok;
      expect(dbService.users.name).to.equal('https://couch.db/_users');
      expect(dbService.builds).to.be.ok;
      expect(dbService.builds.name).to.equal('https://builds.db');
    });
  });

  describe('get', () => {
    it('should create the database', () => {
      sinon.stub(environment, 'serverUrl').get(() => 'https://couch.db');
      const db = dbService.get('database');
      expect(db.name).to.equal('https://couch.db/database');
    });
  });

  describe('close', () => {
    it('should call db.close', () => {
      const db = { close: sinon.stub() };
      dbService.close(db);
      expect(db.close.callCount).to.equal(1);
    });

    it('should not fail when db is not defined', () => {
      dbService.close();
      dbService.close({});
    });

    it('should not close when already closed', () => {
      const db = { close: sinon.stub(), _closed: true };
      dbService.close(db);
      expect(db.close.callCount).to.equal(0);
    });

    it('should not close when destroyed', () => {
      const db = { close: sinon.stub(), _destroyed: true };
      dbService.close(db);
      expect(db.close.callCount).to.equal(0);
    });

    it('should catch close errors', () => {
      const db = { close: sinon.stub().throws({ error: 'omg' }) };
      dbService.close(db);
    });
  });

  describe('activeTasks', () => {
    it('should return active tasks', async () => {
      sinon.stub(environment, 'serverUrl').get(() => 'https://couch.db');
      sinon.stub(rpn, 'get').resolves('active_tasks');

      expect(await dbService.activeTasks()).to.equal('active_tasks');

      expect(rpn.get.callCount).to.equal(1);
      expect(rpn.get.args[0]).to.deep.equal([{
        url: 'https://couch.db/_active_tasks',
        json: true,
      }]);
    });

    it('should throw error', async () => {
      sinon.stub(rpn, 'get').rejects(new Error('boom'));
      await expect(dbService.activeTasks()).to.be.eventually.rejected;
      expect(rpn.get.callCount).to.equal(1);
    });
  });

  describe('allDbs', () => {
    it('should return all databases', async () => {
      sinon.stub(environment, 'serverUrl').get(() => 'https://couch.db');
      sinon.stub(rpn, 'get').resolves(['db1', 'db2']);

      expect(await dbService.allDbs()).to.deep.equal(['db1', 'db2']);

      expect(rpn.get.callCount).to.equal(1);
      expect(rpn.get.args[0]).to.deep.equal([{
        url: 'https://couch.db/_all_dbs',
        json: true,
      }]);
    });

    it('should throw error', async () => {
      sinon.stub(rpn, 'get').rejects(new Error('boom'));
      await expect(dbService.allDbs()).to.be.eventually.rejected;
      expect(rpn.get.callCount).to.equal(1);
    });
  });

});
