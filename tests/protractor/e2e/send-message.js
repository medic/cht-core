var utils = require('../utils'),
    _ = require('underscore');

describe('Send message', function() {
  'use strict';

  var RAW_PH = '+447765902000';
  var ANOTHER_RAW_PH = '+557765902000';

  var ALICE = {
    _id: 'alice-contact',
    type: 'person',
    name: 'Alice Alison',
    phone: '+447765902001'
  };
  var BOB_PLACE = {
    _id: 'bob-contact',
    type: 'clinic',
    name: 'Bob Place'
  };
  var CAROL = {
    _id: 'carol-contact',
    type: 'person',
    name: 'Carol Carolina',
    parent: BOB_PLACE
  };
  var DAVID = {
    _id: 'david-contact',
    type: 'person',
    name: 'David Davidson',
    phone: '+447765902002',
    parent: BOB_PLACE
  };

  var CONTACTS = [ALICE, BOB_PLACE, CAROL, DAVID];

  var savedUuids = [];
  beforeAll(function(done) {
    browser.ignoreSynchronization = true;
    protractor.promise
      .all(CONTACTS.map(utils.saveDoc))
      .then(function(results) {
        results.forEach(function(result) {
          savedUuids.push(result.id);
        });
        done();
      })
      .catch(function(err) {
        console.error('Error saving docs', err);
        done();
      });
  });

  afterAll(function(done) {
    protractor.promise
      .all(savedUuids.map(utils.deleteDoc))
      .then(function() {
        return utils.requestOnTestDb({
          path: '/_design/medic/_view/tasks_messages',
          method: 'GET'
        });
      })
      .then(function(results) {
        var ids = _.uniq(_.pluck(results.rows, 'id'));
        return protractor.promise.all(ids.map(utils.deleteDoc));
      })
      .then(done);
  });


  var messageInList = function(identifier) {
    return '#message-list li[data-record-id="'+identifier+'"]';
  };

  var smsMsg = function(key) {
    return 'Hello ' + key + ' this is a test SMS';
  };

  var openSendMessageModal = function() {
    var sendMessageModal = element(by.id('send-message'));

    expect(element(by.css('.general-actions .send-message')).isDisplayed()).toBeTruthy();
    expect(sendMessageModal.isDisplayed()).toBeFalsy();

    element(by.css('.general-actions .send-message')).click();
    browser.sleep(1000);
    expect(sendMessageModal.isDisplayed()).toBeTruthy();
  };

  var enterCheckAndSelect = function(text, totalResults, resultToClick, id, existingEntryCount) {
    existingEntryCount = existingEntryCount || 0;
    var sendMessageSelect = element(by.css('#send-message .select2'));

    sendMessageSelect.click();

    element(by.css('#send-message input.select2-search__field')).sendKeys(text);
    browser.sleep(1000);

    expect(element.all(by.css('.select2-results__option')).count()).toBe(totalResults);

    expect(element.all(by.css('li.select2-selection__choice')).count()).toBe(existingEntryCount);
    element.all(by.css('li.select2-results__option')).get(resultToClick).click();
    browser.sleep(1000);
    expect(element.all(by.css('li.select2-selection__choice')).count()).toBe(existingEntryCount + 1);
    expect(element.all(by.css('#send-message select>option')).last().getAttribute('value')).toBe(id);
  };

  var sendMessage = function() {
    element(by.css('#send-message a.btn.submit')).click();
    browser.sleep(1000);
    browser.driver.navigate().refresh();
    browser.wait(function() {
      return browser.isElementPresent(by.css('#message-list'));
    }, 10000);
  };

  var clickLhsEntry = function(liIdentifier) {
    expect(element.all(by.css(liIdentifier)).count()).toBe(1);
    element(by.css(liIdentifier + ' a.message-wrapper')).click();
    browser.sleep(1000);
  };

  var lastMessageIs = function(message) {
    expect(element.all(by.css('#message-content li div.data>p>span')).last().getText()).toBe(message);
  };

  describe('Send message modal', function() {
    it('can send messages to raw phone numbers', function() {
      element(by.id('messages-tab')).click();
      expect(element(by.css(messageInList(RAW_PH))).isPresent()).toBeFalsy();

      openSendMessageModal();
      enterCheckAndSelect(RAW_PH, 1, 0, RAW_PH);
      element(by.css('#send-message textarea')).sendKeys(smsMsg('raw'));
      sendMessage();
      clickLhsEntry(messageInList(RAW_PH));

      expect(element.all(by.css('#message-content li')).count()).toBe(1);
      lastMessageIs(smsMsg('raw'));
    });

    it('can send messages to contacts with phone numbers', function() {
      element(by.id('messages-tab')).click();

      expect(element(by.css(messageInList(ALICE._id))).isPresent()).toBeFalsy();

      openSendMessageModal();
      enterCheckAndSelect(ALICE.name, 2, 1, ALICE._id);
      element(by.css('#send-message textarea')).sendKeys(smsMsg('contact'));
      sendMessage();
      clickLhsEntry(messageInList(ALICE._id));

      expect(element.all(by.css('#message-content li')).count()).toBe(1);
      lastMessageIs(smsMsg('contact'));
    });

    it('can send messages to contacts under everyone at with phone numbers', function() {
      element(by.id('messages-tab')).click();

      expect(element(by.css(messageInList(CAROL.phone))).isPresent()).toBeFalsy();
      expect(element(by.css(messageInList(DAVID.phone))).isPresent()).toBeFalsy();

      openSendMessageModal();
      enterCheckAndSelect(BOB_PLACE.name, 3, 1, 'everyoneAt:' + BOB_PLACE._id);
      element(by.css('#send-message textarea')).sendKeys(smsMsg('everyoneAt'));
      sendMessage();

      expect(element.all(by.css(messageInList(CAROL._id))).count()).toBe(0);
      clickLhsEntry(messageInList(DAVID._id));

      expect(element.all(by.css('#message-content li')).count()).toBe(1);
      lastMessageIs(smsMsg('everyoneAt'));
    });

  });

  // Requires that 'Send message modal' describe has been run
  describe('Sending from message pane', function() {
    var openMessageContent = function(liIdentifier) {
      element(by.id('messages-tab')).click();
      expect(element(by.css(liIdentifier)).isPresent()).toBeTruthy();

      clickLhsEntry(liIdentifier);
    };
    var enterMessageText = function(message) {
      element(by.css('#message-footer textarea')).click();
      browser.wait(function() {
        return element(by.css('#message-footer .message-actions .btn-primary')).isDisplayed();
      });
      browser.wait(element(by.css('#message-footer textarea')).sendKeys(message));
    };
    describe('Can send additional messages from message pane', function() {
      var addAnAdditionalMessage = function(liIdentifier) {
        openMessageContent(liIdentifier);
        enterMessageText('Additional Message');

        element(by.css('#message-footer .message-actions .btn-primary')).click();
        browser.wait(function() {
          return element.all(by.css('#message-content li')).count().then(function(c) {
            return c === 2;
          });
        }, 2000);

        expect(element.all(by.css('#message-content li')).count()).toBe(2);
        lastMessageIs('Additional Message');
      };

      it('For raw contacts', function() {
        addAnAdditionalMessage(messageInList(RAW_PH));
      });
      it('For real contacts', function() {
        addAnAdditionalMessage(messageInList(ALICE._id));
      });
    });
    describe('Can add recipients', function() {
      it('For raw contacts', function() {
        openMessageContent(messageInList(RAW_PH));
        enterMessageText('A third message');

        element(by.css('.message-actions .btn.btn-link')).click();
        browser.sleep(1000);
        expect(element(by.id('send-message')).isDisplayed()).toBeTruthy();
        expect(element.all(by.css('li.select2-selection__choice')).count()).toBe(1);
        expect(element(by.css('#send-message select>option')).getAttribute('value')).toBe(RAW_PH);
        enterCheckAndSelect(ANOTHER_RAW_PH, 1, 0, ANOTHER_RAW_PH, 1);
        sendMessage();
        openMessageContent(messageInList(RAW_PH));
        expect(element.all(by.css('#message-content li')).count()).toBe(3);

        lastMessageIs('A third message');
        openMessageContent(messageInList(ANOTHER_RAW_PH));
        expect(element.all(by.css('#message-content li')).count()).toBe(1);
        lastMessageIs('A third message');
      });
      it('For existing contacts', function() {
        openMessageContent(messageInList(ALICE._id));
        enterMessageText('A third message');

        element(by.css('.message-actions .btn.btn-link')).click();
        browser.sleep(1000);
        expect(element(by.id('send-message')).isDisplayed()).toBeTruthy();
        expect(element.all(by.css('li.select2-selection__choice')).count()).toBe(1);
        expect(element(by.css('#send-message select>option')).getAttribute('value')).toBe(ALICE._id);
        enterCheckAndSelect(DAVID.name, 2, 1, DAVID._id, 1);
        sendMessage();
        openMessageContent(messageInList(ALICE._id));
        expect(element.all(by.css('#message-content li')).count()).toBe(3);
        expect(element.all(by.css('#message-content li div.data>p>span')).last().getText()).toBe('A third message');
        openMessageContent(messageInList(DAVID._id));
        expect(element.all(by.css('#message-content li')).count()).toBe(2);
        expect(element.all(by.css('#message-content li div.data>p>span')).last().getText()).toBe('A third message');
      });
    });
  });
});
