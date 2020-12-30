const utils = require('../../utils');
const commonElements = require('../common/common.po');
const helper = require('../../helper');
const { browser, element } = require('protractor');

//page objects        
const  sentTask= element(by.css('#reports-content .details > ul .task-list .task-state .state'));
   
const deliveredTask = element(by.css(
  '#reports-content .scheduled-tasks > ul > li:nth-child(1) > ul > li:nth-child(1) .task-state .state'));

const scheduledTask = element(by.css(
  '#reports-content .scheduled-tasks > ul > li:nth-child(1) > ul > li:nth-child(2) .task-state .state'));
      
const failedTask = element(by.css(
  '#reports-content .scheduled-tasks > ul > li:nth-child(2) > ul > li:nth-child(1) .task-state .state'));
    
const feedback = element(
  by.css('#reports-content .details > ul .task-list .task-state .state')
);

 
// scheduled tasks
// State for messageId2 is still forwarded-to-gateway
const message2State = element(by.css(
  '#reports-content .scheduled-tasks > ul > li:nth-child(1) > ul > li:nth-child(1) .task-state .state'));

const getTaskState = element => {
  helper.waitUntilReady(element);
  return helper.getTextFromElement(element);
}; 

module.exports = {
  pollSmsApi : body => {
    return utils.request({
      method: 'POST',
      path: '/api/sms',
      body: body
    });
  },

  showMessageList : () => {
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

  expectMessage: (heading, summary) => {
    expect(
      helper.getTextFromElement(
        element(by.css('#message-list li:first-child .heading h4'))
      )
    ).toBe(heading);
    expect(
      helper.getTextFromElement(
        element(by.css('#message-list li:first-child .summary p'))
      )
    ).toBe(summary);
  },

  showMessageDetails: () => {
    // RHS
    helper.clickElement(
      element(by.css('#message-list li:first-child .summary'))
    );
    helper.waitElementToBeVisible(
      element(
        by.css('#message-content li.incoming:first-child .data p:first-child')
      )
    );
    helper.waitElementToPresent(
      element(
        by.css('#message-content li.incoming:first-child .data p:first-child')
      )
    );
      
  },

  expectMessageDetails: (header, text, status) => {
    browser.waitForAngular();
    const messageHeader = helper.getTextFromElement(
      element(by.css('#message-header .name'))
    );
    const messageText = helper.getTextFromElement(
      element(
        by.css('#message-content li.incoming:first-child .data p:first-child')
      )
    );
    const messageStatus = helper.getTextFromElement(
      element(
        by.css(
          '#message-content li.incoming:first-child .data .state.received'
        )
      )
    );
    expect(messageHeader).toBe(header);
    expect(messageText).toBe(text);
    expect(messageStatus).toBe(status);
  },

  showReport : () => {
    commonElements.goToReports();
    helper.waitUntilReady(element(by.css('#reports-list li:first-child')));
    helper.clickElement(
      element(by.css('#reports-list li:first-child .heading'))
    );
    helper.waitElementToPresent(
      element(by.css('#reports-content .body .item-summary .icon'))
    );
    browser.waitForAngular();
  },

  sentTaskState :() => getTaskState(sentTask),
  
  deliveredTaskState :() => getTaskState(deliveredTask),
  
  scheduledTaskState :() => getTaskState(scheduledTask),

  failedTaskState :() => getTaskState(failedTask),

  feedbackState : () => getTaskState(feedback),

  messageState : () => getTaskState(message2State),

};
