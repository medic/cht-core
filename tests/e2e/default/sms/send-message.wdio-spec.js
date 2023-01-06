//const moment = require('moment');
const utils = require('../../../utils');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const messagesPage = require('../../../page-objects/default/sms/messages.wdio.page');

describe('Send message', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
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

  const smsMsg = key => `Hello ${key} this is a test SMS`;

  before(async () => {
    await utils.saveDocs([...places.values(), anne, bob]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);    
  });

  it('Should send a message to a raw phone number', async () => {
    await commonPage.goToMessages();
    await commonPage.waitForPageLoaded();

    const rawNumer = '+50683858585';
    await messagesPage.sendMessage(smsMsg('raw'), rawNumer, '', rawNumer);
    await messagesPage.clickLhsEntry(rawNumer);
    
    expect(await messagesPage.lastMessageText()).to.equal(smsMsg('raw'));
  });

  it('Should send a message to a contact with a phone number', async () => {
    await commonPage.goToMessages();
    await commonPage.waitForPageLoaded();

    await messagesPage.sendMessage(smsMsg(anne.name), anne.name, messagesPage.contactNameSelector, anne.phone);
    await messagesPage.clickLhsEntry(anne._id, anne.name);

    expect(await messagesPage.lastMessageText()).to.equal(smsMsg(anne.name));
  });
});
