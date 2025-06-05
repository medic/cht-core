const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const moment = require('moment/moment');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const targetAggregatesPage = require('@page-objects/default/targets/target-aggregates.wdio.page');
const targetAggregatesConfig = require('../config/target-aggregates');

const generateRandomNumber = (max) => Math.floor(Math.random() * max);

const updateAggregateTargetsSettings = async (targetsConfig, user, contactSummary) => {
  const settings = await utils.getSettings();
  settings.tasks.targets.items = targetsConfig;
  settings.permissions.can_aggregate_targets = user.roles;
  await utils.updateSettings(
    { tasks: settings.tasks, permissions: settings.permissions, contact_summary: contactSummary },
    { ignoreReload: true }
  );
  await commonPage.closeReloadModal();
  await commonPage.goToBase();
};

const generateTargetValuesByContact = (contactNames) => {
  const defaultValue = {
    count_no_goal: { value: { pass: 5, total: 5 }, counter: '5', progress: 0 },
    count_with_goal: { value: { pass: 10, total: 10 }, counter: '10', progress: '10' },
    percent_no_goal: { value: { pass: 10, total: 20 }, counter: '50% (10 of 20)', progress: '50%' },
    percent_with_goal: { value: { pass: 19, total: 20 }, counter: '95% (19 of 20)', progress: '95%' },
    percent_achieved: { value: { pass: 2, total: 4 }, counter: '50% (2 of 4)', progress: '50%' },
  };

  return Object.fromEntries(
    contactNames.map(name => [name, defaultValue])
  );
};

const docTags = [
  // current targets
  moment().format('YYYY-MM'),
  // previous months targets
  moment().date(10).subtract(1, 'month').format('YYYY-MM'),
  // previous months targets
  moment().date(10).subtract(2, 'month').format('YYYY-MM'),
  // previous months targets
  moment().date(10).subtract(3, 'month').format('YYYY-MM'),
  // next month targets, in case the reporting period switches mid-test
  moment().date(10).add(1, 'month').format('YYYY-MM'),
];

const genTarget = (target, contact, targetValuesByContact) => {
  const targetValues = targetValuesByContact[contact.name];
  const value = targetValues[target.id]?.value;
  if (value ) {
    return { id: target.id, value };
  }

  return {
    id: target.id,
    value: { pass: generateRandomNumber(100), total: generateRandomNumber(100) },
  };
};

const generateContactsAndTargets = (parent, contactName, targetValuesByContact) => {
  const place = placeFactory.place().build({type: 'health_center', parent: {_id: parent._id}});

  const contact = personFactory.build({
    name: contactName,
    parent: {_id: place._id, parent: place.parent}
  });
  place.contact = {_id: contact._id, parent: contact.parent};

  const targets = docTags.map(tag => ({
    _id: `target~${tag}~${contact._id}~irrelevant`,
    reporting_period: tag,
    targets: targetAggregatesConfig.TARGETS_DEFAULT_CONFIG
      .map(target => genTarget(target, contact, targetValuesByContact)),
    owner: contact._id,
    user: 'irrelevant',
  }));

  return {
    targets,
    contacts: [place, contact],
  };
};

const getLastMonth = () => {
  const newDate = new Date();
  newDate.setDate(1);
  newDate.setMonth(newDate.getMonth() - 1);
  return newDate.toLocaleString('default', { month: 'long' });
};

const assertTitle = async (itemTitle, targetTitle) => {
  expect(itemTitle).to.equal(targetTitle);
  expect(await targetAggregatesPage.targetDetail.title(targetTitle).isDisplayed()).to.be.true;
};

const assertCounter = async (itemCounter, targetCounter) => {
  expect(itemCounter).to.equal(targetCounter);
  expect(await targetAggregatesPage.targetDetail.counter().getText()).to.equal(targetCounter);
};

const assertPlace = async (itemPlace, place) => {
  expect(itemPlace).to.be.true;
  expect(await targetAggregatesPage.targetDetail.place(place).isDisplayed()).to.be.true;
};

const assertPeriod = async (itemPeriod, period) => {
  expect(itemPeriod).to.be.true;
  expect(await targetAggregatesPage.targetDetail.period(period).isDisplayed()).to.be.true;
};

const assertData = async (context, targetValuesByContact, expectedTargets, asserts) => {
  await targetAggregatesPage.openTargetDetails(expectedTargets[0]);
  expect(await targetAggregatesPage.aggregateList().length).to.equal(expectedTargets.length);

  for (const target of expectedTargets) {
    const targetItem = await targetAggregatesPage.getTargetItem(target, context.period, context.place);
    await targetAggregatesPage.openTargetDetails(target);
    await assertTitle(targetItem.title, target.title);

    if (context.isCurrentPeriod) {
      await assertCounter(targetItem.counter, target.counter);
    } else {
      await assertPeriod(targetItem.period, context.period);
    }

    if (asserts.hasMultipleFacilities) {
      await assertPlace(targetItem.place, context.place);
    }

    if (context.contacts[0].counter) {
      await assertContacts(context.contacts, target, asserts.contactValues);
      continue;
    }

    const expectedContacts = context.contacts.map(contact => {
      const targetValue = targetValuesByContact[contact.name][target.id];
      return {
        _id: contact._id,
        name: contact.name,
        counter: targetValue.counter,
        progress: targetValue.progress,
      };
    });
    await assertContacts(expectedContacts, target, asserts.contactValues);
  }
};

const assertContacts = async (contacts, target, assertContactValues) => {
  contacts = contacts.sort((a, b) => a.name.localeCompare(b.name));
  expect(await targetAggregatesPage.getAggregateDetailListLength()).to.equal(contacts.length);

  for (const contact of contacts) {
    const lineContactInfo = await targetAggregatesPage.getAggregateDetailContact(contact._id);
    expect(lineContactInfo.recordId).to.equal(contact._id);
    expect(lineContactInfo.name).to.equal(contact.name);

    if (!assertContactValues) {
      continue;
    }

    expect(lineContactInfo.detail).to.equal(contact.counter);

    if (target.progressBar?.length > 0 && contact.progress) {
      expect(await lineContactInfo.progressBar.value).to.equal(contact.progress);
    }

    if (target.goal?.length > 0) {
      const text = await lineContactInfo.goal.value;
      expect(text.indexOf(target.goal)).not.to.equal(-1);
    }

  }
};

const validateCardFields = async (values) => {
  const conditionCard = $$('.meta .card')[1].$('.row');
  await conditionCard.waitForDisplayed();
  for (const value of values) {
    expect(await conditionCard.$(`p=${value}`).isDisplayed()).to.be.true;
  }
};

const getDocsByPlace = (contactDocs, placeId) => {
  return contactDocs.filter(doc => doc.type === 'person' && doc.parent.parent._id === placeId);
};

module.exports = {
  updateAggregateTargetsSettings,
  generateTargetValuesByContact,
  docTags,
  generateContactsAndTargets,
  getLastMonth,
  assertTitle,
  assertData,
  validateCardFields,
  getDocsByPlace,
};
