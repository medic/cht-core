const fs = require('fs');
const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const messagesUtils = require('../../../utils/messages');
const placeFactory = require('../../../factories/cht/contacts/place');
const userFactory = require('../../../factories/cht/users/users');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const contactsPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const newPersonUserCreatePage = require('../../../page-objects/default/enketo/new-person-user-create.wdio.page');
const { BASE_URL } = require('../../../constants');

describe('Create user when adding contact', () => {
  const district = utils.deepFreeze(placeFactory.place().build({ type: 'district_hospital' }));
  const newUsers = [];
  const contactName = 'Bob_chw';

  const settings = utils.deepFreeze({
    transitions: { create_user_for_contacts: true},
    token_login: { enabled: true },
    app_url: BASE_URL
  });

  const settingsNoTransitions = utils.deepFreeze({
    transitions: { create_user_for_contacts: false},
    token_login: { enabled: true },
    app_url: BASE_URL
  });

  const offlineUser = utils.deepFreeze(userFactory.build({
    username: 'offline_user_create',
    place: district._id,
  }));

  const onlineUser = utils.deepFreeze(userFactory.build({
    username: 'online_user_create',
    place: district._id,
    roles: ['program_officer', 'mm-online'],
  }));

  const newPersonUserCreateForm = utils.deepFreeze({
    _id: 'form:new_person_user_create',
    internalId: 'new_person_user_create',
    title: 'New Person User Create',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer
          .from(fs.readFileSync(`${__dirname}/forms/new_person_user_create.xml`, 'utf8'))
          .toString('base64')
      }
    }
  });

  const verifyUserCreation = async () => {  
    await sentinelUtils.waitForSentinel();
    const chwContactId = await contactsPage.getCurrentContactId();
    const { transitions } = await sentinelUtils.getInfoDoc(chwContactId);
  
    // Transition successful
    expect(transitions.create_user_for_contacts.ok).to.be.true;
    const finalChwContact = await utils.getDoc(chwContactId);
    expect(finalChwContact.user_for_contact).to.be.empty;
  
    // New user created
    const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: chwContactId });
    expect(additionalUsers).to.be.empty;
    newUsers.push(newUserSettings.name);
    const loginLink = await messagesUtils.getTextedLoginLink(newUserSettings);
  
    // Open the texted link
    await commonPage.logout();
    await browser.url(loginLink);
    await commonPage.waitForPageLoaded();
    const [cookie] = await browser.getCookies('userCtx');
    expect(cookie.value).to.include(newUserSettings.name);
  };

  before(async () => {
    await utils.saveDocIfNotExists(newPersonUserCreateForm);
  });

  beforeEach(async () => {
    await utils.saveDocs([district]);    
  });

  afterEach(async () => {
    await utils.deleteUsers(newUsers.map(username => ({ username })));
    newUsers.length = 0;
    await utils.revertDb([/^form:/], true);
    await browser.reloadSession();
    await browser.url('/');
  });

  it('Creates a new user while offline', async () => {
    await utils.createUsers([offlineUser]);
    newUsers.push(offlineUser.username);

    await utils.updateSettings(settings, 'sentinel');
    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
    await browser.throttle('offline');
    await commonPage.goToPeople(district._id);
  
    await contactsPage.addPerson({ name: contactName, phone: '+40755696969' });

    await browser.throttle('online');
    await sentinelUtils.waitForSentinel();
    await commonPage.syncWithoutWaitForSuccess();

    await verifyUserCreation();
  });

  it('creates a new user while online', async () => {
    await utils.createUsers([onlineUser]);
    newUsers.push(onlineUser.username);

    await utils.updateSettings(settings, 'sentinel');
    await loginPage.login(onlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(district._id);
  
    await contactsPage.addPerson({ name: contactName, phone: '+40755696969' });
    await sentinelUtils.waitForSentinel();

    await verifyUserCreation();
  });

  it('Creates a new user when adding a person while adding a place', async () => {
    await utils.createUsers([offlineUser]);
    newUsers.push(offlineUser.username);

    await utils.updateSettings(settings, 'sentinel');
    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(district._id);
    await contactsPage.addPlace({ 
      type: 'health_center', 
      placeName: 'HC1', 
      contactName: contactName, 
      phone: '+40755696969' 
    });
    
    await commonPage.syncWithoutWaitForSuccess();
    await sentinelUtils.waitForSentinel();
    await contactsPage.selectLHSRowByText(contactName);

    await verifyUserCreation();
  });

  it('Does not create a new user when the transition is disabled', async () => {
    await utils.createUsers([offlineUser]);
    newUsers.push(offlineUser.username);

    await utils.updateSettings(settingsNoTransitions, 'sentinel');
    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(district._id);

    await contactsPage.addPerson({ name: contactName, phone: '+40755696969' });

    await commonPage.syncWithoutWaitForSuccess();
    await sentinelUtils.waitForSentinel();
    await contactsPage.selectLHSRowByText(contactName);
    const chwContactId = await contactsPage.getCurrentContactId();
    const { transitions } = await sentinelUtils.getInfoDoc(chwContactId);

    expect(transitions.create_user_for_contacts).to.be.undefined;


    const additionalUsers = await utils.getUserSettings({ contactId: chwContactId });
    expect(additionalUsers).to.be.empty;
  });

  it.skip('Does not create a new user when the transition fails', async () => {
    await utils.createUsers([offlineUser]);
    newUsers.push(offlineUser.username);

    await utils.updateSettings(settings, 'sentinel');
    await loginPage.login(offlineUser);
    await commonPage.goToPeople(offlineUser.contact._id);

    await contactsPage.createNewAction(newPersonUserCreateForm.title);
    await newPersonUserCreatePage.submitForm({ name: contactName, phone: '+40755' });
    await commonPage.waitForPageLoaded();

    await commonPage.syncWithoutWaitForSuccess();
    await sentinelUtils.waitForSentinel();
    await contactsPage.selectLHSRowByText(contactName);
    const chwContactId = await contactsPage.getCurrentContactId();
    const { transitions } = await sentinelUtils.getInfoDoc(chwContactId);
    expect(transitions.create_user_for_contacts.ok).to.be.false;
  });
});
