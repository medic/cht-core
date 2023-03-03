const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const messagesUtils = require('../../../utils/messages');
const { assert } = require('chai');

const CLINIC = utils.deepFreeze({
  _id: 'clinic',
  type: 'clinic',
});

const ORIGINAL_PERSON = utils.deepFreeze({
  _id: 'original_person',
  type: 'person',
  name: 'Original Person',
  parent: { _id: CLINIC._id },
});

const NEW_PERSON = utils.deepFreeze({
  _id: 'new_person',
  type: 'person',
  name: 'New Person',
  phone: '+254712345678',
  parent: { _id: CLINIC._id },
});

const ORIGINAL_USER = utils.deepFreeze({
  username: 'original_person',
  password: 'Sup3rSecret!',
  place: CLINIC._id,
  contact: ORIGINAL_PERSON,
  roles: ['chw'],
});

const newUsers = [];

const getSettings = ({
  transitions: { create_user_for_contacts = true } = {},
  token_login: { enabled = true } = {},
  app_url = 'http://localhost:5988',
} = {}) => ({
  transitions: { create_user_for_contacts },
  token_login: { enabled },
  app_url,
});

const loginAsUser = ({ username, password }) => {
  const opts = {
    path: '/medic/login',
    method: 'POST',
    simple: false,
    noAuth: true,
    body: { user: username, password },
    followRedirect: false,
  };
  return utils.request(opts);
};

const updateUserPassword = (username, password) => utils.request({
  path: `/api/v1/users/${username}`,
  method: 'POST',
  body: { password }
});

