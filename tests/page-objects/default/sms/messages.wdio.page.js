const commonPage = require('../common/common.wdio.page');
const modalPage = require('../common/modal.wdio.page');

const MESSAGES_LIST = '#message-list';
const MESSAGE_HEADER = '#message-header';
const MESSAGE_CONTENT = '#message-content';
const SEND_MESSAGE_MODAL = '#send-message';
const MESSAGE_FOOTER = '#message-footer';

const messageInList = identifier => $(`${MESSAGES_LIST} li[test-id="${identifier}"]`);
const messagesListLeftPanel = () => $$(`${MESSAGES_LIST} li.content-row`);
const messagesLoadingStatus = () => $(`${MESSAGES_LIST} .loading-status`);
const sendMessageModal = () => $(SEND_MESSAGE_MODAL);
const messageText = () => $(`${SEND_MESSAGE_MODAL} textarea[name="message"]`);
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
  const lineageValue = await sms.$('.horizontal.lineage').isExisting() ?
    await sms.$('.horizontal.lineage').getText() : '';
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
    lineage: await $(`${MESSAGE_HEADER} .horizontal.lineage`).getText(),
  };
};

const navigateFromConversationToContact = async () => {
  await $(`${MESSAGE_HEADER} a.name`).waitForClickable();
  await $(`${MESSAGE_HEADER} a.name`).click();
  await commonPage.waitForPageLoaded();
};

const getMessageContent = async  (index = 1) => {
  const sms = await $(`${MESSAGE_CONTENT} li:nth-child(${index})`);
  await sms.waitForDisplayed();
  return {
    content: await sms.$('p[test-id="sms-content"]').getText(),
    state: await sms.$('.state').getText(),
    dataId: await sms.getAttribute('data-id'),
  };
};

const searchSelect = async (recipient, option) => {
  await (await recipientField()).setValue(recipient);
  await (await $('.loading-results')).waitForDisplayed({ reverse: true });
  const selection = await (await $('.select2-results__options')).$(`.*=${option}`);
  await selection.click();
  await browser.waitUntil(async () => await (await $('.select2-selection__choice')).isDisplayed(),  1000);
};

const sendMessage = async (message, recipient, entryText) => {
  await commonPage.clickFastActionFlat({ waitForList: false });
  await (await sendMessageModal()).waitForDisplayed();
  await searchSelect(recipient, entryText);
  await (await messageText()).setValue(message);
  await modalPage.submit();
  await modalPage.checkModalHasClosed();
};

const sendReplyNewRecipient = async (recipient, entryText) => {
  await searchSelect(recipient, entryText);
  await modalPage.submit();
  await modalPage.checkModalHasClosed();
};

const sendMessageToContact = async (message) => {
  await (await messageText()).setValue(message);
  await modalPage.submit();
  await modalPage.checkModalHasClosed();
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
  const numberOfMessages = await getAmountOfMessagesByPhone();
  await (await replyMessage()).setValue(message);
  await (await replyMessageActions()).waitForExist();
  await (await submitReplyBtn()).waitForClickable();
  await (await submitReplyBtn()).click();
  await browser.waitUntil(async () => await getAmountOfMessagesByPhone() > numberOfMessages);
};

const replyAddRecipients = async (message) => {
  await (await replyMessage()).setValue(message);
  await (await replyMessageActions()).waitForExist();
  await (await addRecipient()).waitForClickable();
  await (await addRecipient()).click();
  await (await sendMessageModal()).waitForDisplayed();
};

const getAmountOfMessagesByPhone = async () => {
  await (await $(MESSAGE_CONTENT)).waitForDisplayed();
  const listedMessages = (await messages());
  return listedMessages.length;
};

const getMessagesModalDetails = async () => {
  await (await sendMessageModal()).waitForDisplayed();
  return {
    recipient: await $(`${SEND_MESSAGE_MODAL} .select2-selection__choice`).getText(),
    message: await messageText().getValue(),
  };
};

module.exports = {
  openMessage,
  getMessageInListDetails,
  getMessageHeader,
  getMessageContent,
  sendMessage,
  sendReplyNewRecipient,
  sendMessageToContact,
  exportMessages,
  messagesListLeftPanel,
  getMessageLoadingStatus,
  sendReply,
  replyAddRecipients,
  getAmountOfMessagesByPhone,
  navigateFromConversationToContact,
  getMessagesModalDetails,
};
