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

const DISTRICT = {
  _id: 'fixture:district',
  type: 'district_hospital',
  contact: {
    _id: 'fixture:user:original_person',
  }
};

const ORIGINAL_USER = {
  username: `original_person`,
  password: 'medic.123',
  place: DISTRICT._id,
  phone: '+254712345678',
  contact: { _id: 'fixture:user:original_person', name: 'Original Person', role: 'chw' },
  roles: ['chw'],
  known: true,
};

const ONLINE_USER = {
  username: `online_user`,
  password: 'medic.123',
  place: DISTRICT._id,
  phone: '+254712345678',
  contact: { _id: 'fixture:user:online_person', name: 'Online Person', role: 'chw' },
  roles: ['program_officer', 'mm-online'],
  known: true,
};

const newUsers = [];

const getQueuedMessages = () => utils.db
  .query('medic-admin/message_queue', { reduce: false, include_docs: true })
  .then(response => response.rows.map(row => row.doc));

const REPLACE_USER_FORM_TITLE = 'Replace User';
const REPLACE_USER_FORM_ID = 'replace_user';

const BASIC_FORM_DOC = {
  _id: 'form:basic_form',
  internalId: 'basic_form',
  title: 'Form basic_form',
  type: 'form',
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer.from(fs.readFileSync(`${__dirname}/forms/basic_form.xml`, 'utf8')).toString('base64')
    }
  }
};

const OTHER_REPLACE_FORM_DOC = {
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
};

const SETTINGS = {
  transitions: { create_user_for_contacts: true },
  create_user_for_contacts: { replace_forms: [REPLACE_USER_FORM_ID, OTHER_REPLACE_FORM_DOC.internalId] },
  token_login: { enabled: true },
  app_url: BASE_URL
};

const loginAsOfflineUser = async () => {
  await utils.createUsers([ORIGINAL_USER]);
  newUsers.push(ORIGINAL_USER.username);
  await loginPage.login(ORIGINAL_USER);
  await commonPage.waitForPageLoaded();
};

const loginAsOnlineUser = async () => {
  await utils.createUsers([ONLINE_USER]);
  newUsers.push(ONLINE_USER.username);
  await loginPage.login(ONLINE_USER);
  await commonPage.waitForPageLoaded();
};

const submitReplaceUserForm = async (formTitle, submitAction = () => contactsPage.submitForm() ) => {
  await contactsPage.createNewAction(formTitle);
  await replaceUserForm.selectAdminCode('secretCode');
  await genericForm.nextPage();
  await replaceUserForm.selectContactFullName('Replacement User');
  await replaceUserForm.selectContactSex(replaceUserForm.SEX.female);
  await replaceUserForm.selectContactDobUnknown();
  await replaceUserForm.selectContactAgeYears(22);
  await genericForm.nextPage();
  await submitAction();
};

const getLocalDocFromBrowser = async (docId) => {
  const { err, result } = await browser.executeAsync((docId, callback) => {
    const db = window.CHTCore.DB.get();
    return db
      .get(docId)
      .then(result => callback({ result }))
      .catch(err => callback({ err }));
  }, docId);

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
  await (await reportsPage.submitReportButton()).click();
  await (await reportsPage.formActionsLink('basic_form')).click();
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
      status,
      replacement_contact_id: newContactId,
      original_username: originalUsername,
    }
  });
};

const assertNewContact = (newContact, originalUser, originalContact) => {
  expect(newContact.phone).to.equal(originalUser.phone);
  expect(newContact.parent._id).to.equal(originalContact.parent._id);
  expect(newContact.name).to.equal('Replacement User');
  expect(newContact.sex).to.equal('female');
};

const assertOriginalUserDisabled = async () => {
  const oldUserSettings = await utils.getUserSettings({ contactId: ORIGINAL_USER.contact._id });
  expect(oldUserSettings.inactive).to.be.true;

  const opts = {
    path: '/medic/login',
    body: { user: ORIGINAL_USER.username, password: ORIGINAL_USER.password, locale: 'en' },
    method: 'POST',
    simple: false,
  };
  const resp = await utils.request(opts);
  expect(resp.statusCode).to.equal(401);
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
    type: 'token_login',
    user: newUserSettings._id
  });
  const [{ to, message }] = queuedMsg.tasks[1].messages;
  expect(to).to.equal(newUserSettings.phone);
  return message;
};

