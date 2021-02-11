const utils = require('../utils');
const commonElements = require('../page-objects/common/common.po.js');
const reports = require('../page-objects/reports/reports.po');

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
  beforeEach(async () => {
    const results = await Promise.all(docs.map(utils.saveDocNative));
    results.forEach(result => {
      savedUuids.push(result.id);
    });
  });

  afterEach(async () => { await utils.afterEachNative(); });

  it('reports', async () => {
    await commonElements.goToReportsNative();
    await reports.startSelectModeNative(savedUuids);
    await reports.stopSelectModeNative(savedUuids);
    // start select mode again
    await reports.startSelectModeNative(savedUuids);
    await reports.selectReportNative(savedUuids);
    await reports.expandSelectionNative();
    await reports.collapseSelectionNative();
    // deselect
    await element(by.css('#reports-content .report-body .deselect')).click();
    await reports.selectAllNative();
    await reports.deselectAllNative();
    await reports.selectSeveralReportsNative(savedUuids);
    await reports.deleteSelectedReportsNative(savedUuids);
  });
});
