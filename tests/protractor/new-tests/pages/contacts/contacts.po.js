var helper = require('../../helper');

//var noContactErrorField = $('[ng-show="!error && !loading && !contacts.length"]');

//var rightHandPane = $('[ng-show="!selected.contacts[0] && !loadingContent"]');
var searchBox = $('#freetext');
var seachButton = $('#search');
var refreshButton = $('.fa fa-undo');

var rightHandSideFAB = {
    newActionButton: element(by.css('.mm-icon mm-icon-inverse mm-icon-caption dropdown-toggle mm-icon-disabled')),
    newAreaButton: element(by.css('.mm-icon mm-icon-inverse mm-icon-caption')),
    //todo: needs more precision
    newPersonButton: element(by.css('.fa-stack')),
    editButton: element(by.css('.fa fa-pencil')),
    deleteButton: element(by.css('[ng-click="deleteDoc(actionBar.right.selected)"]'))



};


//functions to interact with our page
module.exports = {
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

