//const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const pagePerformance = require('@utils/performance');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const contactsPage = require('@page-objects/default/contacts/contacts.wdio.page');

const userFactory = require('@factories/cht/users/users');
const user = userFactory.build();

const LOAD_TIMEOUT = 40000;

describe('contacts', () => {
  before(async () => {
    await loginPage.login({ ...user, loadPage: false, createUser: false });
    pagePerformance.track('replicate with tasks');
    await commonElements.waitForAngularLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  it('measure contacts initial load', async () => {
    await commonElements.goToPeople('', false);
    pagePerformance.track('contacts first');
    await contactsPage.waitForContactsLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  it('measure contacts second load', async () => {
    await commonElements.goToPeople('', false);
    pagePerformance.track('contacts second');
    await contactsPage.waitForContactsLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  for (let i = 0; i < 5; i++) {
    it('measure contacts third load', async () => {
      await commonElements.goToPeople('', false);
      pagePerformance.track('contacts third');
      await contactsPage.waitForContactsLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });
  }

  it('measure loading home-place first', async () => {
    await commonElements.goToPeople('', false);
    await contactsPage.waitForContactsLoaded(LOAD_TIMEOUT);
    await contactsPage.openFirstContact();
    pagePerformance.track('home-place first');
    await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  it('measure loading home-place second', async () => {
    await commonElements.goToPeople('', false);
    await contactsPage.waitForContactsLoaded(LOAD_TIMEOUT);
    await contactsPage.openFirstContact();
    pagePerformance.track('home-place second');
    await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  for (let i = 0; i < 5; i++) {
    it('measure loading home-place third', async () => {
      await commonElements.goToPeople('', false);
      await contactsPage.waitForContactsLoaded(LOAD_TIMEOUT);
      await contactsPage.openFirstContact();
      pagePerformance.track('home-place third');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });
  }

  it('measure clinic first', async () => {
    await commonElements.goToPeople('', false);
    await contactsPage.waitForContactsLoaded(LOAD_TIMEOUT);
    await contactsPage.openNthContact(10);
    pagePerformance.track('clinic first');
    await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  it('measure clinic second', async () => {
    await commonElements.goToPeople('', false);
    await contactsPage.waitForContactsLoaded(LOAD_TIMEOUT);
    await contactsPage.openNthContact(10);
    pagePerformance.track('clinic second');
    await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  for (let i = 0; i < 5; i++) {
    it('measure clinic third', async () => {
      await commonElements.goToPeople('', false);
      await contactsPage.waitForContactsLoaded(LOAD_TIMEOUT);
      await contactsPage.openNthContact(10);
      pagePerformance.track('clinic third');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });
  }
});
