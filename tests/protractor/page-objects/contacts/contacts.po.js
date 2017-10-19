const helper = require('../../helper');

const searchBox = element.all(by.css('#freetext')),
      seachButton = element.all(by.css('#search')),
      refreshButton = element.all(by.css('.fa fa-undo')),
      newDistrictButton = element.all(by.css('a[href="#/contacts//add/district_hospital"]')),
      newPlaceForm = element.all(by.css('#district_hospital')),
      newPlaceName = element.all(by.css('[name="/data/district_hospital/name"]')),
      newPersonButton = element.all(by.css('a.btn.btn-link.add-new')),
      nextButton = element.all(by.css('button.btn.btn-primary.next-page.ng-scope')),
      newPersonTextBox = element.all(by.css('[name="/data/contact/name"]')),
      datePicker = element.all(by.css('[placeholder="yyyy-mm-dd"]')),
      phoneNumbers = element.all(by.css(':not([style="display: none;"])[type="tel"]')),
      phoneNumber = phoneNumbers.first(),
      alternativePhoneNumber = phoneNumbers.get(1),
      personNotes = element.all(by.css('[name="/data/contact/notes"]')),
      submitButton = element(by.css('.btn.submit.btn-primary.ng-scope'));

module.exports = {
  
  getSubmitButton: () => {
    return submitButton;
  },

  addNewDistrict: districtName => {
    helper.waitUntilReady(newDistrictButton);
    newDistrictButton.click();
    helper.waitElementToBeVisisble(newPlaceForm);
    helper.waitElementToBeVisisble(newPlaceName);
    newPlaceName.sendKeys(districtName);
    newPersonButton.click();
    nextButton.click();
  },

  completeNewPersonForm: name => {
    helper.waitUntilReady(newPersonTextBox);
    newPersonTextBox.sendKeys(name);
    datePicker.sendKeys('22-03-2016');
    datePicker.sendKeys(protractor.Key.ENTER);
    helper.waitElementToBeVisisble(phoneNumber);
    phoneNumber.sendKeys('+64212156789');
    alternativePhoneNumber.sendKeys('+64212345719');
    personNotes.sendKeys('some notes for the person');
    submitButton.click();
  },

  refresh: () => {
    refreshButton.click();
  },

  search: query => {
    searchBox.sendKeys(query);
    seachButton.click();
  },
};

