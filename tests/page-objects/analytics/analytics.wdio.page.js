const listModule = module => $(`.mm-navigation-menu li a[href="${module}"]`);
const aggregates = () => $(`.mm-navigation-menu li a[href="#/analytics/target-aggregates"]`);
const aggregateList = () => $('#target-aggregates-list');
const pageDisabled = () => $('.page .item-content.disabled');
const analytics = () => $$('ul.mm-navigation-menu li a span');
const targetAggregatesItems = () => $$(`.content .heading h4 span`);
const meta = ('div.body.meta > div >');
const aggregateHeading = () => $(`${meta} div.row.heading > div.heading-content > h2`);
const aggregateLabel = () => $(`${meta} div.cell > label`);
const aggregateSummary = () => $(`${meta} div.cell > p`);

const getAllAggregates = async () => {
  await (await aggregateList()).waitForDisplayed();
  return Promise.all((await targetAggregatesItems()).map(filter => filter.getText()));
};

const expectModulesToBeAvailable = async (modules) => {
  for (const module of modules) {
    expect (await (await listModule(module)).isExisting()).toBeTruthy();
  }
};

const goToTargetAggregates = async (enabled) => {
  await (await aggregates()).click();
  if (enabled) {
    await (await aggregateList()).waitForDisplayed();
  } else {
    await (await pageDisabled()).waitForDisplayed();
  }
};

module.exports = {
  expectModulesToBeAvailable,
  goToTargetAggregates,
  targetById: (id) => $(`div[test-target-id="${id}"]`),
  targetNumber: (target) => target.$('.number'),
  targetGoal: (target) => target.$('.goal p'),
  targetTitle: (target) => target.$('.title h2'),
  analytics,
  targetAggregatesItems,
  aggregateSummary,
  aggregateLabel,
  aggregateHeading,
  getAllAggregates
};
