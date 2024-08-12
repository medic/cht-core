const commonElements = require('@page-objects/default/common/common.wdio.page.js');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page.js');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const utils = require('@utils');
const path = require('path');
const constants = require('@constants');
const chtConfUtils = require('@utils/cht-conf');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const reportFactory = require('@factories/cht/reports/generic-report');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');

describe('Contact details page.', () => {
  describe('Permissions to show reports and tasks', () => {
    const DOCS_DISPLAY_LIMIT = 50;
    const ROLE = 'notchw';

    const parent = placeFactory.place().build({_id: 'dist1', type: 'district_hospital'});
    const user = userFactory.build({username: 'offlineuser', roles: [ROLE]});
    const patient = personFactory.build({parent: {_id: user.place._id, parent: {_id: parent._id}}});

    const updateSettings = async (settings) => {
      await utils.revertSettings(true);
      await utils.updateSettings(settings, true);
    };

    const waitForContactLoaded = async (expectTasks) => {
      await commonElements.waitForPageLoaded();
      await contactPage.waitForContactLoaded();
      if (expectTasks) {
        // contact loaded only waits for contact summary (which requires reports)
        // tasks are loaded afterwards and there is no visual indication of them being loaded, or still loading
        return browser.waitUntil(async () => {
          return await (await contactPage.tasksCardSelectors.rhsTaskListElement()).isDisplayed();
        });
      }

      // if we expect _not_ to see tasks, wait so we make sure they have enough time to not appear
      return browser.pause(1000);
    };

    const newReports = Array
      .from({length: 40})
      .map(() => reportFactory.report().build(
        {form: 'pregnancy_danger_sign'},
        {
          patient,
          submitter: user.contact,
          fields: {t_danger_signs_referral_follow_up: 'yes'},
        }
      ));

    const oldReportDate = new Date();
    oldReportDate.setMonth(new Date().setMonth() - 4);

    const oldReports = Array
      .from({length: 20})
      .map(() => reportFactory.report().build(
        {form: 'pregnancy', reported_date: oldReportDate},
        {
          patient,
          submitter: user.contact,
          fields: {t_danger_signs_referral_follow_up: 'yes'},
        }
      ));

    const pregnancyReport = pregnancyFactory.build({
      fields: {
        patient_id: patient._id,
        patient_uuid: patient._id,
        patient_name: patient.name,
      },
    });

    const updatePermissions = async (roleValue, addPermissions, removePermissions = []) => {
      const settings = await utils.getSettings();
      settings.roles[roleValue] = {offline: true};
      addPermissions.map(permission => settings.permissions[permission].push(roleValue));
      removePermissions.forEach(permission => {
        settings.permissions[permission] = settings.permissions[permission].filter(r => r !== roleValue);
      });
      await updateSettings({roles: settings.roles, permissions: settings.permissions});
    };

    before(async () => {
      const permissions = ['can_view_contacts', 'can_view_contacts_tab', 'can_view_reports', 'can_view_tasks'];
      await updatePermissions(ROLE, permissions);

      await utils.saveDocs([parent, patient, ...newReports, ...oldReports, pregnancyReport]);
      await utils.createUsers([user]);

      await loginPage.login(user);
      await commonElements.waitForPageLoaded();
    });

    after(async () => {
      await utils.revertSettings(true);
    });

    it('should show reports and tasks when permissions are enabled', async () => {
      await commonElements.goToPeople(patient._id, true);
      expect(await (await contactPage.contactCardSelectors.contactCardName()).getText()).to.equal(patient.name);
      await waitForContactLoaded(true);

      expect(await (await contactPage.reportsCardSelectors.rhsReportListElement()).isDisplayed()).to.equal(true);
      expect(await (await contactPage.tasksCardSelectors.rhsTaskListElement()).isDisplayed()).to.equal(true);

      expect((await contactPage.getAllRHSReportsNames()).length).to.equal(41);
      expect((await contactPage.getAllRHSTaskNames()).length).to.deep.equal(DOCS_DISPLAY_LIMIT);

      await contactPage.filterReportViewAll();
      expect((await contactPage.getAllRHSReportsNames()).length).to.equal(DOCS_DISPLAY_LIMIT);
    });

    it('should show contact summary that has the full context for reports > 50' +
      ' validate that the pregnancy card is always displayed', async () => {

      expect(await contactPage.pregnancyCardSelectors.pregnancyCard().isDisplayed()).to.be.true;
      const pregnancyCardInfo = await contactPage.getPregnancyCardInfo();
      expect(pregnancyCardInfo.weeksPregnant).to.equal('12');
      expect(pregnancyCardInfo.risk).to.equal('High risk');
    });

    it('should not show reports when permission is disabled', async () => {
      await updatePermissions(ROLE, [], ['can_view_reports']);
      await commonElements.sync(true);
      await browser.refresh();
      await waitForContactLoaded(true);

      expect(await (await contactPage.reportsCardSelectors.rhsReportListElement()).isDisplayed()).to.equal(false);
      expect(await (await contactPage.tasksCardSelectors.rhsTaskListElement()).isDisplayed()).to.equal(true);
      expect((await contactPage.getAllRHSTaskNames()).length).to.deep.equal(DOCS_DISPLAY_LIMIT);
    });

    it('should not show tasks when permission is disabled', async () => {
      await updatePermissions(ROLE, ['can_view_reports'], ['can_view_tasks']);
      await commonElements.sync(true);
      await browser.refresh();
      await waitForContactLoaded(false);

      expect(await (await contactPage.reportsCardSelectors.rhsReportListElement()).isDisplayed()).to.equal(true);
      expect(await (await contactPage.tasksCardSelectors.rhsTaskListElement()).isDisplayed()).to.equal(false);
      expect((await contactPage.getAllRHSReportsNames()).length).to.equal(41);
    });
  });

  describe('Contact summary error', () => {
    const places = placeFactory.generateHierarchy();
    const clinic = places.get('clinic');

    const patient = personFactory.build({
      name: 'Patient',
      phone: '+50683444444',
      parent: { _id: clinic._id, parent: clinic.parent }
    });

    before(async () => {
      await chtConfUtils.initializeConfigDir();
      const contactSummaryFile = path.join(__dirname, 'config/contact-summary-error-config.js');

      const { contactSummary } = await chtConfUtils.compileNoolsConfig({ contactSummary: contactSummaryFile });
      await utils.updateSettings({ contact_summary: contactSummary }, true);

      await utils.saveDocs([...places.values(), patient]);
    });

    after(async () => {
      await utils.revertSettings(true);
    });

    it('should show error log for bad config', async () => {
      await loginPage.cookieLogin();
      await (await commonPage.goToPeople(patient._id));

      const { errorMessage, url, username, errorStack } = await commonPage.getErrorLog();

      expect(username).to.equal(constants.USERNAME);
      expect(url).to.equal(constants.API_HOST);
      expect(errorMessage).to.equal('Error fetching people');
      expect(await (await errorStack.isDisplayed())).to.be.true;
      expect(await (await errorStack.getText())).to
        .include('Error: Configuration error');
    });
  });
});

