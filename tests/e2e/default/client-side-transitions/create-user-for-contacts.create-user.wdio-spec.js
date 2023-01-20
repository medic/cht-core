const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const messagesUtils = require('../../../utils/messages');
const placeFactory = require('../../../factories/cht/contacts/place');
const userFactory = require('../../../factories/cht/users/users');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const contactsPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
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

  const supervisorUser = utils.deepFreeze(userFactory.build({
    username: 'supervisor',
    place: district._id,
  })); 

  beforeEach(async () => {
    await utils.saveDocs([district]);
    await utils.createUsers([supervisorUser]);
    newUsers.push(supervisorUser.username);
  });

  afterEach(async () => {
    await utils.deleteUsers(newUsers.map(username => ({ username })));
    newUsers.length = 0;
    await utils.revertDb([/^form:/], true);
    await browser.reloadSession();
    await browser.url('/');
  });

  it.skip('creates a new user while offline', async () => {
    await utils.updateSettings(settings, 'sentinel');
    await loginPage.login(supervisorUser);
    await browser.throttle('offline');

    // TODO create contact

    await browser.throttle('online');
    await commonPage.syncWithoutWaitForSuccess();

    await sentinelUtils.waitForSentinel();
    const chwContactId = 'TODO';
    const { transitions } = await sentinelUtils.getInfoDoc(chwContactId);

    // Transition successful
    expect(transitions.create_user_for_contacts.ok).to.be.true;
    // Original contact updated to COMPLETE
    const finalChwContact = await utils.getDoc(chwContactId);
    expect(finalChwContact.user_for_contact).to.deep.equal({
      create: { add: 'true' }
    });

    // New user created
    const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: chwContactId });
    expect(additionalUsers).to.be.empty;
    newUsers.push(newUserSettings.name);
    const loginLink = await messagesUtils.getTextedLoginLink(newUserSettings);

    // TODO log out
    // Open the texted link
    await browser.url(loginLink);
    await commonPage.waitForPageLoaded();
    const [cookie] = await browser.getCookies('userCtx');
    expect(cookie.value).to.include(newUserSettings.name);
  });

  it.skip('creates a new user while online', async () => {
    await utils.updateSettings(settings, 'sentinel');
    await loginPage.login(supervisorUser);

    // create contact
  });

  it('Creates a new user when adding a person while adding a place', async () => {
    await utils.updateSettings(settings, 'sentinel');
    await loginPage.login(supervisorUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(district._id);
    await contactsPage.addPlace({ 
      type: 'health_center', 
      placeName: 'HC1', 
      contactName: contactName, 
      phone: '+40755696969' });
    
    await commonPage.syncWithoutWaitForSuccess();
    await sentinelUtils.waitForSentinel();
    await contactsPage.selectLHSRowByText(contactName);
    const chwContactId = await contactsPage.getCurrentContactId();
    const { transitions } = await sentinelUtils.getInfoDoc(chwContactId);

    // Transition successful
    expect(transitions.create_user_for_contacts.ok).to.be.true;
    // Original contact updated to COMPLETE
    const finalChwContact = await utils.getDoc(chwContactId);
    expect(finalChwContact.user_for_contact).to.deep.equal({
      create: { add: 'true' }
    });

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
  });

  it('Does not create a new user when the transition is disabled', async () => {
    await utils.updateSettings(settingsNoTransitions, 'sentinel');
    await loginPage.login(supervisorUser);
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
});
