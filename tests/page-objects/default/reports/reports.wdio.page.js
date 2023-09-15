const commonElements = require('../common/common.wdio.page');
const modalPage = require('../common/modal.wdio.page');
const searchElements = require('../search/search.wdio.page');
const utils = require('@utils');

const REPORTS_LIST_ID = '#reports-list';
const SELECT_ALL_CHECKBOX = `${REPORTS_LIST_ID} .select-all input[type="checkbox"]`;
const REPORT_BODY_DETAILS_SELECTOR = '#reports-content .report-body .details';
const reportBodyDetails = () => $(REPORT_BODY_DETAILS_SELECTOR);
const reportTasks = () => $(`${REPORT_BODY_DETAILS_SELECTOR} .scheduled-tasks`);
const reportCaseIdFilter = () => $(`${REPORT_BODY_DETAILS_SELECTOR} [test-id*=".case_id"]`);
const REPORT_BODY = '#reports-content .report-body';
const reportBody = () => $(REPORT_BODY);
const noReportSelectedLabel = () => $('.empty-selection');
const selectedCaseId = () => $(`${REPORT_BODY_DETAILS_SELECTOR} > ul > li > p > span > a`);
const selectedCaseIdLabel = () => $(`${REPORT_BODY_DETAILS_SELECTOR} ul > li > label > span`);
const firstReport = () => $(`${REPORTS_LIST_ID} li:first-child`);
const reportList = () => $(`${REPORTS_LIST_ID}`);
const reportListLoadingStatus = () => $(`${REPORTS_LIST_ID} .loading-status`);
const allReports = () => $$(`${REPORTS_LIST_ID} li.content-row`);
const reportsByUUID = (uuid) => $$(`${REPORTS_LIST_ID} li.content-row[data-record-id="${uuid}"]`);
const REPORT_ROW_SELECTOR = `${REPORTS_LIST_ID} .content-row`;
const reportRow = () => $(REPORT_ROW_SELECTOR);
const reportRowsText = () => $$(`${REPORT_ROW_SELECTOR} .heading h4 span`);
const editReportButton = () => $('.mat-mdc-menu-content .mat-mdc-menu-item[test-id="edit-reports"]');
const deleteButton = () => $('.mat-mdc-menu-content .mat-mdc-menu-item[test-id="delete-reports"]');
const exportButton = () => $('.mat-mdc-menu-content .mat-mdc-menu-item[test-id="export-reports"]');
const reviewButton = () => $('.mat-mdc-menu-content .mat-mdc-menu-item[test-id="review-report"]');
const REVIEW_REPORT_CONTAINER = '.verify-report-options-wrapper';
const reviewReportContainer = () => $(REVIEW_REPORT_CONTAINER);
const reviewReportOptionById = (id) => $(`${REVIEW_REPORT_CONTAINER} button.${id}`);
const activeReviewOption = () => $(`${REVIEW_REPORT_CONTAINER} button.active-option`);
const reviewReportCloseButton = () => $(`${REVIEW_REPORT_CONTAINER} .panel-header .panel-header-close`);

const sidebarFilterDateAccordionHeader = () => $('#date-filter-accordion mat-expansion-panel-header');
const sidebarFilterDateAccordionBody = () => $('#date-filter-accordion mat-panel-description');
const sidebarFilterToDate = () => $('#toDateFilter');
const sidebarFilterFromDate = () => $('#fromDateFilter');
const sidebarFilterOpenBtn = () => $('mm-search-bar .open-filter');
const filterResetBtn = () => $('.sidebar-reset');

const REPORT_DETAILS_FIELDS_SELECTOR = `${REPORT_BODY_DETAILS_SELECTOR} > ul > li`;
const reportDetailsFields = () => $$(REPORT_DETAILS_FIELDS_SELECTOR);
const rawReportContent = () => $(`${REPORT_BODY_DETAILS_SELECTOR} p[test-id='raw-report-content']`);
const AUTOMATIC_REPLY_SECTION = `${REPORT_BODY_DETAILS_SELECTOR} ul[test-id='automated-reply']`;
const automaticReplyMessage = () => $(`${AUTOMATIC_REPLY_SECTION} p[test-id='message-content']`);
const automaticReplyState = () => $(`${AUTOMATIC_REPLY_SECTION} .state`);
const automaticReplyRecipient = () => $(`${AUTOMATIC_REPLY_SECTION} .recipient`);

const deleteAllButton = () => $('.desktop.multiselect-bar-container .bulk-delete');
const selectedReportsCount = () => $('.desktop.multiselect-bar-container .count-label');
const bulkDeleteModal = () => $('#bulk-delete-confirm');
const dateFilter = () => $('#date-filter');
const datePickerStart = () => $('.daterangepicker [name="daterangepicker_start"]');
const datePickerEnd = () => $('.daterangepicker [name="daterangepicker_end"]');

const unreadCount = () => $('#reports-tab .mm-badge');
const formTitle = () => $('#report-form #form-title');
const submitButton = () => $('#report-form .form-footer .btn.submit');

