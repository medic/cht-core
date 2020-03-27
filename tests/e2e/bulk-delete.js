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
  beforeEach(done => {
    protractor.promise
      .all(docs.map(utils.saveDoc))
      .then(results => {
        results.forEach(result => {
          savedUuids.push(result.id);
        });
        done();
      })
      .catch(done.fail);
  });

  afterEach(utils.afterEach);

  it('reports', () => {
    commonElements.goToReports();
    reports.waitForReportToAppear();
    reports.startSelectMode(savedUuids);
    reports.stopSelectMode(savedUuids);
    // start select mode again
    reports.startSelectMode(savedUuids);
    reports.selectReport(savedUuids);
    reports.expandSelection();
    reports.collapseSelection();
    // deselect
    element(by.css('#reports-content .report-body .deselect')).click();
    reports.selectAll();
    reports.deselectAll();
    reports.selectSeveralReports(savedUuids);
    reports.deleteSelectedReports(savedUuids);
  });
});
