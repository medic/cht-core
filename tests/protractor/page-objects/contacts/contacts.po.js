const helper = require('../../helper');

const searchBox = element.all(by.css('#freetext'));
const seachButton = element.all(by.css('#search'));
const refreshButton = element.all(by.css('.fa fa-undo'));
const newDistrictButton = element.all(by.css('a[href="#/contacts//add/district_hospital"]'));
const newPlaceForm = element.all(by.css('#district_hospital'));
const newPlaceName = element.all(by.css('[name="/data/district_hospital/name"]'));
const newPersonButton = element.all(by.css('a.btn.btn-link.add-new'));
const externalId = element.all(by.css('[name="/data/district_hospital/external_id"]'));
const notesTextArea = element.all(by.css('[name="/data/district_hospital/notes"]'));
const nextButton = element.all(by.css('button.btn.btn-primary.next-page.ng-scope'));
const newPersonTextBox = element.all(by.css('[name="/data/contact/name"]'));
const datePicker = element.all(by.css('[placeholder="yyyy-mm-dd"]'));
const phoneNumbers = element.all(by.css(':not([style="display: none;"])[type="tel"]'));
const phoneNumber = phoneNumbers.first();
const alternativePhoneNumber = phoneNumbers.get(1);
const personNotes = element.all(by.css('[name="/data/contact/notes"]'));
const submitButton = element(by.css('.btn.submit.btn-primary.ng-scope'));

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
    //complete form
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
  }
};

