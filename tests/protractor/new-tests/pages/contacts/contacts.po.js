var helper = require('../../helper');
  //  faker = require('faker');

   var pageTitle = 'Medic Mobile';
   var noContactErrorField = $('[ng-show="!error && !loading && !contacts.length"]');

   var rightHandPane = $('[ng-show="!selected.contacts[0] && !loadingContent"]');
   var searchBox = $('#freetext');
   var seachButton = $('#search');
   var refreshButton = $('.fa fa-undo');

   var leftHandSideFab = {

    };
   var rightHandSideFAB = {
        newActionButton: element(by.css('.mm-icon mm-icon-inverse mm-icon-caption dropdown-toggle mm-icon-disabled')),
        newAreaButton: element(by.css('.mm-icon mm-icon-inverse mm-icon-caption')),
        //todo: needs more precision
        newPersonButton: element(by.css('.fa-stack')),
        editButton:element(by.css('.fa fa-pencil')),
        deleteButton:element(by.css('[ng-click="deleteDoc(actionBar.right.selected)"]'))

        

    };
    //functions to interact with our page

   var addNewArea= function() {

        helper.waitUntilReady(this.newAreaButton);
         
    };

   var addNewPerson= function() {

        helper.waitUntilReady(this.newPersonButton);
         
    };

   var edit= function() {

        helper.waitUntilReady(this.editButton);
         
    };

    var deleteEntry= function() {

        helper.waitUntilReady(this.deleteButton);
         
    };

var openDeliveryReport= function() {

        helper.waitUntilReady(this.newActionButton);
         
    };


var openNewPregnancyForm= function() {

        helper.waitUntilReady(this.newActionButton);
         
    };
var openPregnancyVisitForm= function() {

        helper.waitUntilReady(this.newActionButton);
         
    };

