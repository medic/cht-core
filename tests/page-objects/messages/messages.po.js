const helper = require('../../helper');
const utils = require('../../utils');
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
  await helper.waitElementToPresentNative(module.exports.messageInList(id), 2000);
  await clickLhsEntry(id, name);
};

const enterMessageText = async message => {
  await element(by.css('#message-footer textarea')).click();
  await helper.waitElementToBeVisible(sendAdditionalMessage);
  await browser.wait(messageTextArea.sendKeys(message));
};

const searchSelect2 = async (searchText, totalExpectedResults, entrySelector, entryText) => {
  await module.exports.messageRecipientSelect().sendKeys(searchText);
  await browser.wait(async () => await selectOptions.count() === totalExpectedResults);
  const elm = element(by.cssContainingText(selectOptions.locator().value + entrySelector , entryText));
  await helper.waitUntilReadyNative(elm);
  return elm;
};

const submitMessage = async () => {
  await helper.clickElementNative(module.exports.sendMessageMobalSubmit());
  await helper.waitElementToDisappear(module.exports.sendMessageModal().locator());
};

const lastMessageText = () => {
  const last = element.all(by.css('#message-content li div.data>p>span')).last();
  return helper.getTextFromElement(last);
};

const clickLhsEntry = async (entryId, entryName) => {
  entryName = entryName || entryId;

  const liElement = await module.exports.messageInList(entryId);
  await helper.waitUntilReadyNative(liElement);
  expect(await element.all(liElement.locator()).count()).toBe(1);
  await liElement.click();

  return browser.wait(() => {
    const el = module.exports.messageDetailsHeader();
    if (helper.waitUntilReadyNative(el)) {
      return helper.getTextFromElement(el).then(text => {
        return text === entryName;
      });
    }
  }, 12000);
};

const enterCheckAndSelect = async (
  searchText,
  totalExpectedResults,
  entrySelector,
  entryText,
  existingEntryCount=0
) => {
  const selectionCount = await selectChoices.count();
  expect(selectionCount).toBe(existingEntryCount);

  const entry = await searchSelect2(
    searchText,
    totalExpectedResults,
    entrySelector,
    entryText
  );
  await entry.click();

  return browser.wait(() => {
    return  selectChoices.count()
      .then(utils.countOf(existingEntryCount + 1));
  }, 2000);
};

module.exports = {
  messageDetailsHeader: () => element(by.css('#message-header .name')),
  messageInList: identifier => element(by.css(`#message-list li[test-id="${identifier}"]`)),
  allMessages: () => element.all(by.css('#message-content li')),
  messageByIndex: index => element(by.css(`#message-list li:nth-child(${index})`)),
  messageText: text => element(by.css('#send-message textarea')).sendKeys(text),
  sendMessage: () => element(by.css('.general-actions .send-message')),
  sendMessageModal: () => element(by.id('send-message')),
  sendMessageMobalSubmit: () => module.exports.sendMessageModal().element(by.css('a.btn.submit:not(.ng-hide)')),
  messageRecipientSelect: () => element(by.css('#send-message input.select2-search__field')),
  exportData: ()=> {
    helper.waitUntilReady(exportButton);
    exportButton.click();
  },
  openSendMessageModal: async ()=> {
    await helper.clickElementNative(module.exports.sendMessage());
    await helper.waitElementToPresent(module.exports.sendMessageModal(), 5000);
    await helper.waitElementToBeVisible(module.exports.sendMessageModal(), 5000);
  },
  getSendMessageButton: ()=> {
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
