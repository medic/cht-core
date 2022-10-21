/* global window */
const { assert } = require('chai');
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

const submitReplaceUserForm = async (formTitle, submitAction = () => contactsPage.submitForm()) => {
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
      .get(docId, { conflicts: true })
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
  assert.isNotEmpty(replaceUserReport.fields.replacement_contact_id);
  assert.equal(replaceUserReport.contact._id, originalContactId);
};

const assertOriginalContactUpdated = (originalContact, originalUsername, newContactId, status) => {
  assert.deepEqual(originalContact.user_for_contact, {
    replace: {
      [originalUsername]: {
        status, replacement_contact_id: newContactId,
      }
    }
  });
};

const assertNewContact = (newContact, originalUser, originalContact) => {
  assert.equal(newContact.phone, originalUser.phone);
  assert.equal(newContact.parent._id, originalContact.parent._id);
  assert.equal(newContact.name, 'Replacement User');
  assert.equal(newContact.sex, 'female');
};

const assertUserDisabled = async (user) => {
  const [oldUserSettings] = await utils.getUserSettings({ name: user.username });
  assert.isTrue(oldUserSettings.inactive);

  const opts = {
    path: '/medic/login',
    body: { user: user.username, password: user.password, locale: 'en' },
    method: 'POST',
    simple: false,
  };
  const resp = await utils.request(opts);
  assert.equal(resp.statusCode, 401);
};

const assertNewUserSettings = (newUserSettings, newContact, originalUser) => {
  assert.deepInclude(newUserSettings, {
    roles: originalUser.roles,
    phone: newContact.phone,
    facility_id: newContact.parent._id,
    contact_id: newContact._id,
    fullname: newContact.name,
  });
  assert.isTrue(newUserSettings.token_login.active);
  assert.match(newUserSettings._id, /^org\.couchdb\.user:replacement-user-\d\d\d\d$/);
  assert.match(newUserSettings.name, /^replacement-user-\d\d\d\d$/);
};

