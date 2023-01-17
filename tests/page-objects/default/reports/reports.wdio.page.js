const commonElements = require('../common/common.wdio.page');
const searchElements = require('../search/search.wdio.page');
const utils = require('../../../utils');

const REPORTS_LIST_ID = '#reports-list';
const SELECT_ALL_CHECKBOX = `${REPORTS_LIST_ID} .select-all input[type="checkbox"]`;
const reportBodyDetailsSelector = '#reports-content .report-body .details';
const reportBodyDetails = () => $(reportBodyDetailsSelector);
const reportTasks = () =>  $(`${reportBodyDetailsSelector} .scheduled-tasks`);
const REPORT_BODY = '#reports-content .report-body';
const reportBody = () => $(REPORT_BODY);
const noReportSelectedLabel = () => $('.empty-selection');
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
const editReportButton = () => $('.mat-menu-content .mat-menu-item[test-id="edit-reports"]');
const deleteButton = () => $('.mat-menu-content .mat-menu-item[test-id="delete-reports"]');
const exportButton = () => $('.mat-menu-content .mat-menu-item[test-id="export-reports"]');

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
const itemSummary = () => $(`${REPORT_BODY} .item-summary`);
const itemSummaries = () => $$(`${REPORT_BODY} .item-summary`);
const reportCheckbox = (uuid) => $(`${REPORTS_LIST_ID} li[data-record-id="${uuid}"] input[type="checkbox"]`);
const selectedReportsCheckboxes = () => $$(`${REPORTS_LIST_ID} li input[type="checkbox"]:checked`);
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

const selectedReportsDetailsCount = async () => {
  const summaries = await itemSummaries();
  return summaries.length;
};

const expandSelectedReportSummary = async () => {
  await (await itemSummary()).waitForClickable();
  await (await itemSummary()).click();
  await (await reportBodyDetails()).waitForDisplayed();
};

const collapseSelectedReportSummary = async () => {
  await (await itemSummary()).waitForClickable();
  await (await itemSummary()).click();
  await (await reportBodyDetails()).waitForDisplayed({ reverse: true });
};

const deleteSelectedReports = async () => {
  await (await deleteAllButton()).waitForDisplayed();
  await (await deleteAllButton()).click();

  await (await bulkDeleteModal()).waitForDisplayed();
  await (await $(`${DELETE_CONFIRM_MODAL} .btn.submit.btn-danger`)).click();

  const bulkDeleteConfirmBtn = () => $(`${DELETE_CONFIRM_MODAL} [test-id="bulkdelete.complete.action"]`);
  await (await bulkDeleteConfirmBtn()).waitForDisplayed();
  await (await bulkDeleteConfirmBtn()).click();

  await (await bulkDeleteModal()).waitForDisplayed({ reverse: true });
  await commonElements.waitForPageLoaded();
  await (await reportList()).waitForDisplayed();
};

const verifyMultiselectElementsDisplay = async (shouldHide=false) => {
  await (await reportBody()).waitForDisplayed( { reverse: shouldHide });
  await (await deleteAllButton()).waitForClickable( { reverse: shouldHide });
  await (await selectedReportsCount()).waitForDisplayed({ reverse: shouldHide });
  return {
    countLabel: shouldHide ? false : await (await selectedReportsCount()).getText(),
    selectedCount: (await selectedReportsCheckboxes()).length,
  };
};

const isSelectAll = async () => {
  return await (await $(`${SELECT_ALL_CHECKBOX}:checked`)).isExisting();
};

const selectAll = async () => {
  if (await isSelectAll()) {
    return;
  }
  await (await $(SELECT_ALL_CHECKBOX)).click();
  return await verifyMultiselectElementsDisplay();
};

const deselectAll = async () => {
  if (!(await isSelectAll())) {
    return;
  }
  await (await $(SELECT_ALL_CHECKBOX)).click();
  return await verifyMultiselectElementsDisplay(true);
};

const isReportSelected = async (uuid) => {
  const checkbox = $(`${REPORTS_LIST_ID} li[data-record-id="${uuid}"] input[type="checkbox"]:checked`);
  return await (await checkbox).isExisting();
};

const selectReports = async (uuids) => {
  for (const uuid of uuids) {
    if (!(await isReportSelected(uuid))) {
      await (await reportCheckbox(uuid)).click();
    }
  }
  return verifyMultiselectElementsDisplay();
};

const deselectReports = async (uuids, shouldHideElements=false) => {
  for (const uuid of uuids) {
    if (await isReportSelected(uuid)) {
      await (await reportCheckbox(uuid)).click();
    }
  }
  return verifyMultiselectElementsDisplay(shouldHideElements);
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

const getLastSubmittedReportId = async () => {
  await (await firstReport()).click();
  return getCurrentReportId();
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
  await (await firstReport()).waitForDisplayed();
  const reportListItem = await reportByUUID(reportId);
  await reportListItem.waitForDisplayed();
  await reportListItem.click();
  await reportBodyDetails().waitForDisplayed();
};

const editReport = async (reportId) => {
  await commonElements.goToReports();
  await openReport(reportId);
  await commonElements.openMoreOptionsMenu();
  await (await editReportButton()).waitForClickable();
  await (await editReportButton()).click();
  await (await formTitle()).waitForDisplayed();
};

const fieldByIndex = async (index) => {
  return await (await $(`${reportBodyDetailsSelector} li:nth-child(${index}) p`)).getText();
};

const exportReports = async () => {
  await commonElements.openMoreOptionsMenu();
  await (await exportButton()).waitForClickable();
  await (await exportButton()).click();
};

const deleteReport = async () => {
  await commonElements.openMoreOptionsMenu();
  await (await deleteButton()).waitForClickable();
  await (await deleteButton()).click();
};

module.exports = {
  getCurrentReportId,
  getLastSubmittedReportId,
  noReportSelectedLabel,
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
  selectAll,
  deselectAll,
  reportCheckbox,
  isReportSelected,
  selectReports,
  deselectReports,
  selectedReportsCheckboxes,
  expandSelectedReportSummary,
  collapseSelectedReportSummary,
  deleteSelectedReports,
  bulkDeleteModal,
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
  resetFilter,
  openReport,
  reportTasks,
  editReportButton,
  editReport,
  deleteReport,
  exportReports,
  fieldByIndex,
  reportBodyDetails,
  openSelectedReport,
  selectedReportsDetailsCount,
};
