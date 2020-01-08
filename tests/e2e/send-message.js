const utils = require('../utils');
const helper = require('../helper');
const common = require('../page-objects/common/common.po');

/* eslint-disable no-console */
describe('Send message', () => {
  'use strict';

  const RAW_PH = '+447765902000';
  const ANOTHER_RAW_PH = '+447765902003';

  const ALICE = {
    _id: 'alice-contact',
    reported_date: 1,
    type: 'person',
    name: 'Alice Alison',
    phone: '+447765902001',
  };
  const BOB_PLACE = {
    _id: 'bob-contact',
    reported_date: 1,
    type: 'health_center',
    name: 'Bob Place',
  };
  const DAVID_AREA = {
    _id: 'david-area',
    reported_date: 1,
    type: 'clinic',
    name: 'David Area',
    parent: { _id: BOB_PLACE._id },
  };
  const CAROL = {
    _id: 'carol-contact',
    reported_date: 1,
    type: 'person',
    name: 'Carol Carolina',
    parent: { _id: DAVID_AREA._id },
  };
  const JAROL = {
    _id: 'jarol-contact',
    reported_date: 1,
    type: 'person',
    name: 'Jarol Jarolina',
    phone: '+558865903003',
    parent: { _id: DAVID_AREA._id },
  };
  const DAVID = {
    _id: 'david-contact',
    reported_date: 1,
    type: 'person',
    name: 'David Davidson',
    phone: '+447765902002',
    parent: { _id: DAVID_AREA._id },
  };

  const CONTACTS = [ALICE, BOB_PLACE, CAROL, JAROL, DAVID, DAVID_AREA];

  beforeAll(done => {
    DAVID_AREA.contact = { _id: DAVID._id, phone: '+447765902002' };
    protractor.promise
      .all(CONTACTS.map(utils.saveDoc))
      .then(done)
      .catch(done.fail);
  });

  afterEach(done => {
    utils.resetBrowser();
    done();
  });

  afterAll(done => {
    console.log('About to call utils.afterEach from send-message');
    utils.afterEach(() => {
      console.log('Finished calling utils.afterEach from send-message');
      done();
    });
  });

  const messageInList = identifier => {
    return `#message-list li[data-record-id="${identifier}"]`;
  };

  const smsMsg = key => {
    return `Hello ${key} this is a test SMS`;
  };

  const openSendMessageModal = () => {
    helper.waitElementToBeClickable(
      element(by.css('.general-actions .send-message'))
    );
    helper.clickElement(element(by.css('.general-actions .send-message')));
    helper.waitElementToPresent(element(by.id('send-message')), 5000);
    helper.waitElementToBeVisible(element(by.id('send-message')), 5000);
  };

  const findSelect2Entry = (selector, expectedValue) => {
    return element
      .all(by.css('.select2-results__option' + selector))
      .filter(item => {
        return item
          .getText()
          .then(text => {
            return text === expectedValue;
          })
          .catch(err => {
            // item may have been detached from the page, so whatever it's invalid,
            // we ignore it. Log the error just for kicks.
            console.log('Caught and ignoring an error trying to getText', err);
          });
      });
  };

  const searchSelect2 = (
    searchText,
    totalExpectedResults,
    entrySelector,
    entryText
  ) => {
    element(by.css('#send-message input.select2-search__field')).sendKeys(
      searchText
    );

    browser.wait(() => {
      return protractor.promise
        .all([
          findSelect2Entry(entrySelector, entryText)
            .count()
            .then(utils.countOf(1)),
          element
            .all(by.css('.select2-results__option.loading-results'))
            .count()
            .then(utils.countOf(0)),
          element
            .all(by.css('.select2-results__option'))
            .count()
            .then(utils.countOf(totalExpectedResults)),
        ])
        .then(results => {
          // My kingdom for results.reduce(&&);
          return results[0] && results[1] && results[2];
        });
    }, 10000);

    return findSelect2Entry(entrySelector, entryText).first();
  };

  const enterCheckAndSelect = (
    searchText,
    totalExpectedResults,
    entrySelector,
    entryText,
    existingEntryCount=0
  ) => {
    expect(element.all(by.css('li.select2-selection__choice')).count()).toBe(
      existingEntryCount
    );

    const entry = searchSelect2(
      searchText,
      totalExpectedResults,
      entrySelector,
      entryText
    );
    entry.click();

    browser.wait(() => {
      return element
        .all(by.css('li.select2-selection__choice'))
        .count()
        .then(utils.countOf(existingEntryCount + 1));
    }, 2000);
  };

  const sendMessage = () => {
    element(by.css('#send-message a.btn.submit:not(.ng-hide)')).click();

    browser.wait(() => {
      return element(by.css('#send-message'))
        .isDisplayed()
        .then(isDisplayed => {
          return !isDisplayed;
        })
        .catch(() => {
          // It's been detached, so it's gone
          return true;
        });
    }, 2000);

    utils.resetBrowser();
  };

  const clickLhsEntry = (entryId, entryName) => {
    entryName = entryName || entryId;

    const liIdentifier = messageInList(entryId);
    helper.waitUntilReady(element(by.css(liIdentifier)));
    expect(element.all(by.css(liIdentifier)).count()).toBe(1);

    const aIdentifier = `${liIdentifier} a`;
    helper.waitUntilReady(element(by.css(aIdentifier)));
    element(by.css(aIdentifier)).click();

    browser.wait(() => {
      const el = element(by.css('#message-header .name'));
      if (helper.waitUntilReady(el)) {
        return helper.getTextFromElement(el).then(text => {
          return text === entryName;
        });
      }
    }, 12000);
  };

  const lastMessageIs = message => {
    const last = element
      .all(by.css('#message-content li div.data>p>span'))
      .last();
    expect(helper.getTextFromElement(last)).toBe(message);
  };

  const contactNameSelector = ' .sender .name';
  const everyoneAtText = name => {
    return name + ' - all contacts';
  };

  describe('Send message modal', () => {
    it('can send messages to raw phone numbers', () => {
      common.goToMessages();
      expect(element(by.css(messageInList(RAW_PH))).isPresent()).toBeFalsy();

      openSendMessageModal();
      enterCheckAndSelect(RAW_PH, 1, '', RAW_PH);
      element(by.css('#send-message textarea')).sendKeys(smsMsg('raw'));
      sendMessage();
      clickLhsEntry(RAW_PH);

      expect(element.all(by.css('#message-content li')).count()).toBe(1);
      lastMessageIs(smsMsg('raw'));
    });

    it('can send messages to contacts with phone numbers', () => {
      common.goToMessages();

      expect(element(by.css(messageInList(ALICE._id))).isPresent()).toBeFalsy();

      openSendMessageModal();
      enterCheckAndSelect(ALICE.name, 2, contactNameSelector, ALICE.name);
      element(by.css('#send-message textarea')).sendKeys(smsMsg('contact'));
      sendMessage();
      clickLhsEntry(ALICE._id, ALICE.name);

      expect(element.all(by.css('#message-content li')).count()).toBe(1);
      lastMessageIs(smsMsg('contact'));
    });

    it('can send messages to contacts under everyone at with phone numbers', () => {
      common.goToMessages();

      expect(
        element(by.css(messageInList(CAROL.phone))).isPresent()
      ).toBeFalsy();
      expect(
        element(by.css(messageInList(JAROL.phone))).isPresent()
      ).toBeFalsy();
      expect(
        element(by.css(messageInList(DAVID.phone))).isPresent()
      ).toBeFalsy();

      openSendMessageModal();
      enterCheckAndSelect(
        BOB_PLACE.name,
        2,
        contactNameSelector,
        everyoneAtText(BOB_PLACE.name)
      );
      element(by.css('#send-message textarea')).sendKeys(smsMsg('everyoneAt'));
      sendMessage();

      expect(element.all(by.css(messageInList(CAROL._id))).count()).toBe(0);
      expect(element.all(by.css(messageInList(JAROL._id))).count()).toBe(0);
      expect(element.all(by.css(messageInList(DAVID._id))).count()).toBe(0);
      clickLhsEntry(DAVID_AREA._id, DAVID_AREA.name);

      expect(element.all(by.css('#message-content li')).count()).toBe(1);
      lastMessageIs(smsMsg('everyoneAt'));
    });
  });

  // Requires that 'Send message modal' describe has been run
  describe('Sending from message pane', () => {
    const openMessageContent = (id, name) => {
      common.goToMessages();
      helper.waitUntilReady(element(by.css(messageInList(id))));
      helper.waitElementToPresent(element(by.css(messageInList(id))), 2000);
      clickLhsEntry(id, name);
    };
    const enterMessageText = message => {
      element(by.css('#message-footer textarea')).click();
      helper.waitElementToBeVisible(
        element(by.css('#message-footer .message-actions .btn-primary'))
      );
      browser.wait(
        element(by.css('#message-footer textarea')).sendKeys(message)
      );
    };
    describe('Can send additional messages from message pane', () => {
      const addAnAdditionalMessage = (id, name) => {
        openMessageContent(id, name);
        enterMessageText('Additional Message');

        element(
          by.css('#message-footer .message-actions .btn-primary')
        ).click();
        browser.wait(() => {
          return element
            .all(by.css('#message-content li'))
            .count()
            .then(utils.countOf(2));
        }, 2000);

        expect(element.all(by.css('#message-content li')).count()).toBe(2);
        lastMessageIs('Additional Message');
      };

      it('For raw contacts', () => {
        addAnAdditionalMessage(RAW_PH);
      });
      it('For real contacts', () => {
        addAnAdditionalMessage(ALICE._id, ALICE.name);
      });
    });
    describe('Can add recipients', () => {
      it('For raw contacts', () => {
        openMessageContent(RAW_PH);
        enterMessageText('A third message');

        element(by.css('.message-actions .btn.btn-link')).click();
        helper.waitForAngularComplete();
        expect(element(by.id('send-message')).isDisplayed()).toBeTruthy();
        expect(
          element.all(by.css('li.select2-selection__choice')).count()
        ).toBe(1);
        expect(
          element(by.css('#send-message select>option')).getAttribute('value')
        ).toBe(RAW_PH);
        enterCheckAndSelect(ANOTHER_RAW_PH, 1, '', ANOTHER_RAW_PH, 1);
        sendMessage();
        openMessageContent(RAW_PH);
        expect(element.all(by.css('#message-content li')).count()).toBe(3);

        lastMessageIs('A third message');
        openMessageContent(ANOTHER_RAW_PH);
        expect(element.all(by.css('#message-content li')).count()).toBe(1);
        lastMessageIs('A third message');
      });
      it('For existing contacts', () => {
        openMessageContent(ALICE._id, ALICE.name);
        enterMessageText('A third message');

        element(by.css('.message-actions .btn.btn-link')).click();
        helper.waitForAngularComplete();
        expect(element(by.id('send-message')).isDisplayed()).toBeTruthy();
        expect(
          element.all(by.css('li.select2-selection__choice')).count()
        ).toBe(1);
        expect(
          element(by.css('#send-message select>option')).getAttribute('value')
        ).toBe(ALICE._id);
        enterCheckAndSelect(DAVID.name, 2, contactNameSelector, DAVID.name, 1);
        sendMessage();
        openMessageContent(ALICE._id, ALICE.name);
        expect(element.all(by.css('#message-content li')).count()).toBe(3);
        expect(
          element
            .all(by.css('#message-content li div.data>p>span'))
            .last()
            .getText()
        ).toBe('A third message');
        openMessageContent(DAVID._id, DAVID.name);
        expect(element.all(by.css('#message-content li')).count()).toBe(1);
        expect(
          element
            .all(by.css('#message-content li div.data>p>span'))
            .last()
            .getText()
        ).toBe('A third message');
      });
    });
  });

});
