const utils = require('../utils');
const helper = require('../helper');
const moment = require('moment');
const commonElements = require('../page-objects/common/common.po.js');
const reportsTab = require('../page-objects/reports/reports.po.js');

describe('Filters reports', () => {
  const reports = [
    // one registration half an hour before the start date
    {
      fields: {
        lmp_date: 'Feb 3, 2016'
      },
      form: 'P',
      type: 'data_record',
      content_type: 'xml',
      reported_date: moment([2016, 4, 15, 23, 30]).valueOf(), // month is 0 based in this context
      contact: {
        name: 'Sharon',
        phone: '+555',
        type: 'person',
        _id: '3305E3D0-2970-7B0E-AB97-C3239CD22D32',
        _rev: '1-fb7fbda241dbf6c2239485c655818a69'
      },
      from: '+555',
      hidden_fields: []
    },
    // one registration half an hour after the start date
    {
      fields: {
        lmp_date: 'Feb 15, 2016'
      },
      form: 'P',
      type: 'data_record',
      content_type: 'xml',
      reported_date: moment([2016, 4, 16, 0, 30]).valueOf(), // month is 0 based in this context
      contact: {
        name: 'Sharon',
        phone: '+555',
        type: 'person',
        _id: '3305E3D0-2970-7B0E-AB97-C3239CD22D32',
        _rev: '1-fb7fbda241dbf6c2239485c655818a69'
      },
      from: '+555',
      hidden_fields: []
    },
    // one visit half an hour after the end date
    {
      fields: {
        ok: 'Yes!'
      },
      form: 'V',
      type: 'data_record',
      content_type: 'xml',
      reported_date: moment([2016, 4, 18, 0, 30]).valueOf(), // month is 0 based in this context
      contact: {
        name: 'Sharon',
        phone: '+555',
        type: 'person',
        _id: '3305E3D0-2970-7B0E-AB97-C3239CD22D32',
        _rev: '1-fb7fbda241dbf6c2239485c655818a69'
      },
      from: '+555',
      hidden_fields: []
    },
    // one visit half an hour before the end date
    {
      fields: {
        ok: 'Yes!'
      },
      form: 'V',
      type: 'data_record',
      content_type: 'xml',
      reported_date: moment([2016, 4, 17, 23, 30]).valueOf(), // month is 0 based in this context
      contact: {
        name: 'Sharon',
        phone: '+555',
        type: 'person',
        _id: '3305E3D0-2970-7B0E-AB97-C3239CD22D32',
        _rev: '1-fb7fbda241dbf6c2239485c655818a69'
      },
      from: '+555',
      hidden_fields: []
    },
  ];

  const savedUuids = [];
  beforeEach(done => {
    protractor.promise
      .all(reports.map(utils.saveDoc))
      .then(results => {
        results.forEach(result => {
          savedUuids.push(result.id);
        });
        done();
      })
      .catch(done.fail);
  });

  afterEach(utils.afterEach);

  it('by date', () => {
    commonElements.goToReports();
    helper.waitElementToPresent(reportsTab.firstReport());

    reportsTab.filterByDate(moment('05/16/2016','MM/DD/YYYY'), moment('05/17/2016','MM/DD/YYYY'));
    
    helper.waitElementToPresent(reportsTab.listLoader());
    helper.waitElementToPresent(reportsTab.firstReport());

    expect(reportsTab.allReports().count()).toBe(2);
    expect(reportsTab.reportByUUID(savedUuids[1]).count()).toBe(1);
    expect(reportsTab.reportByUUID(savedUuids[3]).count()).toBe(1);

  });
});

