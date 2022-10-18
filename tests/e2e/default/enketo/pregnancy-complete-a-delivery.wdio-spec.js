const fs = require('fs');
const moment = require('moment');
const expect = require('chai').expect;
const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const analyticsPage = require('../../../page-objects/default/analytics/analytics.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const contactPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const reportPage = require('../../../page-objects/default/reports/reports.wdio.page');
const genericForm = require('../../../page-objects/default/enketo/generic-form.wdio.page');
const deliveryForm = require('../../../page-objects/default/enketo/delivery.wdio.page');

const DEFAULT_LOCALE = 'en';
const BABYS_NAME = 'Benja';
const MOTHERS_NAME = 'Woman';
const BABYS_DOB = moment().format('YYYY-MM-DD');
const BABYS_SEX = 'male';
const YES = 'yes';
const NO = 'no';

const chw = {
  username: 'bob',
  password: 'medic.123',
  place: 'fixture:center',
  contact: { _id: 'fixture:user:bob', name: 'Bob' },
  roles: ['chw'],
};

const contacts = [
  {
    _id: 'fixture:district',
    type: 'district_hospital',
    name: 'District',
    place_id: 'district',
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:center',
    type: 'health_center',
    name: 'Health Center',
    parent: { _id: 'fixture:district' },
    place_id: 'health_center',
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:woman',
    type: 'person',
    name: MOTHERS_NAME,
    sex: 'female',
    date_of_birth: '1994-05-12',
    date_of_birth_method: 'approx',
    phone: '+64274444444',
    alternate_phone: '',
    notes: '',
    role: 'patient',
    ephemeral_dob: {
      age_label: '',
      age_years: '28',
      age_months: '',
      dob_method: 'approx',
      ephemeral_months: '5',
      ephemeral_years: '1994',
      dob_approx: '1994-05-12',
      dob_raw: '1994-05-12',
      dob_iso: '1994-05-12'
    },
    parent: { _id: 'fixture:center' },
    reported_date: new Date().getTime(),
  },
];

const deliveryXml = fs.readFileSync(`${__dirname}/forms/delivery.xml`, 'utf8');

const formDocument = {
  _id: 'form:delivery2',
  internalId: 'delivery',
  title: 'Delivery',
  type: 'form',
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer.from(deliveryXml).toString('base64')
    }
  }
};

describe('Contact Delivery Form', () => {
  before(async () => {
    await utils.saveDoc(formDocument);
    await utils.saveDocs(contacts);
    await utils.createUsers([chw]);
    await sentinelUtils.waitForSentinel();
    await loginPage.login({ username: chw.username, password: chw.password, locale: DEFAULT_LOCALE });
    await commonPage.closeTour();
    await commonPage.goToPeople('fixture:woman', true);
  });

  it('Complete a delivery: Process a delivery with a live child and facility birth.', async () => {
    await contactPage.createNewAction('Delivery');
    await deliveryForm.selectDeliveryConditionWomanOutcome('alive_well');
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryPosnatalDangerSignsFever(NO);
    await deliveryForm.selectDeliveryPosnatalDangerSevereFever(NO);
    await deliveryForm.selectDeliveryPosnatalDangerVaginalBleeding(NO);
    await deliveryForm.selectDeliveryPosnatalDangerVaginalDischarge(NO);
    await deliveryForm.selectDeliveryPosnatalDangerConvulsion(NO);
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryOutcomeBabiesDelivered('1');
    await deliveryForm.selectDeliveryOutcomeBabiesAlive('1');
    await deliveryForm.selectDeliveryOutcomeDeliveryPlace('health_facility');
    await deliveryForm.selectDeliveryOutcomeDeliveryMode('vaginal');
    await deliveryForm.setDeliveryOutcomeDateOfDelivery(BABYS_DOB);
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryBabysCondition('alive_well');
    await deliveryForm.setDeliveryBabysName(BABYS_NAME);
    await deliveryForm.selectDeliveryBabysSex(BABYS_SEX);
    await deliveryForm.selectDeliveryBabysBirthWeightKnow(NO);
    await deliveryForm.selectDeliveryBabysBirthLengthKnow(NO);
    await deliveryForm.selectDeliveryBabysVaccinesReveived('none');
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
    await deliveryForm.selectDeliveryPncVisits('none');
    await genericForm.nextPage();
    await deliveryForm.submitForm();
    await contactPage.openReport();
    await (await reportPage.reportBodyDetails()).waitForDisplayed();
    expect((await reportPage.getReportSubject())).to.equal(MOTHERS_NAME);
    expect((await reportPage.getReportType())).to.equal(formDocument.title);
  });

  it('The past pregnancy card should show', async () => {
    await commonPage.goToPeople('fixture:woman', true);
    await contactPage.getContactCardTitle();
    expect((await contactPage.getContactCardTitle())).to.equal('Past pregnancy');
  });

  it('The child registered during birth should be created and should display the proper information', async () => {
    await contactPage.selectLHSRowByText(BABYS_NAME);
    expect((await contactPage.getContactInfoName())).to.equal(BABYS_NAME);
    expect((await contactPage.getContactSummaryField('contact.sex')).toLocaleUpperCase())
      .to.equal(BABYS_SEX.toLocaleUpperCase());
  });

  it('The targets page should be updated', async () => {
    await commonPage.goToAnalytics();
    await analyticsPage.goToTargets();
    const targets = await analyticsPage.getTargets();

    expect(targets).to.have.deep.members([
      { title: 'Deaths', goal: '0', count: '0' },
      { title: 'New pregnancies', goal: '20', count: '0' },
      { title: 'Live births', count: '1' },
      { title: 'Active pregnancies', count: '0' },
      { title: 'Active pregnancies with 1+ routine facility visits', count: '0' },
      { title: 'In-facility deliveries', percent: '100%', percentCount: '(1 of 1)' },
      { title: 'Active pregnancies with 4+ routine facility visits', count: '0' },
      { title: 'Active pregnancies with 8+ routine contacts', count: '0' },
    ]);
  });
});
