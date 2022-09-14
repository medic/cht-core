const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const db = require('../../../../src/db');
const env = require('../../../../src/environment');

let databases;

describe('databases', () => {
  beforeEach(() => {
    sinon.stub(env, 'db').value('thedb');
    databases = rewire('../../../../src/services/setup/databases');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should export correct databases', () => {
    expect(databases.DATABASES).to.deep.equal([
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
