/* global window */
const { expect } = require('chai');
const fs = require('fs');
const utils = require('../../../utils');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const { BASE_URL, DEFAULT_USER_CONTACT_DOC } = require('../../../constants');
const contactsPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const genericForm = require('../../../page-objects/default/enketo/generic-form.wdio.page');
const sentinelUtils = require('../../../utils/sentinel');
const replaceUserForm = require('../../../page-objects/default/enketo/replace-user.wdio.page');
const personFactory = require('../../../factories/cht/contacts/person');
const placeFactory = require('../../../factories/cht/contacts/place');
const userFactory = require('../../../factories/cht/users/users');

const USER_CONTACT = utils.deepFreeze(personFactory.build({ role: 'chw' }));

const DISTRICT = utils.deepFreeze(placeFactory
  .place()
  .build({
    type: 'district_hospital',
    contact: {
      _id: USER_CONTACT._id,
    }
  }));

const ORIGINAL_USER = utils.deepFreeze(userFactory.build({
  username: `user_for_contacts_original_person`,
  place: DISTRICT._id,
  contact: USER_CONTACT,
}));

const ONLINE_USER = utils.deepFreeze(userFactory.build({
  username: `user_for_contacts_online_user`,
  place: DISTRICT._id,
  contact: USER_CONTACT,
  roles: ['program_officer', 'mm-online'],
}));

const newUsers = [];

const getQueuedMessages = () => utils.db
  .query('medic-admin/message_queue', { reduce: false, include_docs: true })
  .then(response => response.rows.map(row => row.doc));

const REPLACE_USER_FORM_TITLE = 'Replace User';
const REPLACE_USER_FORM_ID = 'replace_user';

const BASIC_FORM_DOC = utils.deepFreeze({
  _id: 'form:basic_form',
  internalId: 'basic_form',
  title: 'Form basic_form',
  type: 'form',
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer
        .from(fs.readFileSync(`${__dirname}/forms/basic_form.xml`, 'utf8'))
        .toString('base64')
    }
  }
});

const OTHER_REPLACE_FORM_DOC = utils.deepFreeze({
  _id: 'form:other_replace_form',
  internalId: 'other_replace_form',
  title: 'Replace User Again',
  type: 'form',
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer
        .from(fs.readFileSync(`${__dirname}/../../../../config/default/forms/app/replace_user.xml`, 'utf8'))
        .toString('base64')
    }
  }
});

const SETTINGS = utils.deepFreeze({
  transitions: { create_user_for_contacts: true },
  create_user_for_contacts: { replace_forms: [REPLACE_USER_FORM_ID, OTHER_REPLACE_FORM_DOC.internalId] },
  token_login: { enabled: true },
  app_url: BASE_URL
});

const loginAsUser = async (user) => {
  await utils.createUsers([user]);
  newUsers.push(user.username);
  await loginPage.login(user);
  await commonPage.waitForPageLoaded();
};

const loginAsOfflineUser = () => loginAsUser(ORIGINAL_USER);

const loginAsOnlineUser = () => loginAsUser(ONLINE_USER);

const populateReplaceUserForm = async (formTitle) => {
  await contactsPage.createNewAction(formTitle);
  await replaceUserForm.selectAdminCode('secretCode');
  await genericForm.nextPage();
  await replaceUserForm.selectContactFullName('Replacement User');
  await replaceUserForm.selectContactSex(replaceUserForm.SEX.female);
  await replaceUserForm.selectContactDobUnknown();
  await replaceUserForm.selectContactAgeYears(22);
  await genericForm.nextPage();
};

const saveLocalDocFromBrowser = async (doc) => {
  const { err, result } = await browser.executeAsync((doc, callback) => {
    const db = window.CHTCore.DB.get();
    return db
      .put(doc)
      .then(result => callback({ result }))
      .catch(err => callback({ err }));
  }, doc);

  if (err) {
    throw err;
  }

  return result;
};

const getLocalDocFromBrowser = async (docId) => {
  const { err, result } = await browser.executeAsync((docId, callback) => {
    const db = window.CHTCore.DB.get();
    return db
      .get(docId, { conflicts: true })
      .then(result => callback({ result }))
      .catch(err => callback({ err }));
  }, docId);

  if (err) {
    throw err;
  }

  return result;
};

