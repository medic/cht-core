const utils = require('../utils');
const commonElements = require('../page-objects/common/common.wdio.page');
const reports = require('../page-objects/reports/reports.wdio.page');
const loginPage = require('../page-objects/login/login.wdio.page');

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
    await reports.selectReport(savedUuids, docs[3].name);
    await reports.expandSelection();
    await reports.collapseSelection();
    // deselect
    await (await reports.deselectReport()).click();
    const selectedReports = await reports.selectAll();
    expect(selectedReports.length).to.equal(docs.length -1);
    const reportsi = await reports.deselectAll();
    expect(reportsi.length).to.equal(0);
    const selectedItems = await reports.selectSeveralReports([savedUuids[0], savedUuids[2]]);
    expect(selectedItems.length).to.equal(2);
    const body = await reports.deleteSelectedReports();
    console.log('ret...', body);

    expect(await (await reports.reportByUUID(savedUuids[0])).isDisplayed()).to.be.false;
    expect(await (await reports.reportByUUID(savedUuids[1])).isDisplayed()).to.be.true;
    expect(await (await reports.reportByUUID(savedUuids[2])).isDisplayed()).to.be.false;
  // await console.log('report 1...', await (await reports.reportByUUID(savedUuids[1])).isDisplayed());
  // await console.log('report 1...', await (await reports.reportByUUID(savedUuids[2])).isDisplayed());

    //console.log('report....', abc.length);
    //expect((await reports.deleteSelectedReports()).length).to.equal(1);
  });
});
