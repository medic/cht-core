const utils = require('../utils'),
  helper = require('../helper'),
  common = require('../page-objects/common/common.po');

describe('Display message', () => {
  'use strict';

  const ALICE = {
    _id: 'alice-contact',
    reported_date: 1,
    type: 'person',
    name: 'Alice Alison',
    phone: '+447765902001',
  };

  const CONTACTS = [ALICE];

  beforeAll(done => {
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
    utils.afterEach(() => {
      done();
    });
  });

  const messageInList = identifier => {
    return '#message-list li[data-record-id="' + identifier + '"]';
  };

  const smsMsg = key => {
    return 'Hello ' + key + ' this is a test SMS';
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
    existingEntryCount
  ) => {
    existingEntryCount = existingEntryCount || 0;
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
    element(by.css(liIdentifier + ' a')).click();

    browser.wait(() => {
      const el = element(by.css('#message-header .name'));
      if (helper.waitUntilReady(el)) {
        return helper.getTextFromElement(el).then(text => {
          return text === entryName;
        });
      }
    }, 12000);
  };

  const contactNameSelector = ' .sender .name';

  const getElementText = (css, attempt) => {
    attempt = attempt || 0;

    return helper.getTextFromElement(element(by.css(css)))
      .then((text) => {
        return text;
      }, (err) => {
        if (attempt < 2) {
          return getElementText(css, attempt+1);
        }
        throw err;
      });
  };

  describe('Display message without contact', () => {
    it('can display messages without contact', () => {
      common.goToMessages();

      expect(element(by.css(messageInList(ALICE._id))).isPresent()).toBeFalsy();

      openSendMessageModal();
      enterCheckAndSelect(ALICE.name, 2, contactNameSelector, ALICE.name);
      element(by.css('#send-message textarea')).sendKeys(smsMsg('contact'));
      sendMessage();
      clickLhsEntry(ALICE._id, ALICE.name);

      browser.wait(() => {
        return utils.deleteDocs(CONTACTS.map(contact => contact._id));
      });

      helper.waitForAngularComplete();//browser.sleep(100);

      expect(getElementText('.name')).toBe('Unknown sender');
      expect(getElementText('.phone')).toBe(ALICE.phone);
    });
  });
});