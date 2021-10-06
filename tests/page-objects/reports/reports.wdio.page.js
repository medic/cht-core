const reportListID = '#reports-list';
const reportBodyDetails = '#reports-content .report-body .details';
const reportBody = () => $(reportBodyDetails);
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
const addRepeatButton = () => $('.btn.btn-default.add-repeat-btn');
const repeatForm = async () => (await addRepeatButton()).click();
const unreadCount = () => $('#reports-tab .mm-badge');

const sentTask = async () => (await reportBody()).$('ul .task-list .task-state .state');

// warning: the unread element is not displayed when there are no unread reports
const getUnreadCount = async () => {
  await browser.waitUntil(async () => await (await unreadCount()).waitForDisplayed());
  return await (await unreadCount()).getText();
};

const goToReportById = (reportId) => browser.url(`#/reports/${reportId}`); 

const getTaskState = async (first, second) => {
  return (await reportBody())
    .$(`.scheduled-tasks > ul > li:nth-child(${first}) > ul > li:nth-child(${second}) .task-state .state`);
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
  addRepeatButton,
  repeatForm,
  getUnreadCount,
  goToReportById,
  sentTask,
  getTaskState
};
