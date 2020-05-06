const utils = require('../utils');
const commonElements = require('../page-objects/common/common.po.js');
const analytics = require('../page-objects/analytics/analytics.po');
const loginPage = require('../page-objects/login/login.po.js');
const helper = require('../helper');
const moment = require('moment');
const uuid = require('uuid');
const auth = require('../auth')();
const _ = require('underscore');

const randomString = (length) => Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, length);
const randomNumber = (max) => Math.floor(Math.random() * max);

/**
 * Expect certain LHS targets
 * @param {Object[]} targets
 * @param {string} targets[].id
 * @param {string} targets[].title
 * @param {string} targets[].counter
 */
const expectTargets = (targets) => {
  expect(element.all(by.css(`#target-aggregates-list li`)).count()).toEqual(targets.length);
  targets.forEach(target => {
    const lineItem = element(by.css(`#target-aggregates-list li[data-record-id=${target.id}]`));
    expect(lineItem.isPresent()).toBe(true);
    expect(lineItem.element(by.css('h4')).getText()).toEqual(target.title);
    expect(lineItem.element(by.css('.aggregate-status span')).getText()).toEqual(target.counter);
  });
};

const openTargetDetails = (targetID) => {
  element(by.css(`#target-aggregates-list li[data-record-id=${targetID}] a`)).click();
  helper.waitElementToPresent(element(by.css('.target-detail.card h2')));
};

/**
 * Expect certain RHS target details
 * @param {Object} target
 * @param {string} target.id
 * @param {string} target.title
 * @param {string} target.counter
 */
const expectTargetDetails = (target) => {
  expect(element(by.css('.target-detail h2')).getText()).toEqual(target.title);
  expect(element(by.css('.target-detail .cell p')).getText()).toEqual(target.counter);
};

/**
 * Expect certain RHS target aggregate list
 * @param {Object[]} contacts
 * @param {string} contacts[]._id
 * @param {string} contacts[].name
 * @param {string} contacts[].counter
 * @param {string} contacts[].progress
 * @param {Object} target
 * @param {boolean} target.progressBar
 * @param {string} target.goal
 */
const expectContacts = (contacts, target) => {
  contacts = contacts.sort((a, b) => a.name > b.name ? 1 : -1);
  expect(element.all(by.css(`.aggregate-detail li`)).count()).toEqual(contacts.length);
  contacts.forEach((contact, idx) => {
    const lineItem = element.all(by.css(`.aggregate-detail li`)).get(idx);
    expect(lineItem.getAttribute('data-record-id')).toEqual(contact._id);
    expect(lineItem.element(by.css('h4')).getText()).toEqual(contact.name);
    expect(lineItem.element(by.css('.detail')).getText()).toEqual(contact.counter);

    if (!target.progressBar) {
      expect(lineItem.all(by.css('.progress-bar')).count()).toEqual(0);
    } else {
      if (!contact.progress) {
        expect(lineItem.element(by.css('.progress-bar span')).isDisplayed()).toEqual(false);
      } else {
        expect(lineItem.element(by.css('.progress-bar span')).getText()).toEqual(contact.progress);
      }
    }

    if (!target.goal) {
      expect(lineItem.all(by.css('.goal')).count()).toEqual(0);
    } else {
      lineItem.all(by.css('.goal')).first().getText().then(text => {
        expect(text.indexOf(target.goal)).not.toEqual(-1);
      });
    }
  });
};

const updateSettings = (targetsConfig, user, contactSummary) => {
  browser.wait(() => {
    return utils.getSettings()
      .then(settings => {
        const tasks = settings.tasks;
        tasks.targets.items = targetsConfig;
        const permissions = settings.permissions;
        permissions.can_aggregate_targets = user.roles;
        return utils.updateSettings({ tasks, permissions, contact_summary: contactSummary });
      })
      .then(() => true);
  });
};

const clickOnTargetAggregateListItem = (contactId) => {
  element(by.css(`.aggregate-detail li[data-record-id="${contactId}"] a`)).click();
  helper.waitUntilReady(element(by.id('contacts-list')));
};

