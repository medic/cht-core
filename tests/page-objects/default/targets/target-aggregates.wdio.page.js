const commonPage = require('@page-objects/default/common/common.wdio.page');
const AGGREGATE_LIST = '#target-aggregates-list';
const loadingStatus = () => $(`${AGGREGATE_LIST} .loading-status`);
const aggregateList = () => $$(`${AGGREGATE_LIST}  ul li`);

/*const sidebarFilterBtn = () => $('button*=Filter');//$('.open-filter .fa-sliders');
const filterCloseBtn = () => $('.sidebar-close');
const filterOptionsContainer = () => $$('.filter-options-container')
const filterOptionRadioBtn = (optionLabel) => $(`span*=${optionLabel}`).parentElement();*/

const AGGREGATE_DETAIL_LIST = '.aggregate-detail li';
const targetAggregateListItem = (contactId) => $(`${AGGREGATE_DETAIL_LIST}[data-record-id="${contactId}"] a`);
const targetAggregateDetailTitle = (element) => element.$('h4');
const targetAggregateDetailDetail = (element) => element.$('.detail');
const AGGREGATE_DETAIL_PROGRESS_BAR = '.progress-bar';
const getTargetAggregateDetailProgressBar = (element) => element.$(`${AGGREGATE_DETAIL_PROGRESS_BAR} span`);
const getTargetAggregateDetailGoal = (element) => element.$$('.goal');
const NAVIGATION_LINK = '.mm-navigation-menu li a';
const CONTENT_DISABLED = '.page .item-content.disabled';
const lineItem = (elementId) => $(`${AGGREGATE_LIST}  li[data-record-id=${elementId}]`);
const getAggregateDetailListElementByIndex = (index) => $$(AGGREGATE_DETAIL_LIST)[index];


const sidebarFilter = {
  filterBtn: () => $('button*=Filter'),
  closeBtn: () => $('.sidebar-close'),
  optionsContainer: () => $$('.filter-options-container'),
  optionContainerByTitle: (title) => $('.filter-options-container').$(`span*=${title}`).parentElement(),
  optionRadioBtn: (optionLabel) => /*$('.filter-option-place').*/$(`span*=${optionLabel}`).parentElement(),
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
    await (await $(AGGREGATE_LIST)).waitForDisplayed();
    return;
  }
  await (await $(CONTENT_DISABLED)).waitForDisplayed();
};

const checkContentDisabled = async () => {
  await commonPage.goToUrl('/#/analytics/target-aggregates');
  await commonPage.waitForPageLoaded();
  await (await $(CONTENT_DISABLED)).waitForDisplayed();
};

const getTargetItem = async (target) => {
  const item = lineItem(target.id);
  await (await item.$('h4')).waitForDisplayed();
  await (await item.$('.aggregate-status span')).waitForDisplayed();
  return {
    title: await (await item.$('h4')).getText(),
    status: await (await item.$('.aggregate-status span')).getText()
  };
};

const openTargetDetails = async (targetID) => {
  const item = lineItem(targetID);
  await item.$('a').waitForClickable();
  await item.$('a').click();
  await (await $('.target-detail.card h2')).waitForDisplayed();
};

const expectTargetDetails = async (target) => {
  expect(await $('.target-detail h2').getText()).to.equal(target.title);
  expect(await $('.target-detail .cell p').getText()).to.equal(target.counter);
};

const getAggregateDetailListLength = async () => {
  return await $$(AGGREGATE_DETAIL_LIST).length;
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

const getAggregateTargetProgressBar = async (element) => {
  const length = await getAggregateDetailProgressBarLength(element);
  if (!length) {
    return { length };
  }

  const isDisplayed = await (await getTargetAggregateDetailProgressBar(element)).isDisplayed();
  return {
    length,
    isDisplayed,
    value: isDisplayed && await getAggregateDetailProgressBarValue(element),
  };
};

const getAggregateTargetGoal = async (element) => {
  const length = await getAggregateDetailGoalLength(element);
  if (!length) {
    return { length };
  }

  return {
    length,
    value: await getAggregateDetailGoalValue(element),
  };
};

const getAggregateDetailElementInfo = async (element) => {
  return {
    recordId: await element.getAttribute('data-record-id'),
    title: await (await targetAggregateDetailTitle(element)).getText(),
    detail: await (await targetAggregateDetailDetail(element)).getText(),
    progressBar: await getAggregateTargetProgressBar(element),
    goal: await getAggregateTargetGoal(element),
  };
};

const clickOnTargetAggregateListItem = async (contactId) => {
  await (await targetAggregateListItem(contactId)).waitForClickable();
  await (await targetAggregateListItem(contactId)).click();
};

const openSidebarFilter = async () => {
  await (await sidebarFilter.filterBtn()).waitForClickable();
  await (await sidebarFilter.filterBtn()).click();
  await (await sidebarFilter.closeBtn()).waitForDisplayed();
};

const selectFilterOption = async (option) => {
  await (await sidebarFilter.optionRadioBtn(option)).waitForClickable();
  await (await sidebarFilter.optionRadioBtn(option)).click();
};

module.exports = {
  expectModulesToBeAvailable,
  goToTargetAggregates,
  loadingStatus,
  aggregateList,
  sidebarFilter,
  getTargetItem,
  openTargetDetails,
  expectTargetDetails,
  targetAggregateListItem,
  getAggregateDetailListLength,
  getAggregateDetailListElementByIndex,
  getAggregateDetailElementInfo,
  clickOnTargetAggregateListItem,
  checkContentDisabled,
  openSidebarFilter,
  selectFilterOption,
};

