const helper = require('../../helper');

const itemSummary = '#reports-content .report-body .item-summary';
const reportBody = '#reports-content .report-body';
const reportBodyDetails = '#reports-content .report-body .details';
const datePickerStart = element(by.css('.daterangepicker [name="daterangepicker_start"]'));
const datePickerEnd = element(by.css('.daterangepicker [name="daterangepicker_end"]'));
const dateFilter = element(by.css('#date-filter'));

// Left hand side list elements
const reportListID = '#reports-list';
const list = element(by.css(reportListID));
const listLoader =  element(by.css(`${reportListID} .loader`));
const firstReport = element(by.css(`${reportListID} li:first-child`));
const allReports = element.all(by.css(`${reportListID} li`));

//Right hand side elements
const reportSummary = element(by.css('#reports-content .item-summary')); 
const submitterPhone = reportSummary.element(by.css('.sender .phone'));
const submitterName =  reportSummary.element(by.css('.sender .name'));
const subjectName = reportSummary.element(by.css('.subject .name'));
const summaryFormName = reportSummary.element(by.css('.subject + div'));
const formNameNoSubject = reportSummary.element(by.css('mm-sender + div'));

module.exports = {
  formNameNoSubject: formNameNoSubject,
  subjectName: subjectName,
  summaryFormName: summaryFormName,
  submitterName: submitterName,
  submitterPhone: submitterPhone,
  allReports: allReports,
  firstReport: firstReport,
  listLoader: listLoader,
  list: list,
  subject: async reportElement =>  {
    return reportElement.element(by.css('.content .heading h4 span'));
  },
  formName: async reportElement =>  {
    return reportElement.element(by.css('.summary'));
  },
  loadReport: async uuid => {
    const report = module.exports.reportByUUID(uuid).first();
    await helper.waitElementToBeClickable(report);
    await helper.clickElement(report);
    await helper.waitElementToPresent(reportSummary, 3000);
    return report;
  },
  reportByUUID: uuid => {
    return list.all(by.css('li[data-record-id="' + uuid + '"]'));
  },
  filterByDate: (startDate, endDate) => {
    let clear = '';
    for (let i = 0; i < 20; i++) {
      clear += protractor.Key.BACK_SPACE;
    }

    dateFilter.click();
    datePickerStart.click().sendKeys(clear + startDate);
    datePickerEnd.click().sendKeys(clear + endDate + protractor.Key.ENTER);
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
    element(by.css(itemSummary)).click();
    expect(element(by.css(reportBodyDetails)).isDisplayed()).toBeFalsy();
  },

  deleteSelectedReports: (savedUuids) => {
    element(by.css('.action-container .detail-actions .delete-all')).click();
    const confirmButton = element(by.css('.btn.submit.btn-danger'));
    helper.waitElementToBeClickable(confirmButton, 5000);
    confirmButton.click();
    helper.waitElementToBeClickable(confirmButton, 5000);
    confirmButton.click();
    helper.waitElementToPresent(element(by.css('#reports-list li')), 30000);
    // make sure the reports are deleted
    expect(element.all(by.css('#reports-list li[data-record-id="' + savedUuids[1] + '"]')).count()).toBe(1);
  },

  deselectAll: () => {
    element(by.css('.action-container .deselect-all')).click();
    expect(element(by.css('#reports-content .selection-count > span:first-child')).isDisplayed()).toBeFalsy();
    expect(element.all(by.css(reportBody)).count()).toBe(0);
  },

  expandSelection: () => {
    element(by.css(itemSummary)).click();
    helper.waitElementToBeVisible(element(by.css(reportBodyDetails)), 3000);
  },

  selectAll: () => {
    element(by.css('.action-container .select-all')).click();
    helper.waitElementToBeVisible(element(by.css('#reports-content .selection-count > span:nth-child(2)')), 3000);
    expect(element.all(by.css(reportBody)).count()).toBe(3);
  },

  selectSeveralReports: (savedUuids) => {
    element(by.css('#reports-list li[data-record-id="' + savedUuids[0] + '"] input[type="checkbox"]')).click();
    element(by.css('#reports-list li[data-record-id="' + savedUuids[2] + '"] input[type="checkbox"]')).click();
    browser.sleep(1000);
    expect(element.all(by.css(reportBody)).count()).toBe(2);
  },

  selectReport: (savedUuids) => {
    element(by.css('#reports-list li[data-record-id="' + savedUuids[0] + '"] input[type="checkbox"]')).click();
    helper.waitElementToBeVisible(element(by.css('#reports-content .selection-count > span:first-child')), 3000);
    expect(element.all(by.css(reportBody)).count()).toBe(1);
    expect(element(by.css('#reports-content .report-body .item-summary .sender .name')).getText()).toBe('Sharon');
    expect(element(by.css(reportBodyDetails)).isDisplayed()).toBeFalsy();
  },

  startSelectMode: (savedUuids)=> {
    const selectModeButton = element(by.css('.action-container .select-mode-start'));
    helper.waitElementToPresent(selectModeButton, 1000);
    selectModeButton.click();
    expect(element(by.css(`#reports-list li[data-record-id="${savedUuids[0]}"] input[type="checkbox"]`)).isDisplayed())
      .toBeTruthy();
  },

  stopSelectMode: (savedUuids)=> {
    element(by.css('.action-container .select-mode-stop')).click();
    expect(element(by.css(`#reports-list li[data-record-id="${savedUuids[0]}"] input[type="checkbox"]`)).isDisplayed())
      .toBeFalsy();
  },

  waitForReportToAppear: ()=> {
    browser.refresh();
    browser.wait(
      () => element(by.css('#reports-list li:first-child')).isPresent(),
      10000,
      'There should be at least one report in the LHS'
    );
  },
};

