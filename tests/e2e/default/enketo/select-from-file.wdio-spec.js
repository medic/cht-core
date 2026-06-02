const fs = require('fs');
const path = require('path');

const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const utils = require('@utils');
const { DOC_IDS } = require('@medic/constants');

const colorsXmlContent = fs.readFileSync(path.join(__dirname, 'forms', 'colors.xml'));

const upsertResourcesDoc = async () => {
  const attachment = {
    'colors.xml': {
      content_type: 'application/xml',
      data: Buffer.from(colorsXmlContent).toString('base64'),
    }
  };

  let resourcesDoc;
  try {
    resourcesDoc = await utils.getDoc(DOC_IDS.RESOURCES);
    resourcesDoc._attachments = { ...resourcesDoc._attachments, ...attachment };
  } catch {
    resourcesDoc = { _id: DOC_IDS.RESOURCES, _attachments: attachment };
  }
  await utils.saveDoc(resourcesDoc);
};

describe('Select from external dataset (select_one_from_file)', () => {

  before(async () => {
    await upsertResourcesDoc();
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/select_from_file`));

    const waitForServiceWorker = await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX);
    await waitForServiceWorker.promise;
    await commonPage.reloadSession();
  });

  it('loads choices from external XML dataset and submits selected value', async () => {
    await loginPage.cookieLogin();
    await commonPage.goToReports();

    await commonPage.openFastActionReport('select_from_file', false);

    expect(await commonEnketoPage.isElementDisplayed('label', 'Red')).to.be.true;
    expect(await commonEnketoPage.isElementDisplayed('label', 'Green')).to.be.true;
    expect(await commonEnketoPage.isElementDisplayed('label', 'Blue')).to.be.true;

    await commonEnketoPage.selectRadioButton('Select a color', 'Red');

    await genericForm.submitForm();

    await reportsPage.firstReportDetailField().waitForDisplayed();
    expect(await reportsPage.firstReportDetailField().getText()).to.equal('red');
  });

});
