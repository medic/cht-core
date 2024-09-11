const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const dataFactory = require('@factories/cht/generate');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');

const utils = require('@utils');
const sharp = require('sharp');
const MOBILE_WIDTH = 320;
const MOBILE_HEIGHT = 570;
const DESKTOP_WIDTH = 1000;
const DESKTOP_HEIGHT = 820;

const isMobile = async () => {
  const { width } = await browser.getWindowSize();
  return width < 768;
};

const resizeWindowForScreenshots = async () => {
  if (await isMobile()) {
    await browser.emulateDevice({
      viewport: {
        width: MOBILE_WIDTH,
        height: MOBILE_HEIGHT,
        isMobile: true,
        hasTouch: true,
      },
      userAgent: 'my custom user agent'
    });
  } else {
    await browser.setWindowSize(DESKTOP_WIDTH, DESKTOP_HEIGHT);
  }
};

const generateScreenshot = async (scenario, step) => {
  // Determine the device type
  const device = await isMobile() ? 'mobile' : 'desktop';

  // Construct the filename
  const filename = `./${scenario}_${step}_${device}.png`;

  const fullScreenshotBuffer = Buffer.from(await browser.takeScreenshot(), 'base64');
  let extractWidth;
  let extractHeight;
  let screenshotSharp = sharp(fullScreenshotBuffer);

  // Get the metadata of the screenshot
  const metadata = await screenshotSharp.metadata();

  if (await isMobile()) {
    // Ensure we don't extract more than the actual image size
    extractWidth = Math.min(MOBILE_WIDTH, metadata.width);
    extractHeight = Math.min(MOBILE_HEIGHT, metadata.height);
    screenshotSharp = screenshotSharp.extract({
      width: extractWidth,
      height: extractHeight,
      left: 0,
      top: 0
    });
  } else {
    extractWidth = Math.min(DESKTOP_WIDTH, metadata.width);
    extractHeight = Math.min(DESKTOP_HEIGHT, metadata.height);
  }

  // Resize the image to 2x for high-density displays
  screenshotSharp = screenshotSharp.resize(extractWidth * 2, extractHeight * 2);

  // Save the resized image
  await screenshotSharp.toFile(filename);
};

