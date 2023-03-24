const utils = require('../../../utils');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const contactPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const placeFactory = require('../../../factories/cht/contacts/place');
const userFactory = require('../../../factories/cht/users/users');
const gatewayApiUtils = require('../../../gateway-api.utils');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');

describe('Registration by SMS', async () => {
  const district_hospital = placeFactory.generateHierarchy(['district_hospital']).get('district_hospital');
  const user = userFactory.build({ place: district_hospital._id });

  before(async () => {
    await utils.saveDocs([district_hospital]);
    await utils.createUsers([user]);
    await loginPage.cookieLogin();
  });

  it('Should create a new person via SMS', async () => {
    const name = 'Filippo';
    const message = `N ${name}`;
    await gatewayApiUtils.api.postMessage({
      id: 'new-person-sms',
      from: user.phone,
      content: message
    });

    await commonPage.goToPeople(user.place);
    const allRHSPeople = await contactPage.getAllRHSPeopleNames();
    expect(allRHSPeople.length).to.equal(2);
    expect(allRHSPeople).to.include.members([name, user.contact.name]);

    await commonPage.goToReports();
    const firstReport = await reportsPage.firstReport();
    const firstReportInfo = await reportsPage.getListReportInfo(firstReport);
    await reportsPage.openSelectedReport(firstReport);
    await commonPage.waitForPageLoaded();

    expect(firstReportInfo.heading).to.equal(name);
    expect(firstReportInfo.form).to.equal('New Person (SMS)');
    expect(firstReportInfo.lineage).to.equal(district_hospital.name);
    expect(await reportsPage.getRawReportContent()).to.equal(message);
    expect(await reportsPage.getAutomaticReply()).to.include(`Thank you ${user.contact.name} for registering ${name}.`);
    expect(await (await reportsPage.reportTasks()).isDisplayed()).to.be.true;
    expect(await (await reportsPage.getTaskState(1, 1))).to.contain('scheduled');
  });
});
