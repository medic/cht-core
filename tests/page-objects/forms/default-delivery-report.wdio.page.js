const utils = require('../../utils');
const fs = require('fs');
const moment = require('moment');
const genericForm = require('./generic-form.wdio.page');
const reportsPage = require('../reports/reports.wdio.page');

const xml = fs.readFileSync(`${__dirname}/../../../config/default/forms/app/delivery.xml`, 'utf8');
const formId = 'delivery';

const docs = [
  {
    _id: 'form:dd',
    internalId: 'DD',
    title: 'Default Delivery',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(xml).toString('base64'),
      },
    },
  },
];

const getYNValue = (boolean) => boolean ? 'yes' : 'no';

const selectRadioButtonByValue = async value => {
  const radioElement = await $(`[value=${value}]`);
  await radioElement.waitForDisplayed();
  await radioElement.click();
};

const selectRadioButtonByNameAndValue = async (name, value) => {
  const radioElement = await $(`[name="${name}"][value="${value}"]`);
  await radioElement.waitForDisplayed();
  await radioElement.click();
};

const selectPatientName = (name) => {
  return genericForm.selectContact(`/${formId}/inputs/contact`, name);
};

const selectAliveAndWell = () => {
  return selectRadioButtonByValue('alive_well');
};

const hasFever = (hasSymptom) => {
  return selectRadioButtonByNameAndValue(`/${formId}/pnc_danger_sign_check/fever`, getYNValue(hasSymptom));
};

const hasHeadache = (hasSymptom) => {
  return selectRadioButtonByNameAndValue(`/${formId}/pnc_danger_sign_check/severe_headache`, getYNValue(hasSymptom));
};

const hasVaginalBleeding = (hasSymptom) => {
  return selectRadioButtonByNameAndValue(`/${formId}/pnc_danger_sign_check/vaginal_bleeding`, getYNValue(hasSymptom));
};
const hasVaginalDischarge = (hasSymptom) => {
  return selectRadioButtonByNameAndValue(`/${formId}/pnc_danger_sign_check/vaginal_discharge`, getYNValue(hasSymptom));
};

const hasConvulsions = (hasSymptom) => {
  return selectRadioButtonByNameAndValue(`/${formId}/pnc_danger_sign_check/convulsion`, getYNValue(hasSymptom));
};

const selectBabiesDelivered = (value = 'other') => {
  return selectRadioButtonByNameAndValue(`/${formId}/delivery_outcome/babies_delivered`, value);
};

const selectNoOfBabiesDelivered = async (value) => {
  const field = await $(`[name="/${formId}/delivery_outcome/babies_delivered_other"]`);
  await field.waitForDisplayed();
  await field.setValue(value);
  await (await field.parentElement()).click();
};

const selectBabiesAlive = (noOfBabiesAlive) => {
  return selectRadioButtonByNameAndValue(`/${formId}/delivery_outcome/babies_alive`, noOfBabiesAlive);
};

const selectDeliveryDate = (deliveryDate) => {
  const formatted = moment(deliveryDate).format('YYYY-MM-DD');
  return reportsPage.setDateInput('/delivery/delivery_outcome/delivery_date', formatted);
};

const selectDeliveryPlace = (value = 'health_facility') => {
  return selectRadioButtonByNameAndValue(`/${formId}/delivery_outcome/delivery_place`, value);
};

const selectDeliveryMethod = (value = 'vaginal') => {
  return selectRadioButtonByValue(value);
};

const populateDeadBabyInformation = async (index, data = { place: 'health_facility', stillbirth: true }) => {
  const sectionPath = `/${formId}/baby_death`;
  const repeatPath = `${sectionPath}/baby_death_repeat`;

  const parentSection = await $(`section[name="${sectionPath}"]`);
  await (await $(`section[name="${repeatPath}"]`)).waitForDisplayed();

  const section = await (await parentSection.$(`.repeat-number*=${index}`)).parentElement();

  const dateOfDeathPicker = await section.$(`[name="${repeatPath}/baby_death_date"]`);
  const date = moment(data.date).format('YYYY-MM-DD');
  await reportsPage.setDateInput(dateOfDeathPicker, date);
  await (await section.$(`[data-name="${repeatPath}/baby_death_place"][value="${data.place}"]`)).click();
  await (await section.$(`[data-name="${repeatPath}/stillbirth"][value="${getYNValue(data.stillbirth)}"]`)).click();
  await (await section.$(`[name="${repeatPath}/baby_death_add_notes"]`)).setValue(`Baby ${index} death`);
};

const populateAliveBabyInformation = async (index, data = { sex: 'male', danger: false }) => {
  const sectionPath = `/${formId}/babys_condition`;
  const repeatPath = `${sectionPath}/baby_repeat/baby_details`;

  const parentSection = await $(`section[name="${sectionPath}"]`);
  await (await $(`section[name="${repeatPath}"]`)).waitForDisplayed();

  const section = await (await parentSection.$(`.repeat-number*=${index}`)).parentElement();

  await (await section.$(`[data-name="${repeatPath}/baby_condition"][value="alive_well"]`)).click();
  await (await section.$(`[name="${repeatPath}/baby_name"]`)).setValue(`AliveBaby-${index}`);
  await (await section.$(`[data-name="${repeatPath}/baby_sex"][value="${data.sex}"]`)).click();
  await (await section.$(`[data-name="${repeatPath}/birth_weight_know"][value="no"]`)).click();
  await (await section.$(`[data-name="${repeatPath}/birth_length_know"][value="no"]`)).click();
  await (await section.$(`[data-name="${repeatPath}/vaccines_received"][value="bcg_only"]`)).click();
  await (await section.$(`[data-name="${repeatPath}/breatfeeding"][value="no"]`)).click();
  await (await section.$(`[data-name="${repeatPath}/breastfed_within_1_hour"][value="no"]`)).click();

  const dangerSigns = [
    'infected_umbilical_cord',
    'convulsion',
    'difficulty_feeding',
    'vomit',
    'drowsy',
    'stiff',
    'yellow_skin',
    'fever',
    'blue_skin'
  ];
  for (const dangerSign of dangerSigns) {
    await (await section.$(`[data-name="${repeatPath}/${dangerSign}"][value="${getYNValue(data.danger)}"]`)).click();
  }
};

const pncCheckBox = async () => {
  return await (await $('[value="within_24_hrs"]')).click();
};

const getDeadBabyUUID = async (index) => {
  const element = await $(
    `//*[text()="report.DD.baby_death.baby_death_repeat.${index}.baby_death_profile_doc"]/../../p`
  );
  return await element.getText();
};

const getAliveBabyUUID = async (index) => {
  const element = await $(
    `//*[text()="report.DD.babys_condition.baby_repeat.${index}.baby_details.child_doc"]/../../p`
  );
  return await element.getText();
};

module.exports = {
  formTitle: docs[0].title,
  configureForm: (userContactDoc) => {
    return utils.seedTestData(userContactDoc, docs);
  },
  selectPatientName,
  selectAliveAndWell,
  hasFever,
  hasHeadache,
  hasVaginalBleeding,
  hasVaginalDischarge,
  hasConvulsions,

  selectBabiesDelivered,
  selectNoOfBabiesDelivered,
  selectBabiesAlive,
  selectDeliveryDate,
  selectDeliveryPlace,
  selectDeliveryMethod,

  populateDeadBabyInformation,
  populateAliveBabyInformation,

  pncCheckBox,

  getDeadBabyUUID,
  getAliveBabyUUID,
};
