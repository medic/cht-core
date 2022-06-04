const fs = require('fs');
const moment = require('moment');
const utils = require('../../utils');
const userData = require('../../page-objects/forms/data/patient-woman.po.data');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const contactPage = require('../../page-objects/contacts/contacts.wdio.page');
const reportPage = require('../../page-objects/reports/reports.wdio.page');
const genericForm = require('../../page-objects/forms/generic-form.wdio.page');
const deliveryForm = require('../../page-objects/forms/delivery-form.wdio.page');

const BABYSNAME = 'Benja';
const BABYSDATEOFBIRTH = moment().subtract(1, 'day').format('YYYY-MM-DD');
const BABYSSEX = 'male';
const YES = 'yes';
const NO = 'no';

const chw = {
  username: 'bob',
  password: 'medic.123',
  place: 'fixture:center',
  contact: { _id: 'fixture:user:bob', name: 'Bob' },
  roles: ['chw'],
};

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

describe('Contact Delivery Form', () => {
  before(async () => {
    await utils.saveDoc(formDocument);
    await utils.seedTestData(userData.userContactDoc, userData.docs);
    await loginPage.cookieLogin();
    await commonPage.goToPeople(userData.userContactDoc._id, true);
  });

  it('Complete a delivery: Process a delivery with a live child and facility birth', async () => {
    await contactPage.createNewAction('Delivery')
    await deliveryForm.selectDeliveryConditionWomanOutcome("alive_well");
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryPosnatalDangerSignsFever(NO);
    await deliveryForm.selectDeliveryPosnatalDangerSevereFever(NO);
    await deliveryForm.selectDeliveryPosnatalDangerVaginalBleeding(NO);
    await deliveryForm.selectDeliveryPosnatalDangerVaginalDischarge(NO);
    await deliveryForm.selectDeliveryPosnatalDangerConvulsion(NO);
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryOutcomeBabiesDelivered("1");
    await deliveryForm.selectDeliveryOutcomeBabiesAlive("1");
    await deliveryForm.selectDeliveryOutcomeDeliveryPlace("health_facility");
    await deliveryForm.selectDeliveryOutcomeDeliveryMode("vaginal");
    await deliveryForm.setDeliveryOutcomeDateOfDelivery(BABYSDATEOFBIRTH);
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryBabysCondition("alive_well");
    await deliveryForm.setDeliveryBabysName(BABYSNAME);
    await deliveryForm.selectDeliveryBabysSex(BABYSSEX);
    await deliveryForm.selectDeliveryBabysBirthWeightKnow(NO);
    await deliveryForm.selectDeliveryBabysBirthLengthKnow(NO);
    await deliveryForm.selectDeliveryBabysVaccinesReveived("none");
    await deliveryForm.selectDeliveryBabyBreatfeeding(YES);
    await deliveryForm.selectDeliveryBabyBreatfeedingWithin1Hour(YES);
    await deliveryForm.selectDeliveryBabyInfectedUmbilicalCord(NO);
    await deliveryForm.selectDeliveryBabyConvulsion(NO);
    await deliveryForm.selectDeliveryBabyDifficultyFeeding(NO);
    await deliveryForm.selectDeliveryBabyVomit(NO);
    await deliveryForm.selectDeliveryBabyDrowsy(NO);
    await deliveryForm.selectDeliveryBabyStiff(NO);
    await deliveryForm.selectDeliveryBabyYellowSkin(NO);
    await deliveryForm.selectDeliveryBabyFever(NO);
    await deliveryForm.selectDeliveryBabyBlueSkin(NO);
    await genericForm.nextPage();
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryPncVisits("none");
    await genericForm.nextPage();
    await deliveryForm.submitForm();
  });

  it('The past pregnancy card should show', async () => {
    await contactPage.getContactCardTitle();
    expect((await contactPage.getContactCardTitle())).to.equal('Past pregnancy');
  });

  it('The report should show associated to the person', async () => {
    await contactPage.openReport();
    expect((await reportPage.getReportSubject())).to.equal(userData.userContactDoc.name);
    expect((await reportPage.getReportType())).to.equal(formDocument.title);
  });

  it('The child registered during birth should be created and should display the proper information', async () => {
    await commonPage.goToPeople();
    await contactPage.selectLHSRowByText(BABYSNAME);
    expect((await contactPage.getContactInfoName())).to.equal(BABYSNAME);
    expect((await contactPage.getContactInfoSex()).toLocaleUpperCase()).to.equal(BABYSSEX.toLocaleUpperCase());
  });
});
