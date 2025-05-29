const commonPage = require('@page-objects/default/common/common.wdio.page');

const AGGREGATE_LIST = '#target-aggregates-list';
const NAVIGATION_LINK = '.mm-navigation-menu li a';
const CONTENT_DISABLED = '.page .item-content.disabled';
const TARGET_DETAIL = '.target-detail';
const AGGREGATE_DETAIL_CONTACT_LIST = '.aggregate-detail li';
const AGGREGATE_DETAIL_PROGRESS_BAR = '.progress-bar';

const loadingStatus = () => $(`${AGGREGATE_LIST} .loading-status`);
const aggregateList = () => $$(`${AGGREGATE_LIST}  ul li.content-row`);
const lineItem = (elementId) => $(`${AGGREGATE_LIST} li[data-record-id=${elementId}]`);

const sidebarFilter = {
  filterBtn: () => $('button*=Filter'),
  closeBtn: () => $('.sidebar-close'),
  optionsContainer: () => $$('.filter-options-container'),
  optionContainerByTitle: (title) => $('.filter-options-container').$(`span*=${title}`).parentElement(),
  optionRadioBtn: (optionLabel) => $(`span*=${optionLabel}`).parentElement(),
};

const targetDetail = {
  title: (titleValue) => $(TARGET_DETAIL).$(`h2=${titleValue}`),
  counter: () => $(`${TARGET_DETAIL} .cell p`),
  place: (value) => $(TARGET_DETAIL).$(`span*=${value}`),
  period: (periodValue) => $('.aggregate-detail .action-header').$(`h3*=${periodValue}`),
};

const aggregateDetailContactItem = (contactId) => {
  return $(`${AGGREGATE_DETAIL_CONTACT_LIST}[data-record-id="${contactId}"]`); // a
};

const aggregateDetailContactsProcessBar = (contactId) => {
  const contactItem = aggregateDetailContactItem(contactId);
  return contactItem.$(`${AGGREGATE_DETAIL_PROGRESS_BAR} span`);
};

const aggregateDetailContactsGoal = (contactId) => {
  const contactItem = aggregateDetailContactItem(contactId);
  return contactItem.$$('.goal');
};

const getAggregateDetailContact = async (contactId) => {
  const contactItem = aggregateDetailContactItem(contactId);
  return {
    recordId: await contactItem.getAttribute('data-record-id'),
    name: await contactItem.$('h4').getText(),
    detail: await contactItem.$('.detail').getText(),
    progressBar: await getAggregateTargetProgressBar(contactId),
    goal: await getAggregateTargetGoal(contactId),
  };
};

const expectModulesToBeAvailable = async (modules) => {
  for (const module of modules) {
    const element = $(`${NAVIGATION_LINK}[href="${module}"]`);
    expect(await element.isExisting()).to.be.true;
  }
};

const goToTargetAggregates = async (enabled) => {
  await $(`${NAVIGATION_LINK}[href="#/analytics/target-aggregates"]`).click();
  if (enabled) {
    await $(AGGREGATE_LIST).waitForDisplayed();
    return;
  }
  await $(CONTENT_DISABLED).waitForDisplayed();
};

const checkContentDisabled = async () => {
  await commonPage.goToUrl('/#/analytics/target-aggregates');
  await commonPage.waitForPageLoaded();
  await $(CONTENT_DISABLED).waitForDisplayed();
};

const getTargetItem = async (target, period, place) => {
  const item = lineItem(target.id);
  return {
    title: await item.$('h4').getText(),
    counter: await item.$('.aggregate-status span').getText(),
    place: await item.$(`li*=${place}`).isDisplayed(),
    period: await item.$(`li*=${period}`).isDisplayed(),
  };
};

const openTargetDetails = async (target) => {
  const item = lineItem(target.id);
  await item.click();
  await commonPage.waitForLoaders();
  await targetDetail.title(target.title).waitForDisplayed();
};

const getAggregateDetailListLength = async () => {
  const elements = await $$(AGGREGATE_DETAIL_CONTACT_LIST);
  return elements.length;
};

const getAggregateTargetProgressBar = async (contactId) => {
  const contactItem = aggregateDetailContactItem(contactId);
  const length = await contactItem.$$(AGGREGATE_DETAIL_PROGRESS_BAR).length;
  if (!length) {
    return { length };
  }

  const progressBar = await aggregateDetailContactsProcessBar(contactId);

  const isDisplayed = await progressBar.isDisplayed();
  return {
    length,
    isDisplayed,
    value: isDisplayed && await progressBar.getText(),
  };
};

const getAggregateTargetGoal = async (contactId) => {
  const goal = await aggregateDetailContactsGoal(contactId);
  const length = goal.length;
  if (!length) {
    return { length };
  }

  return {
    length,
    value: await goal[0].getText(),
  };
};

const clickOnTargetAggregateListItem = async (contactId) => {
  const contactItem = aggregateDetailContactItem(contactId);
  await contactItem.click();
};

const openSidebarFilter = async () => {
  await sidebarFilter.filterBtn().click();
  await sidebarFilter.closeBtn().waitForDisplayed();
};

const selectFilterOption = async (option) => {
  await sidebarFilter.optionRadioBtn(option).click();
};

module.exports = {
  expectModulesToBeAvailable,
  goToTargetAggregates,
  loadingStatus,
  aggregateList,
  sidebarFilter,
  targetDetail,
  getTargetItem,
  openTargetDetails,
  getAggregateDetailListLength,
  getAggregateDetailContact,
  getAggregateTargetProgressBar,
  getAggregateTargetGoal,
  clickOnTargetAggregateListItem,
  checkContentDisabled,
  openSidebarFilter,
  selectFilterOption,
};

