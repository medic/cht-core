const utils = require('../../utils');
const helper = require('../../helper');
const fs = require('fs');

const xml = fs.readFileSync(`${__dirname}/../../../demo-forms/multiple-repeats.xml`, 'utf8');

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

module.exports = {
  configureForm: async (contactId) => {
    await utils.seedTestData(contactId, docs);
  },

  fillPrimaryCaregiver: async caregiverName => {
    const primaryCaregiverField = element(
      by.css('[name="/data/contact/name"]')
    );
    await helper.waitUntilReadyNative(primaryCaregiverField);
    await primaryCaregiverField.clear().sendKeys(caregiverName);
  },

  fillPrimaryTel: async () => {
    const primaryTelField = element(by.css('.ignore[type="tel"]'));
    await helper.waitUntilReadyNative(primaryTelField);
    await primaryTelField.clear().sendKeys('+13125551212');
  },

  fillSexAndAge: async () => {
    // 0 - female; 1 - male
    const sex = element(by.css('[name="/data/ephemeral_dob/g_sex"]'));
    await helper.waitUntilReadyNative(sex);
    const age = element(by.css('[name="/data/ephemeral_dob/age"]'));
    await helper.waitElementToBeClickable(sex);
    await sex.click();
    await age.clear().sendKeys(20);
  },

  fillChildren: async () => {
    const childrenUnderFiveField = element(
      by.css('[name="/data/ephemeral_pregnancy/g_children_under_5"]')
    );
    // 0 - yes; 1 - no
    const currentlyPregnant = element.all(
      by.css('[name="/data/ephemeral_pregnancy/pregnant"]')
    );
    await childrenUnderFiveField.clear().sendKeys(2);
    await currentlyPregnant.get(0).click();
  },

  registerChildrenOption: async () => {
    // 0 - yes; 1 - no
    const registerChildren = element.all(
      by.css('[name="/data/repeat-relevant/child"]')
    );
    await registerChildren.get(1).click();
  },

  womenBetween: async () => {
    const women = element(
      by.css('[name="/data/other_women/g_women_15_to_49"]')
    );
    await women.clear().sendKeys(2);
  },

  registerWomenOption: async () => {
    // 0 - yes; 1 - no
    const registerChildren = element.all(
      by.css('[name="/data/repeat-women/women"]')
    );
    await registerChildren.get(1).click();
  },

  finalSurvey: async (sourceWater, mosqNet, hygenicToilet, familyPlan) => {
    // Source of water: 0 - Boreholes; 1- Spring
    const sourceOfWater = element.all(
      by.css('.current fieldset:first-of-type input')
    );
    // Mosquito net: 0 - yes; 1 - no
    const mosquitoNet = element.all(
      by.css('.current fieldset:nth-of-type(2) input')
    );
    // Hygienic toilet: 0 - yes; 1 - no
    const hygienicToilet = element.all(
      by.css('.current fieldset:nth-of-type(3) input')
    );
    // Family Planning: 0 - UCID; 1 - Condoms
    const familyPlanning = element.all(
      by.css('.current fieldset:nth-of-type(4) input')
    );

    await sourceOfWater.get(sourceWater).click();
    await mosquitoNet.get(mosqNet).click();
    await hygienicToilet.get(hygenicToilet).click();
    await familyPlanning.get(familyPlan).click();
  },

  reportCheck: async (
    caregiverName,
    sourceOfWater,
    mosquitoNet,
    hygeinicToilet,
    planningMethod
  ) => {
    const savedParameters = element.all(by.css('.details>ul>li'));
    // Primary Caregiver
    expect(await savedParameters.get(2).getText()).toEqual(
      'report.any.clinic.name\n' + caregiverName
    );
    // Source of water
    expect(await savedParameters.get(6).getText()).toEqual(
      'report.any.clinic.household_survey.source_of_drinking_water\n' +
        sourceOfWater
    );
    // Mosquito net
    expect(await savedParameters.get(7).getText()).toEqual(
      'report.any.clinic.household_survey.mosquito_nets\n' + mosquitoNet
    );
    // Hygeinic toilet
    expect(await savedParameters.get(8).getText()).toEqual(
      'report.any.clinic.household_survey.hygeinic_toilet\n' + hygeinicToilet
    );
    // Planning method
    expect(await savedParameters.get(9).getText()).toEqual(
      'report.any.clinic.household_survey.family_planning_method\n' +
        planningMethod
    );
  },
};
