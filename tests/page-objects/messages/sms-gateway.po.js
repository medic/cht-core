const utils = require('../../utils');
const commonElements = require('../common/common.po');
const helper = require('../../helper');
const { browser, element } = require('protractor');

//page objects
const getState = (first, second) => {
  return element(by.css(
    `#reports-content .scheduled-tasks > ul > li:nth-child(${first}) > ul > li:nth-child(${second}) .task-state .state`
  ));
};
const  sentTask= element(by.css('#reports-content .details > ul .task-list .task-state .state'));

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

const getTaskState = element => {
  helper.waitUntilReady(element);
  return helper.getTextFromElement(element);
};

module.exports = {

  showMessageList : async () => {
    utils.resetBrowser();
    helper.clickElement(element(by.id('messages-tab')));

    // LHS
    helper.waitElementToPresent(
      element(by.css('#message-list li:first-child'))
    );
    browser.waitForAngular();
    helper.waitElementToBeVisible(
      element(by.css('#message-list li:first-child'))
    );
  },

  expectMessage: async (heading, summary) => {
    await expect(
      helper.getTextFromElement(
        element(by.css('#message-list li:first-child .heading h4'))
      )
    ).toBe(heading);
    await expect(
      helper.getTextFromElement(
        element(by.css('#message-list li:first-child .summary p'))
      )
    ).toBe(summary);
  },

  showMessageDetails: async () => {
    // RHS
    await helper.clickElement(
      element(by.css('#message-list li:first-child .summary'))
    );
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

  showReport : async () => {
    commonElements.goToReports();
    await helper.waitUntilReady(element(by.css('#reports-list li:first-child')));
    helper.clickElement(
      element(by.css('#reports-list li:first-child .heading'))
    );
    helper.waitElementToPresent(
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