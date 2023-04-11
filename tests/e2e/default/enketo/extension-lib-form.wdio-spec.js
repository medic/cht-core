const extensionLibsPage = require('@page-objects/default/enketo/extension-lib.wdio.page');
const common = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const utils = require('@utils');
const userData = require('@page-objects/default/users/user.data');
const loginPage = require('@page-objects/default/login/login.wdio.page');

const { userContactDoc, docs } = userData;

describe('Extension lib xpath function', () => {

  before(async () => {
    await utils.saveDocs(docs);

    const waitForServiceWorker = await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX);
    await extensionLibsPage.configure(userContactDoc);
    await waitForServiceWorker.promise;
  });

  it('calculate average', async () => {
    await loginPage.cookieLogin();
    await browser.refresh();
    await common.goToReports();

    await reportsPage.openForm(extensionLibsPage.TITLE);
    await extensionLibsPage.typeFirst(5);
    await extensionLibsPage.typeSecond(8);
    await extensionLibsPage.blur();

    const average = await extensionLibsPage.getAverage();
    expect(average).to.deep.equal('6.5');

    // no need to submit - if the value is updated then we're good to go
  });

});
