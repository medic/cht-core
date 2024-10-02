const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const dataFactory = require('@factories/cht/generate');
const searchPage = require('@page-objects/default/search/search.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const sortPage = require('@page-objects/default/sort/sort.wdio.page');
const utils = require('@utils');
const chtConfUtils = require('@utils/cht-conf');
const path = require('path');
const { resizeWindowForScreenshots, generateScreenshot } = require('@utils/screenshots');

describe('Contact List Page', () => {
  const modifyRolePermissionsAndContactTypes = async (roleValue, addPermissions, removePermissions = []) => {
    const roles = [roleValue];
    const settings = await utils.getSettings();
    /*let contactTypes = settings.contact_types;

    contactTypes = contactTypes.map(contactType => {
      if (contactType.id === 'person') {
        return { ...contactType, count_visits: true };
      } else if (contactType.id === 'clinic') {
        const { count_visits, ...rest } = contactType;
        return rest;
      }
      return contactType;
    });*/

    const permissions = await utils.getUpdatedPermissions(roles, addPermissions, removePermissions);

    await utils.updateSettings(
      { roles: settings.roles, permissions: permissions},
      { revert: true, ignoreReload: true, refresh: true, sync: true }
    );
  };

  const docs = dataFactory.createHierarchy({
    name: 'Janet Mwangi',
    user: true,
    nbrClinics: 10,
    nbrPersons: 4,
    useRealNames: true,
  });

  before(async () => {
    await resizeWindowForScreenshots();
    await utils.saveDocs([...docs.places, ...docs.clinics, ...docs.persons, ...docs.reports]);
    await utils.createUsers([docs.user]);
    await utils.addTranslations('en', {'contact.last.visit.unknown': 'Last Visited'});
    /*await loginPage.login(docs.user);
    await chtConfUtils.initializeConfigDir();
    const contactSummaryFile = path.join(__dirname, 'contact-template-config.js');
    const { contactSummary } = await chtConfUtils.compileNoolsConfig({ contactSummary: contactSummaryFile });
    await utils.updateSettings(
      { contact_summary: contactSummary},
      { revert: true, ignoreReload: true, refresh: true, sync: true }
    );
    await commonPage.waitForPageLoaded();
    await commonPage.logout();*/
  });

  after(async () => {
    await utils.deleteUsers([docs.user]);
    await utils.revertDb([/^form:/], true);
  });

  beforeEach(async () => {

  });

  afterEach(async () => {
    await commonPage.goToBase();
    await commonPage.logout();
  });

  describe('Contact and user management workflow', () => {
    it('should show contacts list, search, profiles (person and family), '+
      'contact summary, condition cards and care guides', async () => {
      await loginPage.login(docs.user);
      await commonPage.goToPeople();
      expect(await commonPage.isPeopleListPresent()).to.be.true;
      await generateScreenshot('people', 'list');
      await searchPage.performSearch('Beatrice');
      await generateScreenshot('people', 'search');
      await searchPage.clearSearch();
      await contactPage.selectLHSRowByText('Beatrice Bass Family');
      await generateScreenshot('people', 'profile-family');
      await commonPage.goToBase();
      await commonPage.goToPeople();
      await contactPage.selectLHSRowByText('Beatrice Bass');
      await generateScreenshot('people', 'profile-person');
    });

    it('should show profiles (area and branch)', async () => {
      await loginPage.cookieLogin();
      await commonPage.goToPeople();
      expect(await commonPage.isPeopleListPresent()).to.be.true;
      await contactPage.selectLHSRowByText(`Janet Mwangi's Area`);
      await generateScreenshot('people', 'profile-area');
      await commonPage.goToBase();
      await commonPage.goToPeople();
      await contactPage.selectLHSRowByText(`Kiambu Branch`);
      await generateScreenshot('people', 'profile-branch');
    });

    it.only('should show UHC sort', async () => {
      await loginPage.login(docs.user);
      await modifyRolePermissionsAndContactTypes('chw', ['can_view_uhc_stats', 'can_view_last_visited_date'], []);
      await commonPage.waitForPageLoaded();
      await commonPage.goToPeople();
      await sortPage.selectSortOrder('By date last visited');
      await sortPage.openSortMenu();
      await generateScreenshot('people', 'sort');
    });
  });
});
