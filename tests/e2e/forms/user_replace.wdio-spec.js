const { expect } = require('chai');
const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');
const constants = require('../../constants');
const contactsPage = require('../../page-objects/contacts/contacts.wdio.page');
const genericForm = require('../../page-objects/forms/generic-form.wdio.page');
const commonElements = require('../../page-objects/common/common.wdio.page');
const sentinelUtils = require('../sentinel/utils');

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
  transitions: { user_replace: true },
  token_login: { enabled: true },
  app_url: `http://${constants.API_HOST}:${constants.API_PORT}`
};

describe('user_replace transition', () => {
  before(async () => {
    await utils.saveDoc(DISTRICT);
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
    await contactsPage.openNewAction('replace_user');
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

    await browser.throttle('online');

    await commonElements.openHamburgerMenu();
    await (await commonElements.syncButton()).click();
    await (await loginPage.loginButton()).waitForDisplayed();

    // Replace user report created
    const replaceUserReport = await utils.getDoc(reportId);
    const { original_contact_uuid, new_contact_uuid } = replaceUserReport.fields;
    expect(new_contact_uuid).to.not.be.empty;
    expect(original_contact_uuid).to.equal(ORIGINAL_USER.contact._id);
    // New contact created
    const newContact = await utils.getDoc(new_contact_uuid);
    expect(newContact.phone).to.equal(ORIGINAL_USER.phone);

    await sentinelUtils.waitForSentinel(reportId);
    const { transitions } = await sentinelUtils.getInfoDoc(reportId);

    // Transition successful
    expect(transitions.user_replace.ok).to.be.true;
    // Original user updated
    const oldUserSettings = await utils.getUserSettings({ contactId: original_contact_uuid });
    expect(oldUserSettings.replaced).to.be.true;
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
    browser.navigateTo(message);
    await commonPage.waitForPageLoaded();
    const [cookie] = await browser.getCookies('userCtx');
    expect(cookie.value).to.contain(newUserSettings.name);
  });
});
