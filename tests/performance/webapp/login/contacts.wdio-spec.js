//const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const pagePerformance = require('@utils/performance');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const contactsPage = require('@page-objects/default/contacts/contacts.wdio.page');

const userFactory = require('@factories/cht/users/users');
const user = userFactory.build();

describe('contacts', () => {
  before(async () => {
    await loginPage.login({ ...user, loadPage: false, createUser: false });
    pagePerformance.track('replicate');
    await commonElements.waitForAngularLoaded();
    pagePerformance.record();
  });

  it('measure contacts initial load', async () => {
    await commonElements.goToPeople(null, false);
    pagePerformance.track('contacts');
    await commonElements.waitForPageLoaded();
    await browser.waitUntil(async () => (await contactsPage.leftPanelSelectors.contentRows()).length > 0);
    pagePerformance.record();
  });
});
