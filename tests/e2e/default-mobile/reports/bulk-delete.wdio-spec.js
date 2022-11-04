const utils = require('../../../utils');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const reportsPage = require('../../../page-objects/default-mobile/reports/reports.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');

describe('Bulk delete reports', () => {
  const docs = [
    {
      fields: {
        lmp_date: 'Feb 3, 2016'
      },
      form: 'P',
      type: 'data_record',
      content_type: 'xml',
      reported_date: 1462333250374,
      contact: {
        _id: '3305E3D0-2970-7B0E-AB97-C3239CD22D32'
      },
      from: '+555',
      hidden_fields: []
    },
    {
      fields: {
        lmp_date: 'Feb 15, 2016'
      },
      form: 'P',
      type: 'data_record',
      content_type: 'xml',
      reported_date: 1462338250374,
      contact: {
        _id: '3305E3D0-2970-7B0E-AB97-C3239CD22D32'
      },
      from: '+555',
      hidden_fields: []
    },
    {
      fields: {
        ok: 'Yes!'
      },
      form: 'V',
      type: 'data_record',
      content_type: 'xml',
      reported_date: 1462538250374,
      contact: {
        _id: '3305E3D0-2970-7B0E-AB97-C3239CD22D32'
      },
      from: '+555',
      hidden_fields: []
    },
    {
      name: 'Sharon',
      phone: '+555',
      type: 'person',
      reported_date: 1462538250374,
      _id: '3305E3D0-2970-7B0E-AB97-C3239CD22D32'
    }
  ];

  const savedUuids = [];
  before(async () => {
    await loginPage.cookieLogin();
    const results = await utils.saveDocs(docs);
    results.forEach(result => savedUuids.push(result.id));
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

    await reportsPage.openReport(savedUuids[0]);
    await reportsPage.closeReport();

    await reportsPage.openReport(savedUuids[1]);
    await reportsPage.closeReport();
  });
});
