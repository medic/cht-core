//var helper = require('../../helper'),
   // faker = require('faker');

var TasksPage = function() {

    //title and texts of notifications/error messages
    this.pageTitle = 'Medic Mobile';
    this.noMessageErrorField = $('[ng-show="!error && !loading && !tasks.length"]');
    this.sendMessageButton=element(by.className('mm-icon mm-icon-inverse mm-icon-caption send-message'));
    this.rightHandPane= $('[ng-show="!selected.tasks[0] && !loadingContent"]');
    this.lefHandPane=element(by.id('tasks-list'));
    //functions to interact with our page
  
};

module.exports = TasksPage;
