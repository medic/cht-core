const helper = require('../../helper');

const searchBox = $('#freetext');
const seachButton = $('#search');
const refreshButton = $('.fa fa-undo');
const newDistrictButton = $('a[href="#/contacts//add/district_hospital"]');
const newPlaceForm = $('#district_hospital');
const newPlaceName = $('[name="/data/district_hospital/name"]');
const newPersonButton = $('a.btn.btn-link.add-new');
const externalId = $('[name="/data/district_hospital/external_id"]');
const notesTextArea = $('[name="/data/district_hospital/notes"]');
//const nextButton = $('button.btn.btn-primary.next-page.ng-scope');
const newPersonTextBox = $('[name="/data/contact/name"]');
const datePicker = $('[placeholder="yyyy-mm-dd"]');
const phoneNumbers = element.all(by.css(':not([style="display: none;"])[type="tel"]'));
const phoneNumber = phoneNumbers.first();
const alternativePhoneNumber = phoneNumbers.get(1);
const personNotes = $('[name="/data/contact/notes"]');
const submitButton = $('[ng-click="onSubmit()"]');

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
    notesTextArea.sendKeys('Some notes, just for testing purposes.&$@#!_)_@519874-#@1-3-$^%%');
    //nextButton.click();
  },

  completeNewPersonForm: name => {
    helper.waitUntilReady(newPersonTextBox);
    //complete form
    newPersonTextBox.sendKeys(name);
    datePicker.sendKeys('22-03-2016');
    datePicker.sendKeys(protractor.Key.ENTER);
    helper.waitElementToBeVisisble(phoneNumber);
    phoneNumber.sendKeys('+64212156788');
    alternativePhoneNumber.sendKeys('+64212345718');
    personNotes.sendKeys('some notes for the person');
    personNotes.sendKeys(protractor.Key.TAB);
    helper.waitElementToBeVisisble(submitButton);
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

