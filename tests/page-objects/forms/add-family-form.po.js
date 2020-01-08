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
  configureForm: (contactId, done) => {
    utils.seedTestData(done, contactId, docs);
  },

  fillPrimaryCaregiver: caregiverName => {
    const primaryCaregiverField = element(
      by.css('[name="/data/contact/name"]')
    );
    helper.waitUntilReady(primaryCaregiverField);
    primaryCaregiverField.clear().sendKeys(caregiverName);
  },

  fillPrimaryTel: () => {
    const primaryTelField = element(by.css('.ignore[type="tel"]'));
    helper.waitUntilReady(primaryTelField);
    primaryTelField.clear().sendKeys('+13125551212');
  },

  fillSexAndAge: () => {
    // 0 - female; 1 - male
    const sex = element.all(by.css('[name="/data/ephemeral_dob/g_sex"]'));
    helper.waitUntilReady(sex);
    const age = element(by.css('[name="/data/ephemeral_dob/age"]'));
    const female = sex.get(0);
    helper.waitElementToBeClickable(female);
    female.click();
    age.clear().sendKeys(20);
  },

  fillChildren: () => {
    const childrenUnderFiveField = element(
      by.css('[name="/data/ephemeral_pregnancy/g_children_under_5"]')
    );
    // 0 - yes; 1 - no
    const currentlyPregnant = element.all(
      by.css('[name="/data/ephemeral_pregnancy/pregnant"]')
    );
    childrenUnderFiveField.clear().sendKeys(2);
    currentlyPregnant.get(0).click();
  },

  registerChildrenOption: () => {
    // 0 - yes; 1 - no
    const registerChildren = element.all(
      by.css('[name="/data/repeat-relevant/child"]')
    );
    registerChildren.get(1).click();
  },

  womenBetween: () => {
    const women = element(
      by.css('[name="/data/other_women/g_women_15_to_49"]')
    );
    women.clear().sendKeys(2);
  },

  registerWomenOption: () => {
    // 0 - yes; 1 - no
    const registerChildren = element.all(
      by.css('[name="/data/repeat-women/women"]')
    );
    registerChildren.get(1).click();
  },

  finalSurvey: (sourceWater, mosqNet, hygenicToilet, familyPlan) => {
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

    sourceOfWater.get(sourceWater).click();
    mosquitoNet.get(mosqNet).click();
    hygienicToilet.get(hygenicToilet).click();
    familyPlanning.get(familyPlan).click();
  },

  reportCheck: (
    caregiverName,
    sourceOfWater,
    mosquitoNet,
    hygeinicToilet,
    planningMethod
  ) => {
    const savedParameters = element.all(by.css('.details>ul>li'));
    // Primary Caregiver
    expect(savedParameters.get(2).getText()).toEqual(
      'report.any.clinic.name\n' + caregiverName
    );
    // Source of water
    expect(savedParameters.get(6).getText()).toEqual(
      'report.any.clinic.household_survey.source_of_drinking_water\n' +
        sourceOfWater
    );
    // Mosquito net
    expect(savedParameters.get(7).getText()).toEqual(
      'report.any.clinic.household_survey.mosquito_nets\n' + mosquitoNet
    );
    // Hygeinic toilet
    expect(savedParameters.get(8).getText()).toEqual(
      'report.any.clinic.household_survey.hygeinic_toilet\n' + hygeinicToilet
    );
    // Planning method
    expect(savedParameters.get(9).getText()).toEqual(
      'report.any.clinic.household_survey.family_planning_method\n' +
        planningMethod
    );
  },
};
