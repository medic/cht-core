const fs = require('fs');
const path = require('path');
const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const { hamburguerMenuItemByOption, closeReloadModal } = require('@page-objects/default/common/common.wdio.page');
const chtDbUtils = require('@utils/cht-db');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const { getTelemetry, destroyTelemetryDb } = require('@utils/telemetry');

const EXTENSIONS_DIR = path.join(__dirname, 'ui-extensions');

const buildExtensionDoc = (id) => {
  const properties = JSON.parse(fs.readFileSync(path.join(EXTENSIONS_DIR, `${id}.properties.json`), 'utf8'));
  const script = fs.readFileSync(path.join(EXTENSIONS_DIR, `${id}.js`), 'utf8');
  return {
    _id: `ui-extension:${id}`,
    ...properties,
    _attachments: {
      'extension.js': {
        content_type: 'application/javascript',
        data: Buffer.from(script).toString('base64'),
      },
    },
  };
};

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
      buildExtensionDoc('header-tab'),
      buildExtensionDoc('sidebar-tab'),
      buildExtensionDoc('error'),
      ...places.values(),
      supervisorPerson
    ]);
    await (await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX)).promise;
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
      await commonPage.goToPeople();
      await closeReloadModal();
    });

    after(commonPage.logout);

    afterEach(async () => {
      await destroyTelemetryDb();
    });

    describe('header_tab extension', () => {
      const HEADER_TAB_ID = 'ui-extension-header-tab-tab';

      it('renders the extension as a tab in the header', async () => {
        const [tabLabel] = await commonPage.getAllButtonLabelsNames();
        expect(tabLabel).to.equal('Minimal');
        const [tabIcon] = await commonPage.getAllButtonFaIconClasses();
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
        expect(telemetries).to.have.lengthOf(2);
      });
    });

    describe('sidebar_tab extension', () => {
      it('renders the extension as a link in the sidebar menu', async () => {
        await commonPage.openHamburgerMenu();
        // Translated title
        const menuOption = await hamburguerMenuItemByOption('Installation checks');
        await menuOption.waitForDisplayed();
        // Icon from resources
        const resourceIcon = await (await menuOption.parentElement()).$('.nav-icon .resource-icon');
        expect(await resourceIcon.getAttribute('title')).to.equal('icon-nurse');
      });

      it('renders the extension content when navigating to the tab', async () => {
        const menuOption = await hamburguerMenuItemByOption('Installation checks');
        await menuOption.click();
        await commonPage.waitForPageLoaded();

        const toolBarTitle = await $('.tool-bar h2.ellipsis-title');
        await toolBarTitle.waitForDisplayed();
        expect((await toolBarTitle.getText()).trim()).to.equal('Installation checks');

        const toolBarStyle = await $('.tool-bar').getAttribute('style');
        expect(toolBarStyle).to.contain('#9BBE6F');

        const customElement = await $('#ui-element-tab cht-sidebar-tab');
        await customElement.waitForExist();

        const title = await customElement.$('h2').getText();
        const imgSrc = await customElement.$('img').getAttribute('src');
        // Uses injected translate function
        expect(title).to.equal('with-resources is starting');
        expect(imgSrc).to.match(/^data:image\/png;base64,.+/);

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
      const menuOption = await hamburguerMenuItemByOption('With Error');
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
