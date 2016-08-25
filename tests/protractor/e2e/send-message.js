var utils = require('../utils'),
    _ = require('underscore');

describe('Send message', function() {
  'use strict';

  var RAW_PH = '+447765902000';

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

  it('can send messages to raw phone numbers', function() {

    element(by.id('messages-tab')).click();

    expect(element.all(by.css(messageInList(RAW_PH))).count()).toBe(0);

    var sendMessageModal = element(by.id('send-message'));

    expect(element(by.css('.general-actions .send-message')).isDisplayed()).toBeTruthy();
    expect(sendMessageModal.isDisplayed()).toBeFalsy();

    element(by.css('.general-actions .send-message')).click();
    browser.sleep(1000);
    expect(sendMessageModal.isDisplayed()).toBeTruthy();

    var sendMessageSelect = element(by.css('#send-message .select2'));

    sendMessageSelect.click();

    element(by.css('#send-message input.select2-search__field')).sendKeys(RAW_PH);
    browser.sleep(1000);

    expect(element.all(by.css('.select2-results__option')).count()).toBe(1);

    expect(element.all(by.css('li.select2-selection__choice')).count()).toBe(0);
    element.all(by.css('li.select2-results__option')).first().click();
    browser.sleep(1000);
    expect(element.all(by.css('li.select2-selection__choice')).count()).toBe(1);
    expect(element(by.css('#send-message select>option')).getAttribute('value')).toBe(RAW_PH);

    element(by.css('#send-message textarea')).sendKeys(smsMsg('raw'));

    element(by.css('#send-message a.btn.submit')).click();
    browser.sleep(1000);
    browser.driver.navigate().refresh();
    browser.wait(function() {
      return browser.isElementPresent(by.css('#message-list'));
    }, 10000);

    expect(element.all(by.css(messageInList(RAW_PH))).count()).toBe(1);

    element(by.css(messageInList(RAW_PH) + ' a.message-wrapper')).click();
    browser.sleep(1000);

    expect(element.all(by.css('#message-content li')).count()).toBe(1);
    expect(element(by.css('#message-content li div.data>p>span')).getText()).toBe(smsMsg('raw'));
  });

  it('can send messages to contacts with phone numbers', function() {

    element(by.id('messages-tab')).click();

    expect(element(by.css(messageInList(ALICE._id))).isPresent()).toBeFalsy();

    var sendMessageModal = element(by.id('send-message'));

    expect(element(by.css('.general-actions .send-message')).isDisplayed()).toBeTruthy();
    expect(sendMessageModal.isDisplayed()).toBeFalsy();

    element(by.css('.general-actions .send-message')).click();
    browser.sleep(1000);
    expect(sendMessageModal.isDisplayed()).toBeTruthy();

    var sendMessageSelect = element(by.css('#send-message .select2'));

    sendMessageSelect.click();

    element(by.css('#send-message input.select2-search__field')).sendKeys(ALICE.name);
    browser.sleep(1000);

    expect(element.all(by.css('.select2-results__option')).count()).toBe(2); // Raw name; Contact

    expect(element.all(by.css('li.select2-selection__choice')).count()).toBe(0);
    element.all(by.css('li.select2-results__option ')).get(1).click();
    browser.sleep(1000);
    expect(element.all(by.css('li.select2-selection__choice')).count()).toBe(1);
    expect(element(by.css('#send-message select>option')).getAttribute('value')).toBe(ALICE.name);

    element(by.css('#send-message textarea')).sendKeys(smsMsg('contact'));

    element(by.css('#send-message a.btn.submit')).click();
    browser.sleep(1000);
    browser.driver.navigate().refresh();
    browser.wait(function() {
      return browser.isElementPresent(by.css('#message-list'));
    }, 10000);

    expect(element(by.css(messageInList(ALICE._id))).isPresent()).toBeTruthy();

    element(by.css(messageInList(ALICE._id) + ' a.message-wrapper')).click();
    browser.sleep(1000);

    expect(element.all(by.css('#message-content li')).count()).toBe(1);
    expect(element(by.css('#message-content li div.data>p>span')).getText()).toBe(smsMsg('contact'));
  });

  it('can send messages to contacts under everyone at with phone numbers', function() {

    element(by.id('messages-tab')).click();

    expect(element.all(by.css(messageInList(CAROL.phone))).count()).toBe(0);
    expect(element.all(by.css(messageInList(DAVID.phone))).count()).toBe(0);

    var sendMessageModal = element(by.id('send-message'));

    expect(element(by.css('.general-actions .send-message')).isDisplayed()).toBeTruthy();
    expect(sendMessageModal.isDisplayed()).toBeFalsy();

    element(by.css('.general-actions .send-message')).click();
    browser.sleep(1000);
    expect(sendMessageModal.isDisplayed()).toBeTruthy();

    var sendMessageSelect = element(by.css('#send-message .select2'));

    sendMessageSelect.click();

    element(by.css('#send-message input.select2-search__field')).sendKeys(BOB_PLACE.name);
    browser.sleep(1000);

    expect(element.all(by.css('.select2-results__option')).count()).toBe(3); // Raw name; Contact; Contact under place

    expect(element.all(by.css('li.select2-selection__choice')).count()).toBe(0);
    element.all(by.css('li.select2-results__option ')).get(1).click();
    browser.sleep(1000);
    expect(element.all(by.css('li.select2-selection__choice')).count()).toBe(1);
    expect(element(by.css('#send-message select>option')).getAttribute('value')).toBe(BOB_PLACE.name);

    element(by.css('#send-message textarea')).sendKeys(smsMsg('everyoneAt'));

    element(by.css('#send-message a.btn.submit')).click();
    browser.sleep(1000);
    browser.driver.navigate().refresh();
    browser.wait(function() {
      return browser.isElementPresent(by.css('#message-list'));
    }, 10000);

    expect(element.all(by.css(messageInList(CAROL._id))).count()).toBe(0);
    expect(element.all(by.css(messageInList(DAVID._id))).count()).toBe(1);

    element(by.css(messageInList(DAVID._id) + ' a.message-wrapper')).click();
    browser.sleep(1000);

    expect(element.all(by.css('#message-content li')).count()).toBe(1);
    expect(element(by.css('#message-content li div.data>p>span')).getText()).toBe(smsMsg('everyoneAt'));
  });
});
