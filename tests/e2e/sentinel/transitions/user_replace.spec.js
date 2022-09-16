const utils = require('../../../utils');
const sentinelUtils = require('../utils');
const uuid = require('uuid').v4;
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

const REPLACE_USER = {
  _id: uuid(),
  type: 'data_record',
  reported_date: new Date().getTime(),
  form: 'replace_user',
  contact: {
    _id: ORIGINAL_PERSON._id,
    parent: {
      _id: ORIGINAL_PERSON.parent._id,
    }
  },
  fields: {
    original_contact_uuid: ORIGINAL_PERSON._id,
    new_contact_uuid: NEW_PERSON._id,
  },
};

const newUsers = [];

const getSettings = ({
  transitions: { user_replace = true } = {},
  token_login: { enabled = true } = {}
} = {}) => ({
  transitions: { user_replace },
  token_login: { enabled },
});

const getQueuedMessages = () => utils.db.query('medic-admin/message_queue', { reduce: false, include_docs: true })
  .then(response => response.rows.map(row => row.doc));

const expectError = async (errorPattern) => {
  // Error saved on the replace_user report
  const replaceUser_updated = await utils.getDoc(REPLACE_USER._id);
  expect(replaceUser_updated.errors).to.have.lengthOf(1);
  const [{ code, message }] = replaceUser_updated.errors;
  expect(code).to.equal('user_replace_error\'');
  expect(message).to.match(errorPattern);
  // New user not created
  const newUserSettings = await utils.getUserSettings({ contactId: NEW_PERSON._id });
  expect(newUserSettings).to.be.undefined;
};

