const commonElements = require('@page-objects/default/common/common.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const utils = require('@utils');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

const tabSelectors = {
  unreadCount: () => $('#reports-tab .mm-badge'),
};

const REPORTS_LIST_ID = '#reports-list';
const ALL_REPORTS = `${REPORTS_LIST_ID} li.content-row`;
const leftPanelSelectors = {
  selectAllCheckbox: `${REPORTS_LIST_ID} .select-all input[type="checkbox"]`,
  reportList: () => $(`${REPORTS_LIST_ID}`),
  reportListLoadingStatus: () => $(`${REPORTS_LIST_ID} .loading-status`),
  allReports: () => $$(ALL_REPORTS),
  reportRowsText: () => $$(`${ALL_REPORTS} .heading h4 span`),
  firstReport: () => $(`${REPORTS_LIST_ID} li:first-child`),
  reportByUUID: (uuid) => $(`${REPORTS_LIST_ID} li.content-row[data-record-id="${uuid}"]`),
  reportCheckbox: (uuid) => $(`${REPORTS_LIST_ID} li[data-record-id="${uuid}"] input[type="checkbox"]`),
  selectedReportsCheckboxes: () => $$(`${REPORTS_LIST_ID} li input[type="checkbox"]:checked`),
};

const REPORT_BODY = '#reports-content .report-body';
const REPORT_SUMMARY = `${REPORT_BODY} .item-summary`;
const REPORT_BODY_DETAILS = `${REPORT_BODY} .details`;
const REPORT_DETAILS_FIELDS = `${REPORT_BODY_DETAILS} > ul > li`;
const AUTOMATIC_REPLY_SECTION = `${REPORT_BODY_DETAILS} ul[test-id='automated-reply']`;
const rightPanelSelectors = {
  noReportSelectedLabel: () => $('.empty-selection'),
  reportBody: () => $(REPORT_BODY),
  reportSummary: () => $(REPORT_SUMMARY),
  patientName: () => $(`${REPORT_SUMMARY} .subject .name`),
  reportName: () => $(`${REPORT_SUMMARY} div[test-id="form-title"]`),
  senderName: () => $(`${REPORT_SUMMARY} .sender .name`),
  senderPhone: () => $(`${REPORT_SUMMARY} .sender .phone`),
  lineage: () => $(`${REPORT_SUMMARY} .position`),
  relativeDate: () => $(`${REPORT_SUMMARY} .relative-date`),
  reportBodyDetails: () => $(REPORT_BODY_DETAILS),
  reportTasks: () => $(`${REPORT_BODY_DETAILS} .scheduled-tasks`),
  reportCaseIdFilter: () => $(`${REPORT_BODY_DETAILS} span[test-id*=".case_id"]`),
  selectedCaseId: () => $(`${REPORT_BODY_DETAILS} > ul > li > p > span > a`),
  selectedCaseIdLabel: () => $(`${REPORT_BODY_DETAILS} ul > li > label > span`),
  reportDetailsFields: () => $$(REPORT_DETAILS_FIELDS),
  rawReportContent: () => $(`${REPORT_BODY_DETAILS} p[test-id='raw-report-content']`),
  automaticReplyMessage: () => $(`${AUTOMATIC_REPLY_SECTION} p[test-id='message-content']`),
  automaticReplyState: () => $(`${AUTOMATIC_REPLY_SECTION} .state`),
  automaticReplyRecipient: () => $(`${AUTOMATIC_REPLY_SECTION} .recipient`),
  detailReportRowContent: (row, type) => $$(`${REPORT_BODY_DETAILS} li[test-id*='${row}'] span[test-id='${type}']`),
  deleteAllButton: () => $('.desktop.multiselect-bar-container .bulk-delete'),
  selectedReportsCount: () => $('.desktop.multiselect-bar-container .count-label'),
  sentTask: () => $(`${REPORT_BODY_DETAILS} ul .task-list .task-state .state`),
};

const REVIEW_REPORT_CONTAINER = '.verify-report-options-wrapper';
const reviewDialogSelectors = {
  container: () => $(REVIEW_REPORT_CONTAINER),
  optionById: (id) => $(`${REVIEW_REPORT_CONTAINER} button.${id}`),
  activeOption: () => $(`${REVIEW_REPORT_CONTAINER} button.active-option`),
  closeButton: () => $(`${REVIEW_REPORT_CONTAINER} .panel-header .panel-header-close`)
};

const sidebarFilterSelectors = {
  openBtn: () => $('mm-search-bar .open-filter'),
  resetBtn: () => $('.sidebar-reset'),
  dateAccordionHeader: () => $('#date-filter-accordion mat-expansion-panel-header'),
  dateAccordionBody: () => $('#date-filter-accordion mat-panel-description'),
  toDate: () => $('#toDateFilter'),
  fromDate: () => $('#fromDateFilter'),
  formAccordionHeader: () => $('#form-filter-accordion mat-expansion-panel-header'),
  formAccordionBody: () => $('#form-filter-accordion mat-panel-description'),
  facilityAccordionHeader: () => $('#place-filter-accordion mat-expansion-panel-header'),
  facilityAccordionBody: () => $('#place-filter-accordion mat-panel-description'),
  statusAccordionHeader: () => $('#status-filter-accordion mat-expansion-panel-header'),
  statusAccordionBody: () => $('#status-filter-accordion mat-panel-description'),
};

const deleteDialogSelectors = {
  bulkDeleteModal: () => $('#bulk-delete-confirm'),
};

const oldFilterAndSearchSelectors = {
  dateFilter: () => $('#date-filter'),
  datePickerStart: () => $('.daterangepicker [name="daterangepicker_start"]'),
  datePickerEnd: () => $('.daterangepicker [name="daterangepicker_end"]'),
};

// warning: the unread element is not displayed when there are no unread reports
const getUnreadCount = async () => {
  await browser.waitUntil(async () => await tabSelectors.unreadCount().waitForDisplayed());
  return await tabSelectors.unreadCount().getText();
};

const goToReportById = (reportId) => browser.url(`#/reports/${reportId}`);

const getTaskDetails = async (taskNumber, messageNumber) => {
  const task = rightPanelSelectors.reportTasks().$(`li[test-id='tasks']:nth-child(${taskNumber})`);
  const message = task.$(`li[test-id='task-message']:nth-child(${messageNumber})`);
  return {
    title: await task.$('h3[test-id="task-title"]').getText(),
    message: await message.$('p[test-id="message-content"]').getText(),
    state: await message.$('.state').getText(),
    recipient: await message.$('.recipient').getText(),
  };
};

const setDateInput = async (name, date) => {
  const input = typeof name === 'string' ? $(`input[name="${name}"]`) : name;
  const dateWidget = input.previousElement();
  const visibleInput = dateWidget.$('input[type="text"]');
  await visibleInput.setValue(date);
};

const setBikDateInput = async (name, date) => {
  const input = $(`input[name="${name}"]`);
  const dateWidget = input.nextElement();
  await dateWidget.$('input[name="day"]').setValue(date.day);
  await dateWidget.$('.dropdown-toggle').click();
  await dateWidget.$$('.dropdown-menu li')[date.month - 1].click();
  await dateWidget.$('input[name="year"]').setValue(date.year);
  //To close the date widget
  await genericForm.formTitle().click();
};

const getElementText = async (element) => {
  if (await element.isExisting()) {
    return element.getText();
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

const toggleReportSummary = async (expand = false) => {
  const reportSummary = await rightPanelSelectors.reportSummary();
  await reportSummary.waitForClickable();
  await reportSummary.click();
  await rightPanelSelectors.reportBodyDetails().waitForDisplayed({ reverse: expand });
};

const expandSelectedReportSummary = async () => {
  await toggleReportSummary();
};

const collapseSelectedReportSummary = async () => {
  await toggleReportSummary(true);
};

const deleteSelectedReports = async () => {
  await rightPanelSelectors.deleteAllButton().waitForDisplayed();
  await rightPanelSelectors.deleteAllButton().click();

  await deleteDialogSelectors.bulkDeleteModal().waitForDisplayed();
  await modalPage.submit();
  await modalPage.checkModalHasClosed();

  await commonElements.waitForPageLoaded();
  await leftPanelSelectors.reportList().waitForDisplayed();
};

const verifyMultiselectElementsDisplay = async (shouldHide=false) => {
  await rightPanelSelectors.reportBody().waitForDisplayed( { reverse: shouldHide });
  await rightPanelSelectors.deleteAllButton().waitForClickable( { reverse: shouldHide });
  await rightPanelSelectors.selectedReportsCount().waitForDisplayed({ reverse: shouldHide });
  return {
    countLabel: shouldHide ? false : await rightPanelSelectors.selectedReportsCount().getText(),
    selectedCount: (await leftPanelSelectors.selectedReportsCheckboxes()).length,
  };
};

const isSelectAll = async () => {
  return await $(`${leftPanelSelectors.selectAllCheckbox}:checked`).isExisting();
};

const selectAll = async () => {
  if (await isSelectAll()) {
    return;
  }
  await $(leftPanelSelectors.selectAllCheckbox).click();
  return await verifyMultiselectElementsDisplay();
};

const deselectAll = async () => {
  if (!(await isSelectAll())) {
    return;
  }
  await $(leftPanelSelectors.selectAllCheckbox).click();
  return await verifyMultiselectElementsDisplay(true);
};

const isReportSelected = async (uuid) => {
  const checkbox = $(`${REPORTS_LIST_ID} li[data-record-id="${uuid}"] input[type="checkbox"]:checked`);
  return await checkbox.isExisting();
};

const selectReports = async (uuids) => {
  for (const uuid of uuids) {
    if (!(await isReportSelected(uuid))) {
      await leftPanelSelectors.reportCheckbox(uuid).click();
    }
  }
  return verifyMultiselectElementsDisplay();
};

const deselectReports = async (uuids, shouldHideElements= false) => {
  for (const uuid of uuids) {
    if (await isReportSelected(uuid)) {
      await leftPanelSelectors.reportCheckbox(uuid).click();
    }
  }
  return verifyMultiselectElementsDisplay(shouldHideElements);
};

const filterByDate = async (startDate, endDate) => {
  await oldFilterAndSearchSelectors.dateFilter().click();
  await oldFilterAndSearchSelectors.datePickerStart().click();
  await oldFilterAndSearchSelectors.datePickerStart().setValue(startDate.format('MM/DD/YYYY'));
  await oldFilterAndSearchSelectors.datePickerEnd().click();
  await oldFilterAndSearchSelectors.datePickerEnd().setValue(endDate.format('MM/DD/YYYY'));
  await oldFilterAndSearchSelectors.datePickerStart().click();
  await $('#freetext').click(); // blur the datepicker
};

const openSidebarFilter = async () => {
  if (!await sidebarFilterSelectors.resetBtn().isDisplayed()) {
    await sidebarFilterSelectors.openBtn().click();
  }
  return await sidebarFilterSelectors.resetBtn().waitForDisplayed();
};

const openSidebarFilterDateAccordion = async () => {
  await sidebarFilterSelectors.dateAccordionHeader().click();
  return sidebarFilterSelectors.dateAccordionBody().waitForDisplayed();
};

const filterByForm = async (formName) => {
  await sidebarFilterSelectors.formAccordionHeader().click();
  await sidebarFilterSelectors.formAccordionBody().waitForDisplayed();
  const option = sidebarFilterSelectors.formAccordionBody().$(`a*=${formName}`);
  await option.waitForDisplayed();
  await option.waitForClickable();
  await option.click();
};

const filterByStatus = async (statusOption) => {
  await sidebarFilterSelectors.statusAccordionHeader().click();
  await sidebarFilterSelectors.statusAccordionBody().waitForDisplayed();
  const option = sidebarFilterSelectors.statusAccordionBody().$(`a*=${statusOption}`);
  await option.waitForDisplayed();
  await option.waitForClickable();
  await option.click();
};

const filterByFacility = async (parentFacility, reportFacility) => {
  await sidebarFilterSelectors.facilityAccordionHeader().click();
  await sidebarFilterSelectors.facilityAccordionBody().waitForDisplayed();

  const parent = sidebarFilterSelectors.facilityAccordionBody().$(`a*=${parentFacility}`);
  await parent.waitForDisplayed();
  await parent.waitForClickable();
  await parent.click();

  const facility = sidebarFilterSelectors
    .facilityAccordionBody()
    .$('.mm-dropdown-submenu')
    .$(`a*=${reportFacility}`);
  await facility.waitForDisplayed();
  await facility.waitForClickable();
  const checkbox = facility.previousElement();
  await checkbox.click();
};

const setSidebarFilterDate = async (fieldPromise, calendarIdx, date) => {
  await fieldPromise.waitForDisplayed();
  await fieldPromise.waitForClickable();
  await fieldPromise.click();

  const dateRangePicker = `.daterangepicker:nth-of-type(${calendarIdx})`;
  await $(dateRangePicker).waitForDisplayed();

  const leftArrow = $(`${dateRangePicker} .table-condensed th>.fa-chevron-left`);
  await leftArrow.click();

  const dateCel = $(`${dateRangePicker} .table-condensed tr td[data-title="${date}"]`);
  await dateCel.click();
};

const setSidebarFilterFromDate = () => {
  return setSidebarFilterDate(sidebarFilterSelectors.fromDate(), 1, 'r1c2');
};

const setSidebarFilterToDate = () => {
  return setSidebarFilterDate(sidebarFilterSelectors.toDate(), 2, 'r3c5');
};

const firstReportDetailField = () => $('#reports-content .details ul li:first-child p');

const getAllReportsText = async () => {
  await leftPanelSelectors.allReports()[0].waitForDisplayed();
  return commonElements.getTextForElements(leftPanelSelectors.reportRowsText);
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
  await leftPanelSelectors.firstReport().click();
  return getCurrentReportId();
};

const getReportDetailFieldValueByLabel = async (label) => {
  await rightPanelSelectors.reportBodyDetails().waitForDisplayed();
  for (const field of await rightPanelSelectors.reportDetailsFields()) {
    const fieldLabel = await field.$('label span').getText();
    if (fieldLabel === label) {
      return await field.$('p span').getText();
    }
  }
};

const clickOnCaseId = async () => {
  await rightPanelSelectors.reportBodyDetails().waitForDisplayed();
  await rightPanelSelectors.reportCaseIdFilter().waitForClickable();
  await rightPanelSelectors.reportCaseIdFilter().click();
};

const getAutomaticReply = async () => {
  return {
    message: await rightPanelSelectors.automaticReplyMessage().getText(),
    state: await rightPanelSelectors.automaticReplyState().getText(),
    recipient: await rightPanelSelectors.automaticReplyRecipient().getText(),
  };
};

const getDetailReportRowContent = async (row) => {
  const labels = await rightPanelSelectors
    .detailReportRowContent(row, 'label')
    .map(label => label.getText());
  const values = await rightPanelSelectors
    .detailReportRowContent(row, 'value')
    .map(label => label.getText());
  return {
    rowLabels: labels,
    rowValues: values,
  };
};

const getOpenReportInfo = async () => {
  return {
    patientName: await getElementText(rightPanelSelectors.patientName()),
    reportName: await getElementText(rightPanelSelectors.reportName()),
    senderName: await getElementText(rightPanelSelectors.senderName()),
    senderPhone: await getElementText(rightPanelSelectors.senderPhone()),
    lineage: await getElementText(rightPanelSelectors.lineage()),
    relativeDate: await getElementText(rightPanelSelectors.relativeDate()),
  };
};

const openSelectedReport = async (listElement) => {
  await listElement.click();
};

const openReport = async (reportId) => {
  await leftPanelSelectors.firstReport().waitForDisplayed();
  const reportListItem = leftPanelSelectors.reportByUUID(reportId);
  await reportListItem.waitForClickable();
  await reportListItem.click();
  await rightPanelSelectors.reportBodyDetails().waitForDisplayed();
};

const fieldByIndex = async (index) => {
  return await $(`${REPORT_BODY_DETAILS} li:nth-child(${index}) p`).getText();
};

const openReview = async () => {
  await commonElements.accessReviewOption();
  await reviewDialogSelectors.container().waitForDisplayed();
};

const closeReview = async () => {
  await reviewDialogSelectors.container().waitForDisplayed();
  await reviewDialogSelectors.closeButton().waitForClickable();
  await reviewDialogSelectors.closeButton().click();
};

const openReviewAndSelectOption = async (optionId) => {
  await openReview();
  await reviewDialogSelectors.optionById(optionId).waitForClickable();
  await reviewDialogSelectors.optionById(optionId).click();
};

const getSelectedReviewOption = async () => {
  await openReview();
  await reviewDialogSelectors.activeOption().waitForDisplayed();
  const label = (await reviewDialogSelectors.activeOption().getText()).trim();
  await closeReview();
  return label;
};

const getReportListLoadingStatus = async () => {
  await leftPanelSelectors.reportListLoadingStatus().waitForDisplayed();
  return await leftPanelSelectors.reportListLoadingStatus().getText();
};

const invalidateReport = async () => {
  await openReviewAndSelectOption('invalid-option');
  await commonElements.waitForPageLoaded();
  expect(await getSelectedReviewOption()).to.equal('Has errors');
};

const validateReport = async () => {
  await openReviewAndSelectOption('valid-option');
  await commonElements.waitForPageLoaded();
  expect(await getSelectedReviewOption()).to.equal('Correct');
};

const verifyReport = async () => {
  const reportId = await getCurrentReportId();
  const initialReport = await utils.getDoc(reportId);
  expect(initialReport.verified).to.be.undefined;

  await invalidateReport();
  const invalidatedReport = await utils.getDoc(reportId);
  expect(invalidatedReport.verified).to.be.false;
  expect(invalidatedReport.patient).to.be.undefined;

  await validateReport();
  const validatedReport = await utils.getDoc(reportId);
  expect(validatedReport.verified).to.be.true;
  expect(validatedReport.patient).to.be.undefined;
};

const openFirstReport = async () => {
  const firstReport = leftPanelSelectors.firstReport();
  await firstReport.waitForClickable();
  await openSelectedReport(firstReport);
};

module.exports = {
  leftPanelSelectors,
  rightPanelSelectors,
  deleteDialogSelectors,
  getCurrentReportId,
  getLastSubmittedReportId,
  getUnreadCount,
  goToReportById,
  getTaskDetails,
  openSidebarFilter,
  openSidebarFilterDateAccordion,
  setSidebarFilterFromDate,
  setSidebarFilterToDate,
  filterByForm,
  filterByFacility,
  filterByStatus,
  setDateInput,
  setBikDateInput,
  reportsListDetails,
  selectAll,
  deselectAll,
  isReportSelected,
  selectReports,
  deselectReports,
  expandSelectedReportSummary,
  collapseSelectedReportSummary,
  deleteSelectedReports,
  firstReportDetailField,
  filterByDate,
  getAllReportsText,
  getReportDetailFieldValueByLabel,
  getAutomaticReply,
  getDetailReportRowContent,
  getOpenReportInfo,
  getListReportInfo,
  openReport,
  fieldByIndex,
  clickOnCaseId,
  getReportListLoadingStatus,
  openSelectedReport,
  verifyReport,
  openFirstReport,
};
