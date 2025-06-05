const fs = require('fs');
const uuid = require('uuid').v4;
const utils = require('@utils');
const moment = require('moment');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
const targetAggregatesPage = require('@page-objects/default/targets/target-aggregates.wdio.page');
const contactsPage = require('@page-objects/default/contacts/contacts.wdio.page.js');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const userSettingsFactory = require('@factories/cht/users/user-settings');
const personFactory = require('@factories/cht/contacts/person');
const helperFunctions = require('./utils/aggregates-helper-functions');
const targetAggregatesConfig = require('./config/target-aggregates');

describe('Target aggregates', () => {
  describe('DB admin', () => {
    before(async () => await loginPage.cookieLogin());

    after(async () => {
      await utils.revertSettings(true);
      await browser.deleteCookies();
      await browser.refresh();
    });

    afterEach(async () => await utils.revertDb([/^form:/], true));

    it('should display an empty list when there are no aggregates', async () => {
      await commonPage.goToAnalytics();
      await targetAggregatesPage.expectModulesToBeAvailable([
        '#/analytics/targets',
        '#/analytics/target-aggregates'
      ]);

      await targetAggregatesPage.goToTargetAggregates(true);
      expect((await targetAggregatesPage.aggregateList()).length).to.equal(0);
      expect(await targetAggregatesPage.loadingStatus().isDisplayed()).to.be.true;
      expect(await analyticsPage.emptySelectionNoError().isDisplayed()).to.be.true;
    });

    it('should display an error when there are aggregates but no home place', async () => {
      const settings = await utils.getSettings();
      const tasks = settings.tasks;
      tasks.targets.items[0].aggregate = true;
      await utils.updateSettings({ tasks }, { ignoreReload: true });
      await commonPage.closeReloadModal();

      await commonPage.goToAnalytics();
      await targetAggregatesPage.goToTargetAggregates(true);
      expect((await targetAggregatesPage.aggregateList()).length).to.equal(0);
      expect(await analyticsPage.emptySelectionError().isDisplayed()).to.be.true;
    });
  });

  describe('User with one or more places assigned', () => {
    const CURRENT_PERIOD = 'This month';
    const NAMES_DH1 = ['Clarissa', 'Prometheus', 'Alabama', 'Jasmine', 'Danielle'];
    const NAMES_DH2 = ['Viviana', 'Ximena', 'Esteban', 'Luis', 'Marta'];

    const TARGET_VALUES_BY_CONTACT = helperFunctions.generateTargetValuesByContact([...NAMES_DH1, ...NAMES_DH2]);

    const districtHospital1 = placeFactory.place().build({ type: 'district_hospital', name: 'District Hospital 1' });
    const districtHospital2 = placeFactory.place().build({ type: 'district_hospital', name: 'District Hospital 2' });

    const contactWithManyPlaces = personFactory.build({
      parent: { _id: districtHospital1._id, parent: { _id: districtHospital1._id } },
    });

    const onlineUser = userFactory.build({ place: districtHospital1._id, roles: ['program_officer'] });

    const userWithManyPlaces = userSettingsFactory.build({
      _id: 'org.couchdb.user:offline_many_facilities',
      name: 'offline_many_facilities',
      roles: [ 'chw' ],
      facility_id: [ districtHospital1._id, districtHospital2._id ],
      contact_id: contactWithManyPlaces._id
    });
    const userWithManyPlacesPass = uuid();

    const contactDocs = [];
    const targetDocs = [];
    Array
      .from({ length: 5 })
      .forEach((e, i) => {
        const district1Data = helperFunctions.generateContactsAndTargets(
          districtHospital1, NAMES_DH1[i], TARGET_VALUES_BY_CONTACT,
        );
        const district2Data = helperFunctions.generateContactsAndTargets(
          districtHospital2, NAMES_DH2[i], TARGET_VALUES_BY_CONTACT,
        );

        contactDocs.push(...district1Data.contacts, ...district2Data.contacts);
        targetDocs.push(...district1Data.targets, ...district2Data.targets);
      });

    const DOCS_TO_KEEP = [
      districtHospital1._id,
      districtHospital2._id,
      ...contactDocs.map(doc => doc._id),
      'fixture:user:supervisor',
      'org.couchdb.user:supervisor',
      '^target~',
      [/^form:/],
    ];

    before(async () => {
      await utils.saveDocs([
        ...contactDocs, districtHospital1, districtHospital2, contactWithManyPlaces, userWithManyPlaces
      ]);
      await utils.createUsers([onlineUser]);
      await utils.request({
        path: `/_users/${userWithManyPlaces._id}`,
        method: 'PUT',
        body: { ...userWithManyPlaces, password: userWithManyPlacesPass, type: 'user' },
      });
      await browser.url('/medic/login');
    });

    afterEach(async () => {
      await commonPage.logout();
      await utils.revertDb(DOCS_TO_KEEP, true);
    });

    describe('Online user with one place associated', () => {
      beforeEach(async () => {
        await loginPage.login(onlineUser);
        await commonPage.waitForPageLoaded();
      });

      it('should display no data when no targets are uploaded', async () => {
        await helperFunctions.updateAggregateTargetsSettings(
          targetAggregatesConfig.TARGETS_CONFIG_WITH_AND_WITHOUT_AGGREGATES, onlineUser
        );

        await commonPage.goToAnalytics();
        await targetAggregatesPage.goToTargetAggregates(true);

        const expectedContacts = helperFunctions
          .getDocsByPlace(contactDocs, districtHospital1._id)
          .map(contact => ({ _id: contact._id, name: contact.name, counter: 'No data', progress: 0 }));

        const context = {
          contacts: expectedContacts,
          period: CURRENT_PERIOD,
          isCurrentPeriod: true,
          place: districtHospital1.name
        };

        const asserts = { hasMultipleFacilities: false, contactValues: true };

        await helperFunctions.assertData(
          context, TARGET_VALUES_BY_CONTACT, targetAggregatesConfig.EXPECTED_TARGETS_NO_PROGRESS, asserts
        );
      });

      it('should display correct data', async () => {
        const expectedTargets = targetAggregatesConfig.EXPECTED_DEFAULTS_TARGETS;

        await utils.saveDocs(targetDocs);
        await helperFunctions.updateAggregateTargetsSettings(targetAggregatesConfig.TARGETS_DEFAULT_CONFIG, onlineUser);

        await commonPage.goToAnalytics();
        await targetAggregatesPage.goToTargetAggregates(true);

        const contacts = helperFunctions.getDocsByPlace(contactDocs, districtHospital1._id);

        const context = {
          contacts,
          period: CURRENT_PERIOD,
          isCurrentPeriod: true,
          place: districtHospital1.name
        };
        const asserts = { hasMultipleFacilities: false, contactValues: true };

        await helperFunctions.assertData(context, TARGET_VALUES_BY_CONTACT, expectedTargets, asserts);

        // refreshing with an open target works correctly
        const target = expectedTargets[2];
        await targetAggregatesPage.openTargetDetails(target);
        await browser.refresh();
        expect(await targetAggregatesPage.targetDetail.title(target.title).isDisplayed()).to.be.true;
        expect(await targetAggregatesPage.targetDetail.counter().getText()).to.equal(target.counter);

        await targetAggregatesPage.openSidebarFilter();
        expect((await targetAggregatesPage.sidebarFilter.optionsContainer()).length).to.equal(1);
        await targetAggregatesPage.selectFilterOption('Last month');

        context.period = helperFunctions.getLastMonth();
        context.isCurrentPeriod = false;
        asserts.contactValues = false;

        await helperFunctions.assertData(context, TARGET_VALUES_BY_CONTACT, expectedTargets, asserts);

      });

      it('should route to contact-detail on list item click and display contact summary target card', async () => {
        const targetsConfig = [
          { id: 'a_target', type: 'count', title: { en: 'what a target!' }, aggregate: true },
          { id: 'b_target', type: 'percent', title: { en: 'the most target' }, aggregate: true },
        ];
        const contactSummaryScript = fs
          .readFileSync(`${__dirname}/config/contact-summary-target-aggregates.js`, 'utf8');

        const clarissa = contactDocs.find(doc => doc.name === NAMES_DH1[0]);
        const prometheus = contactDocs.find(doc => doc.name === NAMES_DH1[1]);
        const targets = {
          'Clarissa': [
            { id: 'a_target', value: { total: 50, pass: 40 } },
            { id: 'b_target', value: { total: 20, pass: 10 } }
          ],
          'Prometheus': [
            { id: 'a_target', value: { total: 20, pass: 18 } },
            { id: 'b_target', value: { total: 40, pass: 6 } }
          ],
        };

        const targetsForContact = (contact) => {
          return helperFunctions.docTags.map(tag => ({
            _id: `target~${tag}~${contact._id}~irrelevant`,
            reporting_period: tag,
            targets: targets[contact.name],
            owner: contact._id,
            user: 'irrelevant',
            date_updated: `yesterday ${contact.name}`,
          }));
        };
        const targetDocs = [
          ...targetsForContact(clarissa),
          ...targetsForContact(prometheus),
        ];

        await utils.saveDocs(targetDocs);
        await helperFunctions.updateAggregateTargetsSettings(targetsConfig, onlineUser, contactSummaryScript);

        await commonPage.goToAnalytics();
        await targetAggregatesPage.goToTargetAggregates(true);

        const expectedTargets = [
          { id: 'a_target', title: 'what a target!', progressBar: false, counter: '58' },
          { id: 'b_target', title: 'the most target', progressBar: true, counter: '27%' },
        ];

        const expectedContacts = helperFunctions
          .getDocsByPlace(contactDocs, districtHospital1._id)
          .map(contact => ({ _id: contact._id, name: contact.name, counter: 'No data', progress: 0 }));

        const context = {
          contacts: expectedContacts,
          period: CURRENT_PERIOD,
          isCurrentPeriod: true,
          place: districtHospital1.name
        };
        const asserts = { hasMultipleFacilities: false, contactValues: false };

        await helperFunctions.assertData(context, TARGET_VALUES_BY_CONTACT, expectedTargets, asserts);

        await targetAggregatesPage.openTargetDetails(expectedTargets[0]);
        await targetAggregatesPage.clickOnTargetAggregateListItem(clarissa._id);
        // wait until contact-summary is loaded
        expect(await contactsPage.getContactInfoName()).to.equal('Clarissa');
        // assert that the activity card exists and has the right fields.
        expect(await contactsPage.getContactCardTitle()).to.equal('Activity this month');

        await helperFunctions.validateCardFields(['yesterday Clarissa', moment().format('YYYY-MM'), '40', '50%']);

        await browser.back();

        const firstTargetItem =
          await targetAggregatesPage.getTargetItem(expectedTargets[0], CURRENT_PERIOD, districtHospital1.name);
        await helperFunctions.assertTitle(firstTargetItem.title, expectedTargets[0].title);

        await targetAggregatesPage.openTargetDetails(expectedTargets[1]);

        await targetAggregatesPage.clickOnTargetAggregateListItem(prometheus._id);
        // wait until contact-summary is loaded
        await contactsPage.contactCardSelectors.contactCardName().waitForDisplayed();
        expect(await contactsPage.getContactInfoName()).to.equal('Prometheus');
        // assert that the activity card exists and has the right fields.
        expect(await contactsPage.getContactCardTitle()).to.equal('Activity this month');
        await helperFunctions.validateCardFields(['yesterday Prometheus', moment().format('YYYY-MM'), '18', '15%']);

        await browser.back();
        const secondTargetItem =
          await targetAggregatesPage.getTargetItem(expectedTargets[1], CURRENT_PERIOD, districtHospital1.name);
        await helperFunctions.assertTitle(secondTargetItem.title, expectedTargets[1].title);
      });

      it('should display targets of current user on home place', async () => {
        const targetsConfig = [
          { id: 'a_target', type: 'count', title: { en: 'what a target!' }, aggregate: true },
          { id: 'b_target', type: 'percent', title: { en: 'the most target' }, aggregate: true },
        ];
        const contactSummaryScript = fs
          .readFileSync(`${__dirname}/config/contact-summary-target-aggregates.js`, 'utf8');

        const clarissa = contactDocs.find(doc => doc.name === NAMES_DH1[0]);
        const prometheus = contactDocs.find(doc => doc.name === NAMES_DH1[1]);
        const targets = {
          'Clarissa': [
            { id: 'a_target', value: { total: 50, pass: 40 } },
            { id: 'b_target', value: { total: 20, pass: 10 } }
          ],
          'Prometheus': [
            { id: 'a_target', value: { total: 20, pass: 18 } },
            { id: 'b_target', value: { total: 40, pass: 6 } }
          ],
          [onlineUser.contact.name]: [
            { id: 'a_target', value: { total: 1, pass: 1 } },
            { id: 'b_target', value: { total: 1, pass: 1 } }
          ],
        };

        const targetsForContact = (contact) => {
          return helperFunctions.docTags.map(tag => ({
            _id: `target~${tag}~${contact._id}~irrelevant`,
            reporting_period: tag,
            targets: targets[contact.name],
            owner: contact._id,
            user: 'irrelevant',
            date_updated: `yesterday ${contact.name}`,
          }));
        };
        const targetDocs = [
          ...targetsForContact(clarissa),
          ...targetsForContact(prometheus),
          ...targetsForContact(onlineUser.contact),
        ];

        await utils.saveDocs(targetDocs);
        await helperFunctions.updateAggregateTargetsSettings(targetsConfig, onlineUser, contactSummaryScript);

        await commonPage.goToPeople(onlineUser.place._id);
        // wait until contact-summary is loaded
        expect(await contactsPage.getContactInfoName()).to.equal(districtHospital1.name);
        // assert that the activity card exists and has the right fields.
        expect(await contactsPage.getContactCardTitle()).to.equal('Activity this month');

        await helperFunctions.validateCardFields([
          `yesterday ${onlineUser.contact.name}`,
          moment().subtract(1, 'month').format('YYYY-MM'),
          '1',
          '100%'
        ]);
      });
    });

    describe('Offline user with multiple places associated', () => {
      beforeEach(async () => {
        await loginPage.login({ password: userWithManyPlacesPass, username: userWithManyPlaces.name });
        await commonPage.waitForPageLoaded();
      });

      it('should disable content', async () => {
        await targetAggregatesPage.checkContentDisabled();
      });

      it('should display only the targets sections and show the correct message ' +
        'when target aggregates are disabled', async () => {
        await browser.url('/#/analytics/target-aggregates');

        const emptySelection = await analyticsPage.noSelectedTarget();
        await (emptySelection).waitForDisplayed();
        await commonPage.waitForLoaderToDisappear(emptySelection);

        expect(await emptySelection.getText()).to.equal('Target aggregates are disabled');
      });

      it('should filter aggregates by place and period', async () => {
        const expectedTargets = targetAggregatesConfig.EXPECTED_TARGETS_NO_PROGRESS;

        await utils.saveDocs(targetDocs);
        await helperFunctions.updateAggregateTargetsSettings(
          targetAggregatesConfig.TARGETS_DEFAULT_CONFIG,
          userWithManyPlaces
        );
        await commonPage.sync({ reload: true, expectReload: true });

        await commonPage.goToAnalytics();
        await targetAggregatesPage.goToTargetAggregates(true);

        const contactsDh1 = helperFunctions.getDocsByPlace(contactDocs, districtHospital1._id);
        const contactsDh2 = helperFunctions.getDocsByPlace(contactDocs, districtHospital2._id);

        const context = {
          contacts: contactsDh1,
          period: CURRENT_PERIOD,
          isCurrentPeriod: true,
          place: districtHospital1.name,
        };
        const asserts = { hasMultipleFacilities: true, contactValues: false };

        await helperFunctions.assertData(context, TARGET_VALUES_BY_CONTACT, expectedTargets, asserts);

        await targetAggregatesPage.openSidebarFilter();
        expect((await targetAggregatesPage.sidebarFilter.optionsContainer()).length).to.equal(2);

        await targetAggregatesPage.selectFilterOption('Last month');
        context.period = helperFunctions.getLastMonth();
        context.isCurrentPeriod = false;
        await helperFunctions.assertData(context, TARGET_VALUES_BY_CONTACT, expectedTargets, asserts);

        await targetAggregatesPage.selectFilterOption(districtHospital2.name);
        context.contacts = contactsDh2;
        context.place = districtHospital2.name;
        await helperFunctions.assertData(context, TARGET_VALUES_BY_CONTACT, expectedTargets, asserts);

        await targetAggregatesPage.selectFilterOption(CURRENT_PERIOD);
        context.period = CURRENT_PERIOD;
        context.isCurrentPeriod = true;
        await helperFunctions.assertData(context, TARGET_VALUES_BY_CONTACT, expectedTargets, asserts);
      });
    });
  });
});
