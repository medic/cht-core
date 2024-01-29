const extensionLibsPage = require('@page-objects/default/enketo/extension-lib.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const utils = require('@utils');
const userData = require('@page-objects/default/users/user.data');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe.skip('Extension lib xpath function', () => {
  const { userContactDoc, docs } = userData;

  before(async () => {
    await utils.saveDocs(docs);

    const waitForServiceWorker = await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX);
    await extensionLibsPage.configure(userContactDoc);
    await waitForServiceWorker.promise;
    await browser.reloadSession();
    await browser.url('/');
  });

  it('calculate average', async () => {
    await loginPage.cookieLogin();
    await commonPage.goToReports();

    await commonPage.openFastActionReport(extensionLibsPage.INTERNAL_ID, false);

    await commonEnketoPage.setInputValue('first', 5);
    await commonEnketoPage.setInputValue('second', 8);
    await extensionLibsPage.blur();

    const average = await extensionLibsPage.getAverage();
    expect(average).to.equal('6.5');

    // no need to submit - if the value is updated then we're good to go
  });

});