describe('Contact Page | List View (Access)', () => {
  const updatePermissions = async (roleValue, addPermissions, removePermissions = []) => {
    const settings = await utils.getSettings();
    settings.roles[roleValue] = {offline: true};
    addPermissions.map(permission => settings.permissions[permission].push(roleValue));
    removePermissions.forEach(permission => {
      settings.permissions[permission] = settings.permissions[permission].filter(r => r !== roleValue);
    });
    await utils.updateSettings(
      { roles: settings.roles, permissions: settings.permissions },
      { revert: true, ignoreReload: true, refresh: true, sync: true }
    );

  };

  const docs = dataFactory.createHierarchy({
    name: 'Janet Mwangi',
    user: true,
    nbrClinics: 10,
    nbrPersons: 4,
  });

  before(async () => {
    await resizeWindowForScreenshots();
    await utils.saveDocs([...docs.places, ...docs.clinics, ...docs.persons, ...docs.reports]);
    await utils.createUsers([docs.user]);
  });

  after(async () => {
    await utils.deleteUsers([docs.user]);
    await utils.revertDb([/^form:/], true);
  });

  beforeEach(async () => {
    await loginPage.login(docs.user);
  });

  afterEach(async () => {
    await commonPage.logout();
  });

  describe('Log in', () => {
    it('having can_view_contact and can_view_contacts_tab permissions, ' +
      'should show contacts page as tab, hidden from menu option', async () => {
      await (await commonPage.contactsTab()).waitForDisplayed();
      await generateScreenshot('ContactPage', 'TabVisible');

      await commonPage.openHamburgerMenu();
      await generateScreenshot('ContactPage', 'MenuOpened');

      await commonPage.closeHamburgerMenu();
      await commonPage.goToPeople();
      expect(await commonPage.isPeopleListPresent());
      await generateScreenshot('ContactPage', 'PeopleListVisible');

      await commonPage.goToReports();
      const firstReport = await reportsPage.firstReport();
      await firstReport.waitForClickable();
      await reportsPage.openSelectedReport(firstReport);
      await reportsPage.patientName().waitForClickable();
      await generateScreenshot('ContactPage', 'ReportsVisible');

      await reportsPage.patientName().click();
      await contactPage.waitForContactLoaded();
      await generateScreenshot('ContactPage', 'ContactLoaded');
      await commonPage.goToMessages();
    });

    it('not having can_view_contact and having can_view_contacts_tab permissions, ' +
      'should hide contacts page as tab, hidden from menu option as well', async () => {
      await updatePermissions('chw', [], ['can_view_contacts']);
      await commonPage.waitForPageLoaded();
      await commonPage.goToMessages();
      await (await commonPage.contactsTab()).waitForDisplayed({ reverse: true });
      await generateScreenshot('ContactPage', 'NoTabVisible');
      await commonPage.openHamburgerMenu();
      await (await commonPage.contactsButton()).waitForClickable({ reverse: true });
      await generateScreenshot('ContactPage', 'NoMenuOption');
      await commonPage.closeHamburgerMenu();
      await commonPage.goToReports();
      const firstReport = await reportsPage.firstReport();
      await (firstReport).waitForClickable();
      await reportsPage.openSelectedReport(firstReport);
      await (reportsPage.patientName()).waitForClickable();
      await generateScreenshot('ContactPage', 'ReportView_NoContacts');
      await reportsPage.patientName().click();
      await generateScreenshot('ContactPage', 'Report_NoContactLoaded');
      await commonPage.goToMessages();
    });

    it('having can_view_contact and not having can_view_contacts_tab permissions, ' +
      'should hide contacts page as tab, show from menu option', async () => {
      await updatePermissions('chw', ['can_view_contacts'], ['can_view_contacts_tab']);
      await commonPage.waitForPageLoaded();
      await commonPage.goToMessages();
      await (await commonPage.contactsTab()).waitForDisplayed({ reverse: true });
      await generateScreenshot('ContactPage', 'NoTabVisible');
      await commonPage.openHamburgerMenu();
      await (await commonPage.contactsButton()).waitForClickable();
      await generateScreenshot('ContactPage', 'MenuOptionVisible');
      await (await commonPage.contactsButton()).click();
      expect(await commonPage.isPeopleListPresent());
      await commonPage.waitForPageLoaded();
      await generateScreenshot('ContactPage', 'ContactsInPeopleList');
      await commonPage.goToReports();
      const firstReport = await reportsPage.firstReport();
      await (firstReport).waitForClickable();
      await reportsPage.openSelectedReport(firstReport);
      await (reportsPage.patientName()).waitForClickable();
      await generateScreenshot('ContactPage', 'ReportView_WithContacts');
      await reportsPage.patientName().click();
      await contactPage.waitForContactLoaded();
      await generateScreenshot('ContactPage', 'Report_ContactLoaded');
      await commonPage.goToMessages();
    });

    it('should hide contacts page as a tab and from the menu ' +
      'if user lacks can_view_contact and can_view_contacts_tab permissions', async () => {
      await updatePermissions('chw', [], ['can_view_contacts_tab', 'can_view_contacts']);
      await commonPage.waitForPageLoaded();
      await commonPage.goToMessages();
      await (await commonPage.contactsTab()).waitForDisplayed({ reverse: true });
      await generateScreenshot('ContactPage', 'NoTabVisible_NoPerms');
      await commonPage.openHamburgerMenu();
      await (await commonPage.contactsButton()).waitForClickable({ reverse: true });
      await generateScreenshot('ContactPage', 'NoMenuOption_NoPerms');
      await commonPage.closeHamburgerMenu();
      await commonPage.goToReports();
      const firstReport = await reportsPage.firstReport();
      await (firstReport).waitForClickable();
      await reportsPage.openSelectedReport(firstReport);
      await (reportsPage.patientName()).waitForClickable();
      await generateScreenshot('ContactPage', 'ReportView_NoContacts_NoPerms');
      await reportsPage.patientName().click();
      await generateScreenshot('ContactPage', 'Report_NoContactLoaded_NoPerms');
      await commonPage.goToMessages();
    });
  });
});
