const path = require('path');
const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const { buildExtensionDoc } = require('@page-objects/default/ui-extensions/ui-extensions.wdio.page');
const { hamburgerMenuItemByOption, closeReloadModal } = require('@page-objects/default/common/common.wdio.page');
const chtDbUtils = require('@utils/cht-db');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const { getTelemetry, destroyTelemetryDb } = require('@utils/telemetry');

const EXTENSIONS_DIR = path.join(__dirname, 'ui-extensions');

describe('UI Extensions tab', () => {
  const places = placeFactory.generateHierarchy();
  const districtHospitalId = places.get('district_hospital')._id;
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
      buildExtensionDoc(EXTENSIONS_DIR, 'header-tab'),
      buildExtensionDoc(EXTENSIONS_DIR, 'sidebar-tab'),
      buildExtensionDoc(EXTENSIONS_DIR, 'error'),
      ...places.values(),
      supervisorPerson
    ]);
    await utils.createUsers([offlineUser, onlineUser]);
  });

  after(async () => {
    await utils.revertDb([/^form:/], true);
    await utils.deleteUsers([offlineUser, onlineUser]);
  });

  [
    ['online', onlineUser],
    ['offline', offlineUser],
  ].forEach(([userType, user]) => describe(`Logged in as an ${userType} user`, () => {
    before(async () => {
      await loginPage.login(user);
      await closeReloadModal(true);
    });

    after(async () => {
      // Wait for hamburger menu to fully close before logging out
      await browser.pause(500);
      await commonPage.logout();
    });

    afterEach(async () => {
      await destroyTelemetryDb();
    });

    describe('header_tab extension', () => {
      const HEADER_TAB_ID = 'ui-extension-header-tab-tab';

      it('renders the extension as a tab in the header', async () => {
        const [,tabLabel] = await commonPage.getAllButtonLabelsNames();
        expect(tabLabel).to.equal('Minimal');
        const [,tabIcon] = await commonPage.getAllButtonFaIconClasses();
        expect(tabIcon).to.equal('fa-question-circle');

        const headerTab = await $(`#${HEADER_TAB_ID}`);
        expect(await headerTab.isDisplayed()).to.be.true;
      });

      it('renders the extension content when navigating to the tab', async () => {
        await $(`#${HEADER_TAB_ID}`).click();
        await commonPage.waitForPageLoaded();

        const customElement = await $('#ui-element-tab cht-header-tab');
        await customElement.waitForDisplayed();
        expect(await customElement.getText()).to.equal('Hello world');

        const telemetries = await getTelemetry(`ui-extension:header-tab:render`, user.username);
        expect(telemetries).to.have.lengthOf(1);
      });
    });

    describe('sidebar_tab extension', () => {
      it('renders the extension as a link in the sidebar menu', async () => {
        await commonPage.openHamburgerMenu();
        // Translated title
        const menuOption = await hamburgerMenuItemByOption('Installation checks');
        await menuOption.waitForDisplayed();
        // Icon from resources
        const resourceIcon = await (await menuOption.parentElement()).$('.nav-icon .resource-icon');
        expect(await resourceIcon.getAttribute('title')).to.equal('icon-nurse');
      });

      it('renders the extension content when navigating to the tab', async () => {
        const menuOption = await hamburgerMenuItemByOption('Installation checks');
        await menuOption.click();
        await commonPage.waitForPageLoaded();

        const toolBarTitle = await $('.tool-bar h2.ellipsis-title');
        await toolBarTitle.waitForDisplayed();
        expect((await toolBarTitle.getText()).trim()).to.equal('Installation checks');

        const toolBarStyle = await $('.tool-bar').getAttribute('style');
        expect(toolBarStyle).to.contain('#9BBE6F');

        const customElement = await $('#ui-element-tab cht-sidebar-tab');
        await customElement.waitForExist();

        const shadowContent = await browser.execute(() => {
          const el = document.querySelector('#ui-element-tab cht-sidebar-tab');
          return {
            title: el.shadowRoot.querySelector('h2')?.textContent,
            imgSrc: el.shadowRoot.querySelector('img')?.getAttribute('src'),
          };
        });
        // Uses injected translate function
        expect(shadowContent.title).to.equal('with-resources is starting');
        expect(shadowContent.imgSrc).to.match(/^data:image\/png;base64,.+/);

        const telemetries = await getTelemetry(`ui-extension:sidebar-tab:render`, user.username);
        expect(telemetries).to.have.lengthOf(1);
      });
    });
  }));

  describe('handles errors', () => {
    it('records a feedback document for error in UI Extension', async () => {
      await loginPage.login(offlineUser);
      await closeReloadModal();

      await commonPage.openHamburgerMenu();
      const menuOption = await hamburgerMenuItemByOption('With Error');
      const matIcon = await (await menuOption.parentElement()).$('mat-icon');
      expect(await matIcon.getAttribute('class')).to.contain('fa-ban');
      await menuOption.click();
      await commonPage.waitForPageLoaded();

      const feedbackDocs = await chtDbUtils.getFeedbackDocs();
      expect(feedbackDocs.length).to.be.greaterThan(0);
      expect(feedbackDocs).to.have.length(1);
      expect(feedbackDocs[0].info.message).to.equal('Error from UI Extension');
      await chtDbUtils.clearFeedbackDocs();
    });
  });
});
