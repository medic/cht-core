//const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const user = require('../generate-dataset').data().user;
const pagePerformance = require('@utils/performance');
const commonElements = require('@page-objects/default/common/common.wdio.page');

describe('contacts', () => {
  before(async () => {
    await loginPage.login({ ...user, loadPage: false });
    pagePerformance.track('replicate');
    await commonElements.waitForAngularLoaded();
    pagePerformance.record();
  });

  it('measure contacts initial load', async () => {
    await commonElements.goToPeople(null, false);
    performance.measure('contacts');
    await commonElements.waitForPageLoaded();
    performance.record();
  });
});
