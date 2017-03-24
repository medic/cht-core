//var helper = require('../../helper');
   // faker = require('faker');

var MessagesPage = function() {

    //title and texts of notifications/error messages
    this.pageTitle = 'Medic Mobile';
    this.noMessageErrorField = $('[ng-show="!error && !loading && !messages.length"]');
    this.sendMessageButton=element(by.className('mm-icon mm-icon-inverse mm-icon-caption send-message'));
    this.rightHandPane= $('[ng-show="!selected.messages[0] && !loadingContent"]');
    this.leftHandPane=element(by.id('message-list'));
    
    //functions to interact with our page
    
 

};

module.exports = MessagesPage;
