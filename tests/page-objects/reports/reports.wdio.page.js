const reportListID = '#reports-list';
const reportBodyDetails = '#reports-content .report-body .details';
const selectedCaseId = () => $(`${reportBodyDetails} > ul > li > p > span > a`);
const selectedCaseIdLabel = () => $(`${reportBodyDetails} ul > li > label > span`);
const submitterPlace = () => $('.position a');
const submitterPhone = () => $('.sender .phone');
const submitterName = () => $('.sender .name');
const firstReport = () => $(`${reportListID} li:first-child`);
const reportList = () => $(`${reportListID}`);
const submitReportButton = () => $('.action-container .general-actions:not(.ng-hide) .fa-plus');
const formActionsLink = (formId) => {
  return $(`.action-container .general-actions .dropup.open .dropdown-menu li a[href="#/reports/add/${formId}"]`);
};
const unreadCount = () => $('#reports-tab .mm-badge');

// warning: the unread element is not displayed when there are no unread reports
const getUnreadCount = async () => {
  await browser.waitUntil(async () => await (await unreadCount()).waitForDisplayed());
  return await (await unreadCount()).getText();
};

module.exports = {
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
};
