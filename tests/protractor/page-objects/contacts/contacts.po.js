var helper = require('../../helper');

//var noContactErrorField = $('[ng-show="!error && !loading && !contacts.length"]');

//var rightHandPane = $('[ng-show="!selected.contacts[0] && !loadingContent"]');
var searchBox = $('#freetext');
var seachButton = $('#search');
var refreshButton = $('.fa fa-undo');
var newDistrictButton = $('a[href="#/contacts//add/district_hospital"]');
var newPlaceForm = $('#district_hospital');
var newPlaceName = $('[name="/data/district_hospital/name"]');
var newPersonButton = $('a.btn.btn-link.add-new');
var externalId = $('[name="/data/district_hospital/external_id"]');
var notesTextArea = $('[name="/data/district_hospital/notes"]');
var nextButton = $('button.btn.btn-primary.next-page.ng-scope');
var newPersonForm = $('[name="/data/contact"]');

//person form
var newPersonTextBox = $('[name="/data/contact/name"]');
var datePicker = $('[placeholder="yyyy-mm-dd"]');
//var phoneNumber = $('[name="/data/contact/phone"]');
var phoneNumber = $('[type="tel"]');
var alternativePhoneNumber = $('[name="/data/contact/alternate_phone"]');
var personNotes = $('[name="/data/contact/notes"]');

var submitButton = $('[ng-click="onSubmit()"]');

var rightHandSideFAB = {
    newActionButton: element(by.css('.mm-icon.mm-icon-inverse.mm-icon-caption.dropdown-toggle.mm-icon-disabled')),
    newAreaButton: element(by.css('.mm-icon mm-icon-inverse mm-icon-caption')),
    //todo: needs more precision
    //newPersonButton: element(by.css('.fa-stack')),
    editButton: element(by.css('.fa fa-pencil')),
    deleteButton: element(by.css('[ng-click="deleteDoc(actionBar.right.selected)"]'))
};


//functions to interact with our page
module.exports = {

    addNewDistrict: function (districtName) {

        helper.waitUntilReady(newDistrictButton);
        newDistrictButton.click();
        helper.waitUntilReady(newPlaceForm);
        //complete form
        newPlaceName.sendKeys(districtName);
        newPersonButton.click();
        externalId.sendKeys('1245');
        notesTextArea.sendKeys('Some notes, just for testing purposes.&$@#!_)_@519874-#@1-3-$^%%');
        nextButton.click();
        helper.waitElementToDisappear(newPersonButton);

    },

    completeNewPersonForm: function (name) {

        helper.waitUntilReady(newPersonTextBox);
        //complete form
        newPersonTextBox.sendKeys(name);
        datePicker.sendKeys('22-03-2016');
        datePicker.sendKeys(protractor.Key.ENTER);
        // browser.actions().sendKeys(protractor.Key.ENTER).perform();
        helper.waitElementToBeVisisble(phoneNumber);
        phoneNumber.sendKeys('+64212156788');
        //alternativePhoneNumber.sendKeys('+64212345718');
        personNotes.sendKeys('some notes for the person');
        // personNotes.sendKeys(protractor.Key.TAB);
        //helper.waitElementToBeVisisble(submitButton);
        //submitButton.click();
        //helper.waitElementToDisappear(submitButton);


    },
    addNewArea: function () {

        helper.waitUntilReady(rightHandSideFAB.newAreaButton);

    },

    addNewPerson: function () {

        helper.waitUntilReady(rightHandSideFAB.newPersonButton);

    },

    edit: function () {

        helper.waitUntilReady(rightHandSideFAB.editButton);

    },

    deleteEntry: function () {

        helper.waitUntilReady(rightHandSideFAB.deleteButton);

    },

    openDeliveryReport: function () {

        helper.waitUntilReady(rightHandSideFAB.newActionButton);

    },


    openNewPregnancyForm: function () {

        helper.waitUntilReady(rightHandSideFAB.newActionButton);

    },
    openPregnancyVisitForm: function () {

        helper.waitUntilReady(rightHandSideFAB.newActionButton);

    },

    refresh: function () {
        refreshButton.click();
    },
    search: function (query) {

        searchBox.sendKeys(query);
        seachButton.click();
    }
};

