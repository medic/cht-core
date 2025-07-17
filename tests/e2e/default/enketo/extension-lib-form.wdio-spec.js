const commonPage = require('@page-objects/default/common/common.wdio.page');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const { extensionLibDoc } = require('@page-objects/default/enketo/custom-doc.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');

describe('Extension lib xpath function', () => {

  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const person = personFactory.build({ parent: {_id: healthCenter._id, parent: healthCenter.parent} });

  before(async () => {
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/extension-lib-average-calculator`));
    await utils.saveDoc(extensionLibDoc);

    const waitForServiceWorker = await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX);
    await waitForServiceWorker.promise;
    await commonPage.reloadSession();

    await utils.saveDocs([...places.values(), person]);
    await utils.createUsers([offlineUser]);
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

  it('should calculate average for offline user', async () => {
    await commonPage.reloadSession();
    await loginPage.login(offlineUser);

    await commonPage.goToReports();
    console.warn('before throttle');
    await browser.throttle('offline');
    console.warn('after throttle');

    await commonPage.openFastActionReport('extension-lib-average-calculator', false);

    await commonEnketoPage.setInputValue('first', 5);
    await commonEnketoPage.setInputValue('second', 8);
    await genericForm.formTitle().click();

    expect(await commonEnketoPage.getInputValue('avg')).to.equal('6.5');
  });
});
