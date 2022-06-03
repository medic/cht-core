const fs = require('fs');

const utils = require('../../utils');
//una mujer embarazada grande
const userData = require('../../page-objects/forms/data/patient-woman.po.data');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const contactPage = require('../../page-objects/contacts/contacts.wdio.page');
const genericForm = require('../../page-objects/forms/generic-form.wdio.page');
const deliveryForm = require('../../page-objects/forms/delivery-form.wdio.page');

const xml = fs.readFileSync(`${__dirname}/../../forms/delivery.xml`, 'utf8');
const formDocument = {
  _id: 'form:delivery2',
  internalId: 'delivery',
  title: 'Delivery',
  type: 'form',
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer.from(xml).toString('base64')
    }
  }
};

describe('Delivery form', () => {
  before(async () => {
    await utils.saveDoc(formDocument);
    await utils.seedTestData(userData.userContactDoc, userData.docs);
    await loginPage.cookieLogin();
    await commonPage.goToPeople(userData.userContactDoc._id, true);
  });

  it('Submit and validate Pregnancy delivery form and keeps the report minified', async () => {
    await contactPage.createNewAction('Delivery')
    await deliveryForm.selectDeliveryConditionWomanOutcome("alive_well");
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryPosnatalDangerSignsFever("no");
    await deliveryForm.selectDeliveryPosnatalDangerSevereFever("no");
    await deliveryForm.selectDeliveryPosnatalDangerVaginalBleeding("no");
    await deliveryForm.selectDeliveryPosnatalDangerVaginalDischarge("no");
    await deliveryForm.selectDeliveryPosnatalDangerConvulsion("no");
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryOutcomeBabiesDelivered("1");
    await deliveryForm.selectDeliveryOutcomeBabiesAlive("1");
    await deliveryForm.selectDeliveryOutcomeDateOfDelivery("2022-06-02");
    await deliveryForm.selectDeliveryOutcomeDeliveryPlace("health_facility");
    await deliveryForm.selectDeliveryOutcomeDeliveryMode("vaginal");
    await genericForm.nextPage();

    //await reportsPage.submitForm();

    //const reportId = await reportsPage.getCurrentReportId();
    //const initialReport = await utils.getDoc(reportId);
    //expect(initialReport.verified).to.be.undefined;

    //await genericForm.openReportReviewMenu();
    //await genericForm.invalidateReport();

    //const invalidatedReport = await utils.getDoc(reportId);
    //expect(invalidatedReport.verified).to.be.false;
    //expect(invalidatedReport.patient).to.be.undefined;

    //await genericForm.validateReport();
    //const validatedReport = await utils.getDoc(reportId);
    //expect(validatedReport.verified).to.be.true;
    //expect(validatedReport.patient).to.be.undefined;
  });
});
