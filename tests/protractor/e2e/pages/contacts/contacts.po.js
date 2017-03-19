var helper = require('../../helper'),
    faker = require('faker');

var ContactsPage = function() {

   
    this.pageTitle = 'Medic Mobile';
    this.noContactErrorField = $('[ng-show="!error && !loading && !contacts.length"]');
    
    this.rightHandPane= $('[ng-show="!selected.contacts[0] && !loadingContent"]');
    
    //functions to interact with our page
    
 

}

module.exports = ContactsPage;
