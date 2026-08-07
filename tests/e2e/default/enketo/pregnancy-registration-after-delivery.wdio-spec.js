const moment = require('moment');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const pregnancyForm = require('@page-objects/default/enketo/pregnancy.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const dangerSignPage = require('@page-objects/default/enketo/danger-sign.wdio.page');
const sentinelUtils = require('@utils/sentinel');
const { CONTACT_TYPES } = require('@medic/constants');

describe('Pregnancy registration after delivery', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const pregnantWoman = personFactory.build({
    date_of_birth: moment().subtract(25, 'years').format('YYYY-MM-DD'),
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });

  before(async () => {
    await utils.saveDocs([ ...places.values(), pregnantWoman ]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });

  it('should show pregnancy registration when delivery was more than 6 weeks ago', async () => {
    await commonPage.goToPeople(pregnantWoman._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();
    await commonPage.openFastActionReport('delivery');

    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();
    await dangerSignPage.selectAllDangerSignsDelivery('No');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', '1');
    await commonEnketoPage.selectRadioButton('How many babies are alive?', '1');
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Health facility');
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Vaginal');
    await commonEnketoPage.setDateValue('Date of delivery', moment().format('YYYY-MM-DD'));
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the condition of baby?', 'Alive and well');
    await commonEnketoPage.setInputValue('Name', 'Baby');
    await commonEnketoPage.selectRadioButton('Sex', 'Male');
    await commonEnketoPage.selectRadioButton('Birth weight', 'I don\'t know');
    await commonEnketoPage.selectRadioButton('Birth length', 'I don\'t know');
    await commonEnketoPage.selectRadioButton('What vaccines have they received?', 'None');
    await commonEnketoPage.selectRadioButton('Is the child exclusively breastfeeding?', 'Yes');
    await commonEnketoPage.selectRadioButton('Were they initiated on breastfeeding within on hour of delivery?', 'Yes');
    await commonEnketoPage.selectRadioButton('Infected umbilical cord', 'No');
    await commonEnketoPage.selectRadioButton('Convulsions', 'No');
    await commonEnketoPage.selectRadioButton('Difficulty feeding or drinking', 'No');
    await commonEnketoPage.selectRadioButton('Vomits everything', 'No');
    await commonEnketoPage.selectRadioButton('Drowsy or unconscious', 'No');
    await commonEnketoPage.selectRadioButton('Body stiffness', 'No');
    await commonEnketoPage.selectRadioButton('Yellow skin color', 'No');
    await commonEnketoPage.selectRadioButton('Fever', 'No');
    await commonEnketoPage.selectRadioButton('Blue skin color (hypothermia)', 'No');
    await genericForm.nextPage();
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('Which PNC visits have taken place so far?', 'None of the above');
    await genericForm.nextPage();
    await genericForm.submitForm();
    await sentinelUtils.waitForSentinel();

    await contactPage.openReport();
    await reportsPage.rightPanelSelectors.reportBodyDetails().waitForDisplayed();
    const reportId = await reportsPage.getCurrentReportId();
    const deliveryReportDoc = await utils.getDoc(reportId);
    deliveryReportDoc.fields.delivery_outcome.delivery_date = moment().subtract(8, 'weeks').format('YYYY-MM-DD');
    await utils.saveDoc(deliveryReportDoc);
    await commonPage.sync({ reload: true });

    await commonPage.goToPeople(pregnantWoman._id);
    const labels = await commonPage.getFastActionItemsLabels();
    expect(labels).to.include('Pregnancy registration');
  });
});
