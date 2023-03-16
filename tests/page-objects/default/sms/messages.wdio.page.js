const commonElements = require('../common/common.wdio.page');

// LHS Elements
const messageByIndex = index => $(`#message-list li:nth-child(${index})`);
const messageInList = identifier => $(`#message-list li[test-id="${identifier}"]`);
const messagesList = () => $('#message-list');
const waitForMessagesInLHS = async () => await browser.waitUntil(
  async () => await (await messageByIndex(1)).waitForDisplayed(),
  5000,
  { timeoutMsg: 'Failed waiting for the first left hand side message' });

const listMessageHeading = (listElement) => listElement.$('.heading h4');
const listMessageSummary = (listElement) => listElement.$('.summary p');
const listMessageLineage = (listElement) => listElement.$('.detail');

// RHS Elements
const messageDetailsHeader = () => $('#message-header .name');

const clickLhsEntry = async (entryId, entryName) => {
  entryName = entryName || entryId;
  await (await messageInList(entryId)).click();
  return browser.waitUntil(async () => {
    await (await messageDetailsHeader()).waitForDisplayed();
    const text = await (await messageDetailsHeader()).getText();
    return text === entryName;
  }, 2000);
};
const messageContentIndex = (index = 1) => $(`#message-content li:nth-child(${index})`);
const messageContentText = (messageContentElement) => messageContentElement.$('.data p:first-child');
const messageDetailStatus = async () => (await messageContentIndex()).$('.data .state.received');

const messageText = text => $('#send-message textarea').setValue(text);
const sendMessageButton = () => $('.general-actions .send-message');
const sendMessageModal = () => $('#send-message');
const sendMessageModalSubmit = () => $('a.btn.submit:not(.ng-hide)');
const recipientField = () => $('#send-message input.select2-search__field');
const exportButton = () => $('.mat-menu-content .mat-menu-item[test-id="export-messages"]');
const lastMessageText = () => $('#message-content li:first-child span[test-id="sms-content"]').getText();

const selectOptions = '.select2-results__option';
const contactNameSelector = '.sender .name';

const openSendMessageModal = async () => {
  await (await sendMessageButton()).waitForClickable();
  await (await sendMessageButton()).click();
  await (await sendMessageModal()).waitForDisplayed();
};
const submitMessage = async () => {
  await (await sendMessageModalSubmit()).waitForClickable();
  await (await sendMessageModalSubmit()).click();
};

const sendMessage = async (message, recipient, entrySelector, entryText) => {
  await openSendMessageModal();
  await messageText(message);
  await searchSelect(recipient, entrySelector, entryText);
  await submitMessage();
  await commonElements.waitForPageLoaded();
};

const searchSelect = async (recipient, entrySelector, entryText) => {
  await recipientField().setValue(recipient);
  //Selector needs review, not sure how it works :S test
  const recipientOption = $(`${selectOptions} ${entrySelector}`).$(`//*[text()='${entryText}']`);
  await recipientOption.waitForDisplayed();
  await (await recipientOption).click();
};

const exportMessages = async () => {
  await commonElements.openMoreOptionsMenu();
  await (await exportButton()).waitForClickable();
  await (await exportButton()).click();
};

module.exports = {
  exportMessages,
  messageByIndex,
  waitForMessagesInLHS,
  listMessageHeading,
  listMessageSummary,
  listMessageLineage,
  clickLhsEntry,
  messageDetailsHeader,
  messageContentText,
  messageContentIndex,
  messageDetailStatus,
  messagesList,
  openSendMessageModal,
  messageText,
  submitMessage,
  searchSelect,
  sendMessage,
  lastMessageText,
  contactNameSelector,
};
