const utils = require('../utils');
const helper = require('../helper');
const common = require('../page-objects/common/common.po');
const messagesPo = require('../page-objects/messages/messages.po');

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

  beforeEach(async () => {
    DAVID_AREA.contact = { _id: DAVID._id, phone: '+447765902002' };
    await Promise.all(CONTACTS.map(utils.saveDocNative));
  });

  afterEach(async () => {
    await utils.resetBrowserNative();
    await utils.afterEachNative(); 
  });

  const smsMsg = key => {
    return `Hello ${key} this is a test SMS`;
  };

  const openSendMessageModal = async () => {
    await helper.clickElementNative(messagesPo.sendMessage());
    await helper.waitElementToPresent(messagesPo.sendMessageModal(), 5000);
    await helper.waitElementToBeVisible(messagesPo.sendMessageModal(), 5000);
  };

  // const findSelect2Entry = async (selector, expectedValue) => {

  // };


  const searchSelect2 = async (searchText, totalExpectedResults, entrySelector, entryText) => {
    await messagesPo.messageRecipientSelect().sendKeys(searchText);
    await browser
      .wait(async () => await element.all(by.css('.select2-results__option')).count() === totalExpectedResults);
    const elm = element(by.cssContainingText('.select2-results__option' + entrySelector , entryText));
    await helper.waitUntilReadyNative(elm);
    return elm;
  };

  const enterCheckAndSelect = async (
    searchText,
    totalExpectedResults,
    entrySelector,
    entryText,
    existingEntryCount=0
  ) => {
    const selectionCount = await element.all(by.css('li.select2-selection__choice')).count();
    expect(selectionCount).toBe(existingEntryCount);

    const entry = await searchSelect2(
      searchText,
      totalExpectedResults,
      entrySelector,
      entryText
    );
    await entry.click();

    return browser.wait(() => {
      return element
        .all(by.css('li.select2-selection__choice'))
        .count()
        .then(utils.countOf(existingEntryCount + 1));
    }, 2000);
  };

  const sendMessage = async () => {
    await element(by.css('#send-message a.btn.submit:not(.ng-hide)')).click();
    await helper.waitElementToDisappear(by.css('#send-message'));
  };

  const clickLhsEntry = async (entryId, entryName) => {
    entryName = entryName || entryId;

    const liElement = await messagesPo.messageInList(entryId);
    await helper.waitUntilReadyNative(liElement);
    expect(await element.all(liElement.locator()).count()).toBe(1);
    await liElement.click();

    return browser.wait(() => {
      const el = element(by.css('#message-header .name'));
      if (helper.waitUntilReadyNative(el)) {
        return helper.getTextFromElement(el).then(text => {
          return text === entryName;
        });
      }
    }, 12000);
  };

  const lastMessageIs = async message => {
    const last = await element.all(by.css('#message-content li div.data>p>span')).last();
    expect(await helper.getTextFromElement(last)).toBe(message);
  };

  const contactNameSelector = ' .sender .name';
  const everyoneAtText = name => `${name} - all  contacts`;


  describe('Send message modal', () => {
    it('can send messages to raw phone numbers', async () => {
      await common.goToMessagesNative();
      expect(await messagesPo.messageInList(RAW_PH).isPresent()).toBeFalsy();

      await openSendMessageModal();
      await enterCheckAndSelect(RAW_PH, 1, '', RAW_PH);
      await messagesPo.messageText(smsMsg('raw'));
      await sendMessage();
      await clickLhsEntry(RAW_PH);

      expect(await element.all(by.css('#message-content li')).count()).toBe(1);
      await lastMessageIs(smsMsg('raw'));
    });

    it('can send messages to contacts with phone numbers', async () => {
      await common.goToMessagesNative();

      expect(await messagesPo.messageInList(ALICE._id).isPresent()).toBeFalsy();

      await openSendMessageModal();
      await enterCheckAndSelect(ALICE.name, 2, contactNameSelector, ALICE.name);
      await messagesPo.messageText(smsMsg('contact'));
      await sendMessage();
      await clickLhsEntry(ALICE._id,ALICE.name);

      expect(await element.all(by.css('#message-content li')).count()).toBe(1);
      await lastMessageIs(smsMsg('contact'));
    });

    it('can send messages to contacts under everyone at with phone numbers', async () => {
      await common.goToMessagesNative();

      expect(await messagesPo.messageInList(CAROL.phone).isPresent()).toBeFalsy();
      expect(await messagesPo.messageInList(JAROL.phone).isPresent()).toBeFalsy();
      expect(await messagesPo.messageInList(DAVID.phone).isPresent()).toBeFalsy();

      await openSendMessageModal();
      await enterCheckAndSelect(
        BOB_PLACE.name,
        2,
        contactNameSelector,
        everyoneAtText(BOB_PLACE.name)
      );
      await messagesPo.messageText(smsMsg('everyoneAt'));
      await sendMessage();

      expect(element.all(messagesPo.messageInList(CAROL._id).locator()).count()).toBe(0);
      expect(element.all(messagesPo.messageInList(JAROL._id).locator()).count()).toBe(0);
      expect(element.all(messagesPo.messageInList(DAVID._id).locator()).count()).toBe(0);
      await clickLhsEntry(DAVID_AREA._id, DAVID_AREA.name);

      expect(await element.all(by.css('#message-content li')).count()).toBe(1);
      await lastMessageIs(smsMsg('everyoneAt'));
    });
  });

  // Requires that 'Send message modal' describe has been run
  describe('Sending from message pane', () => {
    const openMessageContent = async (id, name) => {
      await common.goToMessagesNative();
      await helper.waitUntilReadyNative(messagesPo.messageInList(id));
      await helper.waitElementToPresentNative(messagesPo.messageInList(id), 2000);
      await clickLhsEntry(id, name);
    };
    const enterMessageText = async message => {
      await element(by.css('#message-footer textarea')).click();
      await helper.waitElementToBeVisible(
        element(by.css('#message-footer .message-actions .btn-primary'))
      );
      await browser.wait(
        element(by.css('#message-footer textarea')).sendKeys(message)
      );
    };
    describe('Can send additional messages from message pane', () => {
      const addAnAdditionalMessage = async (id, name) => {
        await openMessageContent(id, name);
        await enterMessageText('Additional Message');

        await element(
          by.css('#message-footer .message-actions .btn-primary')
        ).click();
        await browser.wait(() => {
          return element
            .all(by.css('#message-content li'))
            .count()
            .then(utils.countOf(2));
        }, 2000);

        expect(await  element.all(by.css('#message-content li')).count()).toBe(2);
        await lastMessageIs('Additional Message');
      };

      it('For raw contacts', async () => {
        const doc = {
          '_id': '4081db78-9f3a-422c-9f8f-68e9ece119ea',
          'errors': [],
          'form': null,
          'reported_date': 1613151287731,
          'tasks': [
            {
              'messages': [
                {
                  'sent_by': 'admin',
                  'to': '+447765902000',
                  'message': 'Hello raw this is a test SMS',
                  'uuid': 'd472062d-8fd4-4035-b5b7-8d41a6dc81ca'
                }
              ],
              'state_history': [
                {
                  'state': 'pending',
                  'timestamp': '2021-02-12T17:34:47.734Z'
                }
              ],
              'state': 'pending'
            }
          ],
          'kujua_message': true,
          'type': 'data_record',
          'sent_by': 'admin'
        };
              

        await utils.saveDocNative(doc);
        await browser.refresh();
        await addAnAdditionalMessage(RAW_PH);
      });
      it('For real contacts', async () => {
        const doc = {
          '_id': '5908c32b-f94a-4afc-b0bf-c92e7b7f5ca1',
          'form': null,
          'reported_date': 1613159927411,
          'tasks': [
            {
              'messages': [
                {
                  'sent_by': 'admin',
                  'to': '+447765902001',
                  'contact': {
                    '_id': 'alice-contact'
                  },
                  'message': 'Hello contact this is a test SMS',
                  'uuid': 'c47d9109-cdf3-4162-b61b-6a2435ae4814'
                }
              ],
              'state_history': [
                {
                  'state': 'pending',
                  'timestamp': '2021-02-12T19:58:47.413Z'
                }
              ],
              'state': 'pending'
            }
          ],
          'kujua_message': true,
          'type': 'data_record',
          'sent_by': 'admin'
        };

        await utils.saveDocNative(doc);
        await browser.refresh();
        addAnAdditionalMessage(ALICE._id, ALICE.name);
      });
    });
    describe('Can add recipients', () => {
      it('For raw contacts1', async () => {
        const doc = {
          '_id': '4081db78-9f3a-422c-9f8f-68e9ece119ea',
          'errors': [],
          'form': null,
          'reported_date': 1613151287731,
          'tasks': [
            {
              'messages': [
                {
                  'sent_by': 'admin',
                  'to': '+447765902000',
                  'message': 'Hello raw this is a test SMS',
                  'uuid': 'd472062d-8fd4-4035-b5b7-8d41a6dc81ca'
                }
              ],
              'state_history': [
                {
                  'state': 'pending',
                  'timestamp': '2021-02-12T17:34:47.734Z'
                }
              ],
              'state': 'pending'
            }
          ],
          'kujua_message': true,
          'type': 'data_record',
          'sent_by': 'admin'
        };
              

        await utils.saveDocNative(doc);
        await browser.refresh();
        await openMessageContent(RAW_PH);
        await enterMessageText('A second message');

        await helper.clickElementNative(element(by.css('.message-actions .btn.btn-link')));
        await helper.waitUntilReady(element(by.id('send-message')));
        expect(await element(by.id('send-message')).isDisplayed()).toBeTruthy();
        expect(
          await element.all(by.css('li.select2-selection__choice')).count()
        ).toBe(1);
        expect(
          await element(by.css('#send-message select>option')).getAttribute('value')
        ).toBe(RAW_PH);
        await enterCheckAndSelect(ANOTHER_RAW_PH, 1, '', ANOTHER_RAW_PH, 1);
        await sendMessage();
        await openMessageContent(RAW_PH);
        expect(await element.all(by.css('#message-content li')).count()).toBe(2);

        await lastMessageIs('A second message');
        await openMessageContent(ANOTHER_RAW_PH);
        expect(await element.all(by.css('#message-content li')).count()).toBe(1);
        await lastMessageIs('A second message');
      });
      it('For existing contacts', async () => {
        const doc = {
          '_id': '5908c32b-f94a-4afc-b0bf-c92e7b7f5ca1',
          'form': null,
          'reported_date': 1613159927411,
          'tasks': [
            {
              'messages': [
                {
                  'sent_by': 'admin',
                  'to': '+447765902001',
                  'contact': {
                    '_id': 'alice-contact'
                  },
                  'message': 'Hello contact this is a test SMS',
                  'uuid': 'c47d9109-cdf3-4162-b61b-6a2435ae4814'
                }
              ],
              'state_history': [
                {
                  'state': 'pending',
                  'timestamp': '2021-02-12T19:58:47.413Z'
                }
              ],
              'state': 'pending'
            }
          ],
          'kujua_message': true,
          'type': 'data_record',
          'sent_by': 'admin'
        };

        await utils.saveDocNative(doc);
        await browser.refresh();
        await openMessageContent(ALICE._id, ALICE.name);
        await enterMessageText('A second message');

        await helper.clickElementNative(element(by.css('.message-actions .btn.btn-link')));
        await helper.waitUntilReady(element(by.id('send-message')));
        expect(await element(by.id('send-message')).isDisplayed()).toBeTruthy();
        expect(
          await element.all(by.css('li.select2-selection__choice')).count()
        ).toBe(1);
        expect(
          await element(by.css('#send-message select>option')).getAttribute('value')
        ).toBe(ALICE._id);
        await enterCheckAndSelect(DAVID.name, 2, contactNameSelector, DAVID.name, 1);
        await sendMessage();
        await openMessageContent(ALICE._id, ALICE.name);
        expect(await element.all(by.css('#message-content li')).count()).toBe(2);
        expect(
          await element
            .all(by.css('#message-content li div.data>p>span'))
            .last()
            .getText()
        ).toBe('A second message');
        await openMessageContent(DAVID._id, DAVID.name);
        expect(await element.all(by.css('#message-content li')).count()).toBe(1);
        expect(
          await element
            .all(by.css('#message-content li div.data>p>span'))
            .last()
            .getText()
        ).toBe('A second message');
      });
    });
  });

});
