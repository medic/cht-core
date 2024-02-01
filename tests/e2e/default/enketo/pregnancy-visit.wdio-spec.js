const moment = require('moment');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const pregnancyVisitForm = require('@page-objects/default/enketo/pregnancy-visit.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const pregnancyForm = require('@page-objects/default/enketo/pregnancy.wdio.page');
const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
const { TARGET_MET_COLOR, TARGET_UNMET_COLOR } = analyticsPage;

describe('Pregnancy Visit', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const pregnantWoman = personFactory.build({
    date_of_birth: moment().subtract(25, 'years').format('YYYY-MM-DD'),
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });

  before(async () => {
    await utils.saveDocs([...places.values(), pregnantWoman]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });

  it('should submit a pregnancy visit and validate that the report was created successfully.', async () => {
    // Create a pregnancy
    await commonPage.goToPeople(pregnantWoman._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();

    // Create a pregnancy visit
    await commonPage.openFastActionReport('pregnancy_home_visit');
    await pregnancyVisitForm.submitDefaultPregnancyVisit();

    // Verify created report
    await commonPage.goToReports();
    const { heading, form } = await reportsPage.getListReportInfo(await reportsPage.firstReport());
    expect(heading).to.equal(pregnantWoman.name);
    expect(form).to.equal('Pregnancy home visit');

    // Verify that the target tile was updated for pregnancies with 1+ visits
    await commonPage.goToAnalytics();
    await analyticsPage.goToTargets();

    expect(await analyticsPage.getTargets()).to.have.deep.members([
      {title: 'Deaths', goal: '0', count: '0', countNumberColor: TARGET_MET_COLOR},
      {title: 'New pregnancies', goal: '20', count: '1', countNumberColor: TARGET_UNMET_COLOR},
      {title: 'Live births', count: '0', countNumberColor: TARGET_MET_COLOR},
      {title: 'Active pregnancies', count: '1', countNumberColor: TARGET_MET_COLOR},
      {title: 'Active pregnancies with 1+ routine facility visits', count: '1', countNumberColor: TARGET_MET_COLOR},
      {title: 'In-facility deliveries', percent: '0%', percentCount: '(0 of 0)'},
      {title: 'Active pregnancies with 4+ routine facility visits', count: '0', countNumberColor: TARGET_MET_COLOR},
      {title: 'Active pregnancies with 8+ routine contacts', count: '0', countNumberColor: TARGET_MET_COLOR}
    ]);

    // Adding 3 more pregnancy home visits to verify the target tile updated for pregnancies with 4+ visits
    await commonPage.goToPeople(pregnantWoman._id);
    await commonPage.openFastActionReport('pregnancy_home_visit');
    await pregnancyVisitForm.submitDefaultPregnancyVisit();
    await commonPage.openFastActionReport('pregnancy_home_visit');
    await pregnancyVisitForm.submitDefaultPregnancyVisit();
    await commonPage.openFastActionReport('pregnancy_home_visit');
    await pregnancyVisitForm.submitDefaultPregnancyVisit();

    await commonPage.goToAnalytics();
    await analyticsPage.goToTargets();

    expect(await analyticsPage.getTargets()).to.have.deep.members([
      {title: 'Deaths', goal: '0', count: '0', countNumberColor: TARGET_MET_COLOR},
      {title: 'New pregnancies', goal: '20', count: '1', countNumberColor: TARGET_UNMET_COLOR},
      {title: 'Live births', count: '0', countNumberColor: TARGET_MET_COLOR},
      {title: 'Active pregnancies', count: '1', countNumberColor: TARGET_MET_COLOR},
      {title: 'Active pregnancies with 1+ routine facility visits', count: '1', countNumberColor: TARGET_MET_COLOR},
      {title: 'In-facility deliveries', percent: '0%', percentCount: '(0 of 0)'},
      {title: 'Active pregnancies with 4+ routine facility visits', count: '1', countNumberColor: TARGET_MET_COLOR},
      {title: 'Active pregnancies with 8+ routine contacts', count: '1', countNumberColor: TARGET_MET_COLOR}
    ]);

  });
});

