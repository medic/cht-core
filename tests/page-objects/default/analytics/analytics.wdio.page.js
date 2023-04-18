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
const targetAggregateListItem = (contactId) => $(`.aggregate-detail li[data-record-id="${contactId}"] a`);
const AGGREGATE_DETAIL_LIST = '.aggregate-detail li';
const targetAggregateDetailTitle = (element) => element.$('h4');
const targetAggregateDetailDetail = (element) => element.$('.detail');
const AGGREGATE_DETAIL_PROGRESS_BAR = '.progress-bar';
const getTargetAggregateDetailProgressBar = (element) => element.$(`${AGGREGATE_DETAIL_PROGRESS_BAR} span`);
const getTargetAggregateDetailGoal = (element) => element.$$('.goal');
const emptySelectionError = () => $('.content-pane .item-content.empty-selection.selection-error');
const emptySelectionNoError = () => $('.content-pane .item-content.empty-selection:not(.selection-error)');

const NAVIGATION_LINK = '.mm-navigation-menu li a';
const CONTENT_DISABLED = '.page .item-content.disabled';

const getAggregateDetailListLength = async () => {
  return await $$(AGGREGATE_DETAIL_LIST).length;
};

const getAggregateDetailListElementbyIndex = async (index) => {
  return await $$(AGGREGATE_DETAIL_LIST)[index];
};

const getAggregateDetailElementInfo = async (element) => {
  let progressBar = { length: await getAggregateDetailProgressBarLength(element) };
  if (progressBar.length > 0) {
    progressBar = {
      ...progressBar,
      ...{ isDisplayed: await (await getTargetAggregateDetailProgressBar(element)).isDisplayed() }
    };
    if (progressBar.isDisplayed) {
      progressBar = { ...progressBar, ...{ value: await getAggregateDetailProgressBarValue(element) } };
    }
  }
  let goal = { length: await getAggregateDetailGoalLength(element) };
  if (goal.length > 0) {
    goal = { ...goal, ...{ value: await getAggregateDetailGoalValue(element) } };
  }
  return {
    recordId: await element.getAttribute('data-record-id'),
    title: await (await targetAggregateDetailTitle(element)).getText(),
    detail: await (await targetAggregateDetailDetail(element)).getText(),
    progressBar: progressBar,
    goal: goal,
  };
};

const getAggregateDetailProgressBarLength = async (element) => {
  return await (await element.$$(AGGREGATE_DETAIL_PROGRESS_BAR)).length;
};

const getAggregateDetailProgressBarValue = async (element) => {
  return await (await getTargetAggregateDetailProgressBar(element)).getText();
};

const getAggregateDetailGoalLength = async (element) => {
  return await (await getTargetAggregateDetailGoal(element)).length;
};

const getAggregateDetailGoalValue = async (element) => {
  return await (await getTargetAggregateDetailGoal(element)[0]).getText();
};

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
  loadingStatus,
  aggregateList,
  getTargetItem,
  openTargetDetails,
  expectTargetDetails,
  emptySelectionError,
  emptySelectionNoError,
  targetAggregateListItem,
  getAggregateDetailListLength,
  getAggregateDetailListElementbyIndex,
  getAggregateDetailElementInfo,
  getTargetAggregateDetailProgressBar,
  getAggregateDetailProgressBarLength,
  getAggregateDetailProgressBarValue,
  getTargetAggregateDetailGoal,
  getAggregateDetailGoalValue,
  getAggregateDetailGoalLength,
};
