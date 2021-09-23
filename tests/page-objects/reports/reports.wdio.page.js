const reportListID = '#reports-list';
const reportBodyDetails = '#reports-content .report-body .details';
const reportList = () => $(`${reportListID}`);
const selectedCaseId = () => $(`${reportBodyDetails} > ul > li > p > span > a`);
const selectedCaseIdLabel = () => $(`${reportBodyDetails} ul > li > label > span`);
const submitterPlace = () => $('.position a');
const submitterPhone = () => $('.sender .phone');
const submitterName = () => $('.sender .name');
const firstReport = () => $(`${reportListID} li:first-child`);
const unreadCount = () => $('#reports-tab .mm-badge');
const formTitle = () => $('#report-form #form-title');
const submitButton = () => $('#report-form .form-footer .btn.submit');

const submitReportButton = () => $('.action-container .general-actions:not(.ng-hide) .fa-plus');
const forms = () => $$('.action-container .general-actions .actions.dropup .dropdown-menu li');

// warning: the unread element is not displayed when there are no unread reports
const getUnreadCount = async () => {
  await browser.waitUntil(async () => await (await unreadCount()).waitForDisplayed());
  return await (await unreadCount()).getText();
};

const openForm = async (name) => {
  await (await submitReportButton()).click();
  // this is annoying but there's a race condition where the click could end up on another form if we don't
  // wait for the animation to finish
  await (await $('.action-container .general-actions .actions.dropup.open')).waitForDisplayed();
  await browser.pause(50);
  for (const form of await forms()) {
    if (await form.getText() === name) {
      await form.click();
      await (await formTitle()).waitForDisplayed();
      return;
    }
  }
  throw new Error(`Form with name: "${name}" not found`);
};

const setDateInput = async (name, date) => {
  const input = await $(`input[name="${name}"]`);
  const dateWidget = await input.nextElement();
  const visibleInput = await dateWidget.$('input[type="text"]');
  await visibleInput.setValue(date);
  await (await formTitle()).click();
};

const setBikDateInput = async (name, date) => {
  const input = await $(`input[name="${name}"]`);
  const dateWidget = await input.nextElement();
  await (await dateWidget.$('input[name="day"]')).setValue(date.day);
  await (await dateWidget.$('.dropdown-toggle')).click();
  await (await (await dateWidget.$$('.dropdown-menu li'))[date.month -1]).click();
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
  await (await submitButton()).click();
  await (await $(reportBodyDetails)).waitForDisplayed();
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
  };
};

const reportsListDetails = async () => {
  const reports = await $$(`${reportListID} li`);
  const reportDetails = [];
  for (const report of reports) {
    reportDetails.push(await getListReportInfo(report));
  }

  return reportDetails;
};

module.exports = {
  reportList,
  firstReport,
  submitterName,
  submitterPhone,
  submitterPlace,
  selectedCaseId,
  selectedCaseIdLabel,
  getUnreadCount,
  openForm,
  formTitle,
  setDateInput,
  getFieldValue,
  setBikDateInput,
  getSummaryField,
  submitForm,
  reportsListDetails,
};
