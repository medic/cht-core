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
const sendMessage = () => $('.general-actions .send-message');
const sendMessageModal = () => $('#send-message');
const sendMessageModalSubmit = () => $('a.btn.submit:not(.ng-hide)');
const messageRecipientSelect = () => $('#send-message input.select2-search__field');
const contactNameSelector = () => $('.sender .name');
const exportButton = () => $('.mat-mdc-menu-content .mat-mdc-menu-item[test-id="export-messages"]');

const openSendMessageModal = async () => {
  await (await sendMessage()).waitForClickable();
  await (await sendMessage()).click();
  await (await sendMessageModal()).waitForDisplayed();
};
const submitMessage = async () => {
  await (await sendMessageModalSubmit()).waitForClickable();
  await (await sendMessageModalSubmit()).click();
};

const sendMessageToPhone = async (message, phone) => {
  await openSendMessageModal();
  await messageText(message);
  await searchSelect(phone);
  await submitMessage();
};

const searchSelect = async (searchText) => {
  await messageRecipientSelect().setValue(searchText);
  await (await contactNameSelector()).waitForClickable(5000);
  await (await contactNameSelector()).click();
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
  sendMessageToPhone,
};