describe('user_replace', () => {
  beforeEach(() => utils.saveDoc(CLINIC));

  afterEach(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers(newUsers.map(username => ({ username })));
    newUsers.length = 0;
  });

  it('should replace user when the replace_user form is submitted', async () => {
    const oldReport = {
      _id: uuid(),
      reported_date: REPLACE_USER.reported_date - 1,
      form: 'death_report',
      type: 'data_record',
      contact: {
        _id: ORIGINAL_PERSON._id,
        parent: {
          _id: ORIGINAL_PERSON.parent._id,
        }
      },
    };
    const newReport = {
      _id: uuid(),
      reported_date: REPLACE_USER.reported_date + 1,
      form: 'death_report',
      type: 'data_record',
      contact: {
        _id: ORIGINAL_PERSON._id,
        parent: {
          _id: ORIGINAL_PERSON.parent._id,
        }
      },
    };

    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDocs([
      NEW_PERSON,
      oldReport,
      REPLACE_USER,
      newReport,
    ]);
    await sentinelUtils.waitForSentinel(REPLACE_USER._id);
    const { transitions } = await sentinelUtils.getInfoDoc(REPLACE_USER._id);

    // Transition successful
    expect(transitions.user_replace.ok).to.be.true;
    // Original user is disabled
    // const originalUserSettings = await utils.getDoc(`org.couchdb.user:${ORIGINAL_USER.username}`);
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
    // Earlier reports not re-parented
    const oldReport_notUpdated = await utils.getDoc(oldReport._id);
    expect(oldReport_notUpdated.contact._id).to.equal(ORIGINAL_PERSON._id);
    // replace_user report not re-parented
    const replaceUser_updated = await utils.getDoc(REPLACE_USER._id);
    expect(replaceUser_updated.contact._id).to.equal(ORIGINAL_PERSON._id);
    // Later reports re-parented
    const newReport_updated = await utils.getDoc(newReport._id);
    expect(newReport_updated.contact).to.deep.equal({
      _id: NEW_PERSON._id,
      parent: {
        _id: NEW_PERSON.parent._id,
      }
    });
    // Login token sent
    const queuedMsgs = await getQueuedMessages();
    expect(queuedMsgs).to.have.lengthOf(1);
    expect(queuedMsgs[0]).to.deep.include({
      type: 'token_login',
      user: newUserSettings._id
    });
    expect(queuedMsgs[0].tasks[0].messages[0].to).to.equal(NEW_PERSON.phone);
  });

  it('should not replace user when transition is disabled', async () => {
    await utils.updateSettings(getSettings({ transitions: { user_replace: false } }), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDocs([
      NEW_PERSON,
      REPLACE_USER,
    ]);
    await sentinelUtils.waitForSentinel([REPLACE_USER._id]);
    const info = await sentinelUtils.getInfoDoc(REPLACE_USER._id);

    expect(Object.keys(info.transitions)).to.be.empty;
    const newUserSettings = await utils.getUserSettings({ contactId: NEW_PERSON._id });
    expect(newUserSettings).to.be.undefined;
  });

  it('should disable transitions if replace_user is enabled but token_login is not enabled', async () => {
    const tokenLoginErrorPattern =
      /Configuration error\. Token login must be enabled to use the user_replace transition\./;
    const transitionsDisabledPattern = /Transitions are disabled until the above configuration errors are fixed\./;

    const collectLogs = utils.collectLogs('sentinel.e2e.log', tokenLoginErrorPattern, transitionsDisabledPattern);
    await utils.updateSettings(getSettings({ token_login: { enabled: false } }), 'sentinel');
    const logs = await collectLogs();
    expect(logs.find(log => log.match(tokenLoginErrorPattern))).to.exist;
    expect(logs.find(log => log.match(transitionsDisabledPattern))).to.exist;
  });

  it('should not replace user when the new contact does not exist', async () => {
    const missingPersonPattern = /Failed to find person/;
    const collectLogs = utils.collectLogs('sentinel.e2e.log', missingPersonPattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDoc(REPLACE_USER);
    await sentinelUtils.waitForSentinel([REPLACE_USER._id]);
    const { transitions } = await sentinelUtils.getInfoDoc(REPLACE_USER._id);

    expect(transitions.user_replace.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(missingPersonPattern);
  });

  it('should not replace user when the original user does not exist', async () => {
    const missingUserPattern = /Failed to find user setting with contact_id \[original_person]\./;
    const collectLogs = utils.collectLogs('sentinel.e2e.log', missingUserPattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.saveDocs([
      ORIGINAL_PERSON,
      NEW_PERSON,
      REPLACE_USER,
    ]);
    await sentinelUtils.waitForSentinel([REPLACE_USER._id]);
    const { transitions } = await sentinelUtils.getInfoDoc(REPLACE_USER._id);

    expect(transitions.user_replace.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(missingUserPattern);
  });

  it('should not replace user when the new contact does not have a phone', async () => {
    const missingPhonePattern = /Missing required fields: phone/;
    const newPerson = Object.assign({}, NEW_PERSON, { phone: undefined });

    const collectLogs = utils.collectLogs('sentinel.e2e.log', missingPhonePattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDocs([
      newPerson,
      REPLACE_USER,
    ]);
    await sentinelUtils.waitForSentinel([REPLACE_USER._id]);
    const { transitions } = await sentinelUtils.getInfoDoc(REPLACE_USER._id);

    expect(transitions.user_replace.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(missingPhonePattern);
  });

  it('should not replace user when the new contact has an invalid phone', async () => {
    const invalidPhonePattern = /A valid phone number is required for SMS login/;
    const newPerson = Object.assign({}, NEW_PERSON, { phone: 12345 });

    const collectLogs = utils.collectLogs('sentinel.e2e.log', invalidPhonePattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDocs([
      newPerson,
      REPLACE_USER,
    ]);
    await sentinelUtils.waitForSentinel([REPLACE_USER._id]);
    const { transitions } = await sentinelUtils.getInfoDoc(REPLACE_USER._id);

    expect(transitions.user_replace.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(invalidPhonePattern);
  });

  it('should not replace user when the new contact does not have a name', async () => {
    const missingNamePattern = /Replacement contact \[new_person] must have a name\./;
    const newPerson = Object.assign({}, NEW_PERSON, { name: undefined });

    const collectLogs = utils.collectLogs('sentinel.e2e.log', missingNamePattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDocs([
      newPerson,
      REPLACE_USER,
    ]);
    await sentinelUtils.waitForSentinel([REPLACE_USER._id]);
    const { transitions } = await sentinelUtils.getInfoDoc(REPLACE_USER._id);

    expect(transitions.user_replace.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(missingNamePattern);
  });

  it('should not replace user when the new contact does not have a parent', async () => {
    const missingParentPattern = /Contact \[new_person] does not have a parent\./;
    const newPerson = Object.assign({}, NEW_PERSON, { parent: undefined });

    const collectLogs = utils.collectLogs('sentinel.e2e.log', missingParentPattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDocs([
      newPerson,
      REPLACE_USER,
    ]);
    await sentinelUtils.waitForSentinel([REPLACE_USER._id]);
    const { transitions } = await sentinelUtils.getInfoDoc(REPLACE_USER._id);

    expect(transitions.user_replace.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(missingParentPattern);
  });

  it('should not replace user when the contacts do not have the same parent', async () => {
    const sameParentPattern = /The replacement contact must have the same parent as the original contact\./;
    const differentClinic = { _id: 'different_clinic', type: 'clinic', };
    const newPerson = Object.assign({}, NEW_PERSON, { parent: { _id: differentClinic._id } });

    const collectLogs = utils.collectLogs('sentinel.e2e.log', sameParentPattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDocs([
      newPerson,
      REPLACE_USER,
    ]);
    await sentinelUtils.waitForSentinel([REPLACE_USER._id]);
    const { transitions } = await sentinelUtils.getInfoDoc(REPLACE_USER._id);

    expect(transitions.user_replace.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(sameParentPattern);
  });

  it('should not replace user when the replace_user doc does not have an original contact id', async () => {
    const missingIdPattern = /The original_contact_uuid field must be populated on the replace_user report\./;
    const replaceUser = Object.assign({}, REPLACE_USER, {
      fields: { original_contact_uuid: undefined, new_contact_uuid: NEW_PERSON._id },
    });

    const collectLogs = utils.collectLogs('sentinel.e2e.log', missingIdPattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDocs([
      NEW_PERSON,
      replaceUser,
    ]);
    await sentinelUtils.waitForSentinel([replaceUser._id]);
    const { transitions } = await sentinelUtils.getInfoDoc(replaceUser._id);

    expect(transitions.user_replace.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(missingIdPattern);
  });

  it('should not replace user when the replace_user doc does not have an new contact id', async () => {
    const missingIdPattern = /The new_contact_uuid field must be populated on the replace_user report\./;
    const replaceUser = Object.assign({}, REPLACE_USER, {
      fields: { original_contact_uuid: ORIGINAL_PERSON._id, new_contact_uuid: undefined },
    });

    const collectLogs = utils.collectLogs('sentinel.e2e.log', missingIdPattern);
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await utils.saveDoc(replaceUser);
    await sentinelUtils.waitForSentinel([replaceUser._id]);
    const { transitions } = await sentinelUtils.getInfoDoc(replaceUser._id);

    expect(transitions.user_replace.ok).to.be.false;
    expect(await collectLogs()).to.not.be.empty;
    await expectError(missingIdPattern);
  });
});