describe('Target aggregates', () => {

  describe('as a db admin', () => {

    afterEach(() => utils.revertDb());

    it('should display an empty list when there are no aggregates', () => {
      commonElements.goToAnalytics();
      analytics.expectModulesToBeAvailable(['analytics.targets', 'analytics.target-aggregates.detail']);

      analytics.goToTargetAggregates(true);
      expect(element.all(by.css('#target-aggregates-list ul li')).count()).toEqual(0);
      expect(element(by.css('#target-aggregates-list .loading-status')).isDisplayed()).toEqual(true);
      expect(
        element(by.css('.content-pane .item-content.empty-selection:not(.selection-error)')).isDisplayed()
      ).toEqual(true);
    });

    it('should display an error when there are aggregates but no home place', () => {
      browser.wait(() => {
        return utils.getSettings()
          .then(settings => {
            const tasks = settings.tasks;
            tasks.targets.items[0].aggregate = true;
            return utils.updateSettings({ tasks });
          })
          .then(() => true);
      });
      commonElements.goToAnalytics();
      analytics.goToTargetAggregates(true);
      expect(element.all(by.css('#target-aggregates-list ul li')).count()).toEqual(0);
      expect(
        element(by.css('.content-pane .item-content.empty-selection.selection-error')).isDisplayed()
      ).toEqual(true);
    });
  });

  describe('as a user with a home place', () => {
    const password = 'passwordSUP3RS3CR37!';

    const parentPlace = {
      _id: 'PARENT_PLACE',
      type: 'district_hospital',
      name: 'Big Parent Hospital'
    };

    const otherParentPlace = {
      _id: 'OTHER_PLACE',
      type: 'district_hospital',
      name: 'Smaller Hospital'
    };

    const user = {
      username: 'supervisor',
      password: password,
      place: parentPlace._id,
      contact: {
        _id: 'fixture:user:supervisor',
        name: 'Supervisor'
      },
      roles: ['national_admin'],
      known: true,
      language: 'en',
    };

    const names = [ 'Clarissa', 'Prometheus', 'Alabama', 'Jasmine', 'Danielle' ];

    const genPlace = (parent, idx = false) => {
      const place = {
        _id: uuid(),
        type: 'health_center',
        name: randomString(8),
        parent: { _id: parent._id },
        reported_date: moment().valueOf(),
      };

      const contact = {
        _id: uuid(),
        type: 'person',
        name:  idx === false ? randomString(8) : names[idx],
        parent: { _id: place._id, parent: place.parent },
        reported_date: moment().valueOf(),
      };

      place.contact = { _id: contact._id, parent: contact.parent };

      return [place, contact];
    };

    const docs = _.flatten([
      Array.from({ length: 5 }).map((e, i) => genPlace(parentPlace, i)),
      Array.from({ length: 5 }).map(() => genPlace(otherParentPlace)),
    ]);

    const genTitle = (title) => ({ en: title });

    const docTags = [
      // current targets
      moment().format('YYYY-MM'),
      // next month targets, in case the reporting period switches mid-test
      moment().date(1).add(1, 'month').format('YYYY-MM'),
    ];

    beforeAll(() => {
      return utils
        .saveDocs([parentPlace, otherParentPlace])
        .then(() => utils.saveDocs(docs))
        .then(() => utils.createUsers([ user ]))
        .then(() => {
          utils.resetBrowser();
          commonElements.goToLoginPage();
          loginPage.login(user.username, user.password);
          commonElements.calm();
        });
    });

    afterAll(() => {
      commonElements.goToLoginPage();
      loginPage.login(auth.username, auth.password);
    });

    const DOCS_TO_KEEP = [
      parentPlace._id,
      otherParentPlace._id,
      ...docs.map(doc => doc._id),
      'fixture:user:supervisor',
      'org.couchdb.user:supervisor',
      '^target~'
    ];

    afterEach(() => utils.revertDb(DOCS_TO_KEEP));

    it('should display no data when no targets are uploaded', () => {
      const targetsConfig = [
        { id: 'not_aggregate', type: 'count', title: genTitle('my task') },
        { id: 'count_no_goal', type: 'count', title: genTitle('count no goal'), aggregate: true },
        { id: 'count_with_goal', type: 'count', title: genTitle('count with goal'), goal: 20, aggregate: true },
        { id: 'also_not_aggregate', type: 'count', title: genTitle('my task') },
        { id: 'percent_no_goal', type: 'percent', title: genTitle('percent no goal'), aggregate: true },
        { id: 'percent_with_goal', type: 'percent', title: genTitle('percent with goal'), aggregate: true, goal: 80 },
        { id: 'also_also_not_aggregate', type: 'count', title: genTitle('my task'), aggregate: false },
      ];

      updateSettings(targetsConfig, user);

      commonElements.goToAnalytics();
      analytics.goToTargetAggregates(true);

      const expectedTargets = [
        { id: 'count_no_goal', title: 'count no goal', counter: '0', progressBar: false, goal: false },
        { id: 'count_with_goal', title: 'count with goal', counter: '0 of 5', progressBar: true, goal: 20 },
        { id: 'percent_no_goal', title: 'percent no goal', counter: '0%', progressBar: true, goal: false },
        { id: 'percent_with_goal', title: 'percent with goal', counter: '0 of 5', progressBar: true, goal: '80%' },
      ];
      const expectedContacts = docs
        .filter(doc => doc.type === 'person' && doc.parent.parent._id === parentPlace._id)
        .map(contact => ({ _id: contact._id, name: contact.name, counter: 'No data', progress: 0 }));

      expectTargets(expectedTargets);

      expectedTargets.forEach(target => {
        openTargetDetails(target.id);
        expectTargetDetails(target);
        expectContacts(expectedContacts, target);
      });
    });

    it('should display correct data', () => {
      const targetsConfig = [
        { id: 'count_no_goal', type: 'count', title: genTitle('count no goal'), aggregate: true },
        { id: 'count_with_goal', type: 'count', title: genTitle('count with goal'), goal: 20, aggregate: true },
        { id: 'percent_no_goal', type: 'percent', title: genTitle('percent no goal'), aggregate: true },
        { id: 'percent_with_goal', type: 'percent', title: genTitle('percent with goal'), aggregate: true, goal: 80 },
        { id: 'percent_achieved', type: 'percent', title: genTitle('percent achieved'), aggregate: true, goal: 10 },
      ];
      updateSettings(targetsConfig, user);

      const targetValuesByContact = {
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

      const targetDocs = _.flatten(docs
        .filter(doc => doc.type === 'person')
        .map(contact => {
          const genTarget = (target) => {
            const value = targetValuesByContact[contact.name] &&
                          targetValuesByContact[contact.name][target.id].value ||
                          { pass: randomNumber(100), total: randomNumber(100) };
            return { id: target.id, value };
          };

          return docTags.map(tag => ({
            _id: `target~${tag}~${contact._id}~irrelevant`,
            reporting_period: tag,
            targets: targetsConfig.map(genTarget),
            owner: contact._id,
            user: 'irrelevant',
          }));
        }), true);

      browser.wait(() => utils.saveDocs(targetDocs).then(() => true));

      commonElements.goToAnalytics();
      analytics.goToTargetAggregates(true);

      const expectedTargets = [
        { id: 'count_no_goal', title: 'count no goal', progressBar: false, goal: false, counter: '27' },
        { id: 'count_with_goal', title: 'count with goal', progressBar: true, goal: 20, counter: '3 of 5' },
        { id: 'percent_no_goal', title: 'percent no goal', progressBar: true, goal: false, counter: '69%' },
        { id: 'percent_with_goal', title: 'percent with goal', progressBar: true, goal: '80%', counter: '1 of 5' },
        { id: 'percent_achieved', title: 'percent achieved', progressBar: true, goal: '10%', counter: '5 of 5' },
      ];

      const contacts = docs.filter(doc => doc.type === 'person' && doc.parent.parent._id === parentPlace._id);

      expectTargets(expectedTargets);
      expectedTargets.forEach(target => {
        openTargetDetails(target.id);
        expectTargetDetails(target);
        const expectedContacts = contacts.map(contact => ({
          _id: contact._id,
          name: contact.name,
          counter: targetValuesByContact[contact.name][target.id].counter,
          progress: targetValuesByContact[contact.name][target.id].progress,
        }));
        expectContacts(expectedContacts, target);
      });

      // refreshing with an open target works correctly
      const target = expectedTargets[2];
      openTargetDetails(target.id);
      browser.refresh();
      helper.waitElementToPresent(element(by.css('.target-detail.card h2')));
      expectTargetDetails(target);
    });

    it('should redirect to contacts detail when clicking list item and display contact summary target card', () => {
      const targetsConfig = [
        { id: 'a_target', type: 'count', title: genTitle('what a target!'), aggregate: true },
        { id: 'b_target', type: 'percent', title: genTitle('the most target'), aggregate: true },
      ];
      const contactSummaryScript = `
        let cards = [];
        let context = {};
        let fields = [];
        if (contact.type === "person") {
          fields = [{ label: "test.pid", value: contact.patient_id, width: 3 }];
          if (targets) {
            const card = {
              label: "Activity this month",
              fields: [],
            };
            card.fields.push({ label: "Last updated", value: targets.date_updated });           
            targets.targets.forEach(target => {
              let value; 
              if (target.type === 'percent') {
                value = (target.value.total ? target.value.pass * 100 / target.value.total : 0) + "%";  
              } else {
                value = target.value.pass;
              }  
              card.fields.push({ label: target.title.en, value: value });
            });
            cards.push(card);
          }
        }
        return {
          fields: fields,
          cards: cards,
          context: context
        };
      `;

      const clarissa = docs.find(doc => doc.name === names[0]);
      const prometheus = docs.find(doc => doc.name === names[1]);
      const targets = {
        'Clarissa': [
          { id: 'a_target', value: { total: 50, pass: 40 }},
          { id: 'b_target', value: { total: 20, pass: 10 }}
        ],
        'Prometheus': [
          { id: 'a_target', value: { total: 20, pass: 18 }},
          { id: 'b_target', value: { total: 40, pass: 6 }}
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

      browser.wait(() => utils.saveDocs(targetDocs).then(() => true));
      updateSettings(targetsConfig, user, contactSummaryScript);

      commonElements.goToAnalytics();
      analytics.goToTargetAggregates(true);

      const expectedTargets = [
        { id: 'a_target', title: 'what a target!', progressBar: false, counter: '58' },
        { id: 'b_target', title: 'the most target', progressBar: true, counter: '27%' },
      ];

      expectTargets(expectedTargets);
      openTargetDetails(expectedTargets[0].id);
      clickOnTargetAggregateListItem(clarissa._id);

      expect(element(by.css('.content-pane .meta h2')).getText()).toEqual('Clarissa');
      helper.waitUntilReady(element(by.css('.content-pane .meta > div > .card .action-header h3')));
      // assert that the activity card exists and has the right fields.
      expect(element(by.css('.content-pane .meta > div > .card .action-header h3')).getText())
        .toBe('Activity this month');
      expect(element.all(by.css('.content-pane .meta > div > .card .row label')).getText())
        .toEqual(['Last updated', 'what a target!', 'the most target']);
      expect(element.all(by.css('.content-pane .meta > div > .card .row p')).getText())
        .toEqual(['yesterday Clarissa', '40', '50%']);

      browser.navigate().back();
      helper.waitElementToPresent(element(by.css('.target-detail.card h2')));
      expectTargetDetails(expectedTargets[0]);

      openTargetDetails(expectedTargets[1].id);
      clickOnTargetAggregateListItem(prometheus._id);

      expect(element(by.css('.content-pane .meta h2')).getText()).toEqual('Prometheus');
      helper.waitUntilReady(element(by.css('.content-pane .meta > div > .card .action-header h3')));
      // assert that the activity card exists and has the right fields.
      expect(element(by.css('.content-pane .meta > div > .card .action-header h3')).getText())
        .toBe('Activity this month');
      expect(element.all(by.css('.content-pane .meta > div > .card .row label')).getText())
        .toEqual(['Last updated', 'what a target!', 'the most target']);
      expect(element.all(by.css('.content-pane .meta > div > .card .row p')).getText())
        .toEqual(['yesterday Prometheus', '18', '15%']);

      browser.navigate().back();
      helper.waitElementToPresent(element(by.css('.target-detail.card h2')));
      expectTargetDetails(expectedTargets[1]);
    });
  });
});
