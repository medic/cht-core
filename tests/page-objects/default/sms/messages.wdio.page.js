const commonPage = require('@page-objects/default/common/common.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const sentinelUtils = require('@utils/sentinel');

const MESSAGES_LIST = '#message-list';
const MESSAGE_HEADER = '#message-header';
const MESSAGE_CONTENT = '#message-content';
const SEND_MESSAGE_MODAL = '#send-message';
const MESSAGE_FOOTER = '#message-footer';

// Debug helper for diagnosing flaky stale-element clicks.
// Installs a MutationObserver on `watchSelector` before clicking, then on click
// failure dumps recent mutations, the watched container's HTML, and a screenshot.
// Remove once the flake is understood.
const debugClick = async (getter, label, watchSelector) => {
  if (watchSelector) {
    await browser.execute((sel) => {
      try { window.__dbgObs && window.__dbgObs.disconnect(); } catch (e) { /* noop */ }
      window.__dbgLog = [];
      const root = document.querySelector(sel);
      if (!root) {
        window.__dbgLog.push({ note: 'watch root not found', sel });
        return;
      }
      const desc = (n) => {
        if (!n) {
          return null;
        }
        const cls = n.className && n.className.toString ? n.className.toString().slice(0, 60) : '';
        return `${n.nodeName}${n.id ? '#' + n.id : ''}${cls ? '.' + cls.replace(/\s+/g, '.') : ''}`;
      };
      const obs = new MutationObserver((muts) => {
        const t = Date.now();
        for (const m of muts) {
          window.__dbgLog.push({
            t,
            type: m.type,
            target: desc(m.target),
            attr: m.attributeName || undefined,
            added: Array.from(m.addedNodes).map(desc),
            removed: Array.from(m.removedNodes).map(desc),
          });
        }
        if (window.__dbgLog.length > 500) {
          window.__dbgLog.splice(0, window.__dbgLog.length - 500);
        }
      });
      obs.observe(root, { childList: true, subtree: true, attributes: true, characterData: true });
      window.__dbgObs = obs;
    }, watchSelector);
  }

  const start = Date.now();
  let element;
  try {
    element = await getter();
  } catch (err) {
    console.log(`[debugClick:${label}] getter failed: ${err.message}`);
    throw err;
  }

  let preInfo = '?';
  try {
    const tag = await element.getTagName();
    const text = (await element.getText()).slice(0, 80);
    const exists = await element.isExisting();
    const displayed = exists ? await element.isDisplayed() : false;
    preInfo = `<${tag}> exists=${exists} displayed=${displayed} text="${text}"`;
  } catch (e) {
    preInfo = `(pre-info failed: ${e.message})`;
  }
  console.log(`[debugClick:${label}] pre-click: ${preInfo}`);

  try {
    await element.click();
    console.log(`[debugClick:${label}] click OK after ${Date.now() - start}ms`);
  } catch (err) {
    console.log(`[debugClick:${label}] CLICK FAILED after ${Date.now() - start}ms: ${err.message}`);

    if (watchSelector) {
      try {
        const log = await browser.execute(() => window.__dbgLog || []);
        console.log(`[debugClick:${label}] mutations during click attempt (${log.length} total, showing last 40):`);
        for (const e of log.slice(-40)) {
          console.log(`  ${JSON.stringify(e)}`);
        }
        const html = await browser.execute((sel) => {
          const el = document.querySelector(sel);
          return el ? el.outerHTML.slice(0, 4000) : 'NOT FOUND';
        }, watchSelector);
        console.log(`[debugClick:${label}] watched container (${watchSelector}) outerHTML (truncated):\n${html}`);
      } catch (e) {
        console.log(`[debugClick:${label}] mutation log fetch failed: ${e.message}`);
      }
    }

    try {
      const path = `/tmp/debugclick-${label.replace(/\W+/g, '_')}-${Date.now()}.png`;
      await browser.saveScreenshot(path);
      console.log(`[debugClick:${label}] screenshot saved to ${path}`);
    } catch (e) {
      console.log(`[debugClick:${label}] screenshot failed: ${e.message}`);
    }

    throw err;
  }
};

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
  await messageInList(identifier).waitForStable();
  await debugClick(() => messageInList(identifier), `messageInList[${identifier}]`, MESSAGES_LIST);
  await $(MESSAGE_CONTENT).waitForDisplayed();
};

const getMessageInListDetails = async (identifier) => {
  const lineageValue = await messageInList(identifier).$('.horizontal.lineage').isExisting() ?
    await messageInList(identifier).$('.horizontal.lineage').getText() : '';
  return {
    heading: await messageInList(identifier).$('.heading h4').getText(),
    summary: await messageInList(identifier).$('.summary').getText(),
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

const getLastMessageContent = async () => {
  const sms = () => $(`${MESSAGE_CONTENT} li:last-child`);
  return {
    content: await sms().$('p[test-id="sms-content"]').getText(),
    state: await sms().$('.state').getText(),
    dataId: await sms().getAttribute('data-id'),
  };
};

const getMessageContent = async (index = 1) => {
  const sms = () => $(`${MESSAGE_CONTENT} li:nth-child(${index})`);
  return {
    content: await sms().$('p[test-id="sms-content"]').getText(),
    state: await sms().$('.state').getText(),
    dataId: await sms().getAttribute('data-id'),
  };
};

const searchSelect = async (recipient, option) => {
  await recipientField().setValue(recipient);
  await $('.loading-results').waitForDisplayed({ reverse: true });
  await debugClick(
    () => $('.select2-results__options').$(`.*=${option}`),
    `select2-result[${option}]`,
    '.select2-results'
  );
  await browser.waitUntil(async () => await $('.select2-selection__choice').isDisplayed(), 1000);
};

const debugModalSubmit = async (label) => {
  await modalPage.checkModalIsOpen();
  await debugClick(
    () => $('mm-modal-layout .modal-footer button[test-id="submit"]'),
    `modalSubmit[${label}]`,
    'mm-modal-layout'
  );
  await modalPage.checkModalHasClosed();
};

const sendMessage = async (message, recipient, entryText) => {
  await sendMessageModal().waitForDisplayed();
  await searchSelect(recipient, entryText);
  await messageText().setValue(message);
  await debugModalSubmit(`sendMessage:${recipient}`);
  await sentinelUtils.waitForSentinel();
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
  await debugModalSubmit(`sendReplyNewRecipient:${recipient}`);
  await sentinelUtils.waitForSentinel();
};

const sendMessageToContact = async (message) => {
  await messageText().setValue(message);
  await modalPage.submit();
  await modalPage.checkModalHasClosed();
  await sentinelUtils.waitForSentinel();
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
  await sentinelUtils.waitForSentinel();
};

const replyAddRecipients = async (message) => {
  await replyMessage().setValue(message);
  await replyMessageActions().waitForExist();
  await debugClick(() => addRecipient(), 'addRecipient', MESSAGE_FOOTER);
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
  getLastMessageContent,
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