const saveDocIfNotExists = async (doc) => {
  try{
    await utils.getDoc(doc._id);
  } catch(_) {
    await utils.saveDoc(doc);
  }
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

      await commonPage.goToPeople(originalContactId);
      await submitReplaceUserForm(REPLACE_USER_FORM_TITLE);
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
      const { replacement_contact_id } = replaceUserReport.fields;
      // Basic form reports re-parented
      const basicReports = await Promise.all([basicReportId0, basicReportId1].map(id => getLocalDocFromBrowser(id)));
      basicReports.forEach((report) => expect(report.contact._id).to.equal(replacement_contact_id));
      // Original contact updated to PENDING
      const originalContact = await getLocalDocFromBrowser(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacement_contact_id, 'PENDING');
      const newContact = await getLocalDocFromBrowser(replacement_contact_id);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      // Set as primary contact
      const district = await getLocalDocFromBrowser(DISTRICT._id);
      expect(district.contact._id).to.equal(replacement_contact_id);

      await browser.throttle('online');
      await sync();
      await (await loginPage.loginButton()).waitForDisplayed();

      await sentinelUtils.waitForSentinel();
      const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

      // Transition successful
      expect(transitions.create_user_for_contacts.ok).to.be.true;
      // Original contact updated to COMPLETE
      const finalOriginalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(finalOriginalContact, ORIGINAL_USER.username, replacement_contact_id, 'COMPLETE');
      await assertOriginalUserDisabled();
      // New user created
      const newUserSettings = await utils.getUserSettings({ contactId: replacement_contact_id });
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, newContact, ORIGINAL_USER);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // Open the texted link
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      expect(cookie.value).to.contain(newUserSettings.name);
    });

    it('creates a new user when the replace_user form is submitted while online', async () => {
      await utils.updateSettings(SETTINGS, 'sentinel');
      await loginAsOfflineUser();
      const originalContactId = ORIGINAL_USER.contact._id;

      await commonPage.goToPeople(originalContactId);
      await submitReplaceUserForm(REPLACE_USER_FORM_TITLE, async () => {
        await (await genericForm.submitButton()).waitForDisplayed();
        await (await genericForm.submitButton()).click();

        // Logout triggered immediately
        await (await loginPage.loginButton()).waitForDisplayed();
      });

      await loginPage.cookieLogin();
      await commonPage.goToReports();
      const reportId = await reportsPage.getLastSubmittedReportId();

      // Replace user report created
      const replaceUserReport = await utils.getDoc(reportId);
      assertReplaceUserReport(replaceUserReport, originalContactId);
      const { replacement_contact_id } = replaceUserReport.fields;

      await sentinelUtils.waitForSentinel();
      const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

      // Transition successful
      expect(transitions.create_user_for_contacts.ok).to.be.true;
      const originalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacement_contact_id, 'COMPLETE');
      const newContact = await utils.getDoc(replacement_contact_id);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      await assertOriginalUserDisabled();
      // Set as primary contact
      expect((await utils.getDoc(DISTRICT._id)).contact._id).to.equal(replacement_contact_id);
      // New user created
      const newUserSettings = await utils.getUserSettings({ contactId: replacement_contact_id });
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, newContact, ORIGINAL_USER);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // Open the texted link
      await commonPage.logout();
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      expect(cookie.value).to.contain(newUserSettings.name);
    });

    it('does not assign new person as primary contact of parent place if original person was not primary', async () => {
      await utils.updateSettings(SETTINGS, 'sentinel');
      const district = await utils.getDoc(DISTRICT._id);
      district.contact = { _id: 'not-the-original-contact' };
      await utils.saveDoc(district);
      await loginAsOfflineUser();
      const originalContactId = ORIGINAL_USER.contact._id;

      await commonPage.goToPeople(originalContactId);
      await submitReplaceUserForm(REPLACE_USER_FORM_TITLE);

      // Logout triggered immediately
      await (await loginPage.loginButton()).waitForDisplayed();

      await loginPage.cookieLogin();
      await commonPage.goToReports();
      const reportId = await reportsPage.getLastSubmittedReportId();

      // Replace user report created
      const replaceUserReport = await utils.getDoc(reportId);
      assertReplaceUserReport(replaceUserReport, originalContactId);
      const { replacement_contact_id } = replaceUserReport.fields;

      await sentinelUtils.waitForSentinel();
      const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

      // Transition successful
      expect(transitions.create_user_for_contacts.ok).to.be.true;
      const originalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacement_contact_id, 'COMPLETE');
      const newContact = await utils.getDoc(replacement_contact_id);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      await assertOriginalUserDisabled();
      // Primary contact not updated
      expect((await utils.getDoc(DISTRICT._id)).contact._id).to.equal('not-the-original-contact');
      // New user created
      const newUserSettings = await utils.getUserSettings({ contactId: replacement_contact_id });
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, newContact, ORIGINAL_USER);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // Open the texted link
      await commonPage.logout();
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      expect(cookie.value).to.contain(newUserSettings.name);
    });

    it('creates new user from latest replace_user form data if multiple are submitted before syncing', async () => {
      await utils.updateSettings(SETTINGS, 'sentinel');
      await loginAsOfflineUser();
      const originalContactId = ORIGINAL_USER.contact._id;

      await browser.throttle('offline');

      await commonPage.goToPeople(originalContactId);
      await submitReplaceUserForm(REPLACE_USER_FORM_TITLE);
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
      const basicReports = await Promise.all([basicReportId0, basicReportId1].map(id => getLocalDocFromBrowser(id)));
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
      await submitReplaceUserForm(OTHER_REPLACE_FORM_DOC.title);
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
      const basicReports1 = await Promise.all([basicReportId2, basicReportId3].map(id => getLocalDocFromBrowser(id)));
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
      await assertOriginalUserDisabled();
      // New user created
      const newUserSettings = await utils.getUserSettings({ contactId: replacementContactId1 });
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, newContact1, ORIGINAL_USER);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // User not created for first replacement contact
      const newUserSettings1 = await utils.getUserSettings({ contactId: replacementContactId0 });
      expect(newUserSettings1).to.be.undefined;

      // Open the texted link
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      expect(cookie.value).to.contain(newUserSettings.name);
    });

    it('does not create a new user or re-parent reports when the transition is disabled', async () => {
      const settings = Object.assign({}, SETTINGS, { transitions: { create_user_for_contacts: false } });
      await utils.updateSettings(settings, 'sentinel');
      await loginAsOfflineUser();
      const originalContactId = ORIGINAL_USER.contact._id;

      await commonPage.goToPeople(originalContactId);
      await submitReplaceUserForm(REPLACE_USER_FORM_TITLE);
      // No logout triggered
      await commonPage.goToReports();
      const reportId = await reportsPage.getLastSubmittedReportId();
      const basicReportId = await submitBasicForm();

      // Replace user report created
      const replaceUserReport = await utils.getDoc(reportId);
      assertReplaceUserReport(replaceUserReport, originalContactId);
      const { replacement_contact_id } = replaceUserReport.fields;
      // New contact created
      const newContact = await utils.getDoc(replacement_contact_id);
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
  });

  it('does not create a new user when the replace_user form is submitted for online user', async () => {
    await utils.updateSettings(SETTINGS, 'sentinel');
    await loginAsOnlineUser();
    const originalContactId = ONLINE_USER.contact._id;
    await commonPage.goToPeople(originalContactId);

    await submitReplaceUserForm(REPLACE_USER_FORM_TITLE);
    // No logout triggered
    await commonPage.goToReports();
    const reportId = await reportsPage.getLastSubmittedReportId();

    // Report is submitted successfully
    const replaceUserReport = await utils.getDoc(reportId);
    assertReplaceUserReport(replaceUserReport, originalContactId);
    const { replacement_contact_id } = replaceUserReport.fields;

    await sentinelUtils.waitForSentinel();
    const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

    // Transition not triggered
    expect(transitions.create_user_for_contacts).to.be.undefined;
    // Original contact not updated
    const updatedOriginalContact = await utils.getDoc(originalContactId);
    expect(updatedOriginalContact.user_for_contact).to.be.undefined;
    // Original user not disabled
    const oldUserSettings = await utils.getUserSettings({ contactId: originalContactId });
    expect(oldUserSettings.inactive).to.be.undefined;
    // New user not created
    const newUserSettings = await utils.getUserSettings({ contactId: replacement_contact_id });
    expect(newUserSettings).to.be.undefined;
    // No messages sent
    const queuedMsgs = await getQueuedMessages();
    expect(queuedMsgs).to.have.lengthOf(0);
  });
});
