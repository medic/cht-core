const genericForm = require('./generic-form.wdio.page');
const reportsPage = require('../reports/reports.wdio.page');

const FORM = 'form[data-form-id="family"]';

const fillPrimaryCaregiver =  async caregiverName => {
  const primaryCaregiverField = await $('input[name="/data/contact/name"]');
  await primaryCaregiverField.waitForDisplayed();
  await primaryCaregiverField.setValue(caregiverName);
};

const fillPrimaryTel =  async () => {
  const primaryTelField = await $('.ignore[type="tel"]');
  await primaryTelField.waitForDisplayed();
  await primaryTelField.setValue('+13125551212');
};

const fillSexAndAge =  async () => {
  await selectSex();
  const age = await $('input[name="/data/ephemeral_dob/age"]');
  await age.waitForDisplayed();
  await age.setValue(20);
};

const selectSex = async () => {
  const sex = await $('input[name="/data/ephemeral_dob/g_sex"]');
  await sex.waitForDisplayed();
  await sex.click();
};

const fillChildren =  async () => {
  const childrenUnderFiveField = await $('input[name="/data/ephemeral_pregnancy/g_children_under_5"]');
  // 0 - yes; 1 - no
  const currentlyPregnant = await $$('input[name="/data/ephemeral_pregnancy/pregnant"]');
  await childrenUnderFiveField.waitForDisplayed();
  await childrenUnderFiveField.setValue(2);
  await currentlyPregnant[0].waitForClickable();
  await currentlyPregnant[0].click();
};

const registerChildrenOption =  async () => {
  // 0 - yes; 1 - no
  const registerChildren = await $$('input[name="/data/repeat-relevant/child"]');
  await registerChildren[1].waitForClickable();
  await registerChildren[1].click();
};

const womenBetween =  async () => {
  const women = await $('[name="/data/other_women/g_women_15_to_49"]');
  await women.waitForDisplayed();
  await women.setValue(2);
};

const registerWomenOption =  async () => {
  const radios = () => $$('input[name="/data/repeat-women/women"]');
  await browser.waitUntil(async () => (await radios()).length === 2);
  const registerChildren = await radios();
  // 0 - yes; 1 - no
  await registerChildren[1].waitForClickable();
  await registerChildren[1].click();
};

const finalSurvey =  async (sourceWater, mosqNet, hygenicToilet, familyPlan) => {
  // Source of water: 0 - Boreholes; 1- Spring
  const sourceOfWater = await $$('input[name="/data/clinic/household_survey/source_of_drinking_water"]');
  await sourceOfWater[sourceWater].waitForClickable();
  await sourceOfWater[sourceWater].click();

  // Mosquito net: 0 - yes; 1 - no
  const mosquitoNet = await $$('input[name="/data/clinic/household_survey/mosquito_nets"]');
  await mosquitoNet[mosqNet].waitForClickable();
  await mosquitoNet[mosqNet].click();

  // Hygienic toilet: 0 - yes; 1 - no
  const hygienicToilet = await $$('input[name="/data/clinic/household_survey/hygeinic_toilet"]');
  await hygienicToilet[hygenicToilet].waitForClickable();
  await hygienicToilet[hygenicToilet].click();

  // Family Planning: 0 - UCID; 1 - Condoms
  const familyPlanning = await $$('input[name="/data/clinic/household_survey/family_planning_method"]');
  await familyPlanning[familyPlan].waitForClickable();
  await familyPlanning[familyPlan].click();
};

const submitFamilyForm = async () => {
  await $(FORM).waitForDisplayed();
  await fillPrimaryCaregiver('test');
  await genericForm.nextPage();
  await fillPrimaryTel();
  await genericForm.nextPage();
  await fillSexAndAge();
  await genericForm.nextPage();
  await fillChildren();
  await genericForm.nextPage();
  await registerChildrenOption();
  await genericForm.nextPage();
  await womenBetween();
  await genericForm.nextPage();
  await registerWomenOption();
  await genericForm.nextPage();
  await finalSurvey(0, 0, 0, 0);
  await reportsPage.submitForm();
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
  expect((await savedParameters[2].getText()).replace(/[\n]/g, '')).to.equal(
    'report.add-family.clinic.name' + caregiverName
  );
  // Source of water
  expect((await savedParameters[6].getText()).replace(/[\n]/g, '')).to.equal(
    'report.add-family.clinic.household_survey.source_of_drinking_water' +
      sourceOfWater
  );
  // Mosquito net
  expect((await savedParameters[7].getText()).replace(/[\n]/g, '')).to.equal(
    'report.add-family.clinic.household_survey.mosquito_nets' + mosquitoNet
  );
  // Hygeinic toilet
  expect((await savedParameters[8].getText()).replace(/[\n]/g, '')).to.equal(
    'report.add-family.clinic.household_survey.hygeinic_toilet' + hygeinicToilet
  );
  // Planning method
  expect((await savedParameters[9].getText()).replace(/[\n]/g, '')).to.equal(
    'report.add-family.clinic.household_survey.family_planning_method' +
      planningMethod
  );
};

module.exports =  {
  fillPrimaryCaregiver,
  fillPrimaryTel,
  fillSexAndAge,
  fillChildren,
  registerChildrenOption,
  womenBetween,
  registerWomenOption,
  finalSurvey,
  submitFamilyForm,
  reportCheck,
};
