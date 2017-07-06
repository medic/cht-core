var utils = require('../utils');
var helper = require('../helper');

describe('Send message', function() {
  'use strict';

  var RAW_PH = '+447765902000';
  var ANOTHER_RAW_PH = '+557765902000';

  var ALICE = {
    _id: 'alice-contact',
    reported_date: 1,
    type: 'person',
    name: 'Alice Alison',
    phone: '+447765902001'
  };
  var BOB_PLACE = {
    _id: 'bob-contact',
    reported_date: 1,
    type: 'clinic',
    name: 'Bob Place'
  };
  var CAROL = {
    _id: 'carol-contact',
    reported_date: 1,
    type: 'person',
    name: 'Carol Carolina',
    parent: { _id: BOB_PLACE._id }
  };
  var DAVID = {
    _id: 'david-contact',
    reported_date: 1,
    type: 'person',
    name: 'David Davidson',
    phone: '+447765902002',
    parent: { _id: BOB_PLACE._id }
  };

  var CONTACTS = [ALICE, BOB_PLACE, CAROL, DAVID];

  beforeAll(function(done) {
    console.log('beforeAll for send-message');
    browser.ignoreSynchronization = true;
    protractor.promise
      .all(CONTACTS.map(utils.saveDoc))
      .then(done)
      .catch(done);
  });

  afterEach(function(done) {
    utils.resetBrowser();
    done();
  });

  afterAll(done => {
    console.log('About to call utils.afterEach from send-message');
    utils.afterEach(() => {
      console.log('Finsished calling utils.afterEach from send-message');
      done();
    });
  });

  var messageInList = function(identifier) {
    return '#message-list li[data-record-id="' + identifier + '"]';
  };

  var smsMsg = function(key) {
    return 'Hello ' + key + ' this is a test SMS';
  };

  var openSendMessageModal = function() {
    expect(element(by.css('.general-actions .send-message')).isDisplayed()).toBeTruthy();
    element(by.css('.general-actions .send-message')).click();
    browser.wait(function() {
      var modal = element(by.id('send-message'));
      return modal.isPresent().then(function() {
        return modal.isDisplayed();
      });
    }, 5000);
  };

  var findSelect2Entry = function(selector, expectedValue) {
    return element.all(by.css('.select2-results__option' + selector)).filter(function(item) {
      return item.getText()
        .then(function(text) {
          return text === expectedValue;
        })
        .catch(function(err) {
          // item may have been detached from the page, so whatever it's invalid
          // we ignore it. Log the error just for kicks.
          console.log('Caught and ignoring an error trying to getText', err);
        });
    });
  };

  var searchSelect2 = function(searchText, totalExpectedResults, entrySelector, entryText) {
    element(by.css('#send-message input.select2-search__field')).sendKeys(searchText);

    browser.wait(function() {
      return protractor.promise.all([
        findSelect2Entry(entrySelector, entryText).count().then(utils.countOf(1)),
        element.all(by.css('.select2-results__option.loading-results')).count().then(utils.countOf(0)),
        element.all(by.css('.select2-results__option')).count().then(utils.countOf(totalExpectedResults))
      ]).then(function(results) {
        // My kingdom for results.reduce(&&);
        return results[0] && results[1] && results[2];
      });
    }, 10000);

    return findSelect2Entry(entrySelector, entryText).first();
  };

  var enterCheckAndSelect = function(searchText, totalExpectedResults, entrySelector, entryText, existingEntryCount) {
    existingEntryCount = existingEntryCount || 0;
    expect(element.all(by.css('li.select2-selection__choice')).count()).toBe(existingEntryCount);

    var entry = searchSelect2(searchText, totalExpectedResults, entrySelector, entryText);
    entry.click();

    browser.wait(function() {
      return element.all(by.css('li.select2-selection__choice')).count().then(utils.countOf(existingEntryCount + 1));
    }, 2000);
  };

  var sendMessage = function() {
    element(by.css('#send-message a.btn.submit')).click();

    browser.wait(function() {
      return element(by.css('#send-message')).isDisplayed()
        .then(function(isDisplayed) {
          return !isDisplayed;
        })
        .catch(function() {
          // It's been detached, so it's gone
          return true;
        });
    }, 2000);

    utils.resetBrowser();
  };

  var clickLhsEntry = function(entryId, entryName) {
    entryName = entryName || entryId;
    var liIdentifier = messageInList(entryId);

    expect(element.all(by.css(liIdentifier)).count()).toBe(1);
    element(by.css(liIdentifier + ' a.message-wrapper')).click();

    browser.wait(function() {
      var el = element(by.css('#message-header .name'));
      if (helper.waitUntilReady(el)) {
        return el.getText().then(function(text) {
          return text === entryName;
        });
      }
    }, 2000);
  };

  var lastMessageIs = function(message) {
    expect(element.all(by.css('#message-content li div.data>p>span')).last().getText()).toBe(message);
  };

  var contactNameSelector = ' .sender .name';
  var everyoneAtText = function(name) {
    return name + ' - all contacts';
  };

  describe('Send message modal', function() {
    it('can send messages to raw phone numbers', function() {
      element(by.id('messages-tab')).click();
      expect(element(by.css(messageInList(RAW_PH))).isPresent()).toBeFalsy();

      openSendMessageModal();
      enterCheckAndSelect(RAW_PH, 1, '', RAW_PH);
      element(by.css('#send-message textarea')).sendKeys(smsMsg('raw'));
      sendMessage();
      clickLhsEntry(RAW_PH);

      expect(element.all(by.css('#message-content li')).count()).toBe(1);
      lastMessageIs(smsMsg('raw'));
    });

    it('can send messages to contacts with phone numbers', function() {
      element(by.id('messages-tab')).click();

      expect(element(by.css(messageInList(ALICE._id))).isPresent()).toBeFalsy();

      openSendMessageModal();
      enterCheckAndSelect(ALICE.name, 2, contactNameSelector, ALICE.name);
      element(by.css('#send-message textarea')).sendKeys(smsMsg('contact'));
      sendMessage();
      clickLhsEntry(ALICE._id, ALICE.name);

      expect(element.all(by.css('#message-content li')).count()).toBe(1);
      lastMessageIs(smsMsg('contact'));
    });

    it('can send messages to contacts under everyone at with phone numbers', function() {
      element(by.id('messages-tab')).click();

      expect(element(by.css(messageInList(CAROL.phone))).isPresent()).toBeFalsy();
      expect(element(by.css(messageInList(DAVID.phone))).isPresent()).toBeFalsy();

      openSendMessageModal();
      enterCheckAndSelect(BOB_PLACE.name, 2, contactNameSelector, everyoneAtText(BOB_PLACE.name));
      element(by.css('#send-message textarea')).sendKeys(smsMsg('everyoneAt'));
      sendMessage();

      expect(element.all(by.css(messageInList(CAROL._id))).count()).toBe(0);
      clickLhsEntry(DAVID._id, DAVID.name);

      expect(element.all(by.css('#message-content li')).count()).toBe(1);
      lastMessageIs(smsMsg('everyoneAt'));
    });

  });

  // Requires that 'Send message modal' describe has been run
  describe('Sending from message pane', function() {
    var openMessageContent = function(id, name) {
      element(by.id('messages-tab')).click();
      expect(element(by.css(messageInList(id))).isPresent()).toBeTruthy();

      clickLhsEntry(id, name);
    };
    var enterMessageText = function(message) {
      element(by.css('#message-footer textarea')).click();
      browser.wait(function() {
        return element(by.css('#message-footer .message-actions .btn-primary')).isDisplayed();
      });
      browser.wait(element(by.css('#message-footer textarea')).sendKeys(message));
    };
    describe('Can send additional messages from message pane', function() {
      var addAnAdditionalMessage = function(id, name) {
        openMessageContent(id, name);
        enterMessageText('Additional Message');

        element(by.css('#message-footer .message-actions .btn-primary')).click();
        browser.wait(function() {
          return element.all(by.css('#message-content li')).count().then(utils.countOf(2));
        }, 2000);

        expect(element.all(by.css('#message-content li')).count()).toBe(2);
        lastMessageIs('Additional Message');
      };

      it('For raw contacts', function() {
        addAnAdditionalMessage(RAW_PH);
      });
      it('For real contacts', function() {
        addAnAdditionalMessage(ALICE._id, ALICE.name);
      });
    });
    describe('Can add recipients', function() {
      it('For raw contacts', function() {
        openMessageContent(RAW_PH);
        enterMessageText('A third message');

        element(by.css('.message-actions .btn.btn-link')).click();
        browser.sleep(1000); // TODO: work out how to tell that the documents etc have beeen saved
        expect(element(by.id('send-message')).isDisplayed()).toBeTruthy();
        expect(element.all(by.css('li.select2-selection__choice')).count()).toBe(1);
        expect(element(by.css('#send-message select>option')).getAttribute('value')).toBe(RAW_PH);
        enterCheckAndSelect(ANOTHER_RAW_PH, 1, '', ANOTHER_RAW_PH, 1);
        sendMessage();
        openMessageContent(RAW_PH);
        expect(element.all(by.css('#message-content li')).count()).toBe(3);

        lastMessageIs('A third message');
        openMessageContent(ANOTHER_RAW_PH);
        expect(element.all(by.css('#message-content li')).count()).toBe(1);
        lastMessageIs('A third message');
      });
      it('For existing contacts', function() {
        openMessageContent(ALICE._id, ALICE.name);
        enterMessageText('A third message');

        element(by.css('.message-actions .btn.btn-link')).click();
        browser.sleep(1000); // TODO: work out how to tell that the documents etc have beeen saved
        expect(element(by.id('send-message')).isDisplayed()).toBeTruthy();
        expect(element.all(by.css('li.select2-selection__choice')).count()).toBe(1);
        expect(element(by.css('#send-message select>option')).getAttribute('value')).toBe(ALICE._id);
        enterCheckAndSelect(DAVID.name, 2, contactNameSelector, DAVID.name, 1);
        sendMessage();
        openMessageContent(ALICE._id, ALICE.name);
        expect(element.all(by.css('#message-content li')).count()).toBe(3);
        expect(element.all(by.css('#message-content li div.data>p>span')).last().getText()).toBe('A third message');
        openMessageContent(DAVID._id, DAVID.name);
        expect(element.all(by.css('#message-content li')).count()).toBe(2);
        expect(element.all(by.css('#message-content li div.data>p>span')).last().getText()).toBe('A third message');
      });
    });
  });
});
