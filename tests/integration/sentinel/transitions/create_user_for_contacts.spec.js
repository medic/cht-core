const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const { expect } = require('chai');

const CLINIC = {
  _id: 'clinic',
  type: 'clinic',
};

const ORIGINAL_PERSON = {
  _id: 'original_person',
  type: 'person',
  name: 'Original Person',
  parent: { _id: CLINIC._id },
};

const NEW_PERSON = {
  _id: 'new_person',
  type: 'person',
  name: 'New Person',
  phone: '+254712345678',
  parent: { _id: CLINIC._id },
};

const ORIGINAL_USER = {
  username: 'original_person',
  password: 'Sup3rSecret!',
  place: CLINIC._id,
  contact: ORIGINAL_PERSON,
  roles: ['chw'],
};

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

const getQueuedMessages = () => utils.db
  .query('medic-admin/message_queue', { reduce: false, include_docs: true })
  .then(response => response.rows.map(row => row.doc));

const expectError = async (errorPattern) => {
  // Error saved on the replace_user report
  const originalPerson_updated = await utils.getDoc(ORIGINAL_PERSON._id);
  expect(originalPerson_updated.errors).to.have.lengthOf(1);
  const [{ code, message }] = originalPerson_updated.errors;
  expect(code).to.equal('create_user_for_contacts_error\'');
  expect(message).to.match(errorPattern);
  // New user not created
  const newUserSettings = await utils.getUserSettings({ contactId: NEW_PERSON._id });
  expect(newUserSettings).to.be.undefined;
};

