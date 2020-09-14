const helper = require('../../helper');

const itemSummary = '#reports-content .report-body .item-summary';
const reportBody = '#reports-content .report-body';
const reportBodyDetails = '#reports-content .report-body .details';

module.exports = {
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

