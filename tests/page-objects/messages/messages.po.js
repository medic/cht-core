const helper = require('../../helper');

const sendMessageButton = element(by.className('mm-icon mm-icon-inverse mm-icon-caption send-message'));
const exportButton = element(by.css('[ng-click=actionBar.left.exportFn()]'));

module.exports = {
  exportData: ()=> {
    helper.waitUntilReady(exportButton);
    exportButton.click();
  },
  openSendMessageModal: ()=> {
    helper.waitUntilReady(sendMessageButton);
    sendMessageButton.click();
  },
  getSendMessageButton: ()=> {
    helper.waitUntilReady(sendMessageButton);
    return sendMessageButton;
  }
};
