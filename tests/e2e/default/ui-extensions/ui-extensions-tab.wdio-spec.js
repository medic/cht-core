const fs = require('fs');
const path = require('path');
const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const { hamburguerMenuItemByOption, closeReloadModal } = require('@page-objects/default/common/common.wdio.page');

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
  before(async () => {
    await utils.saveDocs([
      buildExtensionDoc('header-tab'),
      buildExtensionDoc('sidebar-tab'),
    ]);
    await (await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX)).promise;
    await loginPage.cookieLogin();
    await closeReloadModal(true);
  });

  after(async () => {
    await utils.revertDb([/^form:/], true);
  });

  describe('header_tab extension', () => {
    const HEADER_TAB_ID = 'ui-extension-header-tab-tab';

    it('should render the extension as a tab in the header', async () => {
      const [tabLabel] = await commonPage.getAllButtonLabelsNames();
      expect(tabLabel).to.equal('Minimal');
      const [tabIcon] = await commonPage.getAllButtonFaIconClasses();
      expect(tabIcon).to.equal('fa-question-circle');

      const headerTab = await $(`#${HEADER_TAB_ID}`);
      expect(await headerTab.isDisplayed()).to.be.true;
    });

    it('should render the extension content when navigating to the tab', async () => {
      await $(`#${HEADER_TAB_ID}`).click();
      await commonPage.waitForPageLoaded();

      const customElement = await $('#ui-element-tab cht-header-tab');
      await customElement.waitForDisplayed();
      expect(await customElement.getText()).to.equal('Hello world');
    });
  });

  describe('sidebar_tab extension', () => {
    it('should render the extension as a link in the sidebar menu', async () => {
      await commonPage.openHamburgerMenu();
      // Translated title
      const menuOption = await hamburguerMenuItemByOption('Installation checks');
      await menuOption.waitForDisplayed();
      // Icon from resources
      const resourceIcon = await (await menuOption.parentElement()).$('.nav-icon .resource-icon');
      expect(await resourceIcon.getAttribute('title')).to.equal('icon-nurse');
    });

    it('should render the extension content when navigating to the tab', async () => {
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
    });
  });
});
