const utils = require('../../utils');
const helper = require('../../helper');

const xml = require('./data/family-survey.po.data').xml;

const docs = [
  {
    _id: 'form:family-survey',
    internalId: 'family_survey',
    title: 'FamilySurvey',
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
  configureForm: (userContactDoc, done) => {
    utils.seedTestData(done, userContactDoc, docs);
  },

  fillFamilySurvey: (pregnant, numberOfChildren) => {
    pregnant = pregnant || 0;
    numberOfChildren = numberOfChildren || 2;
    // 0 - yes, 1 - no
    const pregnantRadioBtn = element.all(
      by.css('[name="/family_survey/a/g_pregnant"]')
    );
    const numberOfChildrenField = element.all(
      by.css('[name="/family_survey/a/g_no_children_u5"]')
    );
    helper.waitUntilReady(pregnantRadioBtn);
    numberOfChildrenField.clear().sendKeys(numberOfChildren);
    pregnantRadioBtn.get(pregnant).click();
  },

  familyConditions: haveCookStove => {
    haveCookStove = haveCookStove || 0;
    // 0 - yes; 1 - no
    const stoveRadioBtns = element.all(
      by.css('[name="/family_survey/b/g_improved_cook_stove"]')
    );
    const haveSolarLight = element.all(
      by.css('[name="/family_survey/b/g_solar_light"]')
    );
    helper.waitUntilReady(stoveRadioBtns);
    stoveRadioBtns.get(haveCookStove).click();
    haveSolarLight.get(0).click();
  },

  reportCheck: (pregnant, numberOfChildren, haveStove) => {
    const savedParameters = element.all(by.css('.details>ul>li'));
    // check Pregnant status
    expect(savedParameters.get(2).getText()).toEqual(
      'report.family_survey.pregnant\n' + pregnant
    );
    // check number of children
    expect(savedParameters.get(3).getText()).toEqual(
      'report.family_survey.no_children_u5\n' + numberOfChildren
    );
    //  check improved cook stove
    expect(savedParameters.get(4).getText()).toEqual(
      'report.family_survey.improved_cook_stove\n' + haveStove
    );
  }
};
