const utils = require('../../utils');
const commonElements = require('../common/common.po');
const messagePo = require('../messages/messages.po');
const reportsPo = require('../reports/reports.po');
const helper = require('../../helper');
const { browser, element } = require('protractor');

//page objects
const getState = (first, second) => {
  return element(by.css(
    `#reports-content .scheduled-tasks > ul > li:nth-child(${first}) > ul > li:nth-child(${second}) .task-state .state`
  ));
};
const  sentTask = element(by.css('#reports-content .details > ul .task-list .task-state .state'));
const feedback = element(
  by.css('#reports-content .details > ul .task-list .task-state .state')
);

const incomingData = element(by.css('#message-content li.incoming:first-child .data p:first-child'));

// scheduled tasks
// State for messageId2 is still forwarded-to-gateway

const getTaskState = async element => {
  await helper.waitUntilReadyNative(element);
  return helper.getTextFromElementNative(element);
};

module.exports = {

  showMessageList :  async () => {
    await utils.resetBrowser();
    await helper.clickElementNative(element(by.id('messages-tab')));

    // LHS
    await helper.waitElementToPresentNative(messagePo.messageByIndex(1));
    await browser.waitForAngular();
    await helper.waitElementToBeVisibleNative(messagePo.messageByIndex(1));
  },

  messageHeading: (index) => messagePo.messageByIndex(index).element(by.css('.heading h4')),
  messageSummary: (index) => messagePo.messageByIndex(index).element(by.css('.summary p')),
  messageDetailsHeader: () => element(by.css('#message-header .name')),
  incomingData,
  messageDetailStatus: () =>  element(by.css('#message-content li.incoming:first-child .data .state.received')),

  showMessageDetails: async () => {
    // RHS
    const message = messagePo.messageByIndex(1);
    await helper.clickElementNative(message.element(by.css('.summary')));
    await helper.waitElementToBeVisibleNative(incomingData);
  },

  showReport : async (reportId) => {
    await commonElements.goToReportsNative();
    const report = reportsPo.reportByUUID(reportId);
    await helper.waitUntilReadyNative(report);
    await report.click();
    await helper.waitElementToPresentNative(
      element(by.css('#reports-content .body .item-summary .icon'))
    );
  },

  getTaskState,
  getState,

  sentTaskState: async () => await getTaskState(sentTask),
  feedbackState: async () => await getTaskState(feedback),
};
