var helper = require('../../helper');
  //  faker = require('faker');

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
        //todo: needs more precision
        newPersonButton: element(by.css('.fa-stack')),
        editButton:element(by.css('.fa fa-pencil')),
        deleteButton:element(by.css('[ng-click="deleteDoc(actionBar.right.selected)"]'))

        

    };
    //functions to interact with our page

    this.addNewArea= function() {

        helper.waitUntilReady(this.newAreaButton);
         
    };

    this.addNewPerson= function() {

        helper.waitUntilReady(this.newPersonButton);
         
    };

    this.edit= function() {

        helper.waitUntilReady(this.editButton);
         
    };

     this.delete= function() {

        helper.waitUntilReady(this.deleteButton);
         
    };

 this.openDeliveryReport= function() {

        helper.waitUntilReady(this.newActionButton);
         
    };


 this.openNewPregnancyForm= function() {

        helper.waitUntilReady(this.newActionButton);
         
    };
 this.openPregnancyVisitForm= function() {

        helper.waitUntilReady(this.newActionButton);
         
    };


};

module.exports = ContactsPage;
