const helper = require('../../../helper');
const common = require('../common/common.po');

const sendMessageButton = element(by.className('mm-icon mm-icon-inverse mm-icon-caption send-message'));
const exportButton = element(by.css('[ng-click=actionBar.left.exportFn()]'));
const selectOptions = element.all(by.css('.select2-results__option'));
const selectChoices = element.all(by.css('li.select2-selection__choice'));
const sendAdditionalMessage = element(by.css('#message-footer .message-actions .btn-primary'));
const messageTextArea = element(by.css('#message-footer textarea'));
const addRecipient = element(by.css('.message-actions .btn.btn-link'));
const selectedOption = element(by.css('#send-message select>option'));

const openMessageContent = async (id, name) => {
  await common.goToMessagesNative();
  await helper.waitUntilReadyNative(module.exports.messageInList(id));
  await clickLhsEntry(id, name);
};

const enterMessageText = async message => {
  await element(by.css('#message-footer textarea')).click();
  await helper.waitElementToBeVisibleNative(sendAdditionalMessage);
  await messageTextArea.sendKeys(message);
};

const searchSelect2 = async (searchText, totalExpectedResults, entrySelector, entryText) => {
  await module.exports.messageRecipientSelect().sendKeys(searchText);
  await browser.wait(async () => await selectOptions.count() === totalExpectedResults, 20000, 'searchSelect2 timedout');
  const elm = element(by.cssContainingText(selectOptions.locator().value + entrySelector, entryText));
  await helper.waitUntilReadyNative(elm);
  return elm;
};

const submitMessage = async () => {
  await helper.clickElementNative(module.exports.sendMessageMobalSubmit());
  await helper.waitElementToDisappear(module.exports.sendMessageModal().locator());
};

const lastMessageText = () => {
  const last = element.all(by.css('#message-content li div.data>p>span')).last();
  return helper.getTextFromElementNative(last);
};

const clickLhsEntry = async (entryId, entryName) => {
  entryName = entryName || entryId;

  const liElement = await module.exports.messageInList(entryId);
  await helper.clickElementNative(liElement);

  return browser.wait(async () => {
    const el = module.exports.messageDetailsHeader();
    await helper.waitUntilReadyNative(el);
    const text = await helper.getTextFromElementNative(el);
    return text === entryName;
  }, 2000);
};

const enterCheckAndSelect = async (searchTxt, totalExpectedResults, entrySelector, entryTxt, existingEntryCount=0) => {
  const selectionCount = await selectChoices.count();
  expect(selectionCount).toBe(existingEntryCount);

  const entry = await searchSelect2(searchTxt, totalExpectedResults, entrySelector, entryTxt);
  await entry.click();

  await browser.wait(async () => await selectChoices.count() === existingEntryCount + 1);
};

module.exports = {
  // LHS
  messageInList: identifier => element(by.css(`#message-list li[test-id="${identifier}"]`)),
  messageByIndex: index => element(by.css(`#message-list li:nth-child(${index})`)),
  listMessageHeading: (listElement) => listElement.element(by.css('.heading h4')),
  listMessageSummary: (listElement) => listElement.element(by.css('.summary p')),

  //RHS
  messageDetailsHeader: () => element(by.css('#message-header .name')),
  allMessages: () => element.all(by.css('#message-content li')),
  messageContentIndex: (index) => element(by.css(`#message-content li:nth-child(${index})`)),
  messageContentText: (messageContentElement) => messageContentElement.element(by.css('.data p:first-child')),
  messageContentState: (messageContentElement) => messageContentElement.element(by.css('.data .state')),


  messageText: text => element(by.css('#send-message textarea')).sendKeys(text),
  sendMessage: () => element(by.css('.general-actions .send-message')),
  sendMessageModal: () => element(by.id('send-message')),
  sendMessageMobalSubmit: () => module.exports.sendMessageModal().element(by.css('a.btn.submit:not(.ng-hide)')),
  messageRecipientSelect: () => element(by.css('#send-message input.select2-search__field')),

  exportData: () => {
    helper.waitUntilReady(exportButton);
    exportButton.click();
  },
  openSendMessageModal: async () => {
    await helper.clickElementNative(module.exports.sendMessage());
    await helper.waitUntilReadyNative(module.exports.sendMessageModal());
  },
  getSendMessageButton: () => {
    helper.waitUntilReady(sendMessageButton);
    return sendMessageButton;
  },
  searchSelect2,
  selectChoices,
  submitMessage,
  lastMessageText,
  clickLhsEntry,
  enterCheckAndSelect,
  openMessageContent,
  enterMessageText,
  sendAdditionalMessage,
  addRecipient,
  selectedOption
};
