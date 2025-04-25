const commonPage = require('@page-objects/default/common/common.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');

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
  const message = messageInList(identifier);
  await message.click();
};

const getMessageInListDetails = async (identifier) => {
  const sms = messageInList(identifier);
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
  await $(`${MESSAGE_HEADER} a.name`).click();
  await commonPage.waitForPageLoaded();
};

const getMessageContent = async (index = 1) => {
  const sms = $(`${MESSAGE_CONTENT} li:nth-child(${index})`);
  await sms.waitForDisplayed();
  return {
    content: await sms.$('p[test-id="sms-content"]').getText(),
    state: await sms.$('.state').getText(),
    dataId: await sms.getAttribute('data-id'),
  };
};

const searchSelect = async (recipient, option) => {
  await recipientField().setValue(recipient);
  await $('.loading-results').waitForDisplayed({ reverse: true });
  const selection = $('.select2-results__options').$(`.*=${option}`);
  await selection.click();
  await browser.waitUntil(async () => await $('.select2-selection__choice').isDisplayed(), 1000);
};

const sendMessage = async (message, recipient, entryText) => {
  await sendMessageModal().waitForDisplayed();
  await searchSelect(recipient, entryText);
  await messageText().setValue(message);
  await modalPage.submit();
  await modalPage.checkModalHasClosed();
};

const sendMessageDesktop = async (message, recipient, entryText) => {
  await commonPage.clickFastActionFlat({ waitForList: false });
  await sendMessage(message, recipient, entryText);
};

const sendMessageOnMobile = async (message, recipient, entryText) => {
  await commonPage.clickFastActionFAB({ waitForList: false });
  await sendMessage(message, recipient, entryText);
};

const sendReplyNewRecipient = async (recipient, entryText) => {
  await searchSelect(recipient, entryText);
  await modalPage.submit();
  await modalPage.checkModalHasClosed();
};

const sendMessageToContact = async (message) => {
  await messageText().setValue(message);
  await modalPage.submit();
  await modalPage.checkModalHasClosed();
};

const exportMessages = async () => {
  await commonPage.openMoreOptionsMenu();
  await exportButton().click();
};

const getMessageLoadingStatus = async () => {
  await messagesLoadingStatus().waitForDisplayed();
  return await messagesLoadingStatus().getText();
};

const sendReply = async (message) => {
  const numberOfMessages = await getAmountOfMessagesByPhone();
  await replyMessage().setValue(message);
  await replyMessageActions().waitForExist();
  await submitReplyBtn().click();
  await browser.waitUntil(async () => await getAmountOfMessagesByPhone() > numberOfMessages);
};

const replyAddRecipients = async (message) => {
  await replyMessage().setValue(message);
  await replyMessageActions().waitForExist();
  await addRecipient().click();
  await sendMessageModal().waitForDisplayed();
};

const getAmountOfMessagesByPhone = async () => {
  await $(MESSAGE_CONTENT).waitForDisplayed();
  const listedMessages = await messages();
  return listedMessages.length;
};

const getMessagesModalDetails = async () => {
  await sendMessageModal().waitForDisplayed();
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
  sendMessageDesktop,
  sendMessageOnMobile,
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
