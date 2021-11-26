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
    await console.log('start 1 ...');
    await reports.startSelectMode(savedUuids);
    await reports.stopSelectMode(savedUuids);
    await console.log('start select ...');
    // start select mode again
    await reports.startSelectMode(savedUuids);
    await reports.selectReport(savedUuids);
    await console.log('start 2 ...');
    await reports.expandSelection();
    await reports.collapseSelection();
    await console.log(' deselect ...');
    // deselect
    // await (await reports.deselectReport()).click();
    // await reports.selectAll();
    // await reports.deselectAll();
    // await reports.selectSeveralReports(savedUuids);
    // await reports.deleteSelectedReports(savedUuids);
  });
});
