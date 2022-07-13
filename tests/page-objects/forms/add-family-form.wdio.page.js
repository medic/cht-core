const utils = require('../../utils');
const fs = require('fs');

const xml = fs.readFileSync(`${__dirname}/../../forms/multiple-repeats.xml`, 'utf8');

const docs = [
  {
    _id: 'form:add-family',
    internalId: 'any',
    title: 'AddFamily',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(xml).toString('base64'),
      },
    },
  },
];

const configureForm =  async (contactId) => {
  await utils.seedTestData(contactId, docs);
};

const fillPrimaryCaregiver =  async caregiverName => {
  const primaryCaregiverField = await $('[name="/data/contact/name"]');
  await primaryCaregiverField.setValue(caregiverName);
};

const fillPrimaryTel =  async () => {
  const primaryTelField = await $('.ignore[type="tel"]');
  await primaryTelField.setValue('+13125551212');
};

const fillSexAndAge =  async () => {
  // 0 - female; 1 - male
  const sex = await $$('[name="/data/ephemeral_dob/g_sex"]');
  const female = sex[0];
  const age = await $('[name="/data/ephemeral_dob/age"]');
  await female.click();
  await age.setValue(20);
};

const fillChildren =  async () => {
  const childrenUnderFiveField = await $('[name="/data/ephemeral_pregnancy/g_children_under_5"]');
  // 0 - yes; 1 - no
  const currentlyPregnant = await $$('[name="/data/ephemeral_pregnancy/pregnant"]');
  await childrenUnderFiveField.setValue(2);
  await currentlyPregnant[0].click();
};

const registerChildrenOption =  async () => {
  // 0 - yes; 1 - no
  const registerChildren = await $$('[name="/data/repeat-relevant/child"]');
  await registerChildren[1].click();
};

const womenBetween =  async () => {
  const women = await $('[name="/data/other_women/g_women_15_to_49"]');
  await women.setValue(2);
};

const registerWomenOption =  async () => {
  // 0 - yes; 1 - no
  const registerChildren = await $$('[name="/data/repeat-women/women"]');
  await registerChildren[1].click();
};

const finalSurvey =  async (sourceWater, mosqNet, hygenicToilet, familyPlan) => {
  // Source of water: 0 - Boreholes; 1- Spring
  const sourceOfWater = await $$('.current fieldset:first-of-type input');
  // Mosquito net: 0 - yes; 1 - no
  const mosquitoNet = await $$('.current fieldset:nth-of-type(2) input');
  // Hygienic toilet: 0 - yes; 1 - no
  const hygienicToilet = await $$('.current fieldset:nth-of-type(3) input');
  // Family Planning: 0 - UCID; 1 - Condoms
  const familyPlanning = await $$('.current fieldset:nth-of-type(4) input');

  await sourceOfWater.get(sourceWater).click();
  await mosquitoNet.get(mosqNet).click();
  await hygienicToilet.get(hygenicToilet).click();
  await familyPlanning.get(familyPlan).click();
};

const reportCheck =  async (
  caregiverName,
  sourceOfWater,
  mosquitoNet,
  hygeinicToilet,
  planningMethod
) => {
  const savedParameters = await $$('.details>ul>li');

  // Primary Caregiver
  expect(await savedParameters[2].getText()).to.equal(
    'report.any.clinic.name\n' + caregiverName
  );
  // Source of water
  expect(await savedParameters[6].getText()).to.equal(
    'report.any.clinic.household_survey.source_of_drinking_water\n' +
      sourceOfWater
  );
  // Mosquito net
  expect(await savedParameters[7].getText()).to.equal(
    'report.any.clinic.household_survey.mosquito_nets\n' + mosquitoNet
  );
  // Hygeinic toilet
  expect(await savedParameters[8].getText()).to.equal(
    'report.any.clinic.household_survey.hygeinic_toilet\n' + hygeinicToilet
  );
  // Planning method
  expect(await savedParameters[9].getText()).to.equal(
    'report.any.clinic.household_survey.family_planning_method\n' +
      planningMethod
  );
};

module.exports =  {
  configureForm,
  fillPrimaryCaregiver,
  fillPrimaryTel,
  fillSexAndAge,
  fillChildren,
  registerChildrenOption,
  womenBetween,
  registerWomenOption,
  finalSurvey,
  reportCheck,
  docs,
};
