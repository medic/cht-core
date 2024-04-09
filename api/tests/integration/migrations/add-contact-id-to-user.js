const { expect } = require('chai');
const utils = require('./utils');
const db = require('../../../src/db');
const logger = require('../../../src/logger');
const sinon = require('sinon');

const createUserSettingsDoc = (id, contactId) => {
  const userSettings = {
    _id: id,
    name: id.split(':')[1],
    type: 'user-settings',
    roles: ['chw'],
    facility_id: 'abc'
  };
  if (contactId) {
    userSettings.contact_id = contactId;
  }
  return userSettings;
};

const createUserDoc = userSettings => {
  return {
    ...userSettings,
    type: 'user',
    contact_id: null,
  };
};

const writeUserDocs = userDocs => db.users.bulkDocs(userDocs);

const getUserDoc = async (id) => db.users.get(id);

describe('add-contact-id-to-user migration', function() {
  afterEach(() => {
    sinon.restore();
    utils.tearDown();
  });

  it('migrates the contact_id value from user-settings to _users for all users', async () => {
    const userDocTuples = Array
      .from({ length: 299 }, (_, i) => i)
      .map(i => {
        const userSettingsDoc = createUserSettingsDoc(`org.couchdb.user:test-chw-${i}`, `contact-${i}`);
        return [
          userSettingsDoc,
          createUserDoc(userSettingsDoc)
        ];
      });
    const userSettingsDocs = userDocTuples.map(([ userSettingsDoc ]) => userSettingsDoc);
    await utils.initDb(userSettingsDocs);
    await writeUserDocs(userDocTuples.map(([, userDoc]) => userDoc));

    await utils.runMigration('add-contact-id-to-user-docs');

    await utils.assertDb(userSettingsDocs);
    for (const [userSettingsDoc, userDoc] of userDocTuples) {
      const updatedUserDoc = await getUserDoc(userDoc._id);
      expect(updatedUserDoc).to.deep.include({ ...userDoc, contact_id: userSettingsDoc.contact_id });
    }
  });

  it('skips users that do not exist in _users', async () => {
    const userSettingsDoc = createUserSettingsDoc('org.couchdb.user:missing-chw', 'contact');
    await utils.initDb([ userSettingsDoc ]);
    sinon.spy(logger, 'warn');

    await utils.runMigration('add-contact-id-to-user-docs');

    expect(logger.warn.calledOnce).to.equal(true);
    expect(logger.warn.firstCall.args[0]).to
      .equal(`User with id "${userSettingsDoc._id}" does not exist anymore, skipping it.`);
    await utils.assertDb([ userSettingsDoc ]);
    try {
      await getUserDoc(userSettingsDoc._id);
      expect.fail('Expected to throw');
    } catch (e) {
      expect(e.status).to.equal(404);
    }
  });

  it('overwrites any existing contact_id value in _users', async () => {
    const userSettingsDocs = [
      createUserSettingsDoc('org.couchdb.user:different-contact', 'contact'),
      createUserSettingsDoc('org.couchdb.user:no-contact')
    ];
    await utils.initDb(userSettingsDocs);
    const userDocs = [
      {
        ...createUserDoc(userSettingsDocs[0]),
        contact_id: 'old-contact'
      },
      {
        ...createUserDoc(userSettingsDocs[1]),
        contact_id: 'old-contact'
      },
    ];
    await writeUserDocs(userDocs);

    await utils.runMigration('add-contact-id-to-user-docs');

    await utils.assertDb(userSettingsDocs);

    const updatedUserDoc0 = await getUserDoc(userDocs[0]._id);
    expect(updatedUserDoc0).to.deep.include({ ...userDocs[0], contact_id: userSettingsDocs[0].contact_id });
    const updatedUserDoc1 = await getUserDoc(userDocs[1]._id);
    const expectedUserDoc1 = { ...userDocs[1] };
    delete expectedUserDoc1.contact_id;
    expect(updatedUserDoc1).to.deep.include(expectedUserDoc1);
    expect(updatedUserDoc1.contact_id).to.be.undefined;
  });
});
