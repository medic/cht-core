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
  return helper.getTextFromElement(element);
};

module.exports = {

  showMessageList :  async () => {
    await utils.resetBrowser();
    await helper.clickElement(element(by.id('messages-tab')));

    // LHS
    helper.waitElementToPresent(messagePo.messageByIndex(1));
    await browser.waitForAngular();
    helper.waitElementToBeVisible(messagePo.messageByIndex(1));
  },

  messageHeading: (index) => messagePo.messageByIndex(index).element(by.css('.heading h4')),
  messageSummary: (index) => messagePo.messageByIndex(index).element(by.css('.summary p')),
  
  incomingData,
  messageDetailStatus: () =>  element(by.css('#message-content li.incoming:first-child .data .state.received')),

  showMessageDetails: async () => {
    // RHS
    const message = messagePo.messageByIndex(1);
    await helper.clickElement(message.element(by.css('.summary')));
    helper.waitElementToBeVisible(incomingData);
  },

  showReport : async (reportId) => {
    await commonElements.goToReportsNative();
    const report = reportsPo.reportByUUID(reportId);
    await helper.waitUntilReadyNative(report);
    await report.click();
    await helper.waitElementToPresent(
      element(by.css('#reports-content .body .item-summary .icon'))
    );
  },

  getTaskState,
  getState,

  sentTaskState: async () => await getTaskState(sentTask),
  feedbackState: async () => await getTaskState(feedback),
};
