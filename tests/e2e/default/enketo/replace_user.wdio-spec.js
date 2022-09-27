const { expect } = require('chai');
const fs = require('fs');
const utils = require('../../../utils');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const constants = require('../../../constants');
const contactsPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const genericForm = require('../../../page-objects/default/enketo/generic-form.wdio.page');
const sentinelUtils = require('../../../utils/sentinel');

const adminCodeField = () => $('input[name="/replace_user/intro/admin_code"]');
const fullNameField = () => $('input[name="/replace_user/new_contact/name"]');
const dobUnknownField = () => $('input[name="/replace_user/new_contact/ephemeral_dob/dob_method"]');
const yearsField = () => $('input[name="/replace_user/new_contact/ephemeral_dob/age_years"]');
const femaleField = () => $('input[name="/replace_user/new_contact/sex"][value="female"]');

const DISTRICT = {
  _id: 'fixture:district',
  type: 'district_hospital',
};
const ORIGINAL_USER = {
  username: 'original_person',
  password: 'medic.123',
  place: DISTRICT._id,
  phone: '+254712345678',
  contact: { _id: 'fixture:user:original_person', name: 'Original Person' },
  roles: ['chw'],
};

const newUsers = [];

const getQueuedMessages = () => utils.db.query('medic-admin/message_queue', { reduce: false, include_docs: true })
  .then(response => response.rows.map(row => row.doc));

const settings = {
  transitions: { create_user_for_contacts: true },
  token_login: { enabled: true },
  app_url: constants.BASE_URL
};

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

describe('Submit the Replace User form', () => {
  beforeEach(async () => {
    await utils.saveDocs([DISTRICT, BASIC_FORM_DOC]);
  });

  afterEach(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers(newUsers.map(username => ({ username })));
    newUsers.length = 0;
  });

  it('is triggred when the replace_user form is submitted', async () => {
    await utils.updateSettings(settings, 'sentinel');
    await utils.createUsers([ORIGINAL_USER]);
    newUsers.push(ORIGINAL_USER.username);
    await loginPage.login(ORIGINAL_USER);
    await commonPage.waitForPageLoaded();
    await commonPage.closeTour();

    await browser.throttle('offline');

    await commonPage.goToPeople(ORIGINAL_USER.contact._id);
    await contactsPage.createNewAction('Replace User');
    await (await adminCodeField()).setValue('secretCode');
    await genericForm.nextPage();
    await (await fullNameField()).setValue('Replacement User');
    await (await dobUnknownField()).click();
    await (await yearsField()).setValue(22);
    await (await femaleField()).click();
    await (await genericForm.submitButton()).click();
    const reportNames = await contactsPage.getAllRHSReportsNames();
    expect(reportNames.filter(name => name === 'Replace User')).to.have.lengthOf(1);
    await commonPage.goToReports();
    await (await reportsPage.firstReport()).click();
    const reportId = await reportsPage.getCurrentReportId();
    // Submit several forms to be re-parented
    await (await reportsPage.submitReportButton()).click();
    await (await reportsPage.formActionsLink('basic_form')).click();
    await (await genericForm.submitButton()).waitForDisplayed();
    await (await genericForm.submitButton()).click();
    await commonPage.waitForPageLoaded();
    const basicReportId0 = await reportsPage.getCurrentReportId();
    await (await reportsPage.submitReportButton()).click();
    await (await reportsPage.formActionsLink('basic_form')).click();
    await (await genericForm.submitButton()).waitForDisplayed();
    await (await genericForm.submitButton()).click();
    await commonPage.waitForPageLoaded();
    const basicReportId1 = await reportsPage.getCurrentReportId();

    await browser.throttle('online');

    await commonPage.openHamburgerMenu();
    await (await commonPage.syncButton()).click();
    await (await loginPage.loginButton()).waitForDisplayed();

    await loginPage.cookieLogin();
    // Replace user report created
    const replaceUserReport = await utils.getDoc(reportId);
    const { original_contact_uuid, new_contact_uuid } = replaceUserReport.fields;
    expect(new_contact_uuid).to.not.be.empty;
    expect(original_contact_uuid).to.equal(ORIGINAL_USER.contact._id);
    // Basic form reports re-parented
    const basicReports = await utils.getDocs([basicReportId0, basicReportId1]);
    basicReports.forEach((report) => expect(report.contact._id).to.equal(new_contact_uuid));
    // New contact created
    const newContact = await utils.getDoc(new_contact_uuid);
    expect(newContact.phone).to.equal(ORIGINAL_USER.phone);

    await sentinelUtils.waitForSentinel(original_contact_uuid);
    const { transitions } = await sentinelUtils.getInfoDoc(original_contact_uuid);

    // Transition successful
    expect(transitions.create_user_for_contacts.ok).to.be.true;
    // Original user disabled
    const oldUserSettings = await utils.getUserSettings({ contactId: original_contact_uuid });
    expect(oldUserSettings.inactive).to.be.true;
    // New user created
    const newUserSettings = await utils.getUserSettings({ contactId: new_contact_uuid });
    newUsers.push(newUserSettings.name);
    expect(newUserSettings).to.deep.include({
      roles: ORIGINAL_USER.roles,
      phone: newContact.phone,
      facility_id: newContact.parent._id,
      contact_id: newContact._id,
      fullname: newContact.name,
    });
    expect(newUserSettings.token_login.active).to.be.true;
    expect(newUserSettings._id).to.match(/^org\.couchdb\.user:replacement-user-\d\d\d\d$/);
    expect(newUserSettings.name).to.match(/^replacement-user-\d\d\d\d$/);
    // Login token sent
    const queuedMsgs = await getQueuedMessages();
    expect(queuedMsgs).to.have.lengthOf(1);
    const [queuedMsg] = queuedMsgs;
    expect(queuedMsg).to.deep.include({
      type: 'token_login',
      user: newUserSettings._id
    });
    const [{ to, message }] = queuedMsg.tasks[1].messages;
    expect(to).to.equal(newUserSettings.phone);

    // Open the texted link
    await commonPage.logout();
    await browser.url(message);
    await commonPage.waitForPageLoaded();
    const [cookie] = await browser.getCookies('userCtx');
    expect(cookie.value).to.contain(newUserSettings.name);
  });
});
