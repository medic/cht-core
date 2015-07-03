var utils = require('../utils');

describe('Auditing', function() {

  'use strict';

  var savedUuid;

  beforeEach(function(done) {
    utils.saveDoc({
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
              timestamp: '2015-05-28T08:20:58.118Z'
            }
          ]
        }
      ],
      read: ['gareth'],
      kujua_message: true,
      type: 'data_record',
      sent_by: 'gareth'
    }).then(function(doc) {
      savedUuid = doc.id;
      done();
    });
  });

  it('audits a change', function() {

    utils.load('/#/messages/+64555555555');

    var selectedTab = element(by.css('.tabs .selected .button-label'));
    expect(selectedTab.getText()).toEqual('Messages');

    var newMessage = element(by.css('#message-content ul li[data-record-id="' + savedUuid + '"] .data p span'));
    expect(newMessage.getText()).toEqual('hello!');

    var deleteIcon = element(by.css('#message-content ul li[data-record-id="' + savedUuid + '"] .fa-trash-o'));
    browser.actions().mouseMove(deleteIcon).perform();
    deleteIcon.click();

    var confirmButton = element(by.css('#delete-confirm .submit'));
    browser.wait(protractor.ExpectedConditions.elementToBeClickable(confirmButton), 5000);
    confirmButton.click();

    // TODO find a better way to wait for DB to update
    browser.sleep(1000);

    var flow = protractor.promise.controlFlow();
    
    flow.execute(function() {
      return utils.getDoc(savedUuid);
    }).then(function(doc) {
      expect(doc.error).toEqual('not_found');
      expect(doc.reason).toEqual('deleted');
    });

    flow.execute(function() {
      return utils.getAuditDoc(savedUuid);
    }).then(function(viewResult) {
      var doc = viewResult.rows[0].doc;
      expect(doc.history.length).toEqual(2);
      expect(doc.history[1].action).toEqual('delete');
      expect(doc.history[1].user).toEqual('gareth');
      expect(doc.history[1].doc._deleted).toEqual(true);
    });

  });
});

