const utils = require('../../../utils');
const helper = require('../../../helper');
const common = require('../../../page-objects/protractor/common/common.po');
const messagesPo = require('../../../page-objects/protractor/sms/messages.po');
const uuid = require('uuid').v4;
const _ = require('lodash');

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

  const messageDoc = {
    '_id': uuid(),
    'errors': [],
    'form': null,
    'reported_date': new Date().getTime(),
    'tasks': [
      {
        'messages': [
          {
            'sent_by': 'admin',
            'to': '+447765902000',
            'message': 'Hello raw this is a test SMS',
            'uuid': uuid()
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

  const aliceMessageDoc = _.cloneDeep(messageDoc);
  aliceMessageDoc.tasks[0].messages[0] = {
    'sent_by': 'admin',
    'to': '+447765902001',
    'contact': {
      '_id': 'alice-contact'
    },
    'message': 'Hello alice-contact this is a test SMS',
    'uuid': uuid()
  };

  const CONTACTS = [ALICE, BOB_PLACE, CAROL, JAROL, DAVID, DAVID_AREA];

  beforeEach(async () => {
    DAVID_AREA.contact = { _id: DAVID._id, phone: '+447765902002' };
    await utils.saveDocs(CONTACTS);
  });

  afterEach(async () => {
    await utils.resetBrowser();
    await utils.afterEach();
  });

  const smsMsg = key => {
    return `Hello ${key} this is a test SMS`;
  };

  const contactNameSelector = ' .sender .name';
  const everyoneAtText = name => `${name} - all  contacts`;

  describe('Send message modal', () => {
    it('can send messages to raw phone numbers', async () => {
      await common.goToMessagesNative();
      expect(await messagesPo.messageInList(RAW_PH).isPresent()).toBeFalsy();

      await messagesPo.openSendMessageModal();
      await messagesPo.enterCheckAndSelect(RAW_PH, 1, '', RAW_PH);
      await messagesPo.messageText(smsMsg('raw'));
      await messagesPo.submitMessage();
      await messagesPo.clickLhsEntry(RAW_PH);

      expect(await messagesPo.allMessages().count()).toBe(1);
      expect(await messagesPo.lastMessageText()).toBe(smsMsg('raw'));
    });

    it('can send messages to contacts with phone numbers', async () => {
      await common.goToMessagesNative();

      expect(await messagesPo.messageInList(ALICE._id).isPresent()).toBeFalsy();

      await messagesPo.openSendMessageModal();
      await messagesPo.enterCheckAndSelect(ALICE.name, 2, contactNameSelector, ALICE.name);
      await messagesPo.messageText(smsMsg('contact'));
      await messagesPo.submitMessage();
      await messagesPo.clickLhsEntry(ALICE._id, ALICE.name);

      expect(await messagesPo.allMessages().count()).toBe(1);
      expect(await messagesPo.lastMessageText()).toBe(smsMsg('contact'));
    });

    it('can send messages to contacts under everyone at with phone numbers', async () => {
      await common.goToMessagesNative();

      expect(await messagesPo.messageInList(CAROL.phone).isPresent()).toBeFalsy();
      expect(await messagesPo.messageInList(JAROL.phone).isPresent()).toBeFalsy();
      expect(await messagesPo.messageInList(DAVID.phone).isPresent()).toBeFalsy();

      await messagesPo.openSendMessageModal();
      await messagesPo.enterCheckAndSelect(
        BOB_PLACE.name,
        2,
        contactNameSelector,
        everyoneAtText(BOB_PLACE.name)
      );
      await messagesPo.messageText(smsMsg('everyoneAt'));
      await messagesPo.submitMessage();

      expect(await element.all(messagesPo.messageInList(CAROL._id).locator()).count()).toBe(0);
      expect(await element.all(messagesPo.messageInList(JAROL._id).locator()).count()).toBe(0);
      expect(await element.all(messagesPo.messageInList(DAVID._id).locator()).count()).toBe(0);
      await messagesPo.clickLhsEntry(DAVID_AREA._id, DAVID_AREA.name);

      expect(await messagesPo.allMessages().count()).toBe(1);
      expect(await messagesPo.lastMessageText()).toBe(smsMsg('everyoneAt'));
    });
  });

  // Requires that 'Send message modal' describe has been run
  describe('Sending from message pane', () => {
    describe('Can send additional messages from message pane', () => {
      const addAnAdditionalMessage = async (id, name) => {
        await messagesPo.openMessageContent(id, name);
        await messagesPo.enterMessageText('Additional Message');
        await messagesPo.sendAdditionalMessage.click();
        await browser.wait(async () => await messagesPo.allMessages().count() === 2, 2000);
        expect(await messagesPo.allMessages().count()).toBe(2);
        expect(await messagesPo.lastMessageText()).toBe('Additional Message');
      };

      it('For raw contacts', async () => {
        await utils.saveDoc(messageDoc);
        await browser.refresh();
        await addAnAdditionalMessage(RAW_PH);
      });

      it('For real contacts', async () => {
        await utils.saveDoc(aliceMessageDoc);
        await browser.refresh();
        await addAnAdditionalMessage(ALICE._id, ALICE.name);
      });
    });
    describe('Can add recipients', () => {
      it('For raw contacts', async () => {
        await utils.saveDoc(messageDoc);
        await browser.refresh();
        await messagesPo.openMessageContent(RAW_PH);
        await messagesPo.enterMessageText('A second message');

        await helper.clickElementNative(messagesPo.addRecipient);
        await helper.waitUntilReadyNative(messagesPo.sendMessageModal());
        expect(await messagesPo.sendMessageModal().isDisplayed()).toBeTruthy();
        expect(await messagesPo.selectChoices.count()).toBe(1);
        expect(await messagesPo.selectedOption.getAttribute('value')).toBe(RAW_PH);
        await messagesPo.enterCheckAndSelect(ANOTHER_RAW_PH, 1, '', ANOTHER_RAW_PH, 1);
        await messagesPo.submitMessage();
        await messagesPo.openMessageContent(RAW_PH);
        expect(await  messagesPo.allMessages().count()).toBe(2);

        expect(await messagesPo.lastMessageText()).toBe('A second message');
        await messagesPo.openMessageContent(ANOTHER_RAW_PH);
        expect(await  messagesPo.allMessages().count()).toBe(1);
        expect(await messagesPo.lastMessageText()).toBe('A second message');
      });
      it('For existing contacts', async () => {
        await utils.saveDoc(aliceMessageDoc);
        await browser.refresh();
        await messagesPo.openMessageContent(ALICE._id, ALICE.name);
        await messagesPo.enterMessageText('A second message');

        await helper.clickElementNative(messagesPo.addRecipient);
        await helper.waitUntilReadyNative(messagesPo.sendMessageModal());
        expect(await messagesPo.sendMessageModal().isDisplayed()).toBeTruthy();
        expect(await messagesPo.selectChoices.count()).toBe(1);
        expect(await messagesPo.selectedOption.getAttribute('value')).toBe(ALICE._id);
        await messagesPo.enterCheckAndSelect(DAVID.name, 2, contactNameSelector, DAVID.name, 1);
        await messagesPo.submitMessage();
        await messagesPo.openMessageContent(ALICE._id, ALICE.name);
        expect(await  messagesPo.allMessages().count()).toBe(2);
        expect(await messagesPo.lastMessageText()).toBe('A second message');
        await messagesPo.openMessageContent(DAVID._id, DAVID.name);
        expect(await  messagesPo.allMessages().count()).toBe(1);
        expect(await messagesPo.lastMessageText()).toBe('A second message');
      });
    });
  });

});
