const moment = require('moment');
const _ = require('lodash');
const utils = require('@utils');
const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const reportPage = require('@page-objects/default/reports/reports.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const pregnancyForm = require('@page-objects/default/enketo/pregnancy.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const dangerSignPage = require('@page-objects/default/enketo/danger-sign.wdio.page');
const deliveryReport = require('@page-objects/default/enketo/default-delivery-report.wdio.page');
const sentinelUtils = require('@utils/sentinel');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const { TARGET_MET_COLOR, TARGET_UNMET_COLOR } = analyticsPage;

describe('Contact Delivery Form', () => {
  const BABY_NAME = 'Benja';
  const BABY_DOB = moment().format('YYYY-MM-DD');
  const BABY_SEX = 'male';
  const pregnantWomanDateOfBirth = moment().subtract(25, 'years').format('YYYY-MM-DD');

  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const pregnantWoman = personFactory.build({
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman2 = personFactory.build({
    patient_id: 'test_woman_2',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman3 = personFactory.build({
    patient_id: 'test_woman_3',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });

  const prepareDeliveryScenarios = async (pregnantWomanId) => {
    await commonPage.goToPeople(pregnantWomanId);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();
    await commonPage.openFastActionReport('delivery');
  };

  before(async () => {
    await utils.saveDocs([ ...places.values(), pregnantWoman, pregnantWoman2, pregnantWoman3 ]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.hideSnackbar();
  });

  it('Complete a delivery: Process a delivery with a live child and facility birth, ' +
    'verify that the past pregnancy card is present and the report was created,' +
    'verify that the child registered during birth is created and displayed the proper information,' +
    'verify that the targets page is updated', async () => {

    await prepareDeliveryScenarios(pregnantWoman._id);

    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();
    await dangerSignPage.selectAllDangerSignsDelivery('No');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', '1');
    await commonEnketoPage.selectRadioButton('How many babies are alive?', '1');
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Health facility');
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Vaginal');
    await commonEnketoPage.setDateValue('Date of delivery', BABY_DOB);
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the condition of baby?', 'Alive and well');
    await commonEnketoPage.setInputValue('Name', BABY_NAME);
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

    const summaryTexts = [
      pregnantWoman.name,
      '25', //age
      'Alive and well', //woman's condition
      BABY_DOB,
      'Health facility' //delivery place
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    await genericForm.submitForm();

    // Verify the past pregnancy card
    await contactPage.getContactCardTitle();
    expect((await contactPage.getContactCardTitle())).to.equal('Past pregnancy');

    //Verify the created report
    await contactPage.openReport();
    await (await reportPage.reportBodyDetails()).waitForDisplayed();
    const { patientName, reportName } = await reportPage.getOpenReportInfo();
    expect(patientName).to.equal(pregnantWoman.name);
    expect(reportName).to.equal('Delivery');

    // Verify the child registered during birth
    await commonPage.goToPeople();
    await contactPage.selectLHSRowByText(BABY_NAME);
    expect((await contactPage.getContactInfoName())).to.equal(BABY_NAME);
    expect((await contactPage.getContactSummaryField('contact.sex')).toLocaleUpperCase())
      .to.equal(BABY_SEX.toLocaleUpperCase());

    // Verify the targets
    await commonPage.goToAnalytics();
    await analyticsPage.goToTargets();
    const targets = await analyticsPage.getTargets();

    expect(targets).to.have.deep.members([
      { title: 'Deaths', goal: '0', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'New pregnancies', goal: '20', count: '1', countNumberColor: TARGET_UNMET_COLOR },
      { title: 'Live births', count: '1', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies with 1+ routine facility visits', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'In-facility deliveries', percent: '100%', percentCount: '(1 of 1)' },
      { title: 'Active pregnancies with 4+ routine facility visits', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies with 8+ routine contacts', count: '0', countNumberColor: TARGET_MET_COLOR },
    ]);
  });

  it('open, submit and edit (no changes) default delivery form', async () => {
    const noOfAliveBabies = 3;
    const noOfDeadBabies = 3;

    await prepareDeliveryScenarios(pregnantWoman2._id);

    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();
    await dangerSignPage.selectAllDangerSignsDelivery('No');
    await genericForm.nextPage();

    // Delivery Outcome
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', 'Other');

    await deliveryReport.selectNoOfBabiesDelivered(noOfAliveBabies + noOfDeadBabies);
    await commonEnketoPage.selectRadioButton('How many babies are alive?', noOfAliveBabies);
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Health facility');
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Vaginal');
    await commonEnketoPage.setDateValue('Date of delivery', moment().format('YYYY-MM-DD'));
    await genericForm.nextPage(1);

    // Dead Babies Information
    // We need to loop through all dead babies and fill out information
    for (let i = 0; i < noOfDeadBabies; i++) {
      await deliveryReport.populateDeadBabyInformation(i + 1);
    }
    await genericForm.nextPage();

    // Alive Babies Information
    // We need to loop through all alive babies and fill out information
    for (let i = 0; i < noOfAliveBabies; i++) {
      await deliveryReport.populateAliveBabyInformation(i + 1);
    }
    await genericForm.nextPage();
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(
      'Which PNC visits have taken place so far?',
      'Within 24 hours (check this box if facility delivery)'
    );
    await genericForm.nextPage();
    await genericForm.submitForm();
    await sentinelUtils.waitForSentinel();

    await contactPage.openReport();
    await (await reportPage.reportBodyDetails()).waitForDisplayed();

    const reportId = await reportsPage.getCurrentReportId();
    const initialReport = await utils.getDoc(reportId);
    expect(initialReport._attachments).to.equal(undefined);

    // Verify dead babies UUIDs are unique
    const deadBabyUUIds = [];
    for (let i = 0; i < noOfDeadBabies; i++) {
      deadBabyUUIds.push(await (await reportsPage
        .getDetailReportRowContent(
          `report.delivery.baby_death.baby_death_repeat.${i}.baby_death_profile_doc`
        )).rowValues[0]);
    }

    // Verify alive babies UUIDs are unique
    const aliveBabyUUIds = [];
    for (let i = 0; i < noOfAliveBabies; i++) {
      aliveBabyUUIds.push(await (await reportsPage
        .getDetailReportRowContent(
          `report.delivery.babys_condition.baby_repeat.${i}.baby_details.child_doc`
        )).rowValues[0]);
    }

    expect(deadBabyUUIds.length).to.equal(noOfDeadBabies);
    expect(aliveBabyUUIds.length).to.deep.equal(noOfAliveBabies);
    expect(_.uniq(deadBabyUUIds).length).to.equal(noOfDeadBabies);
    expect(_.uniq(aliveBabyUUIds).length).to.deep.equal(noOfAliveBabies);

    await reportsPage.openReport(reportId);
    await reportsPage.editReport();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.submitForm();
    await sentinelUtils.waitForSentinel();
    await browser.refresh();
    await (await reportPage.reportBodyDetails()).waitForDisplayed();

    const updatedReport = await utils.getDoc(reportId);
    const exclude = [
      'instanceID',
      'deprecatedID',
      '__pregnancy_uuid',
      'baby_death_profile_doc', // every extra doc is duplicated when editing
      'child_doc', // every extra doc is duplicated when editing
    ];
    // fields remain identical
    expect(updatedReport.hidden_fields).to.deep.equal(initialReport.hidden_fields);
    expect(updatedReport.fields).excludingEvery(exclude).to.deep.equal(initialReport.fields);

    // input fields are filled as expected
    expect(initialReport.fields.inputs).excludingEvery('meta').to.deep.equal({
      source: 'contact',
      source_id: '',
      user: {
        contact_id: offlineUser.contact._id,
        name: offlineUser.username,
        phone: offlineUser.contact.phone,
      },
      contact: {
        _id: pregnantWoman2._id,
        name: pregnantWoman2.name,
        short_name: '',
        patient_id: pregnantWoman2.patient_id,
        date_of_birth: pregnantWoman2.date_of_birth,
        sex: pregnantWoman2.sex,
        parent: {
          _id: pregnantWoman2.parent._id,
          parent: {
            _id: pregnantWoman2.parent.parent._id,
            parent: { _id: '' }, contact: { chw_name: '', phone: '' }
          }
        }
      }
    });

    // created extra docs are identical
    const intialDeadBabies = await utils.getDocs(deadBabyUUIds);
    const initialAliveBabies = await utils.getDocs(aliveBabyUUIds);

    // Verify dead babies UUIDs are unique
    const updatedDeadBabyUUIds = [];
    for (let i = 0; i < noOfDeadBabies; i++) {
      updatedDeadBabyUUIds.push(await (await reportsPage
        .getDetailReportRowContent(
          `report.delivery.baby_death.baby_death_repeat.${i}.baby_death_profile_doc`
        )).rowValues[0]);
    }

    // Verify alive babies UUIDs are unique
    const updatedAliveBabyUUIds = [];
    for (let i = 0; i < noOfAliveBabies; i++) {
      updatedAliveBabyUUIds.push(await (await reportsPage
        .getDetailReportRowContent(
          `report.delivery.babys_condition.baby_repeat.${i}.baby_details.child_doc`
        )).rowValues[0]);
    }

    expect(updatedDeadBabyUUIds.length).to.equal(noOfDeadBabies);
    expect(updatedAliveBabyUUIds.length).to.deep.equal(noOfAliveBabies);
    expect(_.uniq(updatedDeadBabyUUIds).length).to.equal(noOfDeadBabies);
    expect(_.uniq(updatedAliveBabyUUIds).length).to.deep.equal(noOfAliveBabies);
    expect(_.intersection(deadBabyUUIds, updatedDeadBabyUUIds)).to.deep.equal([]);
    expect(_.intersection(aliveBabyUUIds, updatedAliveBabyUUIds)).to.deep.equal([]);

    const updatedDeadBabies = await utils.getDocs(updatedDeadBabyUUIds);
    const updatedAliveBabiles = await utils.getDocs(updatedAliveBabyUUIds);

    const expectedDangerSigns = {
      infected_umbilical_cord: 'no',
      convulsion: 'no',
      difficulty_feeding: 'no',
      vomit: 'no',
      drowsy: 'no',
      stiff: 'no',
      yellow_skin: 'no',
      fever: 'no',
      blue_skin: 'no'
    };

    // duplicated extra docs are identical
    const excludeBabyFields = ['_id', '_rev', 'reported_date', 'patient_id', 'geolocation_log', 'geolocation'];
    intialDeadBabies.forEach((initialBaby, idx) => {
      expect(initialBaby).excludingEvery(excludeBabyFields).to.deep.equal(updatedDeadBabies[idx]);
      expect(initialBaby.date_of_death).to.equal(moment(initialReport.reported_date).format('YYYY-MM-DD'));
    });
    initialAliveBabies.forEach((initialBaby, idx) => {
      expect(initialBaby).excludingEvery(excludeBabyFields).to.deep.equal(updatedAliveBabiles[idx]);
      expect(initialBaby.danger_signs).to.deep.equal(expectedDangerSigns);
    });

    // edit one field
    await reportsPage.openReport(reportId);
    await reportsPage.editReport();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Cesarean');
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.submitForm();
    await sentinelUtils.waitForSentinel();
    await (await reportPage.reportBodyDetails()).waitForDisplayed();

    const cesareanReport = await utils.getDoc(reportId);
    expect(cesareanReport.fields)
      .excludingEvery([...exclude, 'delivery_mode', '__delivery_mode'])
      .to.deep.equal(initialReport.fields);
    expect(cesareanReport.fields.delivery_outcome.delivery_mode).to.equal('cesarean');
    expect(initialReport.fields.delivery_outcome.delivery_mode).to.equal('vaginal');
  });

  it('open, submit and edit default delivery form', async () => {
    const noOfAliveBabies = 2;
    const noOfDeadBabies = 2;

    await prepareDeliveryScenarios(pregnantWoman3._id);

    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();
    await dangerSignPage.selectAllDangerSignsDelivery('No');
    await genericForm.nextPage();

    // Delivery Outcome
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', 'Other');
    await deliveryReport.selectNoOfBabiesDelivered(noOfAliveBabies + noOfDeadBabies);
    await commonEnketoPage.selectRadioButton('How many babies are alive?', noOfAliveBabies);
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Health facility');
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Vaginal');
    await commonEnketoPage.setDateValue('Date of delivery', moment().format('YYYY-MM-DD'));
    await genericForm.nextPage(1);

    // Dead Babies Information
    // We need to loop through all dead babies and fill out information
    for (let i = 0; i < noOfDeadBabies; i++) {
      await deliveryReport.populateDeadBabyInformation(i + 1);
    }
    await genericForm.nextPage();

    // Alive Babies Information
    // We need to loop through all alive babies and fill out information
    for (let i = 0; i < noOfAliveBabies; i++) {
      await deliveryReport.populateAliveBabyInformation(i + 1);
    }
    await genericForm.nextPage();
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(
      'Which PNC visits have taken place so far?',
      'Within 24 hours (check this box if facility delivery)'
    );
    await genericForm.nextPage();
    await genericForm.submitForm();
    await sentinelUtils.waitForSentinel();

    await contactPage.openReport();
    await (await reportPage.reportBodyDetails()).waitForDisplayed();

    const reportId = await reportsPage.getCurrentReportId();
    const initialReport = await utils.getDoc(reportId);
    expect(initialReport._attachments).to.equal(undefined);
    await browser.refresh();

    await reportsPage.editReport();
    await genericForm.nextPage();
    await dangerSignPage.selectAllDangerSignsDelivery();
    await genericForm.nextPage();
    await genericForm.nextPage();

    // Dead Babies Information
    // We need to loop through all dead babies and fill out information
    for (let i = 0; i < noOfDeadBabies; i++) {
      await deliveryReport.populateDeadBabyInformation(i + 1, { place: 'home', stillbirth: false });
    }
    await genericForm.nextPage();

    // Alive Babies Information
    // We need to loop through all alive babies and fill out information
    for (let i = 0; i < noOfAliveBabies; i++) {
      await deliveryReport.populateAliveBabyInformation(i + 1, { sex: 'female', danger: true });
    }
    await genericForm.nextPage();

    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.submitForm();
    await sentinelUtils.waitForSentinel();
    await (await reportPage.reportBodyDetails()).waitForDisplayed();

    const updatedReport = await utils.getDoc(reportId);

    const exclude = [
      'instanceID',
      'deprecatedID',
      '__pregnancy_uuid',
      'baby_death_profile_doc', // every extra doc is duplicated when editing
      'child_doc', // every extra doc is duplicated when editing
    ];
    // fields have changed
    expect(updatedReport.fields).excludingEvery(exclude).not.to.deep.equal(initialReport.fields);
    expect(updatedReport.fields.inputs.user).to.deep.equal(initialReport.fields.inputs.user);
    expect(updatedReport.fields.inputs.contact.name).to.equal(pregnantWoman3.name);
  });

});
