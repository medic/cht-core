const reportsPageDefault = require('@page-objects/default/reports/reports.wdio.page');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');

const SELECT_ALL = '.mobile.multiselect-bar-container .select-all-label';
const DESELECT_ALL = '.mobile.multiselect-bar-container .deselect-all';
const deleteAllButton = () => $('.mobile.multiselect-bar-container .bulk-delete');
const selectedReportsCount = () => $('.mobile.multiselect-bar-container .selection-count .minimal');
const closeOpenReportBtn = () => $('.navigation .filter-bar-back');

const verifyMultiselectElementsDisplay = async (shouldHide=false) => {
  await  deleteAllButton().waitForClickable( { reverse: shouldHide });
  await  selectedReportsCount().waitForDisplayed({ reverse: shouldHide });
  return {
    countLabel: shouldHide ? false : await  selectedReportsCount().getText(),
    selectedCount: (await reportsPageDefault.leftPanelSelectors.selectedReportsCheckboxes()).length,
  };
};

const toggleSelection = async (selector, shouldHide = false) => {
  const element = await $(selector);
  await element.waitForDisplayed();
  await element.click();
  await element.waitForDisplayed({ reverse: true });
  return await verifyMultiselectElementsDisplay(shouldHide);
};

const selectAll = async () => {
  return await toggleSelection(SELECT_ALL);
};

const deselectAll = async () => {
  return await toggleSelection(DESELECT_ALL, true);
};

const selectReports = async (uuids) => {
  for (const uuid of uuids) {
    if (!(await reportsPageDefault.isReportSelected(uuid))) {
      await  reportsPageDefault.leftPanelSelectors.reportCheckbox(uuid).click();
    }
  }
  return verifyMultiselectElementsDisplay();
};

const deselectReports = async (uuids, shouldHideElements=false) => {
  for (const uuid of uuids) {
    if (await reportsPageDefault.isReportSelected(uuid)) {
      await  reportsPageDefault.leftPanelSelectors.reportCheckbox(uuid).click();
    }
  }
  return verifyMultiselectElementsDisplay(shouldHideElements);
};

const deleteSelectedReports = async () => {
  await  deleteAllButton().waitForDisplayed();
  await  deleteAllButton().click();

  await  reportsPageDefault.deleteDialogSelectors.bulkDeleteModal().waitForDisplayed();
  await  modalPage.submit();
  await  modalPage.checkModalHasClosed();

  await commonElements.waitForPageLoaded();
  await  reportsPageDefault.leftPanelSelectors.reportList().waitForDisplayed();
};

const closeReport = async () => {
  await  closeOpenReportBtn().waitForDisplayed();
  await  closeOpenReportBtn().click();
  await reportsPageDefault.rightPanelSelectors.reportBodyDetails().waitForDisplayed({ reverse: true });
};

module.exports = {
  reportsPageDefault,
  selectAll,
  deselectAll,
  selectReports,
  deselectReports,
  deleteSelectedReports,
  closeReport,
  verifyMultiselectElementsDisplay,
};
