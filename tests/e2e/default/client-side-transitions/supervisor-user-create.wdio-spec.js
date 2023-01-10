const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const placeFactory = require('../../../factories/cht/contacts/place');
const userFactory = require('../../../factories/cht/users/users');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const contactsPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const { BASE_URL } = require('../../../constants');

describe('supervisor user create', () => {
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

  it('Creates a new user when adding a person while adding a place', async () => {
    await utils.updateSettings(settings, 'sentinel');
    await loginPage.login(supervisorUser);
    await commonPage.goToPeople(district._id);
    await contactsPage.addPlace({ type: 'health_center', placeName: 'HC1', contactName: contactName });
    
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
      add: { status: 'COMPLETE', roles: [ 'chw' ] }
    });

    // New user created
    const [newUserSettings, ...additionalUsers] = await utils.getUserSettings({ contactId: chwContactId });
    expect(additionalUsers).to.be.empty;
    newUsers.push(newUserSettings.name);
  });

  it.skip('Does not create a new user when the transition is disabled', async () => {
    await utils.updateSettings(settingsNoTransitions, 'sentinel');
    await loginPage.login(supervisorUser);
    await commonPage.goToPeople(district._id);

    await contactsPage.addPerson(contactName, );

  });
});
