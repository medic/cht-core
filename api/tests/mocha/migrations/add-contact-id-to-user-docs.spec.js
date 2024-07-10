const sinon = require('sinon');
const { expect } = require('chai');
const db = require('../../../src/db');
const logger = require('@medic/logger');
const migration = require('../../../src/migrations/add-contact-id-to-user-docs');

const BATCH_SIZE = 100;

const createUserSettingsDoc = (id, contactId) => {
  const userSettings = {
    _id: id,
    type: 'user-settings',
  };
  if (contactId) {
    userSettings.contact_id = contactId;
  }
  return userSettings;
};

const createUserDoc = id => {
  return {
    _id: id,
    type: 'user',
    contact_id: null,
  };
};

const createCouchResponse = docs => ({ rows: docs.map(doc => ({ doc })) });

const assertDocByTypeQueryArgs = (args, skip) => expect(args).to.deep.equal([
  'medic-client/doc_by_type',
  {
    include_docs: true,
    limit: BATCH_SIZE,
    key: ['user-settings'],
    skip
  }
]);

const getExpectedUserDoc = userSettingsDocs => (userDoc, index) => {
  return {
    ...userDoc,
    contact_id: userSettingsDocs[index].contact_id
  };
};

describe('add-contact-id-to-user-docs migration', () => {
  let medicQuery;
  let usersAllDocs;
  let usersBulkDocs;
  let loggerWarn;

  beforeEach(() => {
    medicQuery = sinon.stub(db.medic, 'query');
    usersAllDocs = sinon.stub(db.users, 'allDocs');
    usersBulkDocs = sinon.stub(db.users, 'bulkDocs');
    loggerWarn = sinon.spy(logger, 'warn');
  });

  afterEach(() => sinon.restore());

  it('has basic properties', () => {
    const expectedCreationDate = new Date(2024, 5, 2).toDateString();

    expect(migration.name).to.equal('add-contact-id-to-user-docs');
    expect(migration.created).to.exist;
    expect(migration.created.toDateString()).to.equal(expectedCreationDate);
    expect(migration.run).to.be.a('function');
  });

  it('migrates the contact_id value from user-settings to _users', async () => {
    const userSettingsDoc = createUserSettingsDoc('org.couchdb.user:test-chw-1', 'contact-1');
    medicQuery.resolves(createCouchResponse([userSettingsDoc]));
    const userDoc = createUserDoc(userSettingsDoc._id);
    usersAllDocs.resolves(createCouchResponse([userDoc]));

    await migration.run();

    expect(medicQuery.calledOnce).to.be.true;
    assertDocByTypeQueryArgs(medicQuery.args[0], 0);
    expect(usersAllDocs.calledOnce).to.be.true;
    expect(usersAllDocs.args[0]).to.deep.equal([{ include_docs: true, keys: [userSettingsDoc._id] }]);
    expect(usersBulkDocs.calledOnce).to.be.true;
    expect(usersBulkDocs.args[0]).to.deep.equal([[{ ...userDoc, contact_id: userSettingsDoc.contact_id }]]);
  });

  it('migrates the contact_id value for all batches', async () => {
    const userSettingsFirstBatch = Array.from(
      { length: BATCH_SIZE },
      (_, i) => createUserSettingsDoc(`org.couchdb.user:test-chw-${i}`, `contact-${i}`)
    );
    const userSettingsSecondBatch = Array.from(
      { length: BATCH_SIZE },
      (_, i) => createUserSettingsDoc(`org.couchdb.user:test-chw-11${i}`, `contact-11${i}`)
    );
    const userSettingsThirdBatch = [createUserSettingsDoc(`org.couchdb.user:test-chw-222`, `contact-222`)];
    medicQuery.onFirstCall().resolves(createCouchResponse(userSettingsFirstBatch));
    medicQuery.onSecondCall().resolves(createCouchResponse(userSettingsSecondBatch));
    medicQuery.onThirdCall().resolves(createCouchResponse(userSettingsThirdBatch));

    const userDocsFirstBatch = userSettingsFirstBatch.map(doc => createUserDoc(doc._id));
    const userDocsSecondBatch = userSettingsSecondBatch.map(doc => createUserDoc(doc._id));
    const userDocsThirdBatch = userSettingsThirdBatch.map(doc => createUserDoc(doc._id));
    usersAllDocs.onFirstCall().resolves(createCouchResponse(userDocsFirstBatch));
    usersAllDocs.onSecondCall().resolves(createCouchResponse(userDocsSecondBatch));
    usersAllDocs.onThirdCall().resolves(createCouchResponse(userDocsThirdBatch));

    await migration.run();

    expect(medicQuery.calledThrice).to.be.true;
    assertDocByTypeQueryArgs(medicQuery.args[0], 0);
    assertDocByTypeQueryArgs(medicQuery.args[1], BATCH_SIZE);
    assertDocByTypeQueryArgs(medicQuery.args[2], BATCH_SIZE * 2);
    expect(usersAllDocs.calledThrice).to.be.true;
    expect(usersAllDocs.args[0]).to.deep.equal([{
      include_docs: true,
      keys: userSettingsFirstBatch.map(doc => doc._id)
    }]);
    expect(usersAllDocs.args[1]).to.deep.equal([{
      include_docs: true,
      keys: userSettingsSecondBatch.map(doc => doc._id)
    }]);
    expect(usersAllDocs.args[2]).to.deep.equal([{
      include_docs: true,
      keys: userSettingsThirdBatch.map(doc => doc._id)
    }]);
    expect(usersBulkDocs.calledThrice).to.be.true;
    expect(usersBulkDocs.args[0]).to.deep.equal([userDocsFirstBatch.map(getExpectedUserDoc(userSettingsFirstBatch))]);
    expect(usersBulkDocs.args[1]).to.deep.equal([userDocsSecondBatch.map(getExpectedUserDoc(userSettingsSecondBatch))]);
    expect(usersBulkDocs.args[2]).to.deep.equal([userDocsThirdBatch.map(getExpectedUserDoc(userSettingsThirdBatch))]);
  });

  it('does nothing if no user-settings are found', async () => {
    medicQuery.resolves(createCouchResponse([]));

    await migration.run();

    expect(medicQuery.calledOnce).to.be.true;
    assertDocByTypeQueryArgs(medicQuery.args[0], 0);
    expect(usersAllDocs.notCalled).to.be.true;
    expect(usersBulkDocs.notCalled).to.be.true;
  });

  it('does nothing if no _users docs are found', async () => {
    const userSettingsDoc = createUserSettingsDoc('org.couchdb.user:test-chw-1', 'contact-1');
    medicQuery.resolves(createCouchResponse([userSettingsDoc]));
    usersAllDocs.resolves(createCouchResponse([null]));

    await migration.run();

    expect(medicQuery.calledOnce).to.be.true;
    assertDocByTypeQueryArgs(medicQuery.args[0], 0);
    expect(usersAllDocs.calledOnce).to.be.true;
    expect(usersAllDocs.args[0]).to.deep.equal([{ include_docs: true, keys: [userSettingsDoc._id] }]);
    expect(usersBulkDocs.notCalled).to.be.true;
    expect(loggerWarn.calledOnce).to.be.true;
    expect(loggerWarn.args[0]).to.deep.equal([`Could not find user with id "${userSettingsDoc._id}". Skipping it.`]);
  });

  it('overwrites any existing contact_id value in _users', async () => {
    const userSettingsDoc = createUserSettingsDoc('org.couchdb.user:test-chw-1', 'contact-1');
    medicQuery.resolves(createCouchResponse([userSettingsDoc]));
    const userDoc = createUserDoc(userSettingsDoc._id);
    usersAllDocs.resolves(createCouchResponse([{
      ...userDoc,
      contact_id: 'old-contact'
    }]));

    await migration.run();

    expect(medicQuery.calledOnce).to.be.true;
    assertDocByTypeQueryArgs(medicQuery.args[0], 0);
    expect(usersAllDocs.calledOnce).to.be.true;
    expect(usersAllDocs.args[0]).to.deep.equal([{ include_docs: true, keys: [userSettingsDoc._id] }]);
    expect(usersBulkDocs.calledOnce).to.be.true;
    expect(usersBulkDocs.args[0]).to.deep.equal([[{ ...userDoc, contact_id: userSettingsDoc.contact_id }]]);
  });
});