const getManyLocalDocsFromBrowser = async (docIds) => {
  const { err, result } = await browser.executeAsync((docIds, callback) => {
    const db = window.CHTCore.DB.get();
    return db
      .allDocs({ keys: docIds, include_docs: true })
      .then(response => callback({ result: response.rows.map(row => row.doc) }))
      .catch(err => callback({ err }));
  }, docIds);

  if (err) {
    throw err;
  }

  return result;
};

const sync = async () => {
  await commonPage.openHamburgerMenu();
  await (await commonPage.syncButton()).click();
  // Do not wait for success status to be displayed (may not be shown before logout is triggered)
};

const submitBasicForm = async () => {
  await reportsPage.openForm('Form basic_form');
  await reportsPage.submitForm();
  return reportsPage.getCurrentReportId();
};

const assertReplaceUserReport = (replaceUserReport, originalContactId) => {
  expect(replaceUserReport.fields.replacement_contact_id).to.not.be.empty;
  expect(replaceUserReport.contact._id).to.equal(originalContactId);
};

const assertOriginalContactUpdated = (originalContact, originalUsername, newContactId, status) => {
  expect(originalContact.user_for_contact).to.deep.equal({
    replace: {
      [originalUsername]: {
        status,
        replacement_contact_id: newContactId,
      }
    }
  });
};

const assertNewContact = (newContact, originalUser, originalContact) => {
  expect(newContact.phone).to.equal(originalUser.phone);
  expect(newContact.parent._id).to.equal(originalContact.parent._id);
  expect(newContact.name).to.equal('Replacement User');
  expect(newContact.sex).to.equal('female');
};

const submitLoginRequest = ({ username, password }) => {
  const opts = {
    path: '/medic/login',
    body: { user: username, password, locale: 'en' },
    method: 'POST',
    simple: false,
  };
  return utils.request(opts);
};

const DISABLED_USER_PASSWORD = 'n3wPassword!';

const assertUserPasswordChanged = async (user) => {
  // Cannot login because user's password has been automatically reset
  const resp0 = await submitLoginRequest(user);
  expect(resp0.statusCode).to.equal(401);

  // Update user's password to something we know
  await utils.request({
    path: `/api/v1/users/${user.username}`,
    method: 'POST',
    body: { password: DISABLED_USER_PASSWORD }
  });

  // Can login with new password
  const resp1 = await submitLoginRequest({ ...user, password: DISABLED_USER_PASSWORD });
  expect(resp1.statusCode).to.equal(302);
};

const assertNewUserSettings = (newUserSettings, newContact, originalUser) => {
  expect(newUserSettings).to.deep.include({
    roles: originalUser.roles,
    phone: newContact.phone,
    facility_id: newContact.parent._id,
    contact_id: newContact._id,
    fullname: newContact.name,
  });
  expect(newUserSettings.token_login.active).to.be.true;
  expect(newUserSettings._id).to.match(/^org\.couchdb\.user:replacement-user-\d\d\d\d$/);
  expect(newUserSettings.name).to.match(/^replacement-user-\d\d\d\d$/);
};

const getTextedLoginLink = async (newUserSettings) => {
  const queuedMsgs = await getQueuedMessages();
  expect(queuedMsgs).to.have.lengthOf(1);
  const [queuedMsg] = queuedMsgs;
  expect(queuedMsg).to.deep.include({
    type: 'token_login', user: newUserSettings._id
  });
  const [{ to, message }] = queuedMsg.tasks[1].messages;
  expect(to).to.equal(newUserSettings.phone);
  return message;
};

const saveDocIfNotExists = async (doc) => {
  try {
    await utils.getDoc(doc._id);
  } catch (_) {
    await utils.saveDoc(doc);
  }
};

const waitForConflicts = async (getDoc) => {
  const doc = await getDoc();
  if (doc._conflicts) {
    return doc;
  }
  return utils.delayPromise(waitForConflicts(getDoc), 100);
};

