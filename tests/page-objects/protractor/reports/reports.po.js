const helper = require('../../../helper');
const utils = require('@utils');

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

const getCurrentReportId = async () => {
  const currentUrl = await browser.getCurrentUrl();
  const reportBaseUrl = utils.getBaseUrl() + 'reports/';
  if (!currentUrl.startsWith(reportBaseUrl)) {
    return;
  }

  return currentUrl.slice(reportBaseUrl.length);
};

module.exports = {
  getCurrentReportId,
  relativeDate: () => element(by.css('#reports-content .item-summary .relative-date-content')),
  firstForm,
  submitReport,
  deselectReport: () => element(by.css('#reports-content .report-body .deselect')),
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
  loadReport: async (uuid) => {
    const report = await module.exports.reportByUUID(uuid);
    await helper.waitElementToBeClickable(report);
    await helper.clickElementNative(report);
    await helper.waitElementToPresentNative(module.exports.reportSummary(), 3000);
    return report;
  },
  filterByDate: async (startDate, endDate) => {
    await dateFilter.click();
    await datePickerStart.click().clear().sendKeys(startDate.format('MM/DD/YYYY'));
    await datePickerEnd.click().clear().sendKeys( endDate.format('MM/DD/YYYY') + protractor.Key.ENTER);
    await element(by.css('#freetext')).click(); // blur the datepicker
  },
  expectReportsToExist: uuids => {
    uuids.forEach(uuid => {
      browser.wait(() => element(by.css(`#reports-list li[data-record-id="${uuid}"]`)).isPresent(),
        10000,
        `Report ${uuid} not found`);
    });
  },
  expectReportsToNotExist: uuids => {
    uuids.forEach(uuid => {
      expect(browser.isElementPresent(by.css(`#reports-list li[data-record-id="${uuid}"]`))).toBeFalsy();
    });
  },

  collapseSelection: () => {
    utils.deprecated('collapseSelection', 'collapseSelectionNative');
    element(by.css(itemSummary)).click();
    expect(element(by.css(reportBodyDetails)).isDisplayed()).toBeFalsy();
  },

  collapseSelectionNative: async () => {
    await helper.clickElementNative(element(by.css(itemSummary)));
    expect(await element(by.css(reportBodyDetails)).isPresent()).toBeFalsy();
  },

  deleteSelectedReports: (savedUuids) => {
    utils.deprecated('deleteSelectedReports', 'deleteSelectedReportsNative');
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
    await helper.clickElementNative(element(by.css('.action-container .detail-actions .delete-all')));
    const confirmButton = element(by.css('.btn.submit.btn-danger'));
    await helper.clickElementNative(confirmButton);
    await helper.clickElementNative(confirmButton);
    await helper.waitElementToPresentNative(element(by.css('#reports-list li')));
    // make sure the reports are deleted
    expect(await reportsByUUID(savedUuids[1]).count()).toBe(1);
  },


  deselectAll: () => {
    utils.deprecated('deselectAll', 'deselectAllNative');
    element(by.css('.action-container .deselect-all')).click();
    expect(element(by.css('#reports-content .selection-count > span:first-child')).isDisplayed()).toBeFalsy();
    expect(element.all(by.css(reportBody)).count()).toBe(0);
  },

  deselectAllNative: async () => {
    await helper.clickElementNative(element(by.css('.action-container .deselect-all')));
    expect(await element(by.css('#reports-content .selection-count > span')).isPresent()).toBeFalsy();
    expect(await element.all(by.css(reportBody)).count()).toBe(0);
  },

  expandSelection: () => {
    element(by.css(itemSummary)).click();
    helper.waitElementToBeVisible(element(by.css(reportBodyDetails)), 3000);
  },

  expandSelectionNative: async () => {
    await helper.clickElementNative(element(by.css(itemSummary)));
    await helper.waitElementToBeVisibleNative(element(by.css(reportBodyDetails)));
  },

  selectAll: () => {
    utils.deprecated('selectall', 'selectAllNative');
    element(by.css('.action-container .select-all')).click();
    helper.waitElementToBeVisible(element(by.css('#reports-content .selection-count > span:nth-child(2)')), 3000);
    expect(element.all(by.css(reportBody)).count()).toBe(3);
  },

  selectAllNative: async () => {
    await helper.clickElementNative(element(by.css('.action-container .select-all')));
    await helper.waitElementToBeVisibleNative(element(by.css('#reports-content .selection-count > span')));
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
    await helper.clickElementNative(reportsByUUID(savedUuids[0]).first().element(by.css(checkCss)));
    await helper.clickElementNative(reportsByUUID(savedUuids[2]).first().element(by.css(checkCss)));
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
    const checkbox = element(by.css(`#reports-list li[data-record-id="${savedUuids[0]}"] input[type="checkbox"]`));
    await helper.clickElementNative(checkbox);
    await helper.waitElementToBeVisibleNative(element(by.css('#reports-content .selection-count > span:first-child')));
    expect(await element.all(by.css(reportBody)).count()).toBe(1);

    const textContent = element(by.css('#reports-content .report-body .item-summary .sender .name'));
    await browser.wait(
      async () => await helper.getTextFromElementNative(textContent) === 'Sharon',
      5000
    );
    expect(await element(by.css(reportBodyDetails)).isPresent()).toBeFalsy();
  },

  startSelectMode: (savedUuids) => {
    utils.deprecated('startSelectMode', 'startSelectModeNative');
    const selectModeButton = element(by.css('.action-container .select-mode-start'));
    helper.waitElementToPresent(selectModeButton, 1000);
    selectModeButton.click();
    expect(element(by.css(`#reports-list li[data-record-id="${savedUuids[0]}"] input[type="checkbox"]`)).isDisplayed())
      .toBeTruthy();
  },

  startSelectModeNative: async (savedUuids) => {
    const selectModeButton = element(by.css('.action-container .select-mode-start'));
    await helper.clickElementNative(selectModeButton);
    const checkbox = reportsByUUID(savedUuids[0]).first().element(by.css('input[type="checkbox"]'));
    await helper.waitUntilReadyNative(checkbox);
  },

  stopSelectMode: (savedUuids) => {
    utils.deprecated('stopSelectMode', 'stopSelectModeNative');
    element(by.css('.action-container .select-mode-stop')).click();
    expect(element(by.css(`#reports-list li[data-record-id="${savedUuids[0]}"] input[type="checkbox"]`)).isDisplayed())
      .toBeFalsy();
  },

  stopSelectModeNative: async (savedUuids) => {
    await helper.clickElementNative(element(by.css('.action-container .select-mode-stop')));
    const checkbox = reportsByUUID(savedUuids[0]).first().element(by.css('input[type="checkbox"]'));
    await helper.waitElementToDisappear(checkbox.locator());
  },

  waitForReportToAppear: () => {
    browser.refresh();
    browser.wait(
      () => element(by.css('#reports-list li:first-child')).isPresent(),
      10000,
      'There should be at least one report in the LHS'
    );
  },
  // tasks
  taskByIndex: (index) => {
    return element(by.css(reportBodyDetails)).element(by.css(`ul .task-list > li:nth-child(${index})`));
  },
  taskTextByIndex: (index) => {
    return module.exports.taskByIndex(index).element(by.css('ul > li')).getText();
  },
  taskRecipientByIndex: (index) => {
    return module.exports.taskByIndex(index).element(by.css('.task-state .recipient'));
  },
  taskStateByIndex: (index) => {
    return module.exports.taskByIndex(index).element(by.css('.task-state .state'));
  },
  taskGatewayStatusByIndex: (index) => {
    return module.exports.taskByIndex(index).element(by.css('.task-state .state.forwarded-to-gateway'));
  },

  scheduledTaskGroupByIndex: (groupIndex) => {
    return element(by.css(`#reports-content .details .scheduled-tasks > ul > li:nth-child(${groupIndex})`));
  },
  scheduledTaskByIndex: (groupIndex, taskIndex=1) => {
    return module.exports
      .scheduledTaskGroupByIndex(groupIndex)
      .element(by.css(`.task-list li:nth-child(${taskIndex})`));
  },

  scheduledTaskMessageByIndex: (groupIndex, taskIndex=1) => {
    return module.exports
      .scheduledTaskByIndex(groupIndex, taskIndex)
      .element(by.css('ul li'));
  },
  scheduledTaskStateByIndex: (groupIndex, taskIndex=1 ) => {
    return module.exports
      .scheduledTaskByIndex(groupIndex, taskIndex)
      .element(by.css(`.task-state .state`));
  },
  scheduledTaskRecipientByIndex: (groupIndex, taskIndex=1) => {
    return module.exports
      .scheduledTaskByIndex(groupIndex, taskIndex)
      .element(by.css(`.task-state .recipient`));
  },
  waitForReportToAppearNative: async (numOfReports = 1) => {
    await browser.refresh();
    while (await module.exports.allReports().count < numOfReports) {
      await browser.sleep(100);
    }
  },
};

