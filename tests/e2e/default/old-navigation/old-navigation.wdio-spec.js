const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const messagesPage = require('@page-objects/default/sms/messages.wdio.page');
const taskPage = require('@page-objects/default/tasks/tasks.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');

describe('Old Navigation', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');

  const offlineUser = userFactory.build({ place: healthCenter._id });

  const person = personFactory.build({ 
    phone: '+50689999999', 
    parent: { _id: healthCenter._id, parent: healthCenter.parent } 
  });

  const pregnancyReport = pregnancyFactory.build({
    contact: offlineUser.contact,
    fields: { patient_id: person._id }
  });

  before(async () => {
    await utils.saveDocs([...places.values(), person, pregnancyReport]);
    await utils.createUsers([offlineUser]);
    await utils.updatePermissions(['chw'], ['can_view_old_navigation'], [], true);
    await loginPage.login(offlineUser);
  });

  it('should navigate through the old layout, including messages, tasks, reports and targets', async () => {
    await commonPage.goToMessages();
    await messagesPage.sendMessage('Navigations test', person.name, person.phone );
    await messagesPage.openMessage(person._id);

    const { name, phone } = await messagesPage.getMessageHeader();
    expect(name).to.equal(person.name);
    expect(phone).to.equal(person.phone);

    const messages = await messagesPage.getAmountOfMessagesByPhone();
    const { content, state } = await messagesPage.getMessageContent(messages);
    expect(content).to.equal('Navigations test');
    expect(state).to.equal('pending');

    await commonPage.goToTasks();
    await taskPage.openTaskById(
      pregnancyReport._id,
      '~pregnancy-danger-sign-follow-up~anc.pregnancy_danger_sign_followup'
    );
    expect(await genericForm.getFormTitle()).to.equal('Pregnancy danger sign follow-up');

    await commonPage.goToReports();
    await reportsPage.openSelectedReport(await reportsPage.firstReport());
    await commonPage.waitForPageLoaded();
    const openReportInfo = await reportsPage.getOpenReportInfo();
    expect(openReportInfo.patientName).to.equal(person.name);
    expect(openReportInfo.reportName).to.equal('Pregnancy registration');

    await commonPage.goToPeople();
    await contactPage.selectLHSRowByText(healthCenter.name);
    expect((await contactPage.getContactInfoName())).to.equal(healthCenter.name);
    /*await contactPage.selectLHSRowByText(BABY_NAME);
    expect((await contactPage.getContactInfoName())).to.equal(BABY_NAME);*/

    await commonPage.goToAnalytics();
    await browser.pause(1000);
  });


});
