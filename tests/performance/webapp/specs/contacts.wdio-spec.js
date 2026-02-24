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
    pagePerformance.track('initial replication with tasks');
    await commonElements.waitForAngularLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  it('measure contacts initial load', async () => {
    await commonElements.goToPeople('', false);
    pagePerformance.track('contacts - first load');
    await contactsPage.waitForContactsLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  it('measure contacts second load', async () => {
    await commonElements.goToPeople('', false);
    pagePerformance.track('contacts - second load');
    await contactsPage.waitForContactsLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  for (let i = 0; i < 5; i++) {
    it('measure contacts third load', async () => {
      await commonElements.goToPeople('', false);
      pagePerformance.track('contacts - third load');
      await contactsPage.waitForContactsLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });
  }

  it('measure loading home-place first', async () => {
    await commonElements.goToPeople('', false);
    pagePerformance.track('contacts - open home-place first load');
    await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  it('measure loading home-place second', async () => {
    await commonElements.goToPeople('', false);
    pagePerformance.track('contacts - open home-place second load');
    await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  for (let i = 0; i < 5; i++) {
    it('measure loading home-place third', async () => {
      await commonElements.goToPeople('', false);
      pagePerformance.track('contacts - open home-place third load');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });
  }

  for (let i = 0; i < 2; i++) {
    it('measure contacts scroll', async () => {
      await commonElements.goToPeople('', false);
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      pagePerformance.track('contacts - first scroll');
      await commonElements.loadNextInfiniteScrollPage();
      pagePerformance.record();

      pagePerformance.track('contacts - second scroll');
      await commonElements.loadNextInfiniteScrollPage();
      pagePerformance.record();
    });
  }

  it('measure clinic first', async () => {
    await commonElements.goToPeople('', false);
    await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
    await contactsPage.openNthContact(10);
    pagePerformance.track('contacts - open clinic first load');
    await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  it('measure clinic second', async () => {
    await commonElements.goToPeople('', false);
    await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
    await contactsPage.openNthContact(10);
    pagePerformance.track('contacts - open clinic second load');
    await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  for (let i = 0; i < 5; i++) {
    it('measure clinic third', async () => {
      await commonElements.goToPeople('', false);
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      await contactsPage.openNthContact(10);
      pagePerformance.track('contacts - open clinic third load');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });
  }
});
