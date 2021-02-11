const helper = require('../../helper');
const utils = require('../../utils');

const itemSummary = '#reports-content .report-body .item-summary';
const reportBody = '#reports-content .report-body';
const reportBodyDetails = '#reports-content .report-body .details';
const datePickerStart = element(by.css('.daterangepicker [name="daterangepicker_start"]'));
const datePickerEnd = element(by.css('.daterangepicker [name="daterangepicker_end"]'));
const dateFilter = element(by.css('#date-filter'));
const submitReport = element(by.css('.action-container .general-actions:not(.ng-hide) .fa-plus'));
const firstForm = element(by.css('.action-container .general-actions .dropup.open .dropdown-menu li:first-child a'));

const reportsByUUID = (uuid) => {
  return module.exports.list().all(by.css(`li[data-record-id="${uuid}"]`));
};

const reportListID = '#reports-list';

module.exports = {
  relativeDate: () => element(by.css('#reports-content .item-summary .relative-date-content')),
  firstForm,
  submitReport,
  deselctReport: () => element(by.css('#reports-content .report-body .deselect')),
  allReports: () => element.all(by.css(`${reportListID} li`)),
  firstReport: () => element(by.css(`${reportListID} li:first-child`)),
  listLoader: () => element(by.css(`${reportListID} .loader`)),
  list: () => element(by.css(reportListID)),
  reportByUUID: uuid => reportsByUUID(uuid).first(),
  reportsByUUID: reportsByUUID,
  reportSummary: () => element(by.css('#reports-content .item-summary')),
  formNameNoSubject: () => module.exports.reportSummary().element(by.css('mm-sender + div')),
  subjectName: () => module.exports.reportSummary().element(by.css('.subject .name')),
  summaryFormName: () => module.exports.reportSummary().element(by.css('.subject + div')),
  submitterName: () => module.exports.reportSummary().element(by.css('.sender .name')),
  submitterPhone: () => module.exports.reportSummary().element(by.css('.sender .phone')),
  submitterPlace: () => module.exports.reportSummary().element(by.css('.position a')),
  detail: () => module.exports.reportSummary().element(by.css('.detail')),
  detailStatus: () => module.exports.reportSummary().element(by.css('.detail .status')),
  subject: reportElement =>  {
    return reportElement.element(by.css('.content .heading h4 span'));
  },
  formName: reportElement =>  {
    return reportElement.element(by.css('.summary'));
  },
  loadReport: async uuid => {
    const report = module.exports.reportByUUID(uuid);
    await helper.waitElementToBeClickable(report);
    await helper.clickElement(report);
    await helper.waitElementToPresent(module.exports.reportSummary(), 3000);
    return report;
  },
  filterByDate: (startDate, endDate) => {
    dateFilter.click();
    datePickerStart.click().clear().sendKeys(startDate.format('MM/DD/YYYY'));
    datePickerEnd.click().clear().sendKeys( endDate.format('MM/DD/YYYY') + protractor.Key.ENTER);
    element(by.css('#freetext')).click(); // blur the datepicker
  },
  expectReportsToExist: uuids => {
    browser.wait(
      () => element(by.css('#reports-list li:first-child')).isPresent(),
      10000,
      'There should be at least one report in the LHS'
    );
    uuids.forEach(uuid => {
      expect(browser.isElementPresent(by.css(`#reports-list li[data-record-id="${uuid}"]`))).toBeTruthy();
    });
  },
  expectReportsToNotExist: uuids => {
    uuids.forEach(uuid => {
      expect(browser.isElementPresent(by.css(`#reports-list li[data-record-id="${uuid}"]`))).toBeFalsy();
    });
  },

  collapseSelection: () => {
    utils.deprecated('collapseSelection','collapseSelectionNative');
    element(by.css(itemSummary)).click();
    expect(element(by.css(reportBodyDetails)).isDisplayed()).toBeFalsy();
  },

  collapseSelectionNative: async () => {
    await element(by.css(itemSummary)).click();
    expect(await element(by.css(reportBodyDetails)).isPresent()).toBeFalsy();
  },

  deleteSelectedReports: (savedUuids) => {
    utils.deprecated('deleteSelectedReports','deleteSelectedReportsNative');
    element(by.css('.action-container .detail-actions .delete-all')).click();
    const confirmButton = element(by.css('.btn.submit.btn-danger'));
    helper.waitElementToBeClickable(confirmButton, 5000);
    confirmButton.click();
    helper.waitElementToBeClickable(confirmButton, 5000);
    confirmButton.click();
    helper.waitElementToPresent(element(by.css('#reports-list li')));
    // make sure the reports are deleted
    expect(element.all(by.css('#reports-list li[data-record-id="' + savedUuids[1] + '"]')).count()).toBe(1);
  },

  deleteSelectedReportsNative: async (savedUuids) => {
    await element(by.css('.action-container .detail-actions .delete-all')).click();
    const confirmButton = element(by.css('.btn.submit.btn-danger'));
    await helper.waitElementToBeClickable(confirmButton, 5000);
    await confirmButton.click();
    await helper.waitElementToBeClickable(confirmButton, 5000);
    await confirmButton.click();
    await helper.waitElementToPresent(element(by.css('#reports-list li')));
    // make sure the reports are deleted
    expect(await reportsByUUID(savedUuids[1]).count()).toBe(1);
  },


  deselectAll: () => {
    utils.deprecated('deselectAll','deselectAllNative');
    element(by.css('.action-container .deselect-all')).click();
    expect(element(by.css('#reports-content .selection-count > span:first-child')).isDisplayed()).toBeFalsy();
    expect(element.all(by.css(reportBody)).count()).toBe(0);
  },

  deselectAllNative: async () => {
    await element(by.css('.action-container .deselect-all')).click();
    expect(await element(by.css('#reports-content .selection-count > span')).isPresent()).toBeFalsy();
    expect(await element.all(by.css(reportBody)).count()).toBe(0);
  },

  expandSelection: () => {
    element(by.css(itemSummary)).click();
    helper.waitElementToBeVisible(element(by.css(reportBodyDetails)), 3000);
  },

  expandSelectionNative: async () => {
    await element(by.css(itemSummary)).click();
    await helper.waitElementToBeVisible(element(by.css(reportBodyDetails)), 3000);
  },

  selectAll: () => {
    utils.deprecated('selectall','selectAllNative');
    element(by.css('.action-container .select-all')).click();
    helper.waitElementToBeVisible(element(by.css('#reports-content .selection-count > span:nth-child(2)')), 3000);
    expect(element.all(by.css(reportBody)).count()).toBe(3);
  },

  selectAllNative: async () => {
    await element(by.css('.action-container .select-all')).click();
    await helper.waitElementToBeVisible(element(by.css('#reports-content .selection-count > span')), 3000);
    expect(await element.all(by.css(reportBody)).count()).toBe(3);
  },

  selectSeveralReports: (savedUuids) => {
    element(by.css('#reports-list li[data-record-id="' + savedUuids[0] + '"] input[type="checkbox"]')).click();
    element(by.css('#reports-list li[data-record-id="' + savedUuids[2] + '"] input[type="checkbox"]')).click();
    browser.sleep(1000);
    expect(element.all(by.css(reportBody)).count()).toBe(2);
  },

  selectSeveralReportsNative: async (savedUuids) => {
    const checkCss = 'input[type="checkbox"]';
    await reportsByUUID(savedUuids[0]).first().element(by.css(checkCss)).click();
    await reportsByUUID(savedUuids[2]).first().element(by.css(checkCss)).click();
    await browser.sleep(1000);
    expect(await element.all(by.css(reportBody)).count()).toBe(2);
  },

  selectReport: (savedUuids) => {
    element(by.css('#reports-list li[data-record-id="' + savedUuids[0] + '"] input[type="checkbox"]')).click();
    helper.waitElementToBeVisible(element(by.css('#reports-content .selection-count > span:first-child')), 3000);
    expect(element.all(by.css(reportBody)).count()).toBe(1);
    expect(element(by.css('#reports-content .report-body .item-summary .sender .name')).getText()).toBe('Sharon');
    expect(element(by.css(reportBodyDetails)).isDisplayed()).toBeFalsy();
  },

  selectReportNative: async (savedUuids) => {
    await element(by.css('#reports-list li[data-record-id="' + savedUuids[0] + '"] input[type="checkbox"]')).click();
    await helper.waitElementToBeVisible(element(by.css('#reports-content .selection-count > span:first-child')), 3000);
    expect(await element.all(by.css(reportBody)).count()).toBe(1);
    expect(await element(by.css('#reports-content .report-body .item-summary .sender .name')).getText()).toBe('Sharon');
    const reportElm = element(by.css(reportBodyDetails));
    expect(await reportElm.isPresent()).toBeFalsy();
  },

  startSelectMode: (savedUuids)=> {
    utils.deprecated('startSelectMode','startSelectModeNative');
    const selectModeButton = element(by.css('.action-container .select-mode-start'));
    helper.waitElementToPresent(selectModeButton, 1000);
    selectModeButton.click();
    expect(element(by.css(`#reports-list li[data-record-id="${savedUuids[0]}"] input[type="checkbox"]`)).isDisplayed())
      .toBeTruthy();
  },

  startSelectModeNative: async (savedUuids)=> {
    const selectModeButton = element(by.css('.action-container .select-mode-start'));
    await helper.clickElementNative(selectModeButton);
    const checkbox = reportsByUUID(savedUuids[0]).first().element(by.css('input[type="checkbox"]'));
    await helper.waitUntilReadyNative(checkbox);
  },

  stopSelectMode: (savedUuids)=> {
    utils.deprecated('stopSelectMode','stopSelectModeNative');
    element(by.css('.action-container .select-mode-stop')).click();
    expect(element(by.css(`#reports-list li[data-record-id="${savedUuids[0]}"] input[type="checkbox"]`)).isDisplayed())
      .toBeFalsy();
  },

  stopSelectModeNative: async (savedUuids)=> {
    await element(by.css('.action-container .select-mode-stop')).click();
    const checkbox = reportsByUUID(savedUuids[0]).first().element(by.css('input[type="checkbox"]'));
    await helper.waitElementToDisappear(checkbox.locator());
  },

  waitForReportToAppear: ()=> {
    browser.refresh();
    browser.wait(
      () => element(by.css('#reports-list li:first-child')).isPresent(),
      10000,
      'There should be at least one report in the LHS'
    );
  },
  taskByIndex: (index) => {
    return element(by.css(reportBodyDetails)).element(by.css(`.task-list > li:nth-child(${index})`));
  },
  taskTextByIndex: (index) => {
    return module.exports.taskByIndex(index).element(by.css('ul > li')).getText();
  },
  taskRecipientByIndex: (index) => {
    return module.exports.taskByIndex(index).element(by.css('.task-state .recipient'));
  },
  taskGatewayStatusByIndex: (index) => {
    return module.exports.taskByIndex(index).element(by.css('.task-state .state.forwarded-to-gateway'));
  },
  scheduledTaskByIndex: (index) => {
    return element(by.css(`#reports-content .details .scheduled-tasks > ul > li:nth-child(${index})`));
  },
  scheduledTaskMessageByIndex: (index) => {
    return module.exports.scheduledTaskByIndex(index).element(by.css('.task-list li > ul > li'));
  },
  scheduledTaskStateByIndex: (index) => {
    return module.exports.scheduledTaskByIndex(index).element(by.css('.task-list li .task-state .state.scheduled'));
  },
  scheduledTaskRecipientByIndex: (index) => {
    return module.exports.scheduledTaskByIndex(index).element(by.css('.task-list li .task-state .recipient'));
  },
  waitForReportToAppearNative: async (numOfReports = 1) => {
    await browser.refresh();
    while (await module.exports.allReports().count < numOfReports) {
      await browser.sleep(100);
    }
  },
};

