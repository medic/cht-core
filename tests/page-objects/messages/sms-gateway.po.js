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

const deliveredTask = getState(1,1);

const scheduledTask = getState(1,2);

const failedTask = getState(2,1);

const feedback = element(
  by.css('#reports-content .details > ul .task-list .task-state .state')
);

const incomingData = element(by.css('#message-content li.incoming:first-child .data p:first-child'));

// scheduled tasks
// State for messageId2 is still forwarded-to-gateway
const message2State = getState(1,1);

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

  expectMessage: async (heading, summary) => {
    const message = messagePo.messageByIndex(1);
    expect(await helper.getTextFromElement(message.element(by.css('.heading h4')))).toBe(heading);
    expect(await helper.getTextFromElement(message.element(by.css('.summary p')))).toBe(summary);
  },

  showMessageDetails: async () => {
    // RHS
    const message = messagePo.messageByIndex(1);
    await helper.clickElement(message.element(by.css('.summary')));
    helper.waitElementToBeVisible(incomingData);
  },

  expectMessageDetails: async (header, text, status) => {
    browser.waitForAngular();
    const messageHeader = await helper.getTextFromElement(
      element(by.css('#message-header .name'))
    );
    const messageText = helper.getTextFromElement(incomingData);
    const messageStatus = helper.getTextFromElement(
      element(
        by.css(
          '#message-content li.incoming:first-child .data .state.received'
        )
      )
    );
    await expect(messageHeader).toBe(header);
    await expect(messageText).toBe(text);
    await expect(messageStatus).toMatch(status);
  },

  showReport : async (reportId) => {
    await commonElements.goToReportsNative();
    const report = reportsPo.reportByUUID(reportId).first();
    console.log(report.locator());
    await helper.waitUntilReadyNative(report);
    await report.click();
    await helper.waitElementToPresent(
      element(by.css('#reports-content .body .item-summary .icon'))
    );
  },

  sentTaskState : async () => await getTaskState(sentTask),

  deliveredTaskState : async () => await getTaskState(deliveredTask),

  scheduledTaskState : async () => await getTaskState(scheduledTask),

  failedTaskState : async () => await getTaskState(failedTask),

  feedbackState : async () => await getTaskState(feedback),

  messageState : async () => await getTaskState(message2State),

};
