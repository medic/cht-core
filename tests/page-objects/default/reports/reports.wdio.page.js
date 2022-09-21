const commonElements = require('../common/common.wdio.page');
const searchElements = require('../search/search.wdio.page');
const utils = require('../../../utils');

const reportListID = '#reports-list';
const reportBodyDetailsSelector = '#reports-content .report-body .details';
const reportBodyDetails = () => $(reportBodyDetailsSelector);
const reportTasks = () =>  $(`${reportBodyDetailsSelector} .scheduled-tasks`);
const reportBody = '#reports-content .report-body';
const selectedCaseId = () => $(`${reportBodyDetailsSelector} > ul > li > p > span > a`);
const selectedCaseIdLabel = () => $(`${reportBodyDetailsSelector} ul > li > label > span`);
const submitterPlace = () => $('.position a');
const submitterPhone = () => $('.sender .phone');
const submitterName = () => $('.sender .name');
const firstReport = () => $(`${reportListID} li:first-child`);
const reportList = () => $(`${reportListID}`);
const allReports = () => $$(`${reportListID} li.content-row`);
const reportsByUUID = (uuid) => $$(`${reportListID} li.content-row[data-record-id="${uuid}"]`);
const reportRowSelector = `${reportListID} .content-row`;
const reportRow = () => $(reportRowSelector);
const reportRowsText = () => $$(`${reportRowSelector} .heading h4 span`);
const editReportButton = () => $('.action-container .right-pane .actions .mm-icon .fa-pencil');

const sidebarFilterDateAccordionHeader = () => $('#date-filter-accordion .panel-heading');
const sidebarFilterDateAccordionBody = () => $('#date-filter-accordion .panel-collapse.show');
const sidebarFilterToDate = () => $('#toDateFilter');
const sidebarFilterFromDate = () => $('#fromDateFilter');
const sidebarFilterOpenBtn = () => $('mm-search-bar .open-filter');
const filterResetBtn = () => $('.sidebar-reset');

const reportDetailsFieldsSelector = `${reportBodyDetailsSelector} > ul > li`;
const reportDetailsFields = () => $$(reportDetailsFieldsSelector);

const submitReportButton = () => $('.action-container .general-actions:not(.ng-hide) .fa-plus');
const deleteAllButton = () => $('.action-container .detail-actions .delete-all');
const dateFilter = () => $('#date-filter');
const datePickerStart = () => $('.daterangepicker [name="daterangepicker_start"]');
const datePickerEnd = () => $('.daterangepicker [name="daterangepicker_end"]');

const formActionsLink = (formId) => {
  return $(`.action-container .general-actions .dropup.open .dropdown-menu li a[href="#/reports/add/${formId}"]`);
};
const unreadCount = () => $('#reports-tab .mm-badge');
const formTitle = () => $('#report-form #form-title');
const submitButton = () => $('#report-form .form-footer .btn.submit');

const forms = () => $$('.action-container .general-actions .actions.dropup .dropdown-menu li');
const deselectReport = () => $(`${reportBody} .deselect`);
const itemSummary = () => $(`${reportBody} .item-summary`);
const checkCss = 'input[type="checkbox"]';

const sentTask = async () => (await reportBodyDetails()).$('ul .task-list .task-state .state');
const reportByUUID = (uuid) => $(`li[data-record-id="${uuid}"]`);

const patientName = () => $('.subject .name');
const reportType = () => $('div[test-id="form-title"]');

// warning: the unread element is not displayed when there are no unread reports
const getUnreadCount = async () => {
  await browser.waitUntil(async () => await (await unreadCount()).waitForDisplayed());
  return await (await unreadCount()).getText();
};

const goToReportById = (reportId) => browser.url(`#/reports/${reportId}`);

const getTaskState = async (first, second) => {
  return (await reportBodyDetails())
    .$(`.scheduled-tasks > ul > li:nth-child(${first}) > ul > li:nth-child(${second}) .task-state .state`);
};

const openForm = async (name) => {
  await (await submitReportButton()).waitForClickable();
  await (await submitReportButton()).click();
  // this is annoying but there's a race condition where the click could end up on another form if we don't
  // wait for the animation to finish
  await (await $('.action-container .general-actions .actions.dropup.open')).waitForDisplayed();
  await browser.pause(50);
  for (const form of await forms()) {
    if (await form.getText() === name) {
      await form.click();
      await (await formTitle()).waitForDisplayed();
      return;
    }
  }
  throw new Error(`Form with name: "${name}" not found`);
};

