var helper = require('../../helper');

var searchBox = $('#freetext');
var seachButton = $('#search');
var refreshButton = $('.fa fa-undo');
var newDistrictButton = $('a[href="#/contacts//add/district_hospital"]');
var newPlaceForm = $('#district_hospital');
var newPlaceName = $('[name="/data/district_hospital/name"]');
var newPersonButton = $('a.btn.btn-link.add-new');
var externalId = $('[name="/data/district_hospital/external_id"]');
var notesTextArea = $('[name="/data/district_hospital/notes"]');
//var nextButton = $('button.btn.btn-primary.next-page.ng-scope');
var newPersonTextBox = $('[name="/data/contact/name"]');
var datePicker = $('[placeholder="yyyy-mm-dd"]');
var phoneNumbers = element.all(by.css(':not([style="display: none;"])[type="tel"]'));
var phoneNumber = phoneNumbers.first();
var alternativePhoneNumber = phoneNumbers.get(1);
var personNotes = $('[name="/data/contact/notes"]');
var submitButton = $('[ng-click="onSubmit()"]');

module.exports = {
  getSubmitButton: function () {
    return submitButton;
  },

  addNewDistrict: function (districtName) {
    helper.waitUntilReady(newDistrictButton);
    newDistrictButton.click();
    helper.waitUntilReady(newPlaceForm);
    newPlaceName.sendKeys(districtName);
    newPersonButton.click();
    externalId.sendKeys('1245');
    notesTextArea.sendKeys('Some notes, just for testing purposes.&$@#!_)_@519874-#@1-3-$^%%');
    //nextButton.click();
  },

  completeNewPersonForm: function (name) {
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

  refresh: function () {
    refreshButton.click();
  },
  search: function (query) {

    searchBox.sendKeys(query);
    seachButton.click();
  }
};

