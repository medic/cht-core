const helper = require('../../helper');

const searchBox = element(by.css('#freetext')),
      seachButton = element(by.css('#search')),
      refreshButton = element(by.css('.fa fa-undo')),
      newDistrictButton = element(by.css('a[href="#/contacts//add/district_hospital"]')),
      newPlaceForm = element(by.css('#district_hospital')),
      newPlaceName = element(by.css('[name="/data/district_hospital/name"]')),
      newPersonButton = element(by.css('a.btn.btn-link.add-new')),
      externalId = element(by.css('[name="/data/district_hospital/external_id"]')),
      notesTextArea = element(by.css('[name="/data/district_hospital/notes"]')),
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
    helper.waitUntilReady(newPlaceForm);
    newPlaceName.sendKeys(districtName);
    newPersonButton.click();
    externalId.sendKeys('1245');
    notesTextArea.sendKeys('Some notes, just for testing purposes.&element.all(by.css@#!_)_@519874-#@1-3-element.all(by.css^%%');
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