describe('Create user for contacts', () => {
  before(async () => {
    await saveDocIfNotExists(BASIC_FORM_DOC);
    await saveDocIfNotExists(OTHER_REPLACE_FORM_DOC);
  });

  beforeEach(async () => {
    await utils.saveDoc(DISTRICT);
  });

  afterEach(async () => {
    await utils.deleteUsers(newUsers.map(username => ({ username })));
    newUsers.length = 0;
    await utils.revertDb([/^form:/], true);
    await browser.reloadSession();
    await browser.url('/');
  });

  describe('for an offline user', () => {
    it('creates a new user and re-parents reports when the replace_user form is submitted', async () => {
      await utils.updateSettings(SETTINGS, 'sentinel');
      await loginAsOfflineUser();
      const originalContactId = ORIGINAL_USER.contact._id;

      await browser.throttle('offline');

      // Create existing report (before user is replaced)
      await commonPage.goToReports();
      const existingBasicReportId = await submitBasicForm();

      await commonPage.goToPeople(originalContactId);
      await populateReplaceUserForm(REPLACE_USER_FORM_TITLE);
      await contactsPage.submitForm();
      const reportNames = await contactsPage.getAllRHSReportsNames();
      expect(reportNames.filter(name => name === REPLACE_USER_FORM_TITLE)).to.have.lengthOf(1);
      await commonPage.goToReports();
      const reportId = await reportsPage.getLastSubmittedReportId();
      // Submit several forms to be re-parented
      const basicReportId0 = await submitBasicForm();
      const basicReportId1 = await submitBasicForm();

      // Replace user report created
      const replaceUserReport = await getLocalDocFromBrowser(reportId);
      assertReplaceUserReport(replaceUserReport, originalContactId);
      const { replacement_contact_id: replacementContactId } = replaceUserReport.fields;
      // Basic form reports re-parented
      const basicReports = await getManyLocalDocsFromBrowser([basicReportId0, basicReportId1]);
      basicReports.forEach((report) => expect(report.contact._id).to.equal(replacementContactId));
      // Existing report not re-parented
      const existingBasicReport = await getLocalDocFromBrowser(existingBasicReportId);
      expect(existingBasicReport.contact._id).to.equal(originalContactId);
      // Original contact updated to PENDING
      const originalContact = await getLocalDocFromBrowser(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacementContactId, 'PENDING');
      const newContact = await getLocalDocFromBrowser(replacementContactId);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      // Set as primary contact
      const district = await getLocalDocFromBrowser(DISTRICT._id);
      expect(district.contact._id).to.equal(replacementContactId);

      await browser.throttle('online');
      await sync();
      await (await loginPage.loginButton()).waitForDisplayed();

      await sentinelUtils.waitForSentinel();
      const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

      // Transition successful
      expect(transitions.create_user_for_contacts.ok).to.be.true;
      // Original contact updated to COMPLETE
      const finalOriginalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(finalOriginalContact, ORIGINAL_USER.username, replacementContactId, 'COMPLETE');
      await assertUserPasswordChanged(ORIGINAL_USER);
      // New user created
      const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: replacementContactId });
      expect(additionalUsers).to.be.empty;
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, newContact, ORIGINAL_USER);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // Basic form reports were successfully synced to the server
      const basicReportsFromRemote = await utils.getDocs([basicReportId0, basicReportId1]);
      basicReportsFromRemote.forEach((report, index) => expect(report).to.deep.equal(basicReports[index]));

      // Open the texted link
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      expect(cookie.value).to.include(newUserSettings.name);

      // Can still login as the original user (with the manually updated password)
      await commonPage.closeTour();
      await commonPage.logout();
      await loginPage.login({ ...ORIGINAL_USER, password: DISABLED_USER_PASSWORD });
      await commonPage.waitForPageLoaded();
      await commonPage.sync();
      await commonPage.goToReports();
      const basicReportId3 = await submitBasicForm();
      const basicReport3 = await utils.getDoc(basicReportId3);
      // New reports written by the old user are not re-parented
      expect(basicReport3.contact._id).to.equal(originalContactId);
    });

    it('creates a new user when the replace_user form is submitted while online', async () => {
      await utils.updateSettings(SETTINGS, 'sentinel');
      await loginAsOfflineUser();
      const originalContactId = ORIGINAL_USER.contact._id;

      await commonPage.goToPeople(originalContactId);
      await populateReplaceUserForm(REPLACE_USER_FORM_TITLE);
      await (await genericForm.submitButton()).waitForDisplayed();
      await (await genericForm.submitButton()).click();

      // Logout triggered immediately
      await (await loginPage.loginButton()).waitForDisplayed();

      await loginPage.cookieLogin();
      await commonPage.goToReports();
      const reportId = await reportsPage.getLastSubmittedReportId();

      // Replace user report created
      const replaceUserReport = await utils.getDoc(reportId);
      assertReplaceUserReport(replaceUserReport, originalContactId);
      const { replacement_contact_id: replacementContactId } = replaceUserReport.fields;

      await sentinelUtils.waitForSentinel();
      const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

      // Transition successful
      expect(transitions.create_user_for_contacts.ok).to.be.true;
      const originalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacementContactId, 'COMPLETE');
      const newContact = await utils.getDoc(replacementContactId);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      await assertUserPasswordChanged(ORIGINAL_USER);
      // Set as primary contact
      expect((await utils.getDoc(DISTRICT._id)).contact._id).to.equal(replacementContactId);
      // New user created
      const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: replacementContactId });
      expect(additionalUsers).to.be.empty;
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, newContact, ORIGINAL_USER);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // Open the texted link
      await commonPage.logout();
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      expect(cookie.value).to.include(newUserSettings.name);
    });

    it('does not assign new person as primary contact of parent place if original person was not primary', async () => {
      await utils.updateSettings(SETTINGS, 'sentinel');
      const district = await utils.getDoc(DISTRICT._id);
      district.contact = { _id: 'not-the-original-contact' };
      await utils.saveDoc(district);
      await loginAsOfflineUser();
      const originalContactId = ORIGINAL_USER.contact._id;

      await commonPage.goToPeople(originalContactId);
      await populateReplaceUserForm(REPLACE_USER_FORM_TITLE);
      await contactsPage.submitForm();

      // Logout triggered immediately
      await (await loginPage.loginButton()).waitForDisplayed();

      await loginPage.cookieLogin();
      await commonPage.goToReports();
      const reportId = await reportsPage.getLastSubmittedReportId();

      // Replace user report created
      const replaceUserReport = await utils.getDoc(reportId);
      assertReplaceUserReport(replaceUserReport, originalContactId);
      const { replacement_contact_id: replacementContactId } = replaceUserReport.fields;

      await sentinelUtils.waitForSentinel();
      const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

      // Transition successful
      expect(transitions.create_user_for_contacts.ok).to.be.true;
      const originalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacementContactId, 'COMPLETE');
      const newContact = await utils.getDoc(replacementContactId);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      await assertUserPasswordChanged(ORIGINAL_USER);
      // Primary contact not updated
      expect((await utils.getDoc(DISTRICT._id)).contact._id).to.equal('not-the-original-contact');
      // New user created
      const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: replacementContactId });
      expect(additionalUsers).to.be.empty;
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, newContact, ORIGINAL_USER);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // Open the texted link
      await commonPage.logout();
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      expect(cookie.value).to.include(newUserSettings.name);
    });

    it('creates new user from latest replace_user form data if multiple are submitted before syncing', async () => {
      await utils.updateSettings(SETTINGS, 'sentinel');
      await loginAsOfflineUser();
      const originalContactId = ORIGINAL_USER.contact._id;

      await browser.throttle('offline');

      await commonPage.goToPeople(originalContactId);
      await populateReplaceUserForm(REPLACE_USER_FORM_TITLE);
      await contactsPage.submitForm();
      let reportNames = await contactsPage.getAllRHSReportsNames();
      expect(reportNames.filter(name => name === REPLACE_USER_FORM_TITLE)).to.have.lengthOf(1);
      await commonPage.goToReports();
      const reportId = await reportsPage.getLastSubmittedReportId();
      // Submit several forms to be re-parented
      const basicReportId0 = await submitBasicForm();
      const basicReportId1 = await submitBasicForm();

      // Replace user report created
      const replaceUserReport = await getLocalDocFromBrowser(reportId);
      assertReplaceUserReport(replaceUserReport, originalContactId);
      const { replacement_contact_id: replacementContactId0 } = replaceUserReport.fields;
      // Basic form reports re-parented
      const basicReports = await getManyLocalDocsFromBrowser([basicReportId0, basicReportId1]);
      basicReports.forEach((report) => expect(report.contact._id).to.equal(replacementContactId0));
      // Original contact updated to PENDING
      let originalContact = await getLocalDocFromBrowser(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacementContactId0, 'PENDING');
      const newContact = await getLocalDocFromBrowser(replacementContactId0);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      // Set as primary contact
      let district = await getLocalDocFromBrowser(DISTRICT._id);
      expect(district.contact._id).to.equal(replacementContactId0);

      // Submit another replace user form
      await commonPage.goToPeople(replacementContactId0);
      await populateReplaceUserForm(OTHER_REPLACE_FORM_DOC.title);
      await contactsPage.submitForm();
      reportNames = await contactsPage.getAllRHSReportsNames();
      expect(reportNames.filter(name => name === OTHER_REPLACE_FORM_DOC.title)).to.have.lengthOf(1);
      await commonPage.goToReports();
      const reportId1 = await reportsPage.getLastSubmittedReportId();
      // Submit several forms to be re-parented
      const basicReportId2 = await submitBasicForm();
      const basicReportId3 = await submitBasicForm();

      const replaceUserReport1 = await getLocalDocFromBrowser(reportId1);
      const { replacement_contact_id: replacementContactId1 } = replaceUserReport1.fields;
      assertReplaceUserReport(replaceUserReport, originalContactId);
      // Basic form reports re-parented
      const basicReports1 = await getManyLocalDocsFromBrowser([basicReportId2, basicReportId3]);
      basicReports1.forEach((report) => expect(report.contact._id).to.equal(replacementContactId1));
      // Original contact updated to have new replacement contact id
      originalContact = await getLocalDocFromBrowser(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacementContactId1, 'PENDING');
      const newContact1 = await getLocalDocFromBrowser(replacementContactId1);
      assertNewContact(newContact1, ORIGINAL_USER, originalContact);
      // Set as primary contact
      district = await getLocalDocFromBrowser(DISTRICT._id);
      expect(district.contact._id).to.equal(replacementContactId1);

      await browser.throttle('online');
      await sync();
      await (await loginPage.loginButton()).waitForDisplayed();

      await sentinelUtils.waitForSentinel();
      const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

      // Transition successful
      expect(transitions.create_user_for_contacts.ok).to.be.true;
      // Original contact updated to COMPLETE
      originalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacementContactId1, 'COMPLETE');
      await assertUserPasswordChanged(ORIGINAL_USER);
      // New user created
      const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: replacementContactId1 });
      expect(additionalUsers).to.be.empty;
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, newContact1, ORIGINAL_USER);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // User not created for first replacement contact
      const newUserSettings1 = await utils.getUserSettings({ contactId: replacementContactId0 });
      expect(newUserSettings1).to.be.empty;

      // Open the texted link
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      expect(cookie.value).to.include(newUserSettings.name);

      // Basic form reports were successfully synced to the server
      const basicReportsFromRemote = await utils.getDocs([basicReportId0, basicReportId1]);
      basicReportsFromRemote.forEach((report, index) => expect(report).to.deep.equal(basicReports[index]));
    });

    it('creates new user when replace_user form is submitted for contact associated with multiple users', async () => {
      await utils.updateSettings(SETTINGS, 'sentinel');
      await loginAsOfflineUser();

      const otherUser = {
        ...ORIGINAL_USER,
        username: 'user_for_contacts_other_user',
        contact: ORIGINAL_USER.contact._id
      };
      await utils.createUsers([otherUser]);
      newUsers.push(otherUser.username);

      const originalContactId = ORIGINAL_USER.contact._id;

      await commonPage.goToPeople(originalContactId);
      await populateReplaceUserForm(REPLACE_USER_FORM_TITLE);
      await (await genericForm.submitButton()).waitForDisplayed();
      await (await genericForm.submitButton()).click();

      // Logout triggered immediately
      await (await loginPage.loginButton()).waitForDisplayed();

      await loginPage.cookieLogin();
      await commonPage.goToReports();
      const reportId = await reportsPage.getLastSubmittedReportId();

      // Replace user report created
      const replaceUserReport = await utils.getDoc(reportId);
      assertReplaceUserReport(replaceUserReport, originalContactId);
      const { replacement_contact_id: replacementContactId } = replaceUserReport.fields;

      await sentinelUtils.waitForSentinel();
      const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

      // Transition successful
      expect(transitions.create_user_for_contacts.ok).to.be.true;
      const originalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacementContactId, 'COMPLETE');
      const newContact = await utils.getDoc(replacementContactId);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      await assertUserPasswordChanged(ORIGINAL_USER);
      // Set as primary contact
      expect((await utils.getDoc(DISTRICT._id)).contact._id).to.equal(replacementContactId);
      // New user created
      const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: replacementContactId });
      expect(additionalUsers).to.be.empty;
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, newContact, ORIGINAL_USER);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // Open the texted link
      await commonPage.logout();
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      expect(cookie.value).to.include(newUserSettings.name);

      // Other user still associated with original contact
      const [otherUserSettings] = await utils.getUserSettings({ name: otherUser.username });
      expect(otherUserSettings.contact_id).to.equal(ORIGINAL_USER.contact._id);
      // Can still log in as other user
      await commonPage.closeTour();
      await commonPage.logout();
      await loginPage.login(otherUser);
      await commonPage.waitForPageLoaded();
      await commonPage.goToPeople(originalContactId);
    });

    it('creates new user for the first version of a contact to sync and conflicting replacements ignored', async () => {
      await utils.updateSettings(SETTINGS, 'sentinel');
      await loginAsOfflineUser();
      const originalContactId = ORIGINAL_USER.contact._id;

      const otherUser = {
        ...ORIGINAL_USER,
        username: 'user_for_contacts_other_user',
        contact: ORIGINAL_USER.contact._id
      };
      await utils.createUsers([otherUser]);
      newUsers.push(otherUser.username);

      await browser.throttle('offline');

      await commonPage.goToPeople(originalContactId);
      await populateReplaceUserForm(REPLACE_USER_FORM_TITLE);
      await contactsPage.submitForm();
      const reportNames = await contactsPage.getAllRHSReportsNames();
      expect(reportNames.filter(name => name === REPLACE_USER_FORM_TITLE)).to.have.lengthOf(1);
      await commonPage.goToReports();
      const reportId = await reportsPage.getLastSubmittedReportId();

      // Replace user report created
      const replaceUserReport = await getLocalDocFromBrowser(reportId);
      assertReplaceUserReport(replaceUserReport, originalContactId);
      const replacementContactId = replaceUserReport.fields.replacement_contact_id;
      // Original contact updated to PENDING
      let originalContact = await getLocalDocFromBrowser(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacementContactId, 'PENDING');
      const newContact = await getLocalDocFromBrowser(replacementContactId);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      // Set as primary contact
      const district = await getLocalDocFromBrowser(DISTRICT._id);
      expect(district.contact._id).to.equal(replacementContactId);

      // Submit several forms to be re-parented
      const basicReportId0 = await submitBasicForm();
      const basicReportId1 = await submitBasicForm();
      // Basic form reports re-parented
      const basicReports = await getManyLocalDocsFromBrowser([basicReportId0, basicReportId1]);
      basicReports.forEach((report) => expect(report.contact._id).to.equal(replacementContactId));

      // Logout before syncing
      await commonPage.logout();

      // Replace other user
      await browser.throttle('online');
      await loginPage.login(otherUser);
      await commonPage.waitForPageLoaded();
      await commonPage.goToPeople(originalContactId);
      await populateReplaceUserForm(REPLACE_USER_FORM_TITLE);
      await (await genericForm.submitButton()).waitForDisplayed();
      await (await genericForm.submitButton()).click();

      // Logout triggered immediately
      await (await loginPage.loginButton()).waitForDisplayed();

      await loginPage.cookieLogin();
      await commonPage.goToReports();
      const otherReportId = await reportsPage.getLastSubmittedReportId();

      // Replace user report created
      const otherReplaceUserReport = await utils.getDoc(otherReportId);
      assertReplaceUserReport(otherReplaceUserReport, originalContactId);
      const otherReplacementContactId = otherReplaceUserReport.fields.replacement_contact_id;

      await sentinelUtils.waitForSentinel();
      const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

      // Transition successful
      expect(transitions.create_user_for_contacts.ok).to.be.true;
      originalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(originalContact, otherUser.username, otherReplacementContactId, 'COMPLETE');
      const otherNewContact = await utils.getDoc(otherReplacementContactId);
      assertNewContact(otherNewContact, otherUser, originalContact);
      await assertUserPasswordChanged(otherUser);
      // Set as primary contact
      expect((await utils.getDoc(DISTRICT._id)).contact._id).to.equal(otherReplacementContactId);
      // New user created
      const [newUserSettings, ...additionalUsers] =
        await utils.getUserSettings({ contactId: otherReplacementContactId });
      expect(additionalUsers).to.be.empty;
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, otherNewContact, otherUser);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // Open the texted link
      await commonPage.logout();
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      expect(cookie.value).to.include(newUserSettings.name);
      await commonPage.closeTour();
      await commonPage.logout();

      // Log back in as original user and sync
      await loginPage.login(ORIGINAL_USER);
      await commonPage.sync();
      // The user should not be logged out since the replacement was in conflict
      await commonPage.goToPeople(originalContactId);

      // Local version of contact should be updated and have conflict
      const localOriginalContact = await waitForConflicts(() => getLocalDocFromBrowser(originalContactId));
      originalContact = await waitForConflicts(() => utils.getDoc(originalContactId, null, '?conflicts=true'));
      expect(localOriginalContact).to.deep.equal(originalContact);
      // Other user replace data exists on the contact
      assertOriginalContactUpdated(originalContact, otherUser.username, otherReplacementContactId, 'COMPLETE');
      // Original user replace data is gone (because of the conflict)
      expect(originalContact.user_for_contact.replace[ORIGINAL_USER.username]).to.be.undefined;

      // Basic form reports submitted earlier are still owned by the 1st replacement contact
      const basicReportsFromRemote = await utils.getDocs([basicReportId0, basicReportId1]);
      basicReportsFromRemote.forEach((report) => expect(report.contact._id).to.equal(replacementContactId));

      // Need to include an extra call to clean-up here since only the "winning" version of the conflicting docs will be
      // deleted. This first call will delete the current "winning" version and then the subsequent call in afterEach
      // will handle deleting the other version.
      await utils.revertDb([/^form:/], true);
    });

    it('does not create a new user or re-parent reports when the transition is disabled', async () => {
      const settings = { ...SETTINGS, transitions: { create_user_for_contacts: false } };
      await utils.updateSettings(settings, 'sentinel');
      await loginAsOfflineUser();
      const originalContactId = ORIGINAL_USER.contact._id;

      await commonPage.goToPeople(originalContactId);
      await populateReplaceUserForm(REPLACE_USER_FORM_TITLE);
      await contactsPage.submitForm();
      // No logout triggered
      await commonPage.goToReports();
      const reportId = await reportsPage.getLastSubmittedReportId();
      const basicReportId = await submitBasicForm();

      // Replace user report created
      const replaceUserReport = await utils.getDoc(reportId);
      assertReplaceUserReport(replaceUserReport, originalContactId);
      const { replacement_contact_id: replacementContactId } = replaceUserReport.fields;
      // New contact created
      const newContact = await utils.getDoc(replacementContactId);
      expect(newContact.phone).to.equal(ORIGINAL_USER.phone);
      // Basic report not re-parented
      const basicReports = await utils.getDoc(basicReportId);
      expect(basicReports.contact._id).to.equal(originalContactId);

      await sentinelUtils.waitForSentinel();
      const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

      // Transition not triggered
      expect(transitions.create_user_for_contacts).to.be.undefined;
      // Original contact not updated
      const updatedOriginalContact = await utils.getDoc(DEFAULT_USER_CONTACT_DOC._id);
      expect(updatedOriginalContact.user_for_contact).to.be.undefined;
    });

    it('does not create any new user nor does it reparent new reports when the transition fails', async () => {
      await utils.updateSettings(SETTINGS, 'sentinel');
      await loginAsOfflineUser();
      const originalContactId = ORIGINAL_USER.contact._id;

      await browser.throttle('offline');

      await commonPage.goToPeople(originalContactId);
      await populateReplaceUserForm(REPLACE_USER_FORM_TITLE);
      await contactsPage.submitForm();
      const reportNames = await contactsPage.getAllRHSReportsNames();
      expect(reportNames.filter(name => name === REPLACE_USER_FORM_TITLE)).to.have.lengthOf(1);
      await commonPage.goToReports();
      const reportId = await reportsPage.getLastSubmittedReportId();
      // Submit several forms to be re-parented
      const basicReportId0 = await submitBasicForm();
      const basicReportId1 = await submitBasicForm();

      // Replace user report created
      const replaceUserReport = await getLocalDocFromBrowser(reportId);
      assertReplaceUserReport(replaceUserReport, originalContactId);
      const { replacement_contact_id: replacementContactId } = replaceUserReport.fields;
      // Basic form reports re-parented
      const basicReports = await getManyLocalDocsFromBrowser([basicReportId0, basicReportId1]);
      basicReports.forEach((report) => expect(report.contact._id).to.equal(replacementContactId));
      // Original contact updated to PENDING
      const originalContact = await getLocalDocFromBrowser(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacementContactId, 'PENDING');
      const newContact = await getLocalDocFromBrowser(replacementContactId);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      // Set as primary contact
      const district = await getLocalDocFromBrowser(DISTRICT._id);
      expect(district.contact._id).to.equal(replacementContactId);

      // Remove phone number from contact to force the transition to fail
      await saveLocalDocFromBrowser({
        ...newContact,
        phone: undefined,
      });

      await browser.throttle('online');
      await sync();
      await (await loginPage.loginButton()).waitForDisplayed();

      await sentinelUtils.waitForSentinel();
      const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

      // Transition failed
      expect(transitions.create_user_for_contacts.ok).to.be.false;

      // Original contact updated to ERROR
      const finalOriginalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(finalOriginalContact, ORIGINAL_USER.username, replacementContactId, 'ERROR');
      // No new user created
      const newUserSettings = await utils.getUserSettings({ contactId: replacementContactId });
      expect(newUserSettings).to.be.empty;

      // Basic form reports are still owned by the new contact
      const basicReportsFromRemote = await utils.getDocs([basicReportId0, basicReportId1]);
      basicReportsFromRemote.forEach((report) => expect(report.contact._id).to.equal(replacementContactId));
      const newContactFromRemote = await utils.getDoc(replacementContactId);
      assertNewContact(newContactFromRemote, { ...ORIGINAL_USER, phone: undefined }, originalContact);
      // New contact is still place's primary contact
      const districtFromRemote = await utils.getDoc(DISTRICT._id);
      expect(districtFromRemote.contact._id).to.equal(replacementContactId);

      // Subsequent form reports are *not* re-parented to the new contact
      await browser.reloadSession();
      await browser.url('/');
      await loginPage.login(ORIGINAL_USER);
      await commonPage.waitForPageLoaded();
      await browser.throttle('offline');
      const finalOriginalContactLocal = await getLocalDocFromBrowser(originalContactId);
      assertOriginalContactUpdated(finalOriginalContactLocal, ORIGINAL_USER.username, replacementContactId, 'ERROR');
      await commonPage.goToReports();
      const basicReportId2 = await submitBasicForm();
      const basicReportId3 = await submitBasicForm();
      const subsequentBasicReports = await getManyLocalDocsFromBrowser([basicReportId2, basicReportId3]);
      subsequentBasicReports.forEach((report) => expect(report.contact._id).to.equal(originalContactId));
    });
  });

  it('does not create a new user when the replace_user form is submitted for online user', async () => {
    await utils.updateSettings(SETTINGS, 'sentinel');
    await loginAsOnlineUser();
    const originalContactId = ONLINE_USER.contact._id;
    await commonPage.goToPeople(originalContactId);

    await populateReplaceUserForm(REPLACE_USER_FORM_TITLE);
    await contactsPage.submitForm();
    // No logout triggered
    await commonPage.goToReports();
    const reportId = await reportsPage.getLastSubmittedReportId();

    // Report is submitted successfully
    const replaceUserReport = await utils.getDoc(reportId);
    assertReplaceUserReport(replaceUserReport, originalContactId);
    const { replacement_contact_id: replacementContactId } = replaceUserReport.fields;

    await sentinelUtils.waitForSentinel();
    const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

    // Transition not triggered
    expect(transitions.create_user_for_contacts).to.be.undefined;
    // Original contact not updated
    const updatedOriginalContact = await utils.getDoc(originalContactId);
    expect(updatedOriginalContact.user_for_contact).to.be.undefined;
    // Can still login as original user
    const resp1 = await submitLoginRequest(ONLINE_USER);
    expect(resp1.statusCode).to.equal(302);
    // New user not created
    const newUserSettings = await utils.getUserSettings({ contactId: replacementContactId });
    expect(newUserSettings).to.be.empty;
    // No messages sent
    const queuedMsgs = await getQueuedMessages();
    expect(queuedMsgs).to.be.empty;
  });
});
