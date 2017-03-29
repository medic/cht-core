var helper = require('../../helper');
// var noMessageErrorField = $('[ng-show="!error && !loading && !messages.length"]');
   var sendMessageButton=element(by.className('mm-icon mm-icon-inverse mm-icon-caption send-message'));
  // var rightHandPane= $('[ng-show="!selected.messages[0] && !loadingContent"]');
   //var leftHandPane=element(by.id('message-list'));
   var exportButton=element(by.css('[ng-click=actionBar.left.exportFn()]'));

module.exports = {

     exportData: function () {

        helper.waitUntilReady(exportButton);
        exportButton.click();
    },

    openSendMessageModal: function () {

        helper.waitUntilReady(sendMessageButton);
        sendMessageButton.click();
    }
    
};
