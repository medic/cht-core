const searchPage = require('@page-objects/default/search/search.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const utils = require('@utils');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');

describe('Contact Search', () => {
  const places = placeFactory.generateHierarchy();
  const districtHospitalId = places.get('district_hospital')._id;

  const sittuHealthCenter = placeFactory.place().build({
    name: 'Sittu Health Center',
    type: 'health_center',
    parent: { _id: districtHospitalId, parent: { _id: '' } }
  });

  const potuHealthCenter = placeFactory.place().build({
    name: 'Potu Health Center',
    type: 'health_center',
    parent: { _id: districtHospitalId, parent: { _id: '' } }
  });

  const sittuPerson = personFactory.build({
    name: 'Sittu',
    parent: { _id: sittuHealthCenter._id, parent: sittuHealthCenter.parent }
  });

  const potuPerson = personFactory.build({
    name: 'Potu',
    parent: { _id: sittuHealthCenter._id, parent: sittuHealthCenter.parent }
  });

  const supervisorPerson = personFactory.build({
    name: 'Supervisor',
    parent: { _id: districtHospitalId }
  });

  const offlineUser = userFactory.build({
    username: 'offline-search-user',
    place: districtHospitalId,
    roles: ['chw_supervisor'],
    contact: supervisorPerson._id
  });
  const onlineUser = userFactory.build({
    username: 'online-search-user',
    place: districtHospitalId,
    roles: ['program_officer'],
    contact: supervisorPerson._id
  });

  before(async () => {
    await utils.saveDocs([
      ...places.values(), sittuHealthCenter, sittuPerson, potuHealthCenter, potuPerson, supervisorPerson
    ]);
    await utils.createUsers([offlineUser, onlineUser]);
  });

  after(() => utils.deleteUsers([offlineUser, onlineUser]));

  [
    ['online', onlineUser],
    ['offline', offlineUser],
  ].forEach(([userType, user]) => describe(`Logged in as an ${userType} user`, () => {
    before(async () => {
      await loginPage.login(user);
      await commonPage.goToPeople();
    });

    after(commonPage.logout);

    it('search by NON empty string should display results which contains match and clears search', async () => {
      await contactPage.getAllLHSContactsNames();

      await searchPage.performSearch('sittu');
      expect(await contactPage.getAllLHSContactsNames()).to.have.members([
        sittuPerson.name,
        sittuHealthCenter.name,
      ]);

      await searchPage.clearSearch();
      expect(await contactPage.getAllLHSContactsNames()).to.have.members([
        potuHealthCenter.name,
        sittuHealthCenter.name,
        places.get('district_hospital').name,
        places.get('health_center').name,
      ]);
    });

    it('search should clear RHS selected contact', async () => {
      await contactPage.selectLHSRowByText(potuHealthCenter.name, false);
      await contactPage.waitForContactLoaded();
      expect(
        await (await contactPage.contactCardSelectors.contactCardName()).getText()
      ).to.equal(potuHealthCenter.name);

      await searchPage.performSearch('sittu');
      await contactPage.waitForContactUnloaded();
      const url = await browser.getUrl();
      expect(url.endsWith('/contacts')).to.equal(true);
    });
  }));
});
