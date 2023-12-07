const _ = require('lodash');
const moment = require('moment');

const deliveryReport = require('@page-objects/default/enketo/default-delivery-report.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const utils = require('@utils');
const userData = require('@page-objects/default/users/user.data');
const sentinelUtils = require('@utils/sentinel');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

// FLAKY: https://github.com/medic/cht-core/issues/8087
describe.skip('Submit Default Delivery Report', () => {
  const { userContactDoc, docs } = userData;

  before(async () => {
    await utils.saveDocs(docs);
    await deliveryReport.configureForm(userContactDoc);
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
  });

  it('open, submit and edit (no changes) default delivery form', async () => {
    await commonPage.goToReports();

    await commonPage.openFastActionReport(deliveryReport.formInternalId, false);
    //select name
    await deliveryReport.selectPatientName('jack');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();

    await commonEnketoPage.selectRadioButton('Fever', 'No');
    await commonEnketoPage.selectRadioButton('Severe headache', 'No');
    await commonEnketoPage.selectRadioButton('Vaginal bleeding', 'No');
    await commonEnketoPage.selectRadioButton('Foul smelling vaginal discharge', 'No');
    await commonEnketoPage.selectRadioButton('Convulsions', 'No');
    await genericForm.nextPage();

    const noOfAliveBabies = 3;
    const noOfDeadBabies = 3;

    // Delivery Outcome
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', 'Other');
    await deliveryReport.selectNoOfBabiesDelivered(noOfAliveBabies + noOfDeadBabies);
    await commonEnketoPage.selectRadioButton('How many babies are alive?', noOfAliveBabies);
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Health facility');
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Vaginal');
    await commonEnketoPage.setDateValue('Date of delivery', moment().format('YYYY-MM-DD'));
    await genericForm.nextPage();

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
    await commonEnketoPage.selectCheckBox('Within 24 hours (check this box if facility delivery)');
    await genericForm.nextPage();

    //submit
    await reportsPage.submitForm();
    await sentinelUtils.waitForSentinel();

    const reportId = await reportsPage.getCurrentReportId();
    const initialReport = await utils.getDoc(reportId);
    expect(initialReport._attachments).to.equal(undefined);

    // Verify dead babies UUIDs are unique
    const deadBabyUUIds = [];
    for (let i = 0; i < noOfDeadBabies; i++) {
      deadBabyUUIds.push(await deliveryReport.getDeadBabyUUID(i));
    }

    // Verify alive babies UUIDs are unique
    const aliveBabyUUIds = [];
    for (let i = 0; i < noOfAliveBabies; i++) {
      aliveBabyUUIds.push(await deliveryReport.getAliveBabyUUID(i));
    }

    expect(deadBabyUUIds.length).to.equal(noOfDeadBabies);
    expect(aliveBabyUUIds.length).to.deep.equal(noOfAliveBabies);
    expect(_.uniq(deadBabyUUIds).length).to.equal(noOfDeadBabies);
    expect(_.uniq(aliveBabyUUIds).length).to.deep.equal(noOfAliveBabies);

    await reportsPage.editReport(reportId);
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await reportsPage.submitForm();
    await sentinelUtils.waitForSentinel();
    await browser.refresh();

    const updatedReport = await utils.getDoc(reportId);
    const exclude = [
      'instanceID',
      'baby_death_profile_doc', // every extra doc is duplicated when editing
      'child_doc', // every extra doc is duplicated when editing
    ];
    // fields remain identical
    expect(updatedReport.hidden_fields).to.deep.equal(initialReport.hidden_fields);
    expect(updatedReport.fields).excludingEvery(exclude).to.deep.equal(initialReport.fields);
    // input fields are filled as expected
    expect(initialReport.fields.inputs).excludingEvery(['meta', 'patient_id']).to.deep.equal({
      source: 'user',
      source_id: '',
      user: {
        contact_id: userData.userContactDoc._id,
        name: userData.userContactDoc.name,
        phone: userData.userContactDoc.phone,
      },
      contact: {
        _id: userData.userContactDoc._id,
        name: userData.userContactDoc.name,
        short_name: '',
        date_of_birth: '',
        sex: '',
        parent: {
          _id: userData.userContactDoc.parent._id,
          parent: { _id: '', parent: { _id: '' }, contact: { chw_name: '', phone: '' } },
        }
      }
    });

    // created extra docs are identical
    const intialDeadBabies = await utils.getDocs(deadBabyUUIds);
    const initialAliveBabies = await utils.getDocs(aliveBabyUUIds);

    // Verify dead babies UUIDs are unique
    const updatedDeadBabyUUIds = [];
    for (let i = 0; i < noOfDeadBabies; i++) {
      updatedDeadBabyUUIds.push(await deliveryReport.getDeadBabyUUID(i));
    }

    // Verify alive babies UUIDs are unique
    const updatedAliveBabyUUIds = [];
    for (let i = 0; i < noOfAliveBabies; i++) {
      updatedAliveBabyUUIds.push(await deliveryReport.getAliveBabyUUID(i));
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
    await reportsPage.editReport(reportId);
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Cesarean');
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.nextPage();
    await reportsPage.submitForm();
    await sentinelUtils.waitForSentinel();

    const cesareanReport = await utils.getDoc(reportId);
    expect(cesareanReport.fields)
      .excludingEvery([...exclude, 'delivery_mode', '__delivery_mode'])
      .to.deep.equal(initialReport.fields);
    expect(cesareanReport.fields.delivery_outcome.delivery_mode).to.equal('cesarean');
    expect(initialReport.fields.delivery_outcome.delivery_mode).to.equal('vaginal');
  });

  it('open, submit and edit default delivery form', async () => {
    await commonPage.goToReports();

    await commonPage.openFastActionReport(deliveryReport.formInternalId, false);
    //select name
    await deliveryReport.selectPatientName('jack');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();

    await commonEnketoPage.selectRadioButton('Fever', 'No');
    await commonEnketoPage.selectRadioButton('Severe headache', 'No');
    await commonEnketoPage.selectRadioButton('Vaginal bleeding', 'No');
    await commonEnketoPage.selectRadioButton('Foul smelling vaginal discharge', 'No');
    await commonEnketoPage.selectRadioButton('Convulsions', 'No');
    await genericForm.nextPage();

    const noOfAliveBabies = 2;
    const noOfDeadBabies = 2;

    // Delivery Outcome
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', 'Other');
    await deliveryReport.selectNoOfBabiesDelivered(noOfAliveBabies + noOfDeadBabies);
    await commonEnketoPage.selectRadioButton('How many babies are alive?', noOfAliveBabies);
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Health facility');
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Vaginal');
    await commonEnketoPage.setDateValue('Date of delivery', moment().format('YYYY-MM-DD'));
    await genericForm.nextPage();

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
    await commonEnketoPage.selectCheckBox('Within 24 hours (check this box if facility delivery)');
    await genericForm.nextPage();

    //submit
    await reportsPage.submitForm();
    await sentinelUtils.waitForSentinel();

    const reportId = await reportsPage.getCurrentReportId();
    const initialReport = await utils.getDoc(reportId);
    expect(initialReport._attachments).to.equal(undefined);
    await browser.refresh();

    await reportsPage.editReport(reportId);
    await deliveryReport.selectPatientName('jill');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();

    await commonEnketoPage.selectRadioButton('Fever', 'Yes');
    await commonEnketoPage.selectRadioButton('Severe headache', 'Yes');
    await commonEnketoPage.selectRadioButton('Vaginal bleeding', 'Yes');
    await commonEnketoPage.selectRadioButton('Foul smelling vaginal discharge', 'Yes');
    await commonEnketoPage.selectRadioButton('Convulsions', 'Yes');
    await genericForm.nextPage();

    // Delivery Outcome
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', 'Other');
    await deliveryReport.selectNoOfBabiesDelivered(noOfAliveBabies + noOfDeadBabies);
    await commonEnketoPage.selectRadioButton('How many babies are alive?', noOfAliveBabies);
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Health facility');
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Vaginal');
    await commonEnketoPage.setDateValue('Date of delivery', moment().format('YYYY-MM-DD'));
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
    await reportsPage.submitForm();
    await sentinelUtils.waitForSentinel();

    const updatedReport = await utils.getDoc(reportId);

    const exclude = [
      'instanceID',
      'baby_death_profile_doc', // every extra doc is duplicated when editing
      'child_doc', // every extra doc is duplicated when editing
    ];
    // fields have changed
    expect(updatedReport.fields).excludingEvery(exclude).not.to.deep.equal(initialReport.fields);
    expect(updatedReport.fields.inputs.user).to.deep.equal(initialReport.fields.inputs.user);
    expect(updatedReport.fields.inputs.contact.name).to.equal('Jill');

    // submit same information in new report
    await commonPage.openFastActionReport(deliveryReport.formInternalId, false);
    //select name
    await deliveryReport.selectPatientName('jill');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();

    await commonEnketoPage.selectRadioButton('Fever', 'Yes');
    await commonEnketoPage.selectRadioButton('Severe headache', 'Yes');
    await commonEnketoPage.selectRadioButton('Vaginal bleeding', 'Yes');
    await commonEnketoPage.selectRadioButton('Foul smelling vaginal discharge', 'Yes');
    await commonEnketoPage.selectRadioButton('Convulsions', 'Yes');
    await genericForm.nextPage();

    // Delivery Outcome
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', 'Other');
    await deliveryReport.selectNoOfBabiesDelivered(noOfAliveBabies + noOfDeadBabies);
    await commonEnketoPage.selectRadioButton('How many babies are alive?', noOfAliveBabies);
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Health facility');
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Vaginal');
    await commonEnketoPage.setDateValue('Date of delivery', moment().format('YYYY-MM-DD'));
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
    await commonEnketoPage.selectCheckBox('Within 24 hours (check this box if facility delivery)');
    await genericForm.nextPage();

    //submit
    await reportsPage.submitForm();

    const compareReportId = await reportsPage.getCurrentReportId();
    const compareReport = await utils.getDoc(compareReportId);

    expect(updatedReport.fields).excludingEvery([...exclude, 'created_by_doc']).to.deep.equal(compareReport.fields);
  });
});
