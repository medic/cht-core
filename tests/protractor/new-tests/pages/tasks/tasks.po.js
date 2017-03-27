//var helper = require('../../helper'),
   // faker = require('faker');

    //title and texts of notifications/error messages
   var pageTitle = 'Medic Mobile';
   var noMessageErrorField = $('[ng-show="!error && !loading && !tasks.length"]');
   var sendMessageButton=element(by.className('mm-icon mm-icon-inverse mm-icon-caption send-message'));
   var rightHandPane= $('[ng-show="!selected.tasks[0] && !loadingContent"]');
   var lefHandPane=element(by.id('tasks-list'));
    //functions to interact with our page

