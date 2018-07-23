const commonElements = require('.././common.po.js'),
      contactPage = require('.././contacts.po.js'),
      helper = require('../../framework/modules/helper'),
      utils = require('../../framework/modules/utils');

describe('Add new health center tests : ', () => {

  afterEach(utils.afterEach);
  beforeEach(utils.beforeEach);

  it('should add new health center', () => {
    commonElements.goToPeople();
    contactPage.addNewDistrict('Auckland');
    contactPage.completeNewPersonForm('Kiwimate');
    helper.waitUntilReady(element(by.css('.card .heading')));
    const newHealthCenterButton = element(by.css('[ng-show="actionBar.right.selected[0].child.type"]'));
    helper.waitUntilReady(newHealthCenterButton);
    helper.clickElement(newHealthCenterButton);
    helper.waitUntilReady(element(by.css('[name="/data/health_center"]')));
    element(by.css('[name="/data/health_center/name"]')).sendKeys('Mavuvu Clinic');
    browser.actions()
      .sendKeys(protractor.Key.TAB).perform();
    browser.actions()
      .sendKeys(protractor.Key.TAB).perform();
    browser.actions()
      .sendKeys(protractor.Key.ENTER).perform();
    browser.actions()
      .sendKeys('Kiwi').perform();
    const contactName = element.all(by.css('.select2-results .name')).get(0);
    helper.waitElementToBeVisible(contactName);
    helper.clickElement(contactName);
    element(by.css('[name="/data/health_center/external_id"]')).sendKeys('1234457');
    element(by.css('[name="/data/health_center/notes"]')).sendKeys('some notes');
    const submitButton = element(by.css('.btn.submit.btn-primary'));
    helper.clickElement(submitButton);
    const center = element(by.css('.card h2'));
    helper.waitUntilReady(center);
    expect(center.getText()).toBe('Mavuvu Clinic');
  });
});
