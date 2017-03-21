var helper = require('../../helper'),
    faker = require('faker');

var ContactsPage = function () {


    this.pageTitle = 'Medic Mobile';
    this.noContactErrorField = $('[ng-show="!error && !loading && !contacts.length"]');

    this.rightHandPane = $('[ng-show="!selected.contacts[0] && !loadingContent"]');
    this.searchBox = $('#freetext');
    this.seachButton = $('#search');
    this.refreshButton = $('.fa fa-undo');

    this.leftHandSideFab = {

    };
    this.rightHandSideFAB = {
        newActionButton: element(by.css('.mm-icon mm-icon-inverse mm-icon-caption dropdown-toggle mm-icon-disabled')),
        newAreaButton: element(by.css('.mm-icon mm-icon-inverse mm-icon-caption')),
        newPersonButton: element(by.css('')),
        editButton=element(by.css('')),
        deleteButton=element(by.css(''))

    };
    //functions to interact with our page



}

module.exports = ContactsPage;
