const fs = require('fs');
const { expect } = require('chai');
const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const messagesUtils = require('../../../utils/messages');
const placeFactory = require('../../../factories/cht/contacts/place');
const userFactory = require('../../../factories/cht/users/users');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const contactsPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const addChwPage = require('../../../page-objects/default/enketo/add-chw.wdio.page');
const { BASE_URL } = require('../../../constants');
const { cookieLogin } = require('../../../page-objects/default/login/login.wdio.page');

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

  const addChwAppForm = utils.deepFreeze({
    _id: 'form:add_chw',
    internalId: 'add_chw',
    title: 'Add CHW',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer
          .from(fs.readFileSync(`${__dirname}/forms/add_chw.xml`, 'utf8'))
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

  const verifyUserNotCreated = async (expectedTransitionInfo) => {
    await sentinelUtils.waitForSentinel();
    const chwContactId = await contactsPage.getCurrentContactId();
    const { transitions } = await sentinelUtils.getInfoDoc(chwContactId);
    if(expectedTransitionInfo) {
      expect(transitions.create_user_for_contacts).to.deep.include(expectedTransitionInfo);
    } else {
      expect(transitions.create_user_for_contacts).to.be.undefined;
    }
    const finalChwContact = await utils.getDoc(chwContactId);
    expect(finalChwContact.user_for_contact.create).to.equal('true');
    const userSettings = await utils.getUserSettings({ contactId: chwContactId });
    expect(userSettings).to.be.empty;
  };

  before(async () => await utils.saveDocIfNotExists(addChwAppForm));

  beforeEach(async () => await utils.saveDocs([district]));

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
    await commonPage.sync();

    await verifyUserCreation();
  });

  it('creates a new user while online', async () => {
    await utils.updateSettings(settings, 'sentinel');
    await cookieLogin();
    await commonPage.goToPeople(district._id);
  
    await contactsPage.addPerson({ name: contactName, phone: '+40755696969' });

    await verifyUserCreation();
  });

  it('Creates a new user when adding a person while adding a place', async () => {
    await utils.updateSettings(settings, 'sentinel');
    await cookieLogin();
    await commonPage.goToPeople(district._id);

    await contactsPage.addPlace({ 
      type: 'health_center', 
      placeName: 'HC1', 
      contactName: contactName, 
      phone: '+40755696969' 
    });
    await contactsPage.selectLHSRowByText(contactName);

    await verifyUserCreation();
  });

  it('Does not create a new user when the transition is disabled', async () => {
    await utils.updateSettings(settingsNoTransitions, 'sentinel');
    await cookieLogin();
    await commonPage.goToPeople(district._id);

    await contactsPage.addPerson({ name: contactName, phone: '+40755696969' });
    await contactsPage.selectLHSRowByText(contactName);

    await verifyUserNotCreated();
  });

  it('creates a new user when contact is added from app form', async () => {
    await utils.updateSettings(settings, 'sentinel');
    await cookieLogin();
    await commonPage.goToPeople(district._id);

    await contactsPage.createNewAction(addChwAppForm.title);
    await addChwPage.submitForm({ name: contactName });
    await contactsPage.selectLHSRowByText(contactName);

    await verifyUserCreation();
  });

  it('Does not create a new user when the transition fails', async () => {
    await utils.updateSettings(settings, 'sentinel');
    await cookieLogin();
    await commonPage.goToPeople(district._id);

    await contactsPage.createNewAction(addChwAppForm.title);
    // Add contact with invalid phone number
    await addChwPage.submitForm({ name: contactName, phone: '+40755' });
    await contactsPage.selectLHSRowByText(contactName);

    await verifyUserNotCreated({ ok: false });
  });

  it('Does not create a new user when editing contact', async () => {
    await utils.updateSettings(settings, 'sentinel');
    await cookieLogin();
    await commonPage.goToPeople(district._id);
    await contactsPage.createNewAction(addChwAppForm.title);
    // Add contact with invalid phone number
    await addChwPage.submitForm({ name: contactName, phone: '+40755' });
    await contactsPage.selectLHSRowByText(contactName);
    await verifyUserNotCreated({ ok: false });

    // Edit contact to have valid phone number
    await contactsPage.editPerson(contactName, { phone: '+40755696969', dob: '2000-01-01' });

    // User still not created
    const chwContactId = await contactsPage.getCurrentContactId();
    const finalChwContact = await utils.getDoc(chwContactId);
    expect(finalChwContact.phone).to.equal('+40755696969');
    await verifyUserNotCreated({ ok: false });
  });
});
