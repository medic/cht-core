const commonElements = require('../common/common.wdio.page');
const searchElements = require('../search/search.wdio.page');
const utils = require('../../../utils');

const REPORTS_LIST_ID = '#reports-list';
const reportBodyDetailsSelector = '#reports-content .report-body .details';
const reportBodyDetails = () => $(reportBodyDetailsSelector);
const reportTasks = () =>  $(`${reportBodyDetailsSelector} .scheduled-tasks`);
const REPORT_BODY = '#reports-content .report-body';
const reportBody = () => $(REPORT_BODY);
const selectedCaseId = () => $(`${reportBodyDetailsSelector} > ul > li > p > span > a`);
const selectedCaseIdLabel = () => $(`${reportBodyDetailsSelector} ul > li > label > span`);
const submitterPlace = () => $('.position a');
const submitterPhone = () => $('.sender .phone');
const submitterName = () => $('.sender .name');
const firstReport = () => $(`${REPORTS_LIST_ID} li:first-child`);
const reportList = () => $(`${REPORTS_LIST_ID}`);
const allReports = () => $$(`${REPORTS_LIST_ID} li.content-row`);
const reportsByUUID = (uuid) => $$(`${REPORTS_LIST_ID} li.content-row[data-record-id="${uuid}"]`);
const reportRowSelector = `${REPORTS_LIST_ID} .content-row`;
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
const deleteAllButton = () => $('.desktop.multiselect-bar-container .bulk-delete');
const selectedReportsCount = () => $('.desktop.multiselect-bar-container .count-label');
const DELETE_CONFIRM_MODAL = 'mm-modal#bulk-delete-confirm';
const bulkDeleteModal = () => $(DELETE_CONFIRM_MODAL);
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
const deselectReport = () => $(`${REPORT_BODY} .deselect`);
const itemSummary = () => $(`${REPORT_BODY} .item-summary`);
const reportCheckbox = (uuid) => $(`${REPORTS_LIST_ID} li[data-record-id="${uuid}"] input[type="checkbox"]`);
const reportSelectedCheckbox = () => $$(`${REPORTS_LIST_ID} li input[type="checkbox"]:checked`);
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
  const reports = await $$(`${REPORTS_LIST_ID} li`);
  const reportDetails = [];
  for (const report of reports) {
    reportDetails.push(await getListReportInfo(report));
  }

  return reportDetails;
};

const toggleSelectedReportSummary = async (reverse=false) => {
  await (await itemSummary()).waitForClickable();
  await (await itemSummary()).click();
  await (await reportBodyDetails()).waitForDisplayed({ reverse });
};

const deleteSelectedReports = async () => {
  await (await deleteAllButton()).waitForDisplayed();
  await (await deleteAllButton()).click();

  await (await bulkDeleteModal()).waitForDisplayed();
  await (await $(`${DELETE_CONFIRM_MODAL} .btn.submit.btn-danger`)).click();

  const bulkDeleteConfirmBtn = () => $('a=Complete');
  await (await bulkDeleteConfirmBtn()).waitForDisplayed();
  await (await bulkDeleteConfirmBtn()).click();

  await (await bulkDeleteModal()).waitForDisplayed({ reverse: true });
  await commonElements.waitForPageLoaded();
  await (await firstReport()).waitForDisplayed();
};

const verifyMultiSelect = async (reverse=false) => {
  await (await reportBody()).waitForDisplayed( { reverse });
  await (await deleteAllButton()).waitForClickable( { reverse });
  await (await selectedReportsCount()).waitForDisplayed({ reverse });
  return {
    countLabel: reverse ? false : await (await selectedReportsCount()).getText(),
    selectedCount: (await reportSelectedCheckbox()).length,
  };
};

const toggleSelectAll = async (reverse=false) => {
  await (await $(`${REPORTS_LIST_ID} .select-all input[type="checkbox"]`)).click();
  return verifyMultiSelect(reverse);
};

const selectReports = async (uuids, reverse=false) => {
  for (const uuid of uuids) {
    await (await reportCheckbox(uuid)).click();
  }
  return verifyMultiSelect(reverse);
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
  toggleSelectAll,
  selectReports,
  deselectReport,
  toggleSelectedReportSummary,
  deleteSelectedReports,
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
  reportBodyDetails,
  openSelectedReport,
};
