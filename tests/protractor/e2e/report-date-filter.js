var utils = require('../utils'),
    moment = require('moment');

describe('Filters reports', function() {

  'use strict';

  var reports = [
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

  var savedUuids = [];
  beforeEach(function(done) {
    browser.ignoreSynchronization = true;
    protractor.promise
      .all(reports.map(utils.saveDoc))
      .then(function(results) {
        results.forEach(function(result) {
          savedUuids.push(result.id);
        });
        done();
      })
      .catch(function(err) {
        console.error('Error saving docs', err);
        done();
      });
  });

  afterEach(function(done) {
    protractor.promise
      .all(savedUuids.map(utils.deleteDoc))
      .then(done, done);
  });

  it('by date', function() {
    element(by.id('reports-tab')).click();

    // refresh - live list only updates on changes but changes are disabled for e2e
    browser.driver.navigate().refresh();
    browser.wait(function() {
      return browser.isElementPresent(by.css('#reports-list li:first-child'));
    }, 10000);

    var clear = '';
    for (var i = 0; i < 20; i++) {
      clear += protractor.Key.BACK_SPACE;
    }

    element(by.css('#date-filter')).click();
    element(by.css('.daterangepicker [name="daterangepicker_start"]')).click().sendKeys(clear + '05/16/2016');
    element(by.css('.daterangepicker [name="daterangepicker_end"]')).click().sendKeys(clear + '05/17/2016' + protractor.Key.ENTER);
    element(by.css('#freetext')).click(); // blur the datepicker

    browser.wait(function() {
      return browser.isElementPresent(by.css('#reports-list .filtered li:first-child'));
    }, 10000);

    expect(element.all(by.css('#reports-list .filtered li')).count()).toBe(2);
    expect(element.all(by.css('#reports-list .filtered li[data-record-id="' + savedUuids[1] + '"]')).count()).toBe(1);
    expect(element.all(by.css('#reports-list .filtered li[data-record-id="' + savedUuids[3] + '"]')).count()).toBe(1);

  });
});

