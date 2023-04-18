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
const NAVIGATION_LINK = '.mm-navigation-menu li a';
const CONTENT_DISABLED = '.page .item-content.disabled';

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

const getAggregateDetailListLength = async () => {
  return await $$(AGGREGATE_DETAIL_LIST).length;
};

const getAggregateDetailListElementbyIndex = async (index) => {
  return await $$(AGGREGATE_DETAIL_LIST)[index];
};

const getAggregateDetailElementInfo = async (element) => {
  let progressBar = { length: await getAggregateDetailProgressBarLength(element) };
  if (progressBar.length > 0) {
    progressBar = { ...progressBar, ...{ isDisplayed: await (await getTargetAggregateDetailProgressBar(element)).isDisplayed() } };
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

module.exports = {
  expectModulesToBeAvailable,
  goToTargetAggregates,
  loadingStatus,
  aggregateList,
  getTargetItem,
  openTargetDetails,
  expectTargetDetails,
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

