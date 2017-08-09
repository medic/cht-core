const utils = require('../utils'),
      auth = require('../auth')(),
      commonElements = require('../page-objects/common/common.po.js');

describe('Auditing', () => {

  'use strict';

  const message = {
    errors: [],
    form: null,
    from: '0211111111',
    reported_date: 1432801258088,
    tasks: [
      {
        messages: [
          {
            from: '0211111111',
            sent_by: 'gareth',
            to: '+64555555555',
            message: 'hello!',
            uuid: '0a2bda49-7b12-67ce-c9140a6e14007c7a'
          }
        ],
        state: 'pending',
        state_history: [
          {
            state: 'pending',
            timestamp: (new Date()).toISOString()
          }
        ]
      }
    ],
    kujua_message: true,
    type: 'data_record',
    sent_by: 'gareth'
  };

  let savedUuid;
  beforeEach(done => {
    utils.saveDoc(message)
      .then(doc => {
        savedUuid = doc.id;
        browser.waitForAngular().then(done);
      }, err => {
        console.error('Error saving doc', err);
        done();
      });
  });

  afterEach(utils.afterEach);

  it('audits message deletion', () => {

    // reload messages tab page (changes feeds are disabled)
    commonElements.goToReports();
    browser.sleep(100);
    element(by.id('messages-tab')).click();

    // check selected tab
    const selectedTab = element(by.css('.tabs .selected .button-label'));
    expect(selectedTab.getText()).toEqual('Messages');

    let listitem = element(by.css('.inbox-items li[data-record-id="+64555555555"]'));
    browser.wait(() => {
      return listitem.isPresent();
    }, 5000);

    // mark item read
    listitem.click();
    browser.sleep(1000);

    // reload messages tab page (changes feeds are disabled)
    commonElements.goToReports();
    browser.sleep(100);
    element(by.id('messages-tab')).click();

    // check message is displayed correctly
    listitem = element(by.css('.inbox-items li[data-record-id="+64555555555"]'));
    browser.wait(() => {
      return listitem.isPresent();
    }, 5000);
    listitem.click();
    const newMessage = element(by.css('#message-content ul li[data-record-id="' + savedUuid + '"] .data p span'));
    browser.wait(() => {
      return newMessage.isPresent();
    }, 5000);
    expect(newMessage.getText()).toEqual('hello!');

    // delete the message
    newMessage.click();
    element(by.css('#message-content ul li[data-record-id="' + savedUuid + '"] .fa-trash-o')).click();
    const confirmButton = element(by.css('#delete-confirm .submit:not(.ng-hide)'));
    browser.wait(protractor.ExpectedConditions.elementToBeClickable(confirmButton), 5000);
    confirmButton.click();

    // TODO find a better way to wait for DB to update
    browser.sleep(1000);

    const flow = protractor.promise.controlFlow();

    // check the doc is deleted
    flow.execute(() => {
      return utils.getDoc(savedUuid);
    }).then(() => {
      // should not be found!
      expect(true).toEqual(false);
    }, () => {
      // expected
    });

    // check the audit doc is updated
    flow.execute(() => {
      return utils.getAuditDoc(savedUuid);
    }).then(doc => {
      expect(doc.history.length).toEqual(1);
      expect(doc.history[0].user).toEqual(auth.user);
      expect(doc.history[0].doc._deleted).toEqual(true);
    }, err => {
      console.error('Error fetching audit doc', err);
      expect(true).toEqual(false);
    });

  });
});
