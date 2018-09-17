const helper = require('../../helper');

const searchBox = element(by.css('#freetext')),
      seachButton = element(by.css('#search')),
      refreshButton = element(by.css('.fa fa-undo')),
      newDistrictButton = element(by.css('a[href="#/contacts//add/district_hospital?from=list"]')),
      newPlaceName = element(by.css('[name="/data/district_hospital/name"]')),
      newPersonButton = element(by.css('a.btn.btn-link.add-new')),
      nextButton = element(by.css('button.btn.btn-primary.next-page.ng-scope')),
      newPersonTextBox = element(by.css('[name="/data/contact/name"]')),
      datePicker = element(by.css('[placeholder="yyyy-mm-dd"]')),
      phoneNumbers = element.all(by.css(':not([style="display: none;"])[type="tel"]')),
      phoneNumber = phoneNumbers.first(),
      alternativePhoneNumber = phoneNumbers.get(1),
      personNotes = element(by.css('[name="/data/contact/notes"]')),
      submitButton = element(by.css('.btn.submit.btn-primary.ng-scope'));

module.exports = {

  getSubmitButton: () => {
    return submitButton;
  },

  addNewDistrict: districtName => {
    helper.waitUntilReady(newDistrictButton);
    newDistrictButton.click();
    helper.waitElementToBeVisible(newPlaceName);
    newPlaceName.sendKeys(districtName);
    newPersonButton.click();
    nextButton.click();
  },

  addHealthCenter: () => {
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
  },

  completeNewPersonForm: name => {
    helper.waitUntilReady(newPersonTextBox);
    newPersonTextBox.sendKeys(name);
    datePicker.sendKeys('22-03-2016');
    datePicker.sendKeys(protractor.Key.ENTER);
    helper.waitElementToBeVisible(phoneNumber);
    phoneNumber.sendKeys('+64212156789');
    alternativePhoneNumber.sendKeys('+64212345719');
    personNotes.sendKeys('some notes for the person');
    submitButton.click();
    helper.waitUntilReady(element(by.css('.card .heading')));
  },

  refresh: () => {
    refreshButton.click();
  },

  search: query => {
    searchBox.sendKeys(query);
    seachButton.click();
  },
};

