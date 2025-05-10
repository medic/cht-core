const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const dataFactory = require('@factories/cht/generate');
const searchPage = require('@page-objects/default/search/search.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const utils = require('@utils');
const chtConfUtils = require('@utils/cht-conf');
const path = require('path');
const { generateScreenshot, isMobile } = require('@utils/screenshots');

describe('Contact and User Management', () => {
  const updateContactSummarySettings = async () => {
    await chtConfUtils.initializeConfigDir();
    const contactSummaryFile = path.join(__dirname, 'config/contact-summary.templated.js');
    const contactSummaryExtrasFile = path.join(__dirname, 'config/contact-summary-extras.js');
    const { contactSummary } = await chtConfUtils.compileNoolsConfig({
      contactSummary: contactSummaryFile,
      contactSummaryExtras: contactSummaryExtrasFile
    });
    await utils.updateSettings(
      { contact_summary: contactSummary },
      { revert: true, ignoreReload: true, refresh: true, sync: true }
    );
    await commonPage.waitForPageLoaded();
  };

  const compileAndUploadForms = async () => {
    await chtConfUtils.initializeConfigDir();
    const formsPath = path.join(__dirname, 'forms');
    await chtConfUtils.compileAndUploadAppForms(formsPath);
  };

  const docs = dataFactory.createHierarchy({
    name: 'Janet Mwangi',
    user: true,
    nbrClinics: 10,
    nbrPersons: 4,
    useRealNames: true,
  });

  before(async () => {
    await utils.saveDocs([...docs.places, ...docs.clinics, ...docs.persons, ...docs.reports]);
    await utils.createUsers([docs.user]);
    await utils.addTranslations('en', {'contact.last.visit.unknown': 'Last Visited'});
    await loginPage.login(docs.user);
    await updateContactSummarySettings();
  });

  after(async () => {
    await utils.deleteUsers([docs.user]);
    await utils.revertDb([/^form:/], true);
    await utils.revertSettings();
  });

  afterEach(async () => {
    await commonPage.goToBase();
  });

  describe('Contact and user overview', () => {
    it('should show contacts list, search, profiles (person and family), '+
      'contact summary', async function() {
      await commonPage.goToPeople();
      expect(await commonPage.isPeopleListPresent()).to.be.true;
      await generateScreenshot('people', 'list');
      await searchPage.performSearch('Beatrice');
      await generateScreenshot('people', 'search');
      await searchPage.clearSearch();
      await contactPage.selectLHSRowByText('Beatrice Bass Family');
      await searchPage.clearSearch();
      await generateScreenshot('people', 'profile-family');
      await commonPage.goToBase();
      await commonPage.goToPeople();
      await contactPage.selectLHSRowByText('Beatrice Bass');
      await generateScreenshot('people', 'profile-person');
    });

    it('should show condition cards', async function() {
      if (!await isMobile()){
        this.skip();
      }
      await commonPage.goToPeople();
      expect(await commonPage.isPeopleListPresent()).to.be.true;
      await contactPage.selectLHSRowByText('Beatrice Bass');
      await contactPage.pregnancyCardSelectors.pregnancyCard().scrollIntoView();
      await generateScreenshot('people', 'condition-card-active-pregnancy');
      await commonPage.goToBase();
      await commonPage.goToPeople();
      await contactPage.selectLHSRowByText('John Bass');
      await contactPage.inmunizationCardSelectors.inmunizationCard().scrollIntoView();
      await generateScreenshot('people', 'condition-card-inmunization');
    });

    it('should show profiles (area and branch)', async function() {
      if (!await isMobile()){
        this.skip();
      }
      await commonPage.logout();
      await loginPage.cookieLogin();
      await commonPage.goToPeople();
      expect(await commonPage.isPeopleListPresent()).to.be.true;
      await contactPage.selectLHSRowByText(`Janet Mwangi's Area`);
      await generateScreenshot('people', 'profile-area');
      await commonPage.goToBase();
      await commonPage.goToPeople();
      await contactPage.selectLHSRowByText(`Kiambu Branch`);
      await generateScreenshot('people', 'profile-branch');
      await commonPage.goToBase();
      await commonPage.logout();
      await loginPage.login(docs.user);
    });

    it('should show UHC sort', async function() {
      if (!await isMobile()){
        this.skip();
      }
      await utils.updatePermissions(docs.user.roles, ['can_view_uhc_stats', 'can_view_last_visited_date'], [], {
        ignoreReload: true,
        revert: true,
        refresh: true,
        sync: true
      });
      await commonPage.waitForPageLoaded();
      await commonPage.goToPeople();
      await contactPage.selectSortOrder('By date last visited');
      await contactPage.openSortMenu();
      await generateScreenshot('people', 'sort');
    });

    it('should show cares guides', async function() {
      if (!await isMobile()){
        this.skip();
      }
      await compileAndUploadForms();
      await utils.updatePermissions(docs.user.roles, [], ['can_view_call_action', 'can_view_message_action'], {
        ignoreReload: true,
        revert: true,
        refresh: true,
        sync: true
      });
      await commonPage.waitForPageLoaded();
      await commonPage.goToPeople();
      expect(await commonPage.isPeopleListPresent()).to.be.true;
      await contactPage.selectLHSRowByText('Dana Dearborn');
      await commonPage.clickFastActionFAB({ waitForList: false });
      await generateScreenshot('people', 'care-guides');
    });
  });
});
