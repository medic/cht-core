const helper = require('../../helper');

const sendMessageButton = element(by.className('mm-icon mm-icon-inverse mm-icon-caption send-message'));
const exportButton = element(by.css('[ng-click=actionBar.left.exportFn()]'));

module.exports = {
  messageInList: identifier => element(by.css(`#message-list li[test-id="${identifier}"]`)),
  messageByIndex: index => element(by.css(`#message-list li:nth-child(${index})`)),
  messageText: text => element(by.css('#send-message textarea')).sendKeys(text),
  sendMessage: () => element(by.css('.general-actions .send-message')),
  sendMessageModal: () => element(by.id('send-message')),
  messageRecipientSelect: () => element(by.css('#send-message input.select2-search__field')),
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
