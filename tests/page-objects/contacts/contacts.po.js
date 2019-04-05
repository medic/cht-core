const helper = require('../../helper');

const searchBox = element(by.css('#freetext')),
      seachButton = element(by.css('#search')),
      refreshButton = element(by.css('.fa fa-undo')),
      newDistrictButton = element(by.css('a[href="#/contacts//add/district_hospital?from=list"]')),
      newPlaceName = element(by.css('[name="/data/init/custom_place_name"]')),
      newPersonButton = element(by.css('a.btn.btn-link.add-new')),
      nextButton = element(by.css('button.btn.btn-primary.next-page.ng-scope')),
      newPersonTextBox = element(by.css('[name="/data/contact/name"]')),
      datePicker = element(by.css('[placeholder="yyyy-mm-dd"]')),
      phoneNumbers = element.all(by.css(':not([style="display: none;"])[type="tel"]')),
      phoneNumber = phoneNumbers.first(),
      alternativePhoneNumber = phoneNumbers.get(1),
      personNotes = element(by.css('[name="/data/contact/notes"]')),
      submitButton = element(by.css('.btn.submit.btn-primary.ng-scope'));

const skipCreate = element(by.css('[name="/data/init/create_new_person"][value="none"]'));

module.exports = {

  getSubmitButton: () => {
    return submitButton;
  },

  addNewDistrict: districtName => {
    helper.waitUntilReady(newDistrictButton);
    newDistrictButton.click();
    helper.waitElementToBeVisible(skipCreate);
    skipCreate.click();
    nextButton.click();
    helper.waitElementToBeVisible(newPlaceName);
    newPlaceName.sendKeys(districtName);
    submitButton.click();
  },

  addHealthCenter: () => {
    const newHealthCenterButton = element(by.css('[href$="/add/health_center"]'));
    helper.waitUntilReady(newHealthCenterButton);
    helper.clickElement(newHealthCenterButton);
    helper.waitElementToBeVisible(skipCreate);
    skipCreate.click();
    nextButton.click();
    helper.waitElementToBeVisible(newPlaceName);
    newPlaceName.sendKeys('Mavuvu Clinic');
    element(by.css('[name="/data/health_center/external_id"]')).sendKeys('1234457');
    element(by.css('[name="/data/health_center/notes"]')).sendKeys('some notes');
    submitButton.click();
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