const getTextedLoginLink = async (newUserSettings) => {
  const queuedMsgs = await getQueuedMessages();
  assert.lengthOf(queuedMsgs, 1);
  const [queuedMsg] = queuedMsgs;
  assert.deepInclude(queuedMsg, {
    type: 'token_login', user: newUserSettings._id
  });
  const [{ to, message }] = queuedMsg.tasks[1].messages;
  assert.equal(to, newUserSettings.phone);
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

      await commonPage.goToPeople(originalContactId);
      await submitReplaceUserForm(REPLACE_USER_FORM_TITLE);
      const reportNames = await contactsPage.getAllRHSReportsNames();
      assert.lengthOf(reportNames.filter(name => name === REPLACE_USER_FORM_TITLE), 1);
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
      basicReports.forEach((report) => assert.equal(report.contact._id, replacement_contact_id));
      // Original contact updated to PENDING
      const originalContact = await getLocalDocFromBrowser(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacement_contact_id, 'PENDING');
      const newContact = await getLocalDocFromBrowser(replacement_contact_id);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      // Set as primary contact
      const district = await getLocalDocFromBrowser(DISTRICT._id);
      assert.equal(district.contact._id, replacement_contact_id);

      await browser.throttle('online');
      await sync();
      await (await loginPage.loginButton()).waitForDisplayed();

      await sentinelUtils.waitForSentinel();
      const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

      // Transition successful
      assert.isTrue(transitions.create_user_for_contacts.ok);
      // Original contact updated to COMPLETE
      const finalOriginalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(finalOriginalContact, ORIGINAL_USER.username, replacement_contact_id, 'COMPLETE');
      await assertUserDisabled(ORIGINAL_USER);
      // New user created
      const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: replacement_contact_id });
      assert.isEmpty(additionalUsers);
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, newContact, ORIGINAL_USER);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // Open the texted link
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      assert.include(cookie.value, newUserSettings.name);
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
      assert.isTrue(transitions.create_user_for_contacts.ok);
      const originalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacement_contact_id, 'COMPLETE');
      const newContact = await utils.getDoc(replacement_contact_id);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      await assertUserDisabled(ORIGINAL_USER);
      // Set as primary contact
      assert.equal((await utils.getDoc(DISTRICT._id)).contact._id, replacement_contact_id);
      // New user created
      const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: replacement_contact_id });
      assert.isEmpty(additionalUsers);
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, newContact, ORIGINAL_USER);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // Open the texted link
      await commonPage.logout();
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      assert.include(cookie.value, newUserSettings.name);
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
      assert.isTrue(transitions.create_user_for_contacts.ok);
      const originalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacement_contact_id, 'COMPLETE');
      const newContact = await utils.getDoc(replacement_contact_id);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      await assertUserDisabled(ORIGINAL_USER);
      // Primary contact not updated
      assert.equal((await utils.getDoc(DISTRICT._id)).contact._id, 'not-the-original-contact');
      // New user created
      const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: replacement_contact_id });
      assert.isEmpty(additionalUsers);
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, newContact, ORIGINAL_USER);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // Open the texted link
      await commonPage.logout();
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      assert.include(cookie.value, newUserSettings.name);
    });

    it('creates new user from latest replace_user form data if multiple are submitted before syncing', async () => {
      await utils.updateSettings(SETTINGS, 'sentinel');
      await loginAsOfflineUser();
      const originalContactId = ORIGINAL_USER.contact._id;

      await browser.throttle('offline');

      await commonPage.goToPeople(originalContactId);
      await submitReplaceUserForm(REPLACE_USER_FORM_TITLE);
      let reportNames = await contactsPage.getAllRHSReportsNames();
      assert.lengthOf(reportNames.filter(name => name === REPLACE_USER_FORM_TITLE), 1);
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
      basicReports.forEach((report) => assert.equal(report.contact._id, replacementContactId0));
      // Original contact updated to PENDING
      let originalContact = await getLocalDocFromBrowser(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacementContactId0, 'PENDING');
      const newContact = await getLocalDocFromBrowser(replacementContactId0);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      // Set as primary contact
      let district = await getLocalDocFromBrowser(DISTRICT._id);
      assert.equal(district.contact._id, replacementContactId0);

      // Submit another replace user form
      await commonPage.goToPeople(replacementContactId0);
      await submitReplaceUserForm(OTHER_REPLACE_FORM_DOC.title);
      reportNames = await contactsPage.getAllRHSReportsNames();
      assert.lengthOf(reportNames.filter(name => name === OTHER_REPLACE_FORM_DOC.title), 1);
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
      basicReports1.forEach((report) => assert.equal(report.contact._id, replacementContactId1));
      // Original contact updated to have new replacement contact id
      originalContact = await getLocalDocFromBrowser(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacementContactId1, 'PENDING');
      const newContact1 = await getLocalDocFromBrowser(replacementContactId1);
      assertNewContact(newContact1, ORIGINAL_USER, originalContact);
      // Set as primary contact
      district = await getLocalDocFromBrowser(DISTRICT._id);
      assert.equal(district.contact._id, replacementContactId1);

      await browser.throttle('online');
      await sync();
      await (await loginPage.loginButton()).waitForDisplayed();

      await sentinelUtils.waitForSentinel();
      const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

      // Transition successful
      assert.isTrue(transitions.create_user_for_contacts.ok);
      // Original contact updated to COMPLETE
      originalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacementContactId1, 'COMPLETE');
      await assertUserDisabled(ORIGINAL_USER);
      // New user created
      const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: replacementContactId1 });
      assert.isEmpty(additionalUsers);
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, newContact1, ORIGINAL_USER);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // User not created for first replacement contact
      const newUserSettings1 = await utils.getUserSettings({ contactId: replacementContactId0 });
      assert.isEmpty(newUserSettings1);

      // Open the texted link
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      assert.include(cookie.value, newUserSettings.name);
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
      assert.isTrue(transitions.create_user_for_contacts.ok);
      const originalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(originalContact, ORIGINAL_USER.username, replacement_contact_id, 'COMPLETE');
      const newContact = await utils.getDoc(replacement_contact_id);
      assertNewContact(newContact, ORIGINAL_USER, originalContact);
      await assertUserDisabled(ORIGINAL_USER);
      // Set as primary contact
      assert.equal((await utils.getDoc(DISTRICT._id)).contact._id, replacement_contact_id);
      // New user created
      const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: replacement_contact_id });
      assert.isEmpty(additionalUsers);
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, newContact, ORIGINAL_USER);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // Open the texted link
      await commonPage.logout();
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      assert.include(cookie.value, newUserSettings.name);

      // Other user still associated with original contact
      const [otherUserSettings] = await utils.getUserSettings({ name: otherUser.username });
      assert.equal(otherUserSettings.contact_id, ORIGINAL_USER.contact._id);
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
      await submitReplaceUserForm(REPLACE_USER_FORM_TITLE);
      const reportNames = await contactsPage.getAllRHSReportsNames();
      assert.lengthOf(reportNames.filter(name => name === REPLACE_USER_FORM_TITLE), 1);
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
      assert.equal(district.contact._id, replacementContactId);

      // Logout before syncing
      await commonPage.logout();

      // Replace other user
      await browser.throttle('online');
      await loginPage.login(otherUser);
      await commonPage.waitForPageLoaded();
      await commonPage.goToPeople(originalContactId);
      await submitReplaceUserForm(REPLACE_USER_FORM_TITLE, async () => {
        await (await genericForm.submitButton()).waitForDisplayed();
        await (await genericForm.submitButton()).click();

        // Logout triggered immediately
        await (await loginPage.loginButton()).waitForDisplayed();
      });

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
      assert.isTrue(transitions.create_user_for_contacts.ok);
      originalContact = await utils.getDoc(originalContactId);
      assertOriginalContactUpdated(originalContact, otherUser.username, otherReplacementContactId, 'COMPLETE');
      const otherNewContact = await utils.getDoc(otherReplacementContactId);
      assertNewContact(otherNewContact, otherUser, originalContact);
      await assertUserDisabled(otherUser);
      // Set as primary contact
      assert.equal((await utils.getDoc(DISTRICT._id)).contact._id, otherReplacementContactId);
      // New user created
      const [newUserSettings, ...additionalUsers] =
        await utils.getUserSettings({ contactId: otherReplacementContactId });
      assert.isEmpty(additionalUsers);
      newUsers.push(newUserSettings.name);
      assertNewUserSettings(newUserSettings, otherNewContact, otherUser);
      const loginLink = await getTextedLoginLink(newUserSettings);

      // Open the texted link
      await commonPage.logout();
      await browser.url(loginLink);
      await commonPage.waitForPageLoaded();
      const [cookie] = await browser.getCookies('userCtx');
      assert.include(cookie.value, newUserSettings.name);
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
      assert.deepEqual(localOriginalContact, originalContact);
      // Other user replace data exists on the contact
      assertOriginalContactUpdated(originalContact, otherUser.username, otherReplacementContactId, 'COMPLETE');
      // Original user replace data is gone (because of the conflict)
      assert.isUndefined(originalContact.user_for_contact.replace[ORIGINAL_USER.username]);

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
      assert.equal(newContact.phone, ORIGINAL_USER.phone);
      // Basic report not re-parented
      const basicReports = await utils.getDoc(basicReportId);
      assert.equal(basicReports.contact._id, originalContactId);

      await sentinelUtils.waitForSentinel();
      const { transitions } = await sentinelUtils.getInfoDoc(originalContactId);

      // Transition not triggered
      assert.isUndefined(transitions.create_user_for_contacts);
      // Original contact not updated
      const updatedOriginalContact = await utils.getDoc(DEFAULT_USER_CONTACT_DOC._id);
      assert.isUndefined(updatedOriginalContact.user_for_contact);
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
    assert.isUndefined(transitions.create_user_for_contacts);
    // Original contact not updated
    const updatedOriginalContact = await utils.getDoc(originalContactId);
    assert.isUndefined(updatedOriginalContact.user_for_contact);
    // Original user not disabled
    const [oldUserSettings] = await utils.getUserSettings({ name: ONLINE_USER.username });
    assert.isUndefined(oldUserSettings.inactive);
    // New user not created
    const newUserSettings = await utils.getUserSettings({ contactId: replacement_contact_id });
    assert.isEmpty(newUserSettings);
    // No messages sent
    const queuedMsgs = await getQueuedMessages();
    assert.isEmpty(queuedMsgs);
  });
});
