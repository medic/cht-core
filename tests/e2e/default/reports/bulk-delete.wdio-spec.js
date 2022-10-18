const utils = require('../../../utils');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const reports = require('../../../page-objects/default/reports/reports.wdio.page');
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
    results.forEach(result => {
      savedUuids.push(result.id);
    });
  });

  it('should select, deselect and delete only selected reports', async () => {
    await commonElements.goToReports();
    await reports.startSelectMode(savedUuids);
    await reports.stopSelectMode(savedUuids);
    // start select mode again
    await reports.startSelectMode(savedUuids);
    const selectedReport = await reports.selectReports([savedUuids[0]]);
    expect(selectedReport.length).to.equal(1);
    await reports.expandSelection();
    await reports.collapseSelection();
    // deselect
    await (await reports.deselectReport()).click();
    const selectedAll = await reports.selectAll();
    expect(selectedAll.length).to.equal(3);

    const deselect = await reports.deselectAll();
    expect(deselect.length).to.equal(0);

    const selectedItems = await reports.selectReports([savedUuids[0], savedUuids[2]]);
    expect(selectedItems.length).to.equal(2);

    await reports.deleteSelectedReports();
    expect(await (await reports.reportsListDetails()).length).to.equal(1);
    expect(await (await reports.reportByUUID(savedUuids[0])).isDisplayed()).to.be.false;
    expect(await (await reports.reportByUUID(savedUuids[1])).isDisplayed()).to.be.true;
    expect(await (await reports.reportByUUID(savedUuids[2])).isDisplayed()).to.be.false;
  });
});