describe('create_user_for_contacts', () => {
  beforeEach(() => utils.saveDoc(CLINIC));

  afterEach(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers(newUsers.map(username => ({ username })));
    newUsers.length = 0;
  });

  it('replaces user when the replace_user form is submitted', async () => {
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDoc(NEW_PERSON);
    const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
    originalContact.user_for_contact = { replaced: { by: NEW_PERSON._id, status: 'READY' } };
    await utils.saveDoc(originalContact);
    await sentinelUtils.waitForSentinel(originalContact._id);
    const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

    // Transition successful
    expect(transitions.create_user_for_contacts.ok).to.be.true;
    // Original user is disabled
    const originalUserSettings = await utils.getUserSettings({ contactId: ORIGINAL_PERSON._id });
    expect(originalUserSettings.inactive).to.be.true;
    // New user created
    const newUserSettings = await utils.getUserSettings({ contactId: NEW_PERSON._id });
    newUsers.push(newUserSettings.name);
    expect(newUserSettings).to.deep.include({
      roles: ORIGINAL_USER.roles,
      phone: NEW_PERSON.phone,
      facility_id: NEW_PERSON.parent._id,
      contact_id: NEW_PERSON._id,
      fullname: NEW_PERSON.name,
    });
    expect(newUserSettings.token_login.active).to.be.true;
    expect(newUserSettings._id).to.match(/^org\.couchdb\.user:new-person-\d\d\d\d/);
    expect(newUserSettings.name).to.match(/^new-person-\d\d\d\d$/);
    // Login token sent
    const queuedMsgs = await getQueuedMessages();
    expect(queuedMsgs).to.have.lengthOf(1);
    expect(queuedMsgs[0]).to.deep.include({
      type: 'token_login',
      user: newUserSettings._id
    });
    expect(queuedMsgs[0].tasks[0].messages[0].to).to.equal(NEW_PERSON.phone);
  });

  it('does not replace user when transition is disabled', async () => {
    await utils.updateSettings(getSettings({ transitions: { create_user_for_contacts: false } }), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDoc(NEW_PERSON);
    const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
    originalContact.user_for_contact = { replaced: { by: NEW_PERSON._id, status: 'READY' } };
    await utils.saveDoc(originalContact);
    await sentinelUtils.waitForSentinel(originalContact._id);
    const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

    expect(Object.keys(transitions)).to.be.empty;
    const newUserSettings = await utils.getUserSettings({ contactId: NEW_PERSON._id });
    expect(newUserSettings).to.be.undefined;
  });

  it('disables transitions if replace_user is enabled but token_login is not enabled', async () => {
    const tokenLoginErrorPattern =
      /Configuration error\. Token login must be enabled to use the create_user_for_contacts transition\./;
    const transitionsDisabledPattern = /Transitions are disabled until the above configuration errors are fixed\./;

    const collectLogs = await utils.collectSentinelLogs(tokenLoginErrorPattern, transitionsDisabledPattern);
    await utils.updateSettings(getSettings({ token_login: { enabled: false } }), 'sentinel');
    const logs = await collectLogs();
    expect(logs.find(log => log.match(tokenLoginErrorPattern))).to.exist;
    expect(logs.find(log => log.match(transitionsDisabledPattern))).to.exist;
  });

  it('disables transitions if replace_user is enabled but an app_url is not set', async () => {
    const appUrlErrorPattern =
      /Configuration error\. The app_url must be defined to use the create_user_for_contacts transition\./;
    const transitionsDisabledPattern = /Transitions are disabled until the above configuration errors are fixed\./;

    const collectLogs = await utils.collectSentinelLogs(appUrlErrorPattern, transitionsDisabledPattern);
    await utils.updateSettings(getSettings({ app_url: '' }), 'sentinel');
    const logs = await collectLogs();
    expect(logs.find(log => log.match(appUrlErrorPattern))).to.exist;
    expect(logs.find(log => log.match(transitionsDisabledPattern))).to.exist;
  });

  it('does not replace user when the new contact does not exist', async () => {
    const missingPersonPattern = /Failed to find person/;
    const collectLogs = await utils.collectSentinelLogs(missingPersonPattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
    originalContact.user_for_contact = { replaced: { by: NEW_PERSON._id, status: 'READY' } };
    await utils.saveDoc(originalContact);
    await sentinelUtils.waitForSentinel(originalContact._id);
    const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

    expect(transitions.create_user_for_contacts.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(missingPersonPattern);
  });

  it('does not replace user when the original user does not exist', async () => {
    const missingUserPattern = /Failed to find user setting with contact_id \[original_person]\./;
    const collectLogs = await utils.collectSentinelLogs(missingUserPattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.saveDocs([ORIGINAL_PERSON, NEW_PERSON]);
    const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
    originalContact.user_for_contact = { replaced: { by: NEW_PERSON._id, status: 'READY' } };
    await utils.saveDoc(originalContact);
    await sentinelUtils.waitForSentinel(originalContact._id);
    const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

    expect(transitions.create_user_for_contacts.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(missingUserPattern);
  });

  it('does not replace user when the new contact does not have a phone', async () => {
    const missingPhonePattern = /Missing required fields: phone/;
    const newPerson = Object.assign({}, NEW_PERSON, { phone: undefined });

    const collectLogs = await utils.collectSentinelLogs(missingPhonePattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDoc(newPerson);
    const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
    originalContact.user_for_contact = { replaced: { by: newPerson._id, status: 'READY' } };
    await utils.saveDoc(originalContact);
    await sentinelUtils.waitForSentinel(originalContact._id);
    const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

    expect(transitions.create_user_for_contacts.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(missingPhonePattern);
  });

  it('does not replace user when the new contact has an invalid phone', async () => {
    const invalidPhonePattern = /A valid phone number is required for SMS login/;
    const newPerson = Object.assign({}, NEW_PERSON, { phone: 12345 });

    const collectLogs = await utils.collectSentinelLogs(invalidPhonePattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDoc(newPerson);
    const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
    originalContact.user_for_contact = { replaced: { by: newPerson._id, status: 'READY' } };
    await utils.saveDoc(originalContact);
    await sentinelUtils.waitForSentinel(originalContact._id);
    const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

    expect(transitions.create_user_for_contacts.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(invalidPhonePattern);
  });

  it('does not replace user when the new contact does not have a name', async () => {
    const missingNamePattern = /Replacement contact \[new_person] must have a name\./;
    const newPerson = Object.assign({}, NEW_PERSON, { name: undefined });

    const collectLogs = await utils.collectSentinelLogs(missingNamePattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDoc(newPerson);
    const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
    originalContact.user_for_contact = { replaced: { by: newPerson._id, status: 'READY' } };
    await utils.saveDoc(originalContact);
    await sentinelUtils.waitForSentinel(originalContact._id);
    const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

    expect(transitions.create_user_for_contacts.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(missingNamePattern);
  });

  it('does not replace user when the replace_user doc does not have an new contact id', async () => {
    const missingIdPattern = /No id was provided for the new replacement contact\./;

    const collectLogs = await utils.collectSentinelLogs(missingIdPattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDoc(NEW_PERSON);
    const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
    originalContact.user_for_contact = { replaced: { status: 'READY' } };
    await utils.saveDoc(originalContact);
    await sentinelUtils.waitForSentinel(originalContact._id);
    const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

    expect(transitions.create_user_for_contacts.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(missingIdPattern);
  });

  it('does not replace user when the replaced status is not READY', async () => {
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDoc(NEW_PERSON);
    const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
    originalContact.user_for_contact = { replaced: { by: NEW_PERSON._id, status: 'PENDING' } };
    await utils.saveDoc(originalContact);
    await sentinelUtils.waitForSentinel(originalContact._id);
    const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

    expect(transitions.create_user_for_contacts).to.be.undefined;

    // Original contact not updated
    const originalPerson = await utils.getDoc(ORIGINAL_PERSON._id);
    expect(originalPerson.errors).to.be.undefined;
    // New user not created
    const newUserSettings = await utils.getUserSettings({ contactId: NEW_PERSON._id });
    expect(newUserSettings).to.be.undefined;
  });

  it('does not replace user when the contact is not being replaced', async () => {
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDoc(NEW_PERSON);
    const originalContact = await utils.getDoc(ORIGINAL_PERSON._id);
    originalContact.name ='Updated Person';
    await utils.saveDoc(originalContact);
    await sentinelUtils.waitForSentinel(originalContact._id);
    const { transitions } = await sentinelUtils.getInfoDoc(originalContact._id);

    expect(transitions.create_user_for_contacts).to.be.undefined;

    // Original contact not updated
    const originalPerson = await utils.getDoc(ORIGINAL_PERSON._id);
    expect(originalPerson.errors).to.be.undefined;
    // New user not created
    const newUserSettings = await utils.getUserSettings({ contactId: NEW_PERSON._id });
    expect(newUserSettings).to.be.undefined;
  });

  it('does not replace user when the contact being replaced is not a person', async () => {
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDoc(NEW_PERSON);
    const clinic = await utils.getDoc(CLINIC._id);
    clinic.user_for_contact = { replaced: { by: NEW_PERSON._id, status: 'READY' } };
    await utils.saveDoc(clinic);
    await sentinelUtils.waitForSentinel(clinic._id);
    const { transitions } = await sentinelUtils.getInfoDoc(clinic._id);

    expect(transitions.create_user_for_contacts).to.be.undefined;

    // Original contact not updated
    const originalPerson = await utils.getDoc(ORIGINAL_PERSON._id);
    expect(originalPerson.errors).to.be.undefined;
    // New user not created
    const newUserSettings = await utils.getUserSettings({ contactId: NEW_PERSON._id });
    expect(newUserSettings).to.be.undefined;
  });
});
