//const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const pagePerformance = require('@utils/performance');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const userFactory = require('@factories/cht/users/users');
const user = userFactory.build();

describe('initial replication', () => {

  it('measure replication', async () => {
    await loginPage.login({ ...user, loadPage: false, createUser: false });
    pagePerformance.track('replicate');
    await commonElements.waitForAngularLoaded();
    pagePerformance.record();
  });
});
