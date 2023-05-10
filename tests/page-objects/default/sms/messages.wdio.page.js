const commonPage = require('../common/common.wdio.page');

const MESSAGES_LIST = '#message-list';
const MESSAGE_HEADER = '#message-header';
const MESSAGE_CONTENT = '#message-content';
const SEND_MESSAGE_MODAL = '#send-message';
const MESSAGE_FOOTER = '#message-footer';

const messageInList = identifier => $(`${MESSAGES_LIST} li[test-id="${identifier}"]`);
const messagesList = () => $$(`${MESSAGES_LIST} li.content-row`);
const messagesLoadingStatus = () => $('#message-list .loading-status');
const messageDetailsHeader = () => $('#message-header .name');
const messageText = () => $(`${SEND_MESSAGE_MODAL} textarea[name="message"]`);
const sendMessageModalSubmit = () => $(`${SEND_MESSAGE_MODAL} a.btn.submit:not(.ng-hide)`);
const recipientField = () => $(`${SEND_MESSAGE_MODAL} input.select2-search__field`);
const exportButton = () => $('.mat-mdc-menu-content .mat-mdc-menu-item[test-id="export-messages"]');
const replyMessage = () => $(`${MESSAGE_FOOTER} textarea[name="message"]`);
const replyMessageActions = () => $(`${MESSAGE_FOOTER} .message-actions`);
const addRecipient = () => replyMessageActions().$('.btn-add-recipients');
const submitReplyBtn = () => replyMessageActions().$('.submit');
const messages = () => $$(`${MESSAGE_CONTENT} li`);

const openMessage = async (identifier) => {
  const message = await messageInList(identifier);
  await message.waitForClickable();
  await message.click();
};

const getMessageInListDetails = async (identifier) => {
  const sms = await messageInList(identifier);
  const lineageValue = await sms.$('.lineage').isExisting() ?
    await $(`${MESSAGE_HEADER} .horizontal.lineage`).getText() : '';
  return {
    heading: await sms.$('.heading h4').getText(),
    summary: await sms.$('.summary').getText(),
    lineage: lineageValue,
  };
};

const getMessageHeader = async () => {
  return {
    name: await $(`${MESSAGE_HEADER} .name`).getText(),
    phone: await $(`${MESSAGE_HEADER} .phone`).getText(),
    lineage: await $(`${MESSAGE_HEADER} .horizontal.lineage`).getText()
  };
};

const getMessageContent = async  (index = 1) => {
  const sms = await $(`${MESSAGE_CONTENT} li:nth-child(${index})`);
  return {
    content: await sms.$('p[test-id="sms-content"]').getText(),
    state: await sms.$('.state').getText(),
  };
};

const searchSelect = async (recipient, option) => {
  await (await recipientField()).setValue(recipient);
  const recipientOption = await (await $('.select2-results__options')).$(`//*[text()='${option}']`);
  await recipientOption.waitForClickable();
  await (await recipientOption).click();
};


const sendMessage = async (message, recipient, entryText) => {
  await commonPage.clickFastActionFlat({ waitForList: false });
  await (await $(SEND_MESSAGE_MODAL)).waitForDisplayed();
  await searchSelect(recipient, entryText);
  await (await messageText()).setValue(message);
  await (await sendMessageModalSubmit()).waitForClickable();
  await (await sendMessageModalSubmit()).click();
  await $(SEND_MESSAGE_MODAL).waitForDisplayed({ reverse: true });
};

const sendReplyNewRecipient = async (recipient, entryText) => {
  await searchSelect(recipient, entryText);
  await (await sendMessageModalSubmit()).waitForClickable();
  await (await sendMessageModalSubmit()).click();
  await $(SEND_MESSAGE_MODAL).waitForDisplayed({ reverse: true });
};

const sendMessageToContact = async (message) => {
  await (await messageText()).setValue(message);
  await (await sendMessageModalSubmit()).waitForClickable();
  await (await sendMessageModalSubmit()).click();
  await $(SEND_MESSAGE_MODAL).waitForDisplayed({ reverse: true });
};

const exportMessages = async () => {
  await commonPage.openMoreOptionsMenu();
  await (await exportButton()).waitForClickable();
  await (await exportButton()).click();
};

const getMessageLoadingStatus = async () => {
  await (await messagesLoadingStatus()).waitForDisplayed();
  return await (await messagesLoadingStatus()).getText();
};

const sendReply = async (message) => {
  await (await replyMessage()).setValue(message);
  await (await replyMessageActions()).waitForExist();
  await (await submitReplyBtn()).waitForClickable();
  await (await submitReplyBtn()).click();
};

const replyAddRecipients = async (message) => {
  await (await replyMessage()).setValue(message);
  await (await replyMessageActions()).waitForExist();
  await (await addRecipient()).waitForClickable();
  await (await addRecipient()).click();
  await (await $(SEND_MESSAGE_MODAL)).waitForDisplayed();
};

const getAmountOfMessages = async () => {
  await (await $(MESSAGE_CONTENT)).waitForDisplayed();
  const listedMessages = (await messages());
  return listedMessages.length;
};

const getMessagesModalDetails = async () => {
  await (await $(SEND_MESSAGE_MODAL)).waitForDisplayed();
  return {
    recipient: await (await $(`${SEND_MESSAGE_MODAL} .select2-selection__choice`)).getText(),
    message: await (await messageText()).getAttribute('ng-reflect-model'),
  };
};

module.exports = {
  //messageByIndex,
  openMessage,
  getMessageInListDetails,
  getMessageHeader,
  getMessageContent,
  sendMessage,
  sendReplyNewRecipient,
  sendMessageToContact,
  exportMessages,
  messageDetailsHeader,
  messagesList,
  messageText,
  getMessageLoadingStatus,
  sendReply,
  replyAddRecipients,
  getAmountOfMessages,
  getMessagesModalDetails,
};
