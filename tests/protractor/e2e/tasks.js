var utils = require('../utils');

describe('Tasks', function() {

  'use strict';

  var registration = {
    type: 'data_record',
    from: '+10211111111',
    form: 'P',
    reported_date: Date.now(),
    patient_id: '53144',
    lmp_date: '2015-02-28T11:00:00.000Z',
    expected_date: '2015-12-05T11:00:00.000Z',
    verified: true,
    errors: [],
    fields: {
      last_menstrual_period: 20,
      patient_name: 'sally'
    },
    sms_message: {
      message_id: '650',
      sent_timestamp: '1437618272360',
      message: '1!P!20#sally',
      from: '0211111111',
      type: 'sms_message',
      form: 'P',
      locale: 'en'
    },
    read: [],
    contact: {
      _id: 'a483e2e88487da478c7ad9e2a51bf785',
      _rev: '4-baec5c16f4eea79903000821d03206f6',
      type: 'person',
      name: 'Gareth',
      parent: {
        _id: '69ec8dd90de5640aee7de085572c4c66',
        _rev: '1-a476db6284a7538a14a4df025cb1d824',
        type: 'clinic',
        name: 'Andy Bay',
        parent: {
          _id: '69ec8dd90de5640aee7de085572c3d19',
          _rev: '1-385fcdf7e978dd1984d3c05fa63b23a0',
          type: 'health_center',
          name: 'Dunedin',
          parent: {
            _id: '69ec8dd90de5640aee7de085572c2486',
            _rev: '1-6a22da3e8abca8ef170e2de185d42160',
            type: 'district_hospital',
            name: 'Otago',
            parent: null
          }
        },
        contact: {
          _id: 'a483e2e88487da478c7ad9e2a51bf785',
          _rev: '1-e39081e9217eb0d99b8bcc4c64f33905',
          type: 'person',
          name: 'Gareth'
        }
      }
    }
  };

  var savedUuid;
  beforeEach(function(done) {
    utils.saveDoc(registration)
      .then(function(doc) {
        savedUuid = doc.id;
        done();
      }, function(err) {
        console.log('Error saving doc', err);
        done();
      });
  });

  afterEach(function(done) {
    utils.deleteDoc(savedUuid)
      .then(done, done);
  });

  it('visit tasks are shown', function() {

    // reload page
    element(by.id('reports-tab')).click();
    element(by.id('tasks-tab')).click();
    browser.waitForAngular();

    // check selected tab
    var selectedTab = element(by.css('.tabs .selected .button-label'));
    expect(selectedTab.getText()).toEqual('Tasks');

    // check list details
    var taskSummary = element(by.css('#tasks-list ul li[data-record-id="' + savedUuid + '-1"] .description'));
    expect(taskSummary.getText()).toEqual('ANC visit #1 for sally');

    var taskDueDate = element(by.css('#tasks-list ul li[data-record-id="' + savedUuid + '-1"] .relative-date-content'));
    expect(taskDueDate.getText()).toEqual('3 months ago');

    taskSummary.click();

    // check content details
    var heading = element(by.css('.content-pane .item-body h2'));
    expect(heading.getText()).toEqual('ANC visit #1 for sally');

    var content = element(by.css('.content-pane .item-body ul li:first-child p'));
    expect(content.getText()).toEqual('Please visit sally in Harrisa Village and refer her for ANC visit #1.');

  });
});

