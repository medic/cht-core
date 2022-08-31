const fs = require('fs');

const utils = require('../../utils');
// const constants = require('../../constants');
// const commonElements = require('../../page-objects/common/common.wdio.page');
// const reportsPo = require('../../page-objects/reports/reports.wdio.page');
// const genericForm = require('../../page-objects/forms/generic-form.wdio.page');
const loginPage = require('../../page-objects/login/login.wdio.page');
const userData = require('../../page-objects/forms/data/user.po.data');
const commonPage = require('../../page-objects/common/common.wdio.page');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');
const constants = require("../../constants");
const contactsPage = require("../../page-objects/contacts/contacts.wdio.page");
const genericForm = require("../../page-objects/forms/generic-form.wdio.page");
const commonElements = require("../../page-objects/common/common.wdio.page");

const rightAddAction = () => $('.right-pane span a[data-toggle="dropdown"]');
const replaceUserItem = () => $('li[id="form:replace_user"]');

const formTitle = () => $('#form-title');
const adminCodeField = () => $('input[name="/replace_user/intro/admin_code"]');
const fullNameField = () => $('input[name="/replace_user/new_contact/name"]');
const dobUnknownField = () => $('input[name="/replace_user/new_contact/ephemeral_dob/dob_method"]');
const yearsField = () => $('input[name="/replace_user/new_contact/ephemeral_dob/age_years"]');
const femaleField = () => $('input[name="/replace_user/new_contact/sex"][value="female"]');

const reportRecordEntry = () => $('[ng-reflect-heading="Replace User"]');
const loginButton = () => $('button[id="login"]');

const district = {
  _id: 'fixture:district',
  type: 'district_hospital',
  name: 'District',
  place_id: 'district',
  reported_date: new Date().getTime(),
};
const chw = {
  username: 'bob',
  password: 'medic.123',
  place: 'fixture:district',
  contact: { _id: 'fixture:user:bob', name: 'Bob' },
  roles: ['chw'],
};

const login = async () => {
  await loginPage.login(chw);
  await commonPage.waitForPageLoaded();
};

describe('user_replace transition', () => {
  before(async () => {
    // await utils.saveDoc(formDocument);
    // await utils.seedTestData(userData.userContactDoc, userData.docs);
    await utils.saveDoc(district);
  });

  afterEach(async () => {
  });

  it('submits on reports tab', async () => {
    await utils.createUsers([chw]);
    await login();
    await browser.throttle('offline');
    await commonPage.closeTour();
    await commonPage.goToPeople('fixture:user:bob');


    await (await rightAddAction()).click();
    await (await replaceUserItem()).click();
    await (await formTitle()).waitForDisplayed();
    await (await adminCodeField()).setValue('secretCode');
    await genericForm.nextPage();
    await (await fullNameField()).setValue('Replacement User');
    await (await dobUnknownField()).click();
    await (await yearsField()).setValue(22);
    await (await femaleField()).click();
    await (await genericForm.submitButton()).click();

    await (await reportRecordEntry()).waitForDisplayed();
    await (await reportRecordEntry()).click();
    const reportId = await reportsPage.getCurrentReportId();

    await browser.throttle('online');
    // await commonElements.sync();
    await commonElements.openHamburgerMenu();
    await (await commonElements.syncButton()).click();
    await (await loginButton()).waitForDisplayed();

    await loginPage.cookieLogin();

    // const initialReport = await utils.getDoc(reportId);
    console.log('jkuester' + reportId);
    // TODO Assert report submitted:


  });
});
