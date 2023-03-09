const goToTargets = () => browser.url('/#/analytics/targets');

const noSelectedTarget = () => $('.empty-selection');

const targets = () => $$('.target');

const targetWrap = () => $('.page .targets');

const targetTitle = (targetElement) => targetElement.$('.heading .title h2');

const targetGoal = (targetElement) => targetElement.$('.body .count .goal');

const targetCountNumber = (targetElement) => targetElement.$('.body .count .number');

const targetProgressNumber = (targetElement) => targetElement.$('.body .target-progress .number');

const targetNumberPercent = (targetElement) => targetElement.$('.body .target-progress .number .value');

const targetNumberPercentCount = (targetElement) => targetElement.$('.body .target-progress .number span:nth-child(2)');

const targetGoalValue = (targetElement) => targetElement.$('.body .count .goal p');
const AGGREGATE_LIST = '#target-aggregates-list';
const loadingStatus = () => $(`${AGGREGATE_LIST} .loading-status`);
const aggregateList = () => $$(`${AGGREGATE_LIST}  ul li`);

const labels = () => $$('.content-pane .meta > div > .card .row label');
const meta = () => $$('.content-pane .meta > div > .card .row p');
const rows = () => $$('.content-pane .meta > div > .card .row p');
const pane = () => $$('.content-pane .meta > div > .card .row label');
const emptySelectionError = () => $('.content-pane .item-content.empty-selection.selection-error');
const NAVIGATION_LINK =  '.mm-navigation-menu li a';
const CONTENT_DISABLED = '.page .item-content.disabled';

const getTargetInfo = async (targetElement) => {
  const target = {
    title: await (await targetTitle(targetElement)).getText()
  };

  if (await (await targetGoal(targetElement)).isExisting()) {
    target.goal = await (await targetGoalValue(targetElement)).getText();
  }

  if (await (await targetCountNumber(targetElement)).isExisting()) {
    target.count = await (await targetCountNumber(targetElement)).getText();
  }

  if (await (await targetProgressNumber(targetElement)).isExisting()) {
    target.percent = await (await targetNumberPercent(targetElement)).getText();
    target.percentCount = await (await targetNumberPercentCount(targetElement)).getText();
  }

  return target;
};

const getTargets = async () => {
  await (await targetWrap()).waitForDisplayed();
  const displayedTargets = await targets();

  const targetList = [];
  for (const target of displayedTargets) {
    const info = await getTargetInfo(target);
    targetList.push(info);
  }

  return targetList;
};
const expectModulesToBeAvailable = async (modules) => {
  for (const module of modules) {
    const element = await $(`${NAVIGATION_LINK}[href="${module}"]`);
    expect(await element.isExisting()).to.be.true;
  }
};

const goToTargetAggregates = async (enabled) => {
  await (await $(`${NAVIGATION_LINK}[href="#/analytics/target-aggregates"]`)).click();
  if (enabled) {
    await (await $(`${AGGREGATE_LIST}`)).waitForDisplayed();
  } else {
    await (await $(CONTENT_DISABLED)).waitForDisplayed();
  }
};

const getTargetItem = async (target) => {
  const lineItem = () => $(`${AGGREGATE_LIST}  li[data-record-id=${target.id}]`);
  return {
    title: await lineItem().$('h4').getText(),
    status: await lineItem().$('.aggregate-status span').getText()
  };
};

const openTargetDetails = async (targetID) => {
  await $(`${AGGREGATE_LIST} li[data-record-id=${targetID}] a`).click();
  await $('.target-detail.card h2').waitForDisplayed();
};

const expectTargetDetails = async (target) => {
  expect(await $('.target-detail h2').getText()).to.equal(target.title);
  expect(await $('.target-detail .cell p').getText()).to.equal(target.counter);
};

module.exports = {
  noSelectedTarget,
  goToTargets,
  getTargets,
  expectModulesToBeAvailable,
  goToTargetAggregates,
  labels,
  meta,
  pane,
  rows,
  loadingStatus,
  aggregateList,
  getTargetItem,
  openTargetDetails,
  expectTargetDetails,
  emptySelectionError
};
