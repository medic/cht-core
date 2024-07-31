const moment = require('moment');
const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const sentinelUtils = require('@utils/sentinel');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const { TARGET_MET_COLOR, TARGET_UNMET_COLOR } = analyticsPage;

describe('Submit a death report', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const person = personFactory.build({ parent: {_id: healthCenter._id, parent: healthCenter.parent} });

  before(async () => {
    await utils.saveDocs([...places.values(), person]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });

  it('should create and edit a death, verify the report created and the tile from the Targets section.', async () => {
    const deathDate = moment();
    const deathNote = 'Test note';

    // Create a death
    await commonPage.goToPeople(person._id);
    await commonPage.openFastActionReport('death_report');
    await commonEnketoPage.selectRadioButton('Place of death', 'Health facility');
    await commonEnketoPage.setTextareaValue(`Provide any relevant information related to the death of ${person.name}.`,
      deathNote);
    await commonEnketoPage.setDateValue('Date of Death', deathDate.format('YYYY-MM-DD'));
    await genericForm.nextPage();

    const summaryTexts = [
      person.name,
      deathDate.format('YYYY-MM-DD'),
      deathNote
    ];
    await commonEnketoPage.validateSummaryReport(summaryTexts);
    await genericForm.submitForm();
    await commonPage.sync();
    await sentinelUtils.waitForSentinel();
    await commonPage.sync();

    // Verify the patient's card information
    expect(await contactPage.getContactDeceasedStatus()).to.equal('Deceased');
    expect(await (await contactPage.deathCardSelectors.deathCard()).isDisplayed()).to.be.true;
    const deathCardInfo = await contactPage.getDeathCardInfo();
    expect(Date.parse(deathCardInfo.deathDate)).to.equal(Date.parse(deathDate.format('D MMM, YYYY')));
    expect(deathCardInfo.deathPlace).to.equal('Health facility');

    // Verify that the report was created
    await commonPage.goToReports();
    const firstReportInfo = await reportsPage.getListReportInfo(await reportsPage.firstReport());
    await reportsPage.openReport(firstReportInfo.dataId);
    expect(firstReportInfo.heading).to.equal(person.name);
    expect(firstReportInfo.form).to.equal('Death report');
    expect((await reportsPage.getDetailReportRowContent('place_of_death')).rowValues[0]).to.equal('health_facility');

    // Edit the report created
    await reportsPage.editReport();
    await commonEnketoPage.selectRadioButton('Place of death', 'Home');
    await genericForm.nextPage();
    await genericForm.submitForm();
    expect((await reportsPage.getDetailReportRowContent('place_of_death')).rowValues[0]).to.equal('home');

    // Verify the tile in the Target section
    await commonPage.goToAnalytics();
    const targets = await analyticsPage.getTargets();

    expect(targets).to.have.deep.members([
      { title: 'Deaths', goal: '0', count: '1', countNumberColor: TARGET_MET_COLOR },
      { title: 'New pregnancies', goal: '20', count: '0', countNumberColor: TARGET_UNMET_COLOR },
      { title: 'Live births', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies with 1+ routine facility visits',
        count: '0',
        countNumberColor: TARGET_MET_COLOR
      },
      { title: 'In-facility deliveries', percent: '0%', percentCount: '(0 of 0)' },
      { title: 'Active pregnancies with 4+ routine facility visits',
        count: '0',
        countNumberColor: TARGET_MET_COLOR
      },
      { title: 'Active pregnancies with 8+ routine contacts', count: '0', countNumberColor: TARGET_MET_COLOR }
    ]);
  });

});
