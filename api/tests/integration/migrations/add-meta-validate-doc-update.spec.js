const chai = require('chai');
const utils = require('./utils');
const db = require('../../../src/db');
const usersDb = require('../../../src/services/user-db');

const deleteValidateDocUpdate = (metaDb) => {
  return metaDb
    .get('_design/medic-user')
    .then(ddoc => {
      chai.expect(ddoc.validate_doc_update).to.be.a('string');
      delete ddoc.validate_doc_update;
      return metaDb.put(ddoc);
    });
};

const sampleData = [
  { _id: 'feedback1', type: 'feedback' },
  { _id: 'read:doc:uuid', type: 'readdoc' },
  { _id: 'telemetry1', type: 'telemetry' },
];

// Creates the user, the meta db, deletes the "validate_doc_update" from the DB (it is now added upon creation)
// and adds a few sample docs
const createUser = (name) => {
  const userMetaDbName = usersDb.getDbName(name);
  let metaDb;
  return usersDb
    .create(name)
    .then(() => {
      metaDb = db.get(userMetaDbName);
      return deleteValidateDocUpdate(metaDb);
    })
    .then(() => metaDb.bulkDocs(sampleData))
    .then(() => db.close(metaDb));
};

const assertUserDb = (name) => {
  const userMetaDbName = usersDb.getDbName(name);
  const metaDb = db.get(userMetaDbName);

  return metaDb
    .get('_design/medic-user')
    .then(ddoc => {
      chai.expect(ddoc.validate_doc_update).to.be.a('string');
      return metaDb.allDocs({ include_docs: true });
    })
    .then(result => {
      const docs = result.rows.map(row => delete row.doc._rev && row.doc);
      const docIds = docs.map(doc => doc._id);
      chai.expect(docIds).to.have.members(['_design/medic-user', 'feedback1', 'telemetry1', 'read:doc:uuid']);
      chai.expect(docs).to.deep.include.members(sampleData);
    });
};

describe('add-meta-validate-doc-update migration', () => {
  afterEach(() => utils.tearDown());

  it('should work with no user dbs', () => {
    return utils
      .initDb([])
      .then(() => utils.runMigration('add-meta-validate-doc-update'))
      .then(() => utils.assertDb([]));
  });

  it('should add validate_doc_update to meta db ddocs', () => {
    const users = [ 'alpha', 'beta', 'gamma', 'delta' ];
    return utils
      .initDb([])
      .then(() => Promise.all(users.map(createUser)))
      .then(() => utils.runMigration('add-meta-validate-doc-update'))
      .then(() => Promise.all(users.map(assertUserDb)));
  });

});
