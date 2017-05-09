var helper = require('../../helper');

var sendMessageButton = element(by.className('mm-icon mm-icon-inverse mm-icon-caption send-message'));
var exportButton = element(by.css('[ng-click=actionBar.left.exportFn()]'));

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
