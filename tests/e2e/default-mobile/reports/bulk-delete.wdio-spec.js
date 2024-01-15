const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default-mobile/reports/reports.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const reportFactory = require('@factories/cht/reports/generic-report');
const personFactory = require('@factories/cht/contacts/person');

describe('Bulk delete reports', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const contact = personFactory.build({ parent: { _id: healthCenter._id, parent: healthCenter.parent } });
  const offlineUser = userFactory.build({
    username: 'offline_chw_bulk_delete',
    place: healthCenter._id,
    contact: contact._id,
  });
  const patient = personFactory.build({ parent: { _id: healthCenter._id, parent: healthCenter.parent } });
  const reports = [
    reportFactory
      .report()
      .build(
        { form: 'P' },
        { patient, submitter: offlineUser.contact, fields: { lmp_date: 'Feb 3, 2022' }}
      ),
    reportFactory
      .report()
      .build(
        { form: 'P' },
        { patient, submitter: offlineUser.contact, fields: { lmp_date: 'Feb 16, 2022' }}
      ),
    reportFactory
      .report()
      .build(
        { form: 'V' },
        { patient, submitter: offlineUser.contact, fields: { ok: 'Yes!' }}
      ),
  ];

  const savedUuids = [];
  before(async () => {
    await utils.saveDocs([ ...places.values(), contact, patient ]);
    await utils.createUsers([ offlineUser ]);
    (await utils.saveDocs(reports)).forEach(savedReport => savedUuids.push(savedReport.id));
    await loginPage.login(offlineUser);
  });

  it('should select, deselect and delete only selected reports', async () => {
    await commonElements.goToReports();

    const selectOne = await reportsPage.selectReports([ savedUuids[0] ]);
    expect(selectOne.countLabel).to.equal('1');
    expect(selectOne.selectedCount).to.equal(1);

    const selectAllResult = await reportsPage.selectAll();
    expect(selectAllResult.countLabel).to.equal('3');
    expect(selectAllResult.selectedCount).to.equal(3);

    const deselectAllResult = await reportsPage.deselectAll();
    expect(deselectAllResult.selectedCount).to.equal(0);

    const selectSomeResult = await reportsPage.selectReports([ savedUuids[0], savedUuids[2] ]);
    expect(selectSomeResult.countLabel).to.equal('2');
    expect(selectSomeResult.selectedCount).to.equal(2);

    const deselectSomeResult = await reportsPage.deselectReports([ savedUuids[0] ]);
    expect(deselectSomeResult.countLabel).to.equal('1');
    expect(deselectSomeResult.selectedCount).to.equal(1);

    await reportsPage.deleteSelectedReports();
    expect(await (await reportsPage.reportsPageDefault.reportsListDetails()).length).to.equal(2);
    expect(await (await reportsPage.reportsPageDefault.reportByUUID(savedUuids[0])).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportsPageDefault.reportByUUID(savedUuids[1])).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportsPageDefault.reportByUUID(savedUuids[2])).isDisplayed()).to.be.false;
  });

  it('should open a selected report and a no selected report', async () => {
    const selectOne = await reportsPage.selectReports([ savedUuids[0] ]);
    expect(selectOne.countLabel).to.equal('1');
    expect(selectOne.selectedCount).to.equal(1);

    await reportsPage.reportsPageDefault.openReport(savedUuids[0]);
    await reportsPage.closeReport();
    let currentCount = await reportsPage.verifyMultiselectElementsDisplay();
    expect(currentCount.countLabel).to.equal('1');
    expect(currentCount.selectedCount).to.equal(1);

    await reportsPage.reportsPageDefault.openReport(savedUuids[1]);
    await reportsPage.closeReport();
    currentCount = await reportsPage.verifyMultiselectElementsDisplay();
    expect(currentCount.countLabel).to.equal('1');
    expect(currentCount.selectedCount).to.equal(1);
  });
});
