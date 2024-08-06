const moment = require('moment');
const _ = require('lodash');
const fs = require('fs');
const uuid = require('uuid').v4;
const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
const targetAggregatesPage = require('@page-objects/default/targets/target-aggregates.wdio.page');
const contactsPage = require('@page-objects/default/contacts/contacts.wdio.page.js');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const userSettingsFactory = require('@factories/cht/users/user-settings');
const personFactory = require('@factories/cht/contacts/person');

describe('Target aggregates', () => {
  const RANDOM_NUMBER = (max) => Math.floor(Math.random() * max);

  const expectTargets = async (targets, period, place = '') => {
    expect(await (await targetAggregatesPage.aggregateList()).length).to.equal(targets.length);
    for (const target of targets) {
      const targetItem = await (await targetAggregatesPage.getTargetItem(target, period, place));
      expect(target.title).to.equal(targetItem.title);
      expect(target.status).to.equal(targetItem.counter);
      expect(targetItem.period).to.be.true;
      if (place){
        expect(targetItem.place).to.be.true;
      }
    }
  };

  const expectContacts = async (contacts, target) => {
    contacts = contacts.sort((a, b) => a.name.localeCompare(b.name));
    expect(await targetAggregatesPage.getAggregateDetailListLength()).to.equal(contacts.length);
    // eslint-disable-next-line guard-for-in
    for (const idx in contacts) {
      const contact = contacts[idx];
      const lineItem = await targetAggregatesPage.getAggregateDetailListElementByIndex(idx);
      const lineItemInfo = await targetAggregatesPage.getAggregateDetailElementInfo(lineItem);
      expect(await lineItemInfo.recordId).to.equal(contact._id);
      expect(await lineItemInfo.title).to.equal(contact.name);
      expect(await lineItemInfo.detail).to.equal(contact.counter);
      if (!target.progressBar) {
        expect(await lineItemInfo.progressBar.length).to.equal(0);
      } else {
        if (!contact.progress) {
          expect(await lineItemInfo.progressBar.isDisplayed).to.be.false;
        } else {
          expect(await lineItemInfo.progressBar.value).to.equal(contact.progress);
        }
      }
      if (!target.goal) {
        expect(await lineItemInfo.goal.length).to.equal(0);
      } else {
        const text = await lineItemInfo.goal.value;
        expect(text.indexOf(target.goal)).not.to.equal(-1);
      }
    }
  };

  const updateSettings = async (targetsConfig, user, contactSummary) => {
    const settings = await utils.getSettings();
    const tasks = settings.tasks;
    tasks.targets.items = targetsConfig;
    const permissions = settings.permissions;
    permissions.can_aggregate_targets = user.roles;
    await utils.updateSettings({ tasks, permissions, contact_summary: contactSummary }, true);
    await commonPage.closeReloadModal();
    await commonPage.goToBase();
  };

  const validateCardFields = async (values) => {
    const conditionCard = $$('.meta .card')[1].$('.row');
    await conditionCard.waitForDisplayed();
    for (const value of values) {
      expect(await (await conditionCard.$(`p=${value}`)).isDisplayed()).to.be.true;
    }
  };

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
      expect(await (await targetAggregatesPage.aggregateList()).length).to.equal(0);
      expect(await targetAggregatesPage.loadingStatus().isDisplayed()).to.be.true;
      expect(await analyticsPage.emptySelectionNoError().isDisplayed()).to.be.true;
    });

    it('should display an error when there are aggregates but no home place', async () => {
      const settings = await utils.getSettings();
      const tasks = settings.tasks;
      tasks.targets.items[0].aggregate = true;
      await utils.updateSettings({ tasks }, true);
      await commonPage.closeReloadModal();

      await commonPage.goToAnalytics();
      await targetAggregatesPage.goToTargetAggregates(true);
      expect((await targetAggregatesPage.aggregateList()).length).to.equal(0);
      expect(await analyticsPage.emptySelectionError().isDisplayed()).to.be.true;
    });
  });

  describe('User with a one or more places assigned', () => {
    const NAMES = ['Clarissa', 'Prometheus', 'Alabama', 'Jasmine', 'Danielle'];
    const OTHER_NAMES = ['Viviana', 'Ximena', 'Esteban', 'Luis', 'Marta'];

    const TARGETS_CONFIG = [
      { id: 'count_no_goal', type: 'count', title: { en: 'count no goal' }, aggregate: true },
      { id: 'count_with_goal', type: 'count', title: { en: 'count with goal' }, goal: 20, aggregate: true },
      { id: 'percent_no_goal', type: 'percent', title: { en: 'percent no goal' }, aggregate: true },
      { id: 'percent_with_goal', type: 'percent', title: { en: 'percent with goal' }, aggregate: true, goal: 80 },
      { id: 'percent_achieved', type: 'percent', title: { en: 'percent achieved' }, aggregate: true, goal: 10 },
    ];

    const TARGET_VALUES_BY_CONTACT = {
      'Clarissa': {
        count_no_goal: { value: { pass: 5, total: 5 }, counter: '5', progress: 0 },
        count_with_goal: { value: { pass: 10, total: 10 }, counter: '10', progress: '10' },
        percent_no_goal: { value: { pass: 10, total: 20 }, counter: '50% (10 of 20)', progress: '50%' },
        percent_with_goal: { value: { pass: 19, total: 20 }, counter: '95% (19 of 20)', progress: '95%' },
        percent_achieved: { value: { pass: 2, total: 4 }, counter: '50% (2 of 4)', progress: '50%' },
      },
      'Prometheus': {
        count_no_goal: { value: { pass: 2, total: 2 }, counter: '2', progress: 0 },
        count_with_goal: { value: { pass: 21, total: 21 }, counter: '21', progress: '21' },
        percent_no_goal: { value: { pass: 7, total: 9 }, counter: '78% (7 of 9)', progress: '78%' },
        percent_with_goal: { value: { pass: 118, total: 162 }, counter: '73% (118 of 162)', progress: '73%' },
        percent_achieved: { value: { pass: 2, total: 4 }, counter: '50% (2 of 4)', progress: '50%' },
      },
      'Alabama': {
        count_no_goal: { value: { pass: 0, total: 0 }, counter: '0', progress: 0 },
        count_with_goal: { value: { pass: 0, total: 0 }, counter: '0', progress: '0' },
        percent_no_goal: { value: { pass: 0, total: 0 }, counter: '0% (0 of 0)', progress: '0%' },
        percent_with_goal: { value: { pass: 0, total: 0 }, counter: '0% (0 of 0)', progress: '0%' },
        percent_achieved: { value: { pass: 2, total: 4 }, counter: '50% (2 of 4)', progress: '50%' },
      },
      'Jasmine': {
        count_no_goal: { value: { pass: 9, total: 9 }, counter: '9', progress: 0 },
        count_with_goal: { value: { pass: 31, total: 31 }, counter: '31', progress: '31' },
        percent_no_goal: { value: { pass: 20, total: 20 }, counter: '100% (20 of 20)', progress: '100%' },
        percent_with_goal: { value: { pass: 5, total: 20 }, counter: '25% (5 of 20)', progress: '25%' },
        percent_achieved: { value: { pass: 2, total: 4 }, counter: '50% (2 of 4)', progress: '50%' },
      },
      'Danielle': {
        count_no_goal: { value: { pass: 11, total: 11 }, counter: '11', progress: 0 },
        count_with_goal: { value: { pass: 29, total: 29 }, counter: '29', progress: '29' },
        percent_no_goal: { value: { pass: 3, total: 9 }, counter: '33% (3 of 9)', progress: '33%' },
        percent_with_goal: { value: { pass: 7, total: 20 }, counter: '35% (7 of 20)', progress: '35%' },
        percent_achieved: { value: { pass: 2, total: 4 }, counter: '50% (2 of 4)', progress: '50%' },
      }
    };
    
    const districtHospital1 = placeFactory.place().build({ type: 'district_hospital', name: 'District Hospital 1' });
    const districtHospital2 = placeFactory.place().build({ type: 'district_hospital', name: 'District Hospital 2' });

    const contactWithManyPlaces = personFactory.build({
      parent: { _id: districtHospital1._id, parent: { _id: districtHospital1._id } },
    });

    const onlineUser = userFactory.build({ place: districtHospital1._id, roles: ['program_officer'] });
    
    const userWithManyPlaces = userSettingsFactory.build({
      _id: 'org.couchdb.user:offline_many_facilities',
      id: 'org.couchdb.user:offline_many_facilities',
      name: 'offline_many_facilities',
      roles: [ 'chw' ],
      facility_id: [ districtHospital1._id, districtHospital2._id ],
      contact_id: contactWithManyPlaces._id
    });
    const userWithManyPlacesPass = uuid();

    const generateHealthCenter = (parent, idx, otherPlace) => {
      const place = placeFactory.place().build({ type: 'health_center', parent: { _id: parent._id } });
      const contact = personFactory.build({
        name: otherPlace === true ? OTHER_NAMES[idx] : NAMES[idx],
        parent: { _id: place._id, parent: place.parent }
      });
      place.contact = { _id: contact._id, parent: contact.parent };
      return [place, contact];
    };

    const docs = _.flattenDeep([
      Array.from({ length: 5 }).map((e, i) => generateHealthCenter(districtHospital1, i, false)),
      Array.from({ length: 5 }).map((e, i) => generateHealthCenter(districtHospital2, i, true)),
    ]);

    const docTags = [
      // current targets
      moment().format('YYYY-MM'),
      // next month targets, in case the reporting period switches mid-test
      moment().date(10).add(1, 'month').format('YYYY-MM'),
    ];

    const targetDocs = _.flatten(docs
      .filter(doc => doc.type === 'person')
      .map(contact => {
        const genTarget = (target) => {
          const value = TARGET_VALUES_BY_CONTACT[contact.name] &&
            TARGET_VALUES_BY_CONTACT[contact.name][target.id].value ||
            { pass: RANDOM_NUMBER(100), total: RANDOM_NUMBER(100) };
          return { id: target.id, value };
        };

        return docTags.map(tag => ({
          _id: `target~${tag}~${contact._id}~irrelevant`,
          reporting_period: tag,
          targets: TARGETS_CONFIG.map(genTarget),
          owner: contact._id,
          user: 'irrelevant',
        }));
      }));

    const DOCS_TO_KEEP = [
      districtHospital1._id,
      districtHospital2._id,
      ...docs.map(doc => doc._id),
      'fixture:user:supervisor',
      'org.couchdb.user:supervisor',
      '^target~',
      [/^form:/],
    ];

    before(async () => {
      await utils.saveDocs([ ...docs, districtHospital1, districtHospital2, contactWithManyPlaces, userWithManyPlaces]);
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
        const targetsConfig = [
          { id: 'not_aggregate', type: 'count', title: { en: 'my task' } },
          { id: 'count_no_goal', type: 'count', title: { en: 'count no goal' }, aggregate: true },
          { id: 'count_with_goal', type: 'count', title: { en: 'count with goal' }, goal: 20, aggregate: true },
          { id: 'also_not_aggregate', type: 'count', title: { en: 'my task' } },
          { id: 'percent_no_goal', type: 'percent', title: { en: 'percent no goal' }, aggregate: true },
          { id: 'percent_with_goal', type: 'percent', title: { en: 'percent with goal' }, aggregate: true, goal: 80 },
          { id: 'also_also_not_aggregate', type: 'count', title: { en: 'my task' }, aggregate: false },
        ];

        await updateSettings(targetsConfig, onlineUser);

        await commonPage.goToAnalytics();
        await targetAggregatesPage.goToTargetAggregates(true);

        const expectedTargets = [
          { id: 'count_no_goal', title: 'count no goal', counter: '0', progressBar: false, goal: false },
          { id: 'count_with_goal', title: 'count with goal', counter: '0 of 5', progressBar: true, goal: 20 },
          { id: 'percent_no_goal', title: 'percent no goal', counter: '0%', progressBar: true, goal: false },
          { id: 'percent_with_goal', title: 'percent with goal', counter: '0 of 5', progressBar: true, goal: '80%' },
        ];
        const expectedContacts = docs
          .filter(doc => doc.type === 'person' && doc.parent.parent._id === districtHospital1._id)
          .map(contact => ({ _id: contact._id, name: contact.name, counter: 'No data', progress: 0 }));

        await expectTargets(expectedTargets, 'This month');

        for (const target of expectedTargets) {
          await targetAggregatesPage.openTargetDetails(target);
          await targetAggregatesPage.assertTargetDetails(target, 'This month');
          await expectContacts(expectedContacts, target);
        }
      });

      it('should display correct data', async () => {
        const expectedTargets = [
          { id: 'count_no_goal', title: 'count no goal', progressBar: false, goal: false, counter: '27' },
          { id: 'count_with_goal', title: 'count with goal', progressBar: true, goal: 20, counter: '3 of 5' },
          { id: 'percent_no_goal', title: 'percent no goal', progressBar: true, goal: false, counter: '69%' },
          { id: 'percent_with_goal', title: 'percent with goal', progressBar: true, goal: '80%', counter: '1 of 5' },
          { id: 'percent_achieved', title: 'percent achieved', progressBar: true, goal: '10%', counter: '5 of 5' },
        ];

        await utils.saveDocs(targetDocs);
        await updateSettings(TARGETS_CONFIG, onlineUser);

        await commonPage.goToAnalytics();
        await targetAggregatesPage.goToTargetAggregates(true);

        const contacts = docs.filter(doc => doc.type === 'person' && doc.parent.parent._id === districtHospital1._id);

        await expectTargets(expectedTargets, 'This month');
        for (const target of expectedTargets) {
          await targetAggregatesPage.openTargetDetails(target);
          await targetAggregatesPage.assertTargetDetails(target, 'This month');
          const expectedContacts = contacts.map(contact => ({
            _id: contact._id,
            name: contact.name,
            counter: TARGET_VALUES_BY_CONTACT[contact.name][target.id].counter,
            progress: TARGET_VALUES_BY_CONTACT[contact.name][target.id].progress,
          }));
          await expectContacts(expectedContacts, target);
        }

        // refreshing with an open target works correctly
        const target = expectedTargets[2];
        await targetAggregatesPage.openTargetDetails(target);
        await browser.refresh();
        await targetAggregatesPage.assertTargetDetails(target, 'This month');
      });

      it('should route to contact-detail on list item click and display contact summary target card', async () => {
        const targetsConfig = [
          { id: 'a_target', type: 'count', title: { en: 'what a target!' }, aggregate: true },
          { id: 'b_target', type: 'percent', title: { en: 'the most target' }, aggregate: true },
        ];
        const contactSummaryScript = fs
          .readFileSync(`${__dirname}/config/contact-summary-target-aggregates.js`, 'utf8');

        const clarissa = docs.find(doc => doc.name === NAMES[0]);
        const prometheus = docs.find(doc => doc.name === NAMES[1]);
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
          return docTags.map(tag => ({
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
        await updateSettings(targetsConfig, onlineUser, contactSummaryScript);

        await commonPage.goToAnalytics();
        await targetAggregatesPage.goToTargetAggregates(true);

        const expectedTargets = [
          { id: 'a_target', title: 'what a target!', progressBar: false, counter: '58' },
          { id: 'b_target', title: 'the most target', progressBar: true, counter: '27%' },
        ];

        await expectTargets(expectedTargets, 'This month');
        await targetAggregatesPage.openTargetDetails(expectedTargets[0]);
        await targetAggregatesPage.clickOnTargetAggregateListItem(clarissa._id);
        // wait until contact-summary is loaded
        expect(await contactsPage.getContactInfoName()).to.equal('Clarissa');
        // assert that the activity card exists and has the right fields.
        expect(await contactsPage.getContactCardTitle()).to.equal('Activity this month');

        await validateCardFields(['yesterday Clarissa', '40', '50%']);

        await browser.back();
        await targetAggregatesPage.assertTargetDetails(expectedTargets[0], 'This month');

        await targetAggregatesPage.openTargetDetails(expectedTargets[1]);

        await targetAggregatesPage.clickOnTargetAggregateListItem(prometheus._id);
        // wait until contact-summary is loaded
        await (await contactsPage.contactCardSelectors.contactCardName()).waitForDisplayed();
        expect(await contactsPage.getContactInfoName()).to.equal('Prometheus');
        // assert that the activity card exists and has the right fields.
        expect(await contactsPage.getContactCardTitle()).to.equal('Activity this month');
        await validateCardFields(['yesterday Prometheus', '18', '15%']);

        await browser.back();
        await targetAggregatesPage.assertTargetDetails(expectedTargets[1], 'This month');
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

      it('should filter aggregates by place', async () => {
        await utils.saveDocs(targetDocs);
        await updateSettings(TARGETS_CONFIG, userWithManyPlaces);
        await commonPage.sync(true);
        await browser.refresh();

        await commonPage.goToAnalytics();
        await targetAggregatesPage.goToTargetAggregates(true);

        await targetAggregatesPage.openSidebarFilter();

        expect((await targetAggregatesPage.sidebarFilter.optionsContainer()).length).to.equal(2);

        await targetAggregatesPage.openTargetDetails({id: 'count_with_goal', title: 'count with goal'});

        const firstLineItem = await targetAggregatesPage.getAggregateDetailListElementByIndex(0);
        let lineItemInfo = await targetAggregatesPage.getAggregateDetailElementInfo(firstLineItem);
        expect(await lineItemInfo.title).to.equal('Alabama');

        await targetAggregatesPage.selectFilterOption('District Hospital 2');
        await commonPage.waitForPageLoaded();
        lineItemInfo = await targetAggregatesPage.getAggregateDetailElementInfo(firstLineItem);
        expect(await lineItemInfo.title).to.equal('Esteban');
      });

    });

  });
});
