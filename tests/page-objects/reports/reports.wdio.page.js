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
const formTitle = () => $('#report-form #form-title');
const submitButton = () => $('#report-form .form-footer .btn.submit');

const forms = () => $$('.action-container .general-actions .actions.dropup .dropdown-menu li');
const deselectReport = () => $('#reports-content .report-body .deselect'),
const itemSummary = () => $('#reports-content .report-body .item-summary');

const sentTask = async () => (await reportBody()).$('ul .task-list .task-state .state');

// warning: the unread element is not displayed when there are no unread reports
const getUnreadCount = async () => {
  await browser.waitUntil(async () => await (await unreadlength).waitForDisplayed());
  return await (await unreadlength).getText();
};

const goToReportById = (reportId) => browser.url(`#/reports/${reportId}`);

const getTaskState = async (first, second) => {
  return (await reportBody())
    .$(`.scheduled-tasks > ul > li:nth-child(${first}) > ul > li:nth-child(${second}) .task-state .state`);
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

const collapseSelection = async () => {
  await (await itemSummary()).click();
  expect(await $(reportBodyDetails).isExisting()).to.be.false;
};

const deleteSelectedReports = async (savedUuids) => {
  const deleteAllButton = () => $('.action-container .detail-actions .delete-all');
  const confirmButton = () => $('.btn.submit.btn-danger');

  await (await deleteAllButton()).click();
  await (await confirmButton()).click();;
  await (await confirmButton()).click();;
  await (await firstReport ()).waitForDisplayed();
  // make sure the reports are deleted
  expect(await reportsByUUID(savedUuids[1]).lenghth).to.equal(1);
};

const deselectAll = async () => {
  const deselectAllButton = await $('.action-container .deselect-all');
  await deselectAllButton.click();
  expect(await $('#reports-content .selection-count > span').isExising()).to.be.false;
  expect(await $(reportBody).length).to.equal(0);
};

const expandSelection = async () => {
  await (await itemSummary()).click();
  await (await $(reportBodyDetails)).waitForDisplayed();
};
const selectAll = async () => {
    await (await $('.action-container .select-all')).click();
    await (await $('#reports-content .selection-count > span')).waitForDisplayed();
    expect(await $$(reportBody).length).to.equal(3);
  };
  const selectSeveralReports = async (savedUuids) => {
    const checkCss = 'input[type="checkbox"]';
    await helper.clickElement(reportsByUUID(savedUuids[0]).first().element(by.css(checkCss)));
    await helper.clickElement(reportsByUUID(savedUuids[2]).first().element(by.css(checkCss)));
    await browser.sleep(1000);
    expect(await element.all(by.css(reportBody)).length).to.equal(2);
  };

  const selectReport = async (savedUuids) => {
    const checkbox = element(by.css(`#reports-list li[data-record-id="${savedUuids[0]}"] input[type="checkbox"]`));
    await helper.clickElement(checkbox);
    await helper.waitElementToBeVisible(element(by.css('#reports-content .selection-count > span:first-child')));
    expect(await element.all(by.css(reportBody)).length).to.equal(1);

    const textContent = element(by.css('#reports-content .report-body .item-summary .sender .name'));
    await browser.wait(
      async () => await helper.getTextFromElement(textContent) === 'Sharon',
      5000
    );
    expect(await element(by.css(reportBodyDetails)).isPresent()).to.be.false;
  };

  const startSelectMode = async (savedUuids)=> {
    const selectModeButton = element(by.css('.action-container .select-mode-start'));
    await helper.clickElement(selectModeButton);
    const checkbox = reportsByUUID(savedUuids[0]).first().element(by.css('input[type="checkbox"]'));
    await helper.waitUntilReady(checkbox);
  };

  const stopSelectMode = async (savedUuids)=> {
    await helper.clickElement(element(by.css('.action-container .select-mode-stop')));
    const checkbox = reportsByUUID(savedUuids[0]).first().element(by.css('input[type="checkbox"]'));
    await helper.waitElementToDisappear(checkbox.locator());
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
  getTaskState,
  openForm,
  formTitle,
  setDateInput,
  getFieldValue,
  setBikDateInput,
  getSummaryField,
  submitForm,
  reportsListDetails,
  deselectReport,
  stopSelectMode,
  startSelectMode,
  selectReport,
  selectAll,
  selectSeveralReports,
  deselectReport,
  expandSelection,
  collapseSelection,
  deleteSelectedReports,
  deselectAll,
};
