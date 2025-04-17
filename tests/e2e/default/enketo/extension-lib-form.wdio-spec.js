const commonPage = require('@page-objects/default/common/common.wdio.page');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const { extensionLibDoc } = require('@page-objects/default/enketo/custom-doc.wdio.page');

describe('Extension lib xpath function', () => {

  before(async () => {
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/extension-lib-average-calculator`));
    await utils.saveDoc(extensionLibDoc);

    const waitForServiceWorker = await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX);
    await waitForServiceWorker.promise;
    await commonPage.reloadSession();
  });

  after(async () => {
    await utils.deleteDocs(['extension-lib-average-calculator']);
    await utils.revertDb([/^form:/], true);
  });

  it('calculate average', async () => {
    await loginPage.cookieLogin();
    await commonPage.goToReports();

    await commonPage.openFastActionReport('extension-lib-average-calculator', false);

    await commonEnketoPage.setInputValue('first', 5);
    await commonEnketoPage.setInputValue('second', 8);
    await genericForm.formTitle().click();

    expect(await commonEnketoPage.getInputValue('avg')).to.equal('6.5');

    // no need to submit - if the value is updated then we're good to go
  });

});