const itemSummary = () => $(`${REPORT_BODY} .item-summary`);
const reportCheckbox = (uuid) => $(`${REPORTS_LIST_ID} li[data-record-id="${uuid}"] input[type="checkbox"]`);
const selectedReportsCheckboxes = () => $$(`${REPORTS_LIST_ID} li input[type="checkbox"]:checked`);
const sentTask = async () => (await reportBodyDetails()).$('ul .task-list .task-state .state');
const reportByUUID = (uuid) => $(`li[data-record-id="${uuid}"]`);

const patientName = () => itemSummary().$('.subject .name');
const reportName = () => itemSummary().$('div[test-id="form-title"]');
const senderName = () => itemSummary().$('.sender .name');
const senderPhone = () => itemSummary().$('.sender .phone');
const lineage = () => itemSummary().$('.position');
const relativeDate = () => itemSummary().$('.relative-date');

// warning: the unread element is not displayed when there are no unread reports
const getUnreadCount = async () => {
  await browser.waitUntil(async () => await (await unreadCount()).waitForDisplayed());
  return await (await unreadCount()).getText();
};

const goToReportById = (reportId) => browser.url(`#/reports/${reportId}`);

const getTaskDetails = async (taskNumber, messageNumber) => {
  const task = await reportTasks().$(`li[test-id='tasks']:nth-child(${taskNumber})`);
  const message = await task.$(`li[test-id='task-message']:nth-child(${messageNumber})`);
  return {
    title: await task.$('h3[test-id="task-title"]').getText(),
    message: await message.$('p[test-id="message-content"]').getText(),
    state: await message.$('.state').getText(),
    recipient: await message.$('.recipient').getText(),
  };
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
    dataId: await listElement.getAttribute('data-record-id'),
  };
};

const reportsListDetails = async () => {
  const reports = await $$(`${REPORTS_LIST_ID} .items-container>ul>li`);
  const reportDetails = [];
  for (const report of reports) {
    reportDetails.push(await getListReportInfo(report));
  }

  return reportDetails;
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
  await (await modalPage.submit());
  await (await modalPage.checkModalHasClosed());

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

const clickOnCaseId = async () => {
  await reportBodyDetails().waitForDisplayed();
  await reportCaseIdFilter().waitForClickable();
  await reportCaseIdFilter().click();
};

const getRawReportContent = async () => {
  return await (await rawReportContent()).getText();
};

const getAutomaticReply = async () => {
  return {
    message: await automaticReplyMessage().getText(),
    state: await automaticReplyState().getText(),
    recipient: await automaticReplyRecipient().getText(),
  };
};

const getOpenReportInfo = async () => {
  return {
    patientName: await getElementText(patientName()),
    reportName: await getElementText(reportName()),
    senderName: await getElementText(senderName()),
    senderPhone: await getElementText(senderPhone()),
    lineage: await getElementText(lineage()),
    relativeDate: await getElementText(relativeDate()),
  };
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
  return await (await $(`${REPORT_BODY_DETAILS_SELECTOR} li:nth-child(${index}) p`)).getText();
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

const openReview = async () => {
  await commonElements.openMoreOptionsMenu();
  await (await reviewButton()).waitForClickable();
  await (await reviewButton()).click();
  await (await reviewReportContainer()).waitForDisplayed();
};

const closeReview = async () => {
  await (await reviewReportContainer()).waitForDisplayed();
  await (await reviewReportCloseButton()).waitForClickable();
  await (await reviewReportCloseButton()).click();
};

const openReviewAndSelectOption = async (optionId) => {
  await openReview();
  await (await reviewReportOptionById(optionId)).waitForClickable();
  await (await reviewReportOptionById(optionId)).click();
};

const getSelectedReviewOption = async () => {
  await openReview();
  await (await activeReviewOption()).waitForDisplayed();
  const label = (await (await activeReviewOption()).getText()).trim();
  await closeReview();
  return label;
};

const getReportListLoadingStatus = async () => {
  await (await reportListLoadingStatus()).waitForDisplayed();
  return await (await reportListLoadingStatus()).getText();
};

module.exports = {
  getCurrentReportId,
  getLastSubmittedReportId,
  noReportSelectedLabel,
  reportList,
  firstReport,
  patientName,
  senderPhone,
  selectedCaseId,
  selectedCaseIdLabel,
  getUnreadCount,
  goToReportById,
  sentTask,
  getTaskDetails,
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
  getRawReportContent,
  getAutomaticReply,
  getOpenReportInfo,
  getListReportInfo,
  resetFilter,
  openReport,
  reportTasks,
  editReportButton,
  editReport,
  deleteReport,
  exportReports,
  openReviewAndSelectOption,
  getSelectedReviewOption,
  fieldByIndex,
  reportBodyDetails,
  clickOnCaseId,
  getReportListLoadingStatus,
  openSelectedReport,
};