const setDateInput = async (name, date) => {
  const input = await (typeof name === 'string' ? $(`input[name="${name}"]`) : name);
  const dateWidget = await input.previousElement();
  const visibleInput = await dateWidget.$('input[type="text"]');
  await visibleInput.setValue(date);
  await (await formTitle()).click();
};

const setBikDateInput = async (name, date) => {
  const input = await $(`input[name="${name}"]`);
  const dateWidget = await input.nextElement();
  await (await dateWidget.$('input[name="day"]')).setValue(date.day);
  await (await dateWidget.$('.dropdown-toggle')).click();
  await (await (await dateWidget.$$('.dropdown-menu li'))[date.month - 1]).click();
  await (await dateWidget.$('input[name="year"]')).setValue(date.year);
  await (await formTitle()).click();
};

const getSummaryField = async (name) => {
  const input = await $(`input[name="${name}"]`);
  const summaryElement = await input.previousElement();
  return summaryElement.getText();
};

const getFieldValue = async (name) => {
  const input = await $(`input[name="${name}"]`);
  return input.getValue();
};

const submitForm = async () => {
  await (await submitButton()).waitForDisplayed();
  await (await submitButton()).click();
  await (await reportBodyDetails()).waitForDisplayed();
};

const getElementText = async (element) => {
  if (await (await element).isExisting()) {
    return (await element).getText();
  }
};

const getListReportInfo = async (listElement) => {
  return {
    heading: await getElementText(listElement.$('.content .heading h4 span')),
    form: await getElementText(listElement.$('.content .summary')),
    lineage: await getElementText(listElement.$('.content .detail')),
    reported_date: await getElementText(listElement.$('.content .heading .date')),
  };
};

const reportsListDetails = async () => {
  const reports = await $$(`${reportListID} li`);
  const reportDetails = [];
  for (const report of reports) {
    reportDetails.push(await getListReportInfo(report));
  }

  return reportDetails;
};

const collapseSelection = async () => {
  await (await itemSummary()).click();
  expect(await (await reportBodyDetails()).isExisting()).to.be.false;
};

const deleteSelectedReports = async () => {
  const confirmButton = () => $('.btn.submit.btn-danger');
  const completeButton = () => $('a=Complete');
  await (await deleteAllButton()).click();
  await (await confirmButton()).click();
  await (await completeButton()).click();
  await (await completeButton()).waitForDisplayed({ reverse: true });
  await (await firstReport()).waitForDisplayed();
  return await $$(reportBody);
};

const deselectAll = async () => {
  const deselectAllButton = await $('.action-container .deselect-all');
  await deselectAllButton.click();
  const count = await $('#reports-content .selection-count > span');
  await count.waitForExist({ reverse: true });
  return await $$(reportBody);
};

const expandSelection = async () => {
  await (await itemSummary()).click();
  await (await $(reportBodyDetailsSelector)).waitForDisplayed();
};

const selectAll = async () => {
  await (await $('.action-container .select-all')).click();
  await (await $('#reports-content .selection-count > span')).waitForDisplayed();
  return await $$(reportBody);
};

const selectReports = async (uuids) => {
  for (const uuid of uuids) {
    await (await reportByUUID(uuid)).$(checkCss).click();
    await (await deleteAllButton()).waitForClickable();
  }
  return await $$(reportBody);
};

const startSelectMode = async (savedUuids) => {
  const selectModeButton = () => $('.action-container .select-mode-start');
  await (await selectModeButton()).click();
  const checkbox = (await reportByUUID(savedUuids[0])).$(checkCss);
  await checkbox.waitForDisplayed();
};

const stopSelectMode = async (savedUuids) => {
  await (await $('.action-container .select-mode-stop')).click();
  const checkbox = (await reportByUUID(savedUuids[0])).$(checkCss);
  await checkbox.waitForDisplayed({ reverse: true });
};

const filterByDate = async (startDate, endDate) => {
  await (await dateFilter()).click();
  await (await datePickerStart()).click();
  await (await datePickerStart()).setValue(startDate.format('MM/DD/YYYY'));
  await (await datePickerEnd()).click();
  await (await datePickerEnd()).setValue(endDate.format('MM/DD/YYYY'));
  await (await datePickerStart()).click();
  await (await $('#freetext')).click(); // blur the datepicker
};

const openSidebarFilter = async () => {
  if (!await (await filterResetBtn()).isDisplayed()) {
    await (await sidebarFilterOpenBtn()).click();
  }
  return await (await filterResetBtn()).waitForDisplayed();
};

