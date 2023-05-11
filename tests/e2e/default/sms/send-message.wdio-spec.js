const utils = require('../../../utils');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const messagesPage = require('../../../page-objects/default/sms/messages.wdio.page');

describe('Send message', () => {
  const rawNumber = '+50683858585';
  const anotherRawNumber = '+50689232323';
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const anne = personFactory.build({
    name: 'Anne',
    phone: '+50683333333',
    parent: {_id: healthCenter._id, parent: healthCenter.parent}
  });
  const bob = personFactory.build({
    name: 'Bob',
    phone: '+50683444444',
    parent: {_id: healthCenter._id, parent: healthCenter.parent}
  });

  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'], contact: anne });

  const smsMsg = (person, type = 'regular')  => `Test SMS - ${person} - ${type}`;

  const verifyMessageHeader = async (personName, phoneNumber) => {
    const { name, phone } = await messagesPage.getMessageHeader();
    expect(name).to.equal(personName);
    expect(phone).to.equal(phoneNumber);
  };

  const verifyLastSmsContent = async (msg, type) => {
    const messages = await messagesPage.getAmountOfMessages();
    const { content, state } = await messagesPage.getMessageContent(messages);
    expect(content).to.equal(smsMsg(msg, type));
    expect(state).to.equal('pending');
  };

  const verifyMessageModalContent = async (recipientName, messageValue) => {
    const { recipient, message } = await messagesPage.getMessagesModalDetails();
    expect(recipient).to.contain(recipientName);
    expect(message).to.equal(messageValue);
  };

  before(async () => {
    await utils.saveDocs([...places.values(), bob]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);    
  });

  beforeEach(async () => {
    await commonPage.goToMessages();
    await commonPage.waitForPageLoaded();
  });

  it('should send messages to all the contacts, under a place, that have a primary phone number assigned', async () => {
    await messagesPage.sendMessage(
      smsMsg(healthCenter.name),
      healthCenter.name,
      `${healthCenter.name} - all  contacts`);

    const messages = await messagesPage.messagesList();
    expect(messages.length).to.equal(2);

    await messagesPage.openMessage(anne._id);
    await verifyMessageHeader(anne.name, anne.phone);
    await verifyLastSmsContent(healthCenter.name);

    await messagesPage.openMessage(bob._id);
    await verifyMessageHeader(bob.name, bob.phone);
    await verifyLastSmsContent(healthCenter.name);
  });

  it('should send a message to a raw phone number', async () => {
    await messagesPage.sendMessage(smsMsg('raw'), rawNumber, rawNumber);
    await messagesPage.openMessage(rawNumber);
    await verifyMessageHeader(rawNumber, '');
    await verifyLastSmsContent('raw');
  });

  it('should send a message to a contact with a phone number', async () => {
    await messagesPage.sendMessage(smsMsg(anne.name), anne.name, anne.phone);
    await messagesPage.openMessage(anne._id);
    await verifyMessageHeader(anne.name, anne.phone);
    await verifyLastSmsContent(anne.name, 'regular');
  });

  it('should reply to an existing message - raw phone number', async () => {
    await messagesPage.openMessage(rawNumber);
    await verifyMessageHeader(rawNumber, '');
    await messagesPage.sendReply(smsMsg('raw', 'reply'));
    await browser.refresh();
    await verifyLastSmsContent('raw', 'reply');
  });

  it('should reply to an existing message - contact with a phone number',  async () => {
    await messagesPage.openMessage(anne._id);
    await verifyMessageHeader(anne.name, anne.phone);
    await messagesPage.sendReply(smsMsg(anne.name, 'reply'));
    await browser.refresh();
    await verifyLastSmsContent(anne.name, 'reply');
  });

  it('should reply to an existing message and add a new recipient - raw phone number ', async () => {
    await messagesPage.openMessage(rawNumber);
    await verifyMessageHeader(rawNumber, '');
    const newMessage = smsMsg('raw', 'add recipient');

    await messagesPage.replyAddRecipients(newMessage);
    await verifyMessageModalContent(rawNumber, newMessage);
    await messagesPage.sendReplyNewRecipient(anotherRawNumber, anotherRawNumber);
    await browser.refresh();
    await verifyLastSmsContent('raw', 'add recipient');

    await messagesPage.openMessage(anotherRawNumber);
    await verifyMessageHeader(anotherRawNumber, '');
    await verifyLastSmsContent('raw', 'add recipient');
  });

  it('should reply to an existing message and add a new recipient - contact with a phone number ', async () => {
    await messagesPage.openMessage(anne._id);
    await verifyMessageHeader(anne.name, anne.phone);
    const newMessage = smsMsg('all', 'add recipient');

    await messagesPage.replyAddRecipients(newMessage);
    await verifyMessageModalContent(anne.name, newMessage);
    await messagesPage.sendReplyNewRecipient(bob.name, bob.phone);
    await browser.refresh();
    await verifyLastSmsContent('all', 'add recipient');

    await messagesPage.openMessage(bob._id);
    await verifyMessageHeader(bob.name, bob.phone);
    await verifyLastSmsContent('all', 'add recipient');
  });

  it('should send a message using FAB at people\'s tab', async () => {
    await commonPage.goToPeople(bob._id);
    await commonPage.clickFastActionFAB({ actionId: 'send-message' });
    await verifyMessageModalContent(bob.name, '');
    await messagesPage.sendMessageToContact(smsMsg(bob.name, 'People\'s Tab'));

    await commonPage.goToMessages();
    await commonPage.waitForPageLoaded();
    await messagesPage.openMessage(bob._id);
    await verifyMessageHeader(bob.name, bob.phone);
    await verifyLastSmsContent(bob.name, 'People\'s Tab');
  });

});
