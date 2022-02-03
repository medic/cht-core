const rewire = require('rewire');
const { expect } = require('chai');
const sinon = require('sinon');

const serverChecks = require('@medic/server-checks');

let db;
const { UNIT_TEST_ENV: originalEnv } = process.env;

const deletePouchDbCache = () => {
  // because you can't PouchDB.plugin(require('pouchdb-replication')); more than once
  // it uses non-configurable Object.defineProperty
  // https://github.com/pouchdb/pouchdb/issues/6512
  Object
    .keys(require.cache)
    .filter(key => key.includes('pouchdb-core'))
    .forEach(key => (delete require.cache[key]));
};

describe('db', () => {
  beforeEach(() => {
    delete process.env.UNIT_TEST_ENV;
    deletePouchDbCache();
    db = rewire('../../src/db');
  });

  afterEach(() => {
    process.env.UNIT_TEST_ENV = originalEnv;
    sinon.restore();
  });

  describe('initialize', () => {
    it('should not initialize dbs immediately', () => {
      expect(db.couchUrl).to.equal(undefined);
      expect(db.serverUrl).to.equal(undefined);
      expect(db.medic).to.equal(undefined);
      expect(db.medicDbName).to.equal(undefined);
      expect(db.sentinel).to.equal(undefined);
      expect(db.users).to.equal(undefined);
    });

    it('should initialize dbs', async () => {
      const couchUrl = 'http://adm:pas@couch.db:9800/dbname';
      const serverUrl = 'http://adm:pas@couch.db:9800/';

      sinon.stub(serverChecks, 'getServerUrls').resolves({
        couchUrl: new URL(couchUrl),
        serverUrl: new URL(serverUrl),
        dbName: 'dbname',
      });

      await db.initialize();

      expect(db.couchUrl).to.equal(couchUrl);
      expect(db.serverUrl).to.equal(serverUrl);
      expect(db.medic).to.be.ok;
      expect(db.medic.name).to.equal(couchUrl);
      expect(db.sentinel).to.be.ok;
      expect(db.sentinel.name).to.equal(`${couchUrl}-sentinel`);
      expect(db.users).to.be.ok;
      expect(db.users.name).to.equal(`${serverUrl}/_users`);
      expect(db.medicDbName).to.equal('dbname');
    });
  });
});