const closeSidebarFilter = async () => {
  if (await (await filterResetBtn()).isDisplayed()) {
    await (await sidebarFilterOpenBtn()).click();
  }
  return await (await filterResetBtn()).waitForDisplayed({ reverse: true });
};

const openSidebarFilterDateAccordion = async () => {
  await (await sidebarFilterDateAccordionHeader()).click();
  return (await sidebarFilterDateAccordionBody()).waitForDisplayed();
};

const setSidebarFilterDate = async (fieldPromise, calendarIdx, date) => {
  await (await fieldPromise).waitForDisplayed();
  await (await fieldPromise).click();

  const dateRangePicker = `.daterangepicker:nth-of-type(${calendarIdx})`;
  await (await $(dateRangePicker)).waitForDisplayed();

  const leftArrow = $(`${dateRangePicker} .table-condensed th>.fa-chevron-left`);
  await (await leftArrow).click();

  const dateCel = $(`${dateRangePicker} .table-condensed tr td[data-title="${date}"]`);
  await (await dateCel).click();
};

const setSidebarFilterFromDate = () => {
  return setSidebarFilterDate(sidebarFilterFromDate(), 1, 'r1c2');
};

const setSidebarFilterToDate = () => {
  return setSidebarFilterDate(sidebarFilterToDate(), 2, 'r3c5');
};

const firstReportDetailField = () => $('#reports-content .details ul li:first-child p');

const getAllReportsText = async () => {
  await (await reportRow()).waitForDisplayed();
  return commonElements.getTextForElements(reportRowsText);
};

const getCurrentReportId = async () => {
  const currentUrl = await browser.getUrl();
  const reportBaseUrl = utils.getBaseUrl() + 'reports/';
  if (!currentUrl.startsWith(reportBaseUrl)) {
    return;
  }

  return currentUrl.slice(reportBaseUrl.length);
};

const getReportDetailFieldValueByLabel = async (label) => {
  await reportBodyDetails().waitForDisplayed();
  for (const field of await reportDetailsFields()) {
    const fieldLabel = await (await field.$('label span')).getText();
    if (fieldLabel === label) {
      return await (await field.$('p span')).getText();
    }
  }
};

const getReportSubject = async () => {
  await patientName().waitForDisplayed();
  return (await patientName()).getText();
};

const getReportType = async () => {
  await reportType().waitForDisplayed();
  return (await reportType()).getText();
};

const openSelectedReport = async (listElement) => {
  await listElement.click();
};

const resetFilter = async () => {
  await openSidebarFilter();
  await (await filterResetBtn()).waitForDisplayed();
  await (await filterResetBtn()).click();
  await closeSidebarFilter();
  await searchElements.clearSearch();
};

const openReport = async (reportId) => {
  await resetFilter();
  await (await firstReport()).waitForDisplayed();
  const reportListItem = await reportByUUID(reportId);
  await reportListItem.waitForDisplayed();
  await reportListItem.click();
  await reportBodyDetails().waitForDisplayed();
};

const editReport = async (reportId) => {
  await commonElements.goToReports();
  await openReport(reportId);
  await (await editReportButton()).click();
  await (await formTitle()).waitForDisplayed();
};

const fieldByIndex = async (index) => {
  return await (await $(`${reportBodyDetailsSelector} li:nth-child(${index}) p`)).getText();
};

module.exports = {
  getCurrentReportId,
  reportList,
  firstReport,
  submitterName,
  submitterPhone,
  submitterPlace,
  selectedCaseId,
  selectedCaseIdLabel,
  submitReportButton,
  formActionsLink,
  getUnreadCount,
  goToReportById,
  sentTask,
  getTaskState,
  openForm,
  formTitle,
  openSidebarFilter,
  openSidebarFilterDateAccordion,
  setSidebarFilterFromDate,
  setSidebarFilterToDate,
  setDateInput,
  getFieldValue,
  setBikDateInput,
  getSummaryField,
  submitForm,
  reportsListDetails,
  stopSelectMode,
  startSelectMode,
  selectAll,
  selectReports,
  deselectReport,
  expandSelection,
  collapseSelection,
  deleteSelectedReports,
  deselectAll,
  firstReportDetailField,
  reportByUUID,
  filterByDate,
  allReports,
  reportsByUUID,
  getAllReportsText,
  getReportDetailFieldValueByLabel,
  getReportSubject,
  getReportType,
  getListReportInfo,
  openReport,
  reportTasks,
  editReport,
  fieldByIndex,
  openSelectedReport,
};
