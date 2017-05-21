var utils = require('../utils');

describe('Bulk delete reports', function() {

  'use strict';

  var reports = [
    {
      fields: {
        lmp_date: 'Feb 3, 2016'
      },
      form: 'P',
      type: 'data_record',
      content_type: 'xml',
      reported_date: 1462333250374,
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
    {
      fields: {
        lmp_date: 'Feb 15, 2016'
      },
      form: 'P',
      type: 'data_record',
      content_type: 'xml',
      reported_date: 1462338250374,
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
    {
      fields: {
        ok: 'Yes!'
      },
      form: 'V',
      type: 'data_record',
      content_type: 'xml',
      reported_date: 1462538250374,
      contact: {
        name: 'Sharon',
        phone: '+555',
        type: 'person',
        _id: '3305E3D0-2970-7B0E-AB97-C3239CD22D32',
        _rev: '1-fb7fbda241dbf6c2239485c655818a69'
      },
      from: '+555',
      hidden_fields: []
    }
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

  it('reports', function() {
    element(by.id('reports-tab')).click();

    // refresh - live list only updates on changes but changes are disabled for e2e
    browser.driver.navigate().refresh();
    browser.wait(function() {
      return element(by.css('#reports-list li:first-child')).isPresent();
    }, 10000);

    // start select mode
    var selectModeButton = element(by.css('.action-container .select-mode-start'));
    browser.wait(function() {
      return selectModeButton.isPresent();
    }, 1000);
    selectModeButton.click();
    expect(element(by.css('#reports-list li[data-record-id="' + savedUuids[0] + '"] input[type="checkbox"]')).isDisplayed()).toBeTruthy();

    // stop select mode
    element(by.css('.action-container .select-mode-stop')).click();
    expect(element(by.css('#reports-list li[data-record-id="' + savedUuids[0] + '"] input[type="checkbox"]')).isDisplayed()).toBeFalsy();

    // start select mode again
    selectModeButton.click();
    expect(element(by.css('#reports-list li[data-record-id="' + savedUuids[0] + '"] input[type="checkbox"]')).isDisplayed()).toBeTruthy();

    // select a report
    element(by.css('#reports-list li[data-record-id="' + savedUuids[0] + '"] input[type="checkbox"]')).click();
    expect(element(by.css('#reports-content .selection-count > span:first-child')).isDisplayed()).toBeTruthy();
    expect(element.all(by.css('#reports-content .report-body')).count()).toBe(1);
    expect(element(by.css('#reports-content .report-body .item-summary .sender .name')).getText()).toBe('Sharon');
    expect(element(by.css('#reports-content .report-body .details')).isDisplayed()).toBeFalsy();

    // expand selection
    element(by.css('#reports-content .report-body .item-summary')).click();
    expect(element(by.css('#reports-content .report-body .details')).isDisplayed()).toBeTruthy();

    // collapse selection
    element(by.css('#reports-content .report-body .item-summary')).click();
    expect(element(by.css('#reports-content .report-body .details')).isDisplayed()).toBeFalsy();
    
    // deselect
    element(by.css('#reports-content .report-body .deselect')).click();

    // select all
    element(by.css('.action-container .select-all')).click();
    browser.sleep(1000);
    expect(element(by.css('#reports-content .selection-count > span:nth-child(2)')).isDisplayed()).toBeTruthy();
    expect(element.all(by.css('#reports-content .report-body')).count()).toBe(3);

    // deselect all
    element(by.css('.action-container .deselect-all')).click();
    expect(element(by.css('#reports-content .selection-count > span:first-child')).isDisplayed()).toBeFalsy();
    expect(element.all(by.css('#reports-content .report-body')).count()).toBe(0);

    // select a couple
    element(by.css('#reports-list li[data-record-id="' + savedUuids[0] + '"] input[type="checkbox"]')).click();
    element(by.css('#reports-list li[data-record-id="' + savedUuids[2] + '"] input[type="checkbox"]')).click();
    browser.sleep(1000);
    expect(element.all(by.css('#reports-content .report-body')).count()).toBe(2);

    // delete all selected
    element(by.css('.action-container .detail-actions .delete-all')).click();
    var confirmButton = element(by.css('#delete-confirm .submit'));
    browser.wait(protractor.ExpectedConditions.elementToBeClickable(confirmButton), 5000);
    confirmButton.click();

    // refresh - live list only updates on changes but changes are disabled for e2e
    browser.sleep(1000);
    browser.driver.navigate().refresh();
    browser.wait(function() {
      return element(by.css('#reports-list li:first-child')).isPresent();
    }, 10000);

    // make sure the reports are deleted
    expect(element.all(by.css('#reports-list li')).count()).toBe(1);
    expect(element.all(by.css('#reports-list li[data-record-id="' + savedUuids[1] + '"]')).count()).toBe(1);

  });
});