describe('create_user_for_contacts', () => {
  beforeEach(() => utils.saveDoc(CLINIC));

  afterEach(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers(newUsers.map(username => ({ username })));
    newUsers.length = 0;
  });

  it('disables transitions if create_user_for_contacts is enabled but token_login is not enabled', async () => {
    const tokenLoginErrorPattern =
      /Configuration error\. Token login must be enabled to use the create_user_for_contacts transition\./;
    const transitionsDisabledPattern = /Transitions are disabled until the above configuration errors are fixed\./;

    const collectLogs = await utils.collectSentinelLogs(tokenLoginErrorPattern, transitionsDisabledPattern);
    await utils.updateSettings(getSettings({ token_login: { enabled: false } }), 'sentinel');
    // Wait a bit before collecting logs. Cannot wait on directly on Sentinel because no docs are being processed
    await sentinelUtils.getCurrentSeq();
    const logs = await collectLogs();
    assert.exists(logs.find(log => log.match(tokenLoginErrorPattern)));
    assert.exists(logs.find(log => log.match(transitionsDisabledPattern)));
  });

  it('disables transitions if create_user_for_contacts is enabled but an app_url is not set', async () => {
    const appUrlErrorPattern =
      /Configuration error\. The app_url must be defined to use the create_user_for_contacts transition\./;
    const transitionsDisabledPattern = /Transitions are disabled until the above configuration errors are fixed\./;

    const collectLogs = await utils.collectSentinelLogs(appUrlErrorPattern, transitionsDisabledPattern);
    await utils.updateSettings(getSettings({ app_url: '' }), 'sentinel');
    // Wait a bit before collecting logs. Cannot wait on directly on Sentinel because no docs are being processed
    await sentinelUtils.getCurrentSeq();
    const logs = await collectLogs();
    assert.exists(logs.find(log => log.match(appUrlErrorPattern)));
    assert.exists(logs.find(log => log.match(transitionsDisabledPattern)));
  });

  it('does nothing when no users should be created for the contact', async () => {
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDoc(NEW_PERSON);
    const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
    originalContact.name = 'Updated Person';
    await utils.saveDoc(originalContact);
    await sentinelUtils.waitForSentinel(originalContact._id);
    const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

    assert.isUndefined(transitions.create_user_for_contacts);

    // Original contact not updated
    const originalPerson = await utils.getDoc(ORIGINAL_PERSON._id);
    assert.isUndefined(originalPerson.errors);
    // New user not created
    const newUserSettings = await utils.getUserSettings({ contactId: NEW_PERSON._id });
    assert.isEmpty(newUserSettings);
  });

  it('replaces user but does not create a new user for the same contact in the same transition', async () => {
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    // Can log in as user
    assert.include(await loginAsUser(ORIGINAL_USER), { statusCode: 302 });
    await utils.saveDoc(NEW_PERSON);
    // Write another contact that has a user being created and another user being replaced
    // (This is an approximation of behavior that could happen if Sentinel was down when the
    // contact was initially created and so this is the first time it is being processed by Sentinel)
    const additionalPerson = {
      _id: 'additional_person',
      type: 'person',
      name: 'Additional Person',
      phone: '+254712345679',
      parent: { _id: CLINIC._id },
      role: 'chw',
      user_for_contact: {
        create: 'true',
        replace: {
          [ORIGINAL_USER.username]: {
            replacement_contact_id: NEW_PERSON._id,
            status: 'READY'
          }
        }
      }
    };

    await utils.saveDoc(additionalPerson);
    await sentinelUtils.waitForSentinel(additionalPerson._id);
    const { transitions } = await sentinelUtils.getInfoDoc(additionalPerson._id);

    // Transition successful
    assert.isTrue(transitions.create_user_for_contacts.ok);
    // Can no longer log in as user
    assert.include(await loginAsUser(ORIGINAL_USER), { statusCode: 401 });
    // User's password was automatically reset. Change it to something we know.
    await updateUserPassword(ORIGINAL_USER.username, 'n3wPassword!');
    // Can still login as original user with new password
    assert.include(await loginAsUser({ ...ORIGINAL_USER, password: 'n3wPassword!' }), { statusCode: 302 });

    // New replacement user created
    const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: NEW_PERSON._id });
    assert.isEmpty(additionalUsers);
    newUsers.push(newUserSettings.name);
    assert.deepInclude(newUserSettings, {
      roles: ORIGINAL_USER.roles,
      phone: NEW_PERSON.phone,
      facility_id: NEW_PERSON.parent._id,
      contact_id: NEW_PERSON._id,
      fullname: NEW_PERSON.name,
    });
    assert.isTrue(newUserSettings.token_login.active);
    assert.match(newUserSettings._id, /^org\.couchdb\.user:new-person-\d\d\d\d/);
    assert.match(newUserSettings.name, /^new-person-\d\d\d\d$/);

    // New user created for additional contact
    const moreUsers = await utils.getUserSettings({ contactId: additionalPerson._id });
    assert.isEmpty(moreUsers);

    const originalContact = await utils.getDoc(additionalPerson._id);
    assert.deepEqual(originalContact.user_for_contact, {
      replace: {
        [ORIGINAL_USER.username]: {
          replacement_contact_id: NEW_PERSON._id,
          status: 'COMPLETE'
        }
      }
    });

    // Login token sent
    const queuedMsgs = await messagesUtils.getQueuedMessages();
    assert.lengthOf(queuedMsgs, 1);
    assert.deepInclude(queuedMsgs[0], {
      type: 'token_login',
      user: newUserSettings._id
    });
    assert.equal(queuedMsgs[0].tasks[0].messages[0].to, NEW_PERSON.phone);
  });

  describe('user replace', () => {
    const expectError = async (errorPattern) => {
      // Error saved on the contact
      const originalPersonUpdated = await utils.getDoc(ORIGINAL_PERSON._id);
      assert.lengthOf(originalPersonUpdated.errors, 1);
      const [{ code, message }] = originalPersonUpdated.errors;
      assert.equal(code, 'create_user_for_contacts_error\'');
      assert.match(message, errorPattern);
      // New user not created
      const newUserSettings = await utils.getUserSettings({ contactId: NEW_PERSON._id });
      assert.isEmpty(newUserSettings);
    };

    it('replaces user for contact', async () => {
      await utils.updateSettings(getSettings(), 'sentinel');
      await utils.createUsers([ORIGINAL_USER]);
      newUsers.push(ORIGINAL_USER.username);
      // Can log in as user
      assert.include(await loginAsUser(ORIGINAL_USER), { statusCode: 302 });
      await utils.saveDoc(NEW_PERSON);
      const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
      originalContact.user_for_contact = {
        replace: {
          [ORIGINAL_USER.username]: {
            replacement_contact_id: NEW_PERSON._id,
            status: 'READY'
          }
        },
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      // Transition successful
      assert.isTrue(transitions.create_user_for_contacts.ok);
      // Can no longer log in as user
      assert.include(await loginAsUser(ORIGINAL_USER), { statusCode: 401 });
      // User's password was automatically reset. Change it to something we know.
      await updateUserPassword(ORIGINAL_USER.username, 'n3wPassword!');
      // Can still login as original user with new password
      assert.include(await loginAsUser({ ...ORIGINAL_USER, password: 'n3wPassword!' }), { statusCode: 302 });

      // New user created
      const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: NEW_PERSON._id });
      assert.isEmpty(additionalUsers);
      newUsers.push(newUserSettings.name);
      assert.deepInclude(newUserSettings, {
        roles: ORIGINAL_USER.roles,
        phone: NEW_PERSON.phone,
        facility_id: NEW_PERSON.parent._id,
        contact_id: NEW_PERSON._id,
        fullname: NEW_PERSON.name,
      });
      assert.isTrue(newUserSettings.token_login.active);
      assert.match(newUserSettings._id, /^org\.couchdb\.user:new-person-\d\d\d\d/);
      assert.match(newUserSettings.name, /^new-person-\d\d\d\d$/);
      // Login token sent
      const queuedMsgs = await messagesUtils.getQueuedMessages();
      assert.lengthOf(queuedMsgs, 1);
      assert.deepInclude(queuedMsgs[0], {
        type: 'token_login',
        user: newUserSettings._id
      });
      assert.equal(queuedMsgs[0].tasks[0].messages[0].to, NEW_PERSON.phone);
    });

    it('replaces user for a contact when the contact is associated with multiple users', async () => {
      await utils.updateSettings(getSettings(), 'sentinel');
      await utils.createUsers([ORIGINAL_USER]);
      newUsers.push(ORIGINAL_USER.username);
      const otherUser = { ...ORIGINAL_USER, username: 'other_user', contact: ORIGINAL_PERSON._id };
      await utils.createUsers([otherUser]);
      newUsers.push(otherUser.username);
      // Can log in as user
      assert.include(await loginAsUser(ORIGINAL_USER), { statusCode: 302 });
      await utils.saveDoc(NEW_PERSON);
      const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
      originalContact.user_for_contact = {
        replace: {
          [ORIGINAL_USER.username]: {
            replacement_contact_id: NEW_PERSON._id,
            status: 'READY'
          },
        },
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      // Transition successful
      assert.isTrue(transitions.create_user_for_contacts.ok);
      // Can no longer log in as user
      assert.include(await loginAsUser(ORIGINAL_USER), { statusCode: 401 });
      // User's password was automatically reset. Change it to something we know.
      await updateUserPassword(ORIGINAL_USER.username, 'n3wPassword!');
      // Can still login as original user with new password
      assert.include(await loginAsUser({ ...ORIGINAL_USER, password: 'n3wPassword!' }), { statusCode: 302 });
      // New user created
      const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: NEW_PERSON._id });
      assert.isEmpty(additionalUsers);
      newUsers.push(newUserSettings.name);
      assert.deepInclude(newUserSettings, {
        roles: ORIGINAL_USER.roles,
        phone: NEW_PERSON.phone,
        facility_id: NEW_PERSON.parent._id,
        contact_id: NEW_PERSON._id,
        fullname: NEW_PERSON.name,
      });
      assert.isTrue(newUserSettings.token_login.active);
      assert.match(newUserSettings._id, /^org\.couchdb\.user:new-person-\d\d\d\d/);
      assert.match(newUserSettings.name, /^new-person-\d\d\d\d$/);
      // Login token sent
      const queuedMsgs = await messagesUtils.getQueuedMessages();
      assert.lengthOf(queuedMsgs, 1);
      assert.deepInclude(queuedMsgs[0], {
        type: 'token_login',
        user: newUserSettings._id
      });
      assert.equal(queuedMsgs[0].tasks[0].messages[0].to, NEW_PERSON.phone);

      // Other user still associated with original contact
      const [otherUserSettings] = await utils.getUserSettings({ name: otherUser.username });
      assert.equal(otherUserSettings.contact_id, ORIGINAL_PERSON._id);
      // Can still log in as other user
      assert.include(await loginAsUser(otherUser), { statusCode: 302 });
    });

    it('replaces multiple users for a contact', async () => {
      await utils.updateSettings(getSettings(), 'sentinel');
      await utils.createUsers([ORIGINAL_USER]);
      newUsers.push(ORIGINAL_USER.username);
      const otherUser = { ...ORIGINAL_USER, username: 'other_user', contact: ORIGINAL_PERSON._id };
      await utils.createUsers([otherUser]);
      newUsers.push(otherUser.username);
      // Can log in as users
      assert.include(await loginAsUser(ORIGINAL_USER), { statusCode: 302 });
      assert.include(await loginAsUser(otherUser), { statusCode: 302 });
      await utils.saveDoc(NEW_PERSON);
      const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
      originalContact.user_for_contact = {
        replace: {
          [ORIGINAL_USER.username]: {
            replacement_contact_id: NEW_PERSON._id,
            status: 'READY'
          },
          [otherUser.username]: {
            replacement_contact_id: NEW_PERSON._id,
            status: 'READY'
          },
        },
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      // Transition successful
      assert.isTrue(transitions.create_user_for_contacts.ok);
      // Can no longer log in as users
      assert.include(await loginAsUser(ORIGINAL_USER), { statusCode: 401 });
      assert.include(await loginAsUser(otherUser), { statusCode: 401 });
      // User's password was automatically reset. Change it to something we know.
      await updateUserPassword(ORIGINAL_USER.username, 'n3wPassword!');
      await updateUserPassword(otherUser.username, 'n3wPassword!');
      // Can still login as original user with new password
      assert.include(await loginAsUser({ ...ORIGINAL_USER, password: 'n3wPassword!' }), { statusCode: 302 });
      assert.include(await loginAsUser({ ...otherUser, password: 'n3wPassword!' }), { statusCode: 302 });
      // New users created
      const [newUserSettings0, newUserSettings1, ...additionalUsers] =
        await utils.getUserSettings({ contactId: NEW_PERSON._id });
      assert.isEmpty(additionalUsers);
      newUsers.push(newUserSettings0.name);
      newUsers.push(newUserSettings1.name);
      [newUserSettings0, newUserSettings1].forEach(newUserSettings => {
        assert.deepInclude(newUserSettings, {
          roles: ORIGINAL_USER.roles,
          phone: NEW_PERSON.phone,
          facility_id: NEW_PERSON.parent._id,
          contact_id: NEW_PERSON._id,
          fullname: NEW_PERSON.name,
        });
        assert.isTrue(newUserSettings.token_login.active);
        assert.match(newUserSettings._id, /^org\.couchdb\.user:new-person-\d\d\d\d/);
        assert.match(newUserSettings.name, /^new-person-\d\d\d\d$/);
      });

      // Login tokens sent
      const queuedMsgs = await messagesUtils.getQueuedMessages();
      assert.lengthOf(queuedMsgs, 2);
      queuedMsgs.forEach(msg => {
        assert.equal(msg.type, 'token_login');
        assert.equal(msg.tasks[0].messages[0].to, NEW_PERSON.phone);
      });
      const queuedMsg0 = queuedMsgs.find(msg => msg.user === newUserSettings0._id);
      assert.exists(queuedMsg0);
      const queuedMsg1 = queuedMsgs.find(msg => msg.user === newUserSettings1._id);
      assert.exists(queuedMsg1);
    });

    it('does not replace user when transition is disabled', async () => {
      await utils.updateSettings(getSettings({ transitions: { create_user_for_contacts: false } }), 'sentinel');
      await utils.createUsers([ORIGINAL_USER]);
      newUsers.push(ORIGINAL_USER.username);
      await utils.saveDoc(NEW_PERSON);
      const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
      originalContact.user_for_contact = {
        replace: {
          [ORIGINAL_USER.username]: {
            replacement_contact_id: NEW_PERSON._id,
            status: 'READY'
          }
        },
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isEmpty(Object.keys(transitions));
      const newUserSettings = await utils.getUserSettings({ contactId: NEW_PERSON._id });
      assert.isEmpty(newUserSettings);
    });

    it('does not replace user when the new contact does not exist', async () => {
      const missingPersonPattern = /Failed to find person/;
      const collectLogs = await utils.collectSentinelLogs(missingPersonPattern);
      await utils.updateSettings(getSettings(), 'sentinel');
      await utils.createUsers([ORIGINAL_USER]);
      newUsers.push(ORIGINAL_USER.username);
      const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
      originalContact.user_for_contact = {
        replace: {
          [ORIGINAL_USER.username]: {
            replacement_contact_id: NEW_PERSON._id,
            status: 'READY'
          }
        },
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isFalse(transitions.create_user_for_contacts.ok);
      assert.isNotEmpty(await collectLogs());
      await expectError(missingPersonPattern);
    });

    it('does not replace user when the original user does not exist', async () => {
      const missingUserPattern = /Failed to find user with name \[original_person] in the \[(users|medic)] database\./;
      const collectLogs = await utils.collectSentinelLogs(missingUserPattern);
      await utils.updateSettings(getSettings(), 'sentinel');
      await utils.saveDocs([ORIGINAL_PERSON, NEW_PERSON]);
      const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
      originalContact.user_for_contact = {
        replace: {
          [ORIGINAL_USER.username]: {
            replacement_contact_id: NEW_PERSON._id,
            status: 'READY'
          }
        },
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isFalse(transitions.create_user_for_contacts.ok);
      assert.isNotEmpty(await collectLogs());
      await expectError(missingUserPattern);
    });

    it('does not replace user when the new contact does not have a phone', async () => {
      const missingPhonePattern = /Missing required fields: phone/;
      const newPerson = { ...NEW_PERSON, phone: undefined };

      const collectLogs = await utils.collectSentinelLogs(missingPhonePattern);
      await utils.updateSettings(getSettings(), 'sentinel');
      await utils.createUsers([ORIGINAL_USER]);
      newUsers.push(ORIGINAL_USER.username);
      await utils.saveDoc(newPerson);
      const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
      originalContact.user_for_contact = {
        replace: {
          [ORIGINAL_USER.username]: {
            replacement_contact_id: newPerson._id,
            status: 'READY'
          },
        },
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isFalse(transitions.create_user_for_contacts.ok);
      assert.isNotEmpty(await collectLogs());
      await expectError(missingPhonePattern);
    });

    it('does not replace user when the new contact has an invalid phone', async () => {
      const invalidPhonePattern = /A valid phone number is required for SMS login/;
      const newPerson = { ...NEW_PERSON, phone: 12345 };

      const collectLogs = await utils.collectSentinelLogs(invalidPhonePattern);
      await utils.updateSettings(getSettings(), 'sentinel');
      await utils.createUsers([ORIGINAL_USER]);
      newUsers.push(ORIGINAL_USER.username);
      await utils.saveDoc(newPerson);
      const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
      originalContact.user_for_contact = {
        replace: {
          [ORIGINAL_USER.username]: {
            replacement_contact_id: newPerson._id,
            status: 'READY'
          }
        },
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isFalse(transitions.create_user_for_contacts.ok);
      assert.isNotEmpty(await collectLogs());
      await expectError(invalidPhonePattern);
    });

    it('does not replace user when the new contact does not have a name', async () => {
      const missingNamePattern = /Contact \[new_person] must have a name\./;
      const newPerson = { ...NEW_PERSON, name: undefined };

      const collectLogs = await utils.collectSentinelLogs(missingNamePattern);
      await utils.updateSettings(getSettings(), 'sentinel');
      await utils.createUsers([ORIGINAL_USER]);
      newUsers.push(ORIGINAL_USER.username);
      await utils.saveDoc(newPerson);
      const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
      originalContact.user_for_contact = {
        replace: {
          [ORIGINAL_USER.username]: {
            replacement_contact_id: newPerson._id,
            status: 'READY'
          }
        },
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isFalse(transitions.create_user_for_contacts.ok);
      assert.isNotEmpty(await collectLogs());
      await expectError(missingNamePattern);
    });

    it('does not replace user when the contact replace data does not have an new contact id', async () => {
      const missingIdPattern = /No id was provided for the new replacement contact\./;

      const collectLogs = await utils.collectSentinelLogs(missingIdPattern);
      await utils.updateSettings(getSettings(), 'sentinel');
      await utils.createUsers([ORIGINAL_USER]);
      newUsers.push(ORIGINAL_USER.username);
      await utils.saveDoc(NEW_PERSON);
      const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
      originalContact.user_for_contact = {
        replace: {
          [ORIGINAL_USER.username]: {
            status: 'READY'
          }
        }
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isFalse(transitions.create_user_for_contacts.ok);
      assert.isNotEmpty(await collectLogs());
      await expectError(missingIdPattern);
    });

    it('does not replace user when the replace status is not READY', async () => {
      await utils.updateSettings(getSettings(), 'sentinel');
      await utils.createUsers([ORIGINAL_USER]);
      newUsers.push(ORIGINAL_USER.username);
      await utils.saveDoc(NEW_PERSON);
      const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
      originalContact.user_for_contact = {
        replace: {
          [ORIGINAL_USER.username]: {
            replacement_contact_id: NEW_PERSON._id,
            status: 'PENDING'
          }
        },
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isUndefined(transitions.create_user_for_contacts);

      // Original contact not updated
      const originalPerson = await utils.getDoc(ORIGINAL_PERSON._id);
      assert.isUndefined(originalPerson.errors);
      // New user not created
      const newUserSettings = await utils.getUserSettings({ contactId: NEW_PERSON._id });
      assert.isEmpty(newUserSettings);
    });

    it('does not replace user when the contact being replaced is not a person', async () => {
      await utils.updateSettings(getSettings(), 'sentinel');
      await utils.createUsers([ORIGINAL_USER]);
      newUsers.push(ORIGINAL_USER.username);
      await utils.saveDoc(NEW_PERSON);
      const clinic = await utils.getDoc(CLINIC._id);
      clinic.user_for_contact = { replace: { by: NEW_PERSON._id, status: 'READY' } };
      await utils.saveDoc(clinic);
      await sentinelUtils.waitForSentinel(clinic._id);
      const { transitions } = await sentinelUtils.getInfoDoc(clinic._id);

      assert.isUndefined(transitions.create_user_for_contacts);

      // Original contact not updated
      const originalPerson = await utils.getDoc(ORIGINAL_PERSON._id);
      assert.isUndefined(originalPerson.errors);
      // New user not created
      const newUserSettings = await utils.getUserSettings({ contactId: NEW_PERSON._id });
      assert.isEmpty(newUserSettings);
    });
  });

  describe('user create', () => {
    const expectError = async (errorPattern) => {
      // Error saved on the contact
      const originalPersonUpdated = await utils.getDoc(NEW_PERSON._id);
      assert.lengthOf(originalPersonUpdated.errors, 1);
      const [{ code, message }] = originalPersonUpdated.errors;
      assert.equal(code, 'create_user_for_contacts_error\'');
      assert.match(message, errorPattern);
      // New user not created
      const newUserSettings = await utils.getUserSettings({ contactId: NEW_PERSON._id });
      assert.isEmpty(newUserSettings);
    };

    it('creates user for new contact with multiple roles', async () => {
      await utils.updateSettings(getSettings(), 'sentinel');

      const originalContact = {
        roles: ['chw', 'other-role'],
        user_for_contact: { create: 'true' },
        ...NEW_PERSON
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      // Transition successful
      assert.isTrue(transitions.create_user_for_contacts.ok);
      // Contact updated
      const updatedContact = await utils.getDoc(originalContact._id);
      assert.isUndefined(updatedContact.user_for_contact.create);

      // New user created
      const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: originalContact._id });
      assert.isEmpty(additionalUsers);
      newUsers.push(newUserSettings.name);
      assert.deepInclude(newUserSettings, {
        roles: originalContact.roles,
        phone: originalContact.phone,
        facility_id: originalContact.parent._id,
        contact_id: originalContact._id,
        fullname: originalContact.name,
      });
      assert.isTrue(newUserSettings.token_login.active);
      assert.match(newUserSettings._id, /^org\.couchdb\.user:new-person-\d\d\d\d/);
      assert.match(newUserSettings.name, /^new-person-\d\d\d\d$/);
      // Login token sent
      const queuedMsgs = await messagesUtils.getQueuedMessages();
      assert.lengthOf(queuedMsgs, 1);
      assert.deepInclude(queuedMsgs[0], {
        type: 'token_login',
        user: newUserSettings._id
      });
      assert.equal(queuedMsgs[0].tasks[0].messages[0].to, NEW_PERSON.phone);
    });

    it('creates user for new contact with single role', async () => {
      await utils.updateSettings(getSettings(), 'sentinel');

      const originalContact = {
        role: 'chw',
        user_for_contact: { create: 'true' },
        ...NEW_PERSON
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      // Transition successful
      assert.isTrue(transitions.create_user_for_contacts.ok);
      // Contact updated
      const updatedContact = await utils.getDoc(originalContact._id);
      assert.isUndefined(updatedContact.user_for_contact.create);

      // New user created
      const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: originalContact._id });
      assert.isEmpty(additionalUsers);
      newUsers.push(newUserSettings.name);
      assert.deepInclude(newUserSettings, {
        roles: [originalContact.role],
        phone: originalContact.phone,
        facility_id: originalContact.parent._id,
        contact_id: originalContact._id,
        fullname: originalContact.name,
      });
      assert.isTrue(newUserSettings.token_login.active);
      assert.match(newUserSettings._id, /^org\.couchdb\.user:new-person-\d\d\d\d/);
      assert.match(newUserSettings.name, /^new-person-\d\d\d\d$/);
      // Login token sent
      const queuedMsgs = await messagesUtils.getQueuedMessages();
      assert.lengthOf(queuedMsgs, 1);
      assert.deepInclude(queuedMsgs[0], {
        type: 'token_login',
        user: newUserSettings._id
      });
      assert.equal(queuedMsgs[0].tasks[0].messages[0].to, NEW_PERSON.phone);
    });

    it('does not create user when transition is disabled', async () => {
      await utils.updateSettings(getSettings({ transitions: { create_user_for_contacts: false } }), 'sentinel');

      const originalContact = {
        roles: ['chw', 'other-role'],
        user_for_contact: { create: 'true' },
        ...NEW_PERSON
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isEmpty(Object.keys(transitions));
      const newUserSettings = await utils.getUserSettings({ contactId: originalContact._id });
      assert.isEmpty(newUserSettings);
    });

    it('does not create user when the new contact does not have a role', async () => {
      const missingRolePattern = /must have a "role" or "roles" property/;
      const collectLogs = await utils.collectSentinelLogs(missingRolePattern);

      await utils.updateSettings(getSettings(), 'sentinel');

      const originalContact = {
        ...NEW_PERSON,
        user_for_contact: { create: 'true' },
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isFalse(transitions.create_user_for_contacts.ok);
      assert.isNotEmpty(await collectLogs());
      await expectError(missingRolePattern);
    });

    it('does not create user when the new contact does not have a phone', async () => {
      const missingPhonePattern = /Missing required fields: phone/;
      const collectLogs = await utils.collectSentinelLogs(missingPhonePattern);

      await utils.updateSettings(getSettings(), 'sentinel');

      const originalContact = {
        ...NEW_PERSON,
        roles: ['chw', 'other-role'],
        user_for_contact: { create: 'true' },
        phone: undefined
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isFalse(transitions.create_user_for_contacts.ok);
      assert.isNotEmpty(await collectLogs());
      await expectError(missingPhonePattern);
    });

    it('does not create user when the new contact has an invalid phone', async () => {
      const invalidPhonePattern = /A valid phone number is required for SMS login/;
      const collectLogs = await utils.collectSentinelLogs(invalidPhonePattern);

      await utils.updateSettings(getSettings(), 'sentinel');

      const originalContact = {
        ...NEW_PERSON,
        roles: ['chw', 'other-role'],
        user_for_contact: { create: 'true' },
        phone: 12345
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isFalse(transitions.create_user_for_contacts.ok);
      assert.isNotEmpty(await collectLogs());
      await expectError(invalidPhonePattern);
    });

    it('does not create user when the new contact does not have a name', async () => {
      const missingNamePattern = /Contact \[new_person] must have a name\./;
      const collectLogs = await utils.collectSentinelLogs(missingNamePattern);

      await utils.updateSettings(getSettings(), 'sentinel');

      const originalContact = {
        ...NEW_PERSON,
        roles: ['chw', 'other-role'],
        user_for_contact: { create: 'true' },
        name: undefined
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isFalse(transitions.create_user_for_contacts.ok);
      assert.isNotEmpty(await collectLogs());
      await expectError(missingNamePattern);
    });

    it(`does not create user when the create is not 'true'`, async () => {
      await utils.updateSettings(getSettings(), 'sentinel');
      const originalContact = {
        ...NEW_PERSON,
        roles: ['chw', 'other-role'],
        user_for_contact: { create: 'false', },
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isUndefined(transitions.create_user_for_contacts);

      // Original contact not updated
      const updatedContact = await utils.getDoc(originalContact._id);
      assert.deepEqualExcluding(originalContact, updatedContact, ['_rev']);
      // New user not created
      const newUserSettings = await utils.getUserSettings({ contactId: originalContact._id });
      assert.isEmpty(newUserSettings);
    });

    it('does not create user when the contact being added is not a person', async () => {
      await utils.updateSettings(getSettings(), 'sentinel');
      await utils.createUsers([ORIGINAL_USER]);
      newUsers.push(ORIGINAL_USER.username);
      await utils.saveDoc(NEW_PERSON);
      const clinic = await utils.getDoc(CLINIC._id);
      const originalContact = {
        ...clinic,
        user_for_contact: { create: 'true' },
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isUndefined(transitions.create_user_for_contacts);

      // Original contact not updated
      const updatedContact = await utils.getDoc(originalContact._id);
      assert.deepEqualExcluding(originalContact, updatedContact, ['_rev']);
      // New user not created
      const newUserSettings = await utils.getUserSettings({ contactId: originalContact._id });
      assert.isEmpty(newUserSettings);
    });

    it('does not create user when editing contact', async () => {
      await utils.updateSettings(getSettings(), 'sentinel');

      await utils.saveDoc(NEW_PERSON);
      await sentinelUtils.waitForSentinel(NEW_PERSON._id);
      const originalContact = {
        role: 'chw',
        user_for_contact: { create: 'true' },
        ...(await utils.getDoc(NEW_PERSON._id))
      };
      await utils.saveDoc(originalContact);
      await sentinelUtils.waitForSentinel(originalContact._id);
      const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

      assert.isUndefined(transitions.create_user_for_contacts);

      // Original contact not updated
      const updatedContact = await utils.getDoc(originalContact._id);
      assert.deepEqualExcluding(originalContact, updatedContact, ['_rev']);
      // New user not created
      const newUserSettings = await utils.getUserSettings({ contactId: originalContact._id });
      assert.isEmpty(newUserSettings);
    });
  });
});
