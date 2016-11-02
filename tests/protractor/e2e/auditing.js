var utils = require('../utils'),
    environment = require('../auth')();

describe('Auditing', function() {

  'use strict';

  var message = {
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

  var savedUuid;
  beforeEach(function(done) {
    browser.ignoreSynchronization = true;
    utils.saveDoc(message)
      .then(function(doc) {
        savedUuid = doc.id;
        browser.waitForAngular().then(done);
      }, function(err) {
        console.error('Error saving doc', err);
        done();
      });
  });

  afterEach(function(done) {
    utils.deleteDoc(savedUuid)
      .then(done, done);
  });

  it('audits message deletion', function() {

    // reload messages tab page (changes feeds are disabled)
    element(by.id('reports-tab')).click();
    browser.sleep(100);
    element(by.id('messages-tab')).click();

    // check selected tab
    var selectedTab = element(by.css('.tabs .selected .button-label'));
    expect(selectedTab.getText()).toEqual('Messages');

    var listitem = element(by.css('.inbox-items li[data-record-id="+64555555555"]'));
    browser.wait(function() {
      return browser.isElementPresent(listitem);
    }, 5000);

    // mark item read
    listitem.click();
    browser.sleep(1000);

    // reload messages tab page (changes feeds are disabled)
    element(by.id('reports-tab')).click();
    browser.sleep(100);
    element(by.id('messages-tab')).click();

    // check message is displayed correctly
    listitem = element(by.css('.inbox-items li[data-record-id="+64555555555"]'));
    browser.wait(function() {
      return browser.isElementPresent(listitem);
    }, 5000);
    listitem.click();
    var newMessage = element(by.css('#message-content ul li[data-record-id="' + savedUuid + '"] .data p span'));
    expect(newMessage.getText()).toEqual('hello!');

    // delete the message
    newMessage.click();
    element(by.css('#message-content ul li[data-record-id="' + savedUuid + '"] .fa-trash-o')).click();
    var confirmButton = element(by.css('#delete-confirm .submit'));
    browser.wait(protractor.ExpectedConditions.elementToBeClickable(confirmButton), 5000);
    confirmButton.click();

    // TODO find a better way to wait for DB to update
    browser.sleep(1000);

    var flow = protractor.promise.controlFlow();

    // check the doc is deleted
    flow.execute(function() {
      return utils.getDoc(savedUuid);
    }).then(function(doc) {
      expect(doc.error).toEqual('not_found');
      expect(doc.reason).toEqual('deleted');
    }, function(err) {
      console.error('Error fetching doc', err);
      expect(true).toEqual(false);
    });

    // check the audit doc is updated
    flow.execute(function() {
      return utils.getAuditDoc(savedUuid);
    }).then(function(doc) {
      expect(doc.history.length).toEqual(2);
      expect(doc.history[1].action).toEqual('delete');
      expect(doc.history[1].user).toEqual(environment.user);
      expect(doc.history[1].doc._deleted).toEqual(true);
    }, function(err) {
      console.error('Error fetching audit doc', err);
      expect(true).toEqual(false);
    });

  });
});

