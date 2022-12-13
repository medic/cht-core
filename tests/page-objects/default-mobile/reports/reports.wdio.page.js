const reportsPageDefault = require('../../default/reports/reports.wdio.page');
const commonElements = require('../../default/common/common.wdio.page');

const SELECT_ALL = '.mobile.multiselect-bar-container .select-all-label';
const DESELECT_ALL = '.mobile.multiselect-bar-container .deselect-all';
const DELETE_CONFIRM_MODAL = 'mm-modal#bulk-delete-confirm';
const deleteAllButton = () => $('.mobile.multiselect-bar-container .bulk-delete');
const selectedReportsCount = () => $('.mobile.multiselect-bar-container .selection-count .minimal');
const closeOpenReportBtn = () => $('.navigation .filter-bar-back');

const verifyMultiselectElementsDisplay = async (shouldHide=false) => {
  await (await deleteAllButton()).waitForClickable( { reverse: shouldHide });
  await (await selectedReportsCount()).waitForDisplayed({ reverse: shouldHide });
  return {
    countLabel: shouldHide ? false : await (await selectedReportsCount()).getText(),
    selectedCount: (await reportsPageDefault.selectedReportsCheckboxes()).length,
  };
};

const selectAll = async () => {
  await (await $(SELECT_ALL)).waitForDisplayed();
  await (await $(SELECT_ALL)).click();
  await (await $(SELECT_ALL)).waitForDisplayed({ reverse: true });
  return await verifyMultiselectElementsDisplay();
};

const deselectAll = async () => {
  await (await $(DESELECT_ALL)).waitForDisplayed();
  await (await $(DESELECT_ALL)).click();
  await (await $(DESELECT_ALL)).waitForDisplayed({ reverse: true });
  return await verifyMultiselectElementsDisplay(true);
};

const selectReports = async (uuids) => {
  for (const uuid of uuids) {
    if (!(await reportsPageDefault.isReportSelected(uuid))) {
      await (await reportsPageDefault.reportCheckbox(uuid)).click();
    }
  }
  return verifyMultiselectElementsDisplay();
};

const deselectReports = async (uuids, shouldHideElements=false) => {
  for (const uuid of uuids) {
    if (await reportsPageDefault.isReportSelected(uuid)) {
      await (await reportsPageDefault.reportCheckbox(uuid)).click();
    }
  }
  return verifyMultiselectElementsDisplay(shouldHideElements);
};

const deleteSelectedReports = async () => {
  await (await deleteAllButton()).waitForDisplayed();
  await (await deleteAllButton()).click();

  await (await reportsPageDefault.bulkDeleteModal()).waitForDisplayed();
  await (await $(`${DELETE_CONFIRM_MODAL} .btn.submit.btn-danger`)).click();
  const confirmButton = $(`${DELETE_CONFIRM_MODAL} [test-id="bulkdelete.complete.action"]`);
  await (await confirmButton).waitForDisplayed();
  await (await confirmButton).click();
  await (await reportsPageDefault.bulkDeleteModal()).waitForDisplayed({ reverse: true });

  await commonElements.waitForPageLoaded();
  await (await reportsPageDefault.reportList()).waitForDisplayed();
};

const closeReport = async () => {
  await (await closeOpenReportBtn()).waitForDisplayed();
  await (await closeOpenReportBtn()).click();
  await reportsPageDefault.reportBodyDetails().waitForDisplayed({ reverse: true });
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
