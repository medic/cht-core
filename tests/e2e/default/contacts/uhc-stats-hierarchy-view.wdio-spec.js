const moment = require('moment');
const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const reportFactory = require('@factories/cht/reports/generic-report');
const { CONTACT_TYPES } = require('@medic/constants');

describe('UHC visit stats in the contact hierarchy view', () => {
  const ROLE = 'chw';
  const VISIT_COUNT_GOAL = 2;
  // start the UHC reporting interval safely in the past, so recent visits always fall inside it
  const UHC_MONTH_START_DATE = moment().subtract(15, 'days').date();

  const places = placeFactory.generateHierarchy([CONTACT_TYPES.DISTRICT_HOSPITAL, CONTACT_TYPES.HEALTH_CENTER]);
  const districtHospital = places.get(CONTACT_TYPES.DISTRICT_HOSPITAL);
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);

  const buildHousehold = (name) => placeFactory.place().build({
    name,
    type: CONTACT_TYPES.CLINIC,
    parent: { _id: healthCenter._id, parent: { _id: districtHospital._id } },
  });

  const visitedOnGoalHousehold = buildHousehold('visited on goal household');
  const visitedBelowGoalHousehold = buildHousehold('visited below goal household');
  const overdueHousehold = buildHousehold('overdue household');
  const neverVisitedHousehold = buildHousehold('never visited household');
  const households = [visitedOnGoalHousehold, visitedBelowGoalHousehold, overdueHousehold, neverVisitedHousehold];

  const patient = personFactory.build({
    name: 'Health Center Person',
    parent: { _id: healthCenter._id, parent: { _id: districtHospital._id } },
  });

  const offlineUser = userFactory.build({
    username: 'offline-uhc-user',
    place: healthCenter._id,
    roles: [ROLE],
  });

  const visitReport = (household, daysAgo = 0) => reportFactory.report().build(
    {
      form: 'home_visit',
      reported_date: moment().subtract(daysAgo, 'days').valueOf(),
      fields: { visited_contact_uuid: household._id },
    },
    { place: household, submitter: offlineUser.contact },
  );

  const visitReports = [
    // two visits on distinct days: meets the goal of 2
    visitReport(visitedOnGoalHousehold, 0),
    visitReport(visitedOnGoalHousehold, 5),
    // one recent visit: below the goal but not overdue
    visitReport(visitedBelowGoalHousehold, 5),
    // last visit outside both the UHC interval and the 30 day overdue period
    visitReport(overdueHousehold, 45),
  ];

  const configureUHC = async (rolesWithPermission) => {
    const settings = await utils.getSettings();
    const permissions = {
      ...settings.permissions,
      can_view_last_visited_date: rolesWithPermission,
    };
    await utils.updateSettings(
      {
        permissions,
        uhc: { visit_count: { month_start_date: UHC_MONTH_START_DATE, visit_count_goal: VISIT_COUNT_GOAL } },
      },
      { revert: true, ignoreReload: true },
    );
  };

  before(async () => {
    await configureUHC([ROLE]);
    await utils.saveDocs([...places.values(), ...households, patient, ...visitReports]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });

  it('should show visit stats on the children list of an ancestor place', async () => {
    await commonPage.goToPeople(healthCenter._id);
    await contactPage.waitForContactLoaded();

    // the children render first and the visit stats are merged in when loaded
    await contactPage.childRowSelectors.childVisitBadge(visitedOnGoalHousehold._id).waitForDisplayed();

    const visitedOnGoal = await contactPage.getChildVisitStats(visitedOnGoalHousehold._id);
    expect(visitedOnGoal).to.deep.include({ hasVisitBadge: true, overdue: false, count: '2', status: 'success' });
    expect(visitedOnGoal.summary).to.contain('Visited');

    const visitedBelowGoal = await contactPage.getChildVisitStats(visitedBelowGoalHousehold._id);
    expect(visitedBelowGoal).to.deep.include({ hasVisitBadge: true, overdue: false, count: '1', status: 'warning' });
    expect(visitedBelowGoal.summary).to.contain('Visited');

    const overdue = await contactPage.getChildVisitStats(overdueHousehold._id);
    expect(overdue).to.deep.include({ hasVisitBadge: true, overdue: true, count: '0', status: 'danger' });

    const neverVisited = await contactPage.getChildVisitStats(neverVisitedHousehold._id);
    expect(neverVisited).to.deep.include({ hasVisitBadge: true, overdue: true, count: '0', status: 'danger' });
    expect(neverVisited.summary).to.equal('Last visit unknown');
  });

  it('should not show visit stats on children whose type does not count visits', async () => {
    const personRow = await contactPage.getChildVisitStats(patient._id);
    expect(personRow).to.deep.include({ hasVisitBadge: false, overdue: false });
  });

  it('should refresh the displayed visit stats when a visit report syncs', async () => {
    await utils.saveDocs([visitReport(neverVisitedHousehold)]);
    await commonPage.sync();

    await browser.waitUntil(async () => {
      const stats = await contactPage.getChildVisitStats(neverVisitedHousehold._id);
      return stats.count === '1' && stats.status === 'warning' && !stats.overdue;
    }, { timeout: 20000, timeoutMsg: 'Expected the visit stats to refresh in place after sync' });
  });

  it('should not show visit stats without the can_view_last_visited_date permission', async () => {
    await configureUHC([]);
    await commonPage.sync({ reload: true });

    await commonPage.goToPeople(healthCenter._id);
    await contactPage.waitForContactLoaded();
    // the stats load in the background with no visual indication, so allow them time to not appear
    await browser.pause(1500);

    const visitedOnGoal = await contactPage.getChildVisitStats(visitedOnGoalHousehold._id);
    expect(visitedOnGoal).to.deep.include({ hasVisitBadge: false, overdue: false });
  });
});
