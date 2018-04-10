const utils = require('../utils'),
      commonElements = require('../page-objects/common/common.po.js');

describe('Bulk delete reports', () => {

  'use strict';

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

    browser.wait(() => element(by.css('#reports-list li:first-child')).isPresent(), 10000, 'There should be at least one report in the LHS');

    // start select mode
    const selectModeButton = element(by.css('.action-container .select-mode-start'));
    browser.wait(() => {
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
    browser.wait(() => {
      return element(by.css('#reports-content .selection-count > span:first-child')).isDisplayed();
    }, 3000);
    expect(element.all(by.css('#reports-content .report-body')).count()).toBe(1);
    expect(element(by.css('#reports-content .report-body .item-summary .sender .name')).getText()).toBe('Sharon');
    expect(element(by.css('#reports-content .report-body .details')).isDisplayed()).toBeFalsy();

    // expand selection
    element(by.css('#reports-content .report-body .item-summary')).click();
    browser.wait(() => {
      return element(by.css('#reports-content .report-body .details')).isDisplayed();
    }, 3000);

    // collapse selection
    element(by.css('#reports-content .report-body .item-summary')).click();
    expect(element(by.css('#reports-content .report-body .details')).isDisplayed()).toBeFalsy();

    // deselect
    element(by.css('#reports-content .report-body .deselect')).click();

    // select all
    element(by.css('.action-container .select-all')).click();
    browser.wait(() => {
      return element(by.css('#reports-content .selection-count > span:nth-child(2)')).isDisplayed();
    }, 3000);
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
    const confirmButton = element(by.css('#bulk-delete-confirm .submit:not(.ng-hide)'));
    browser.wait(protractor.ExpectedConditions.elementToBeClickable(confirmButton), 5000);
    confirmButton.click();

    browser.wait(protractor.ExpectedConditions.elementToBeClickable(confirmButton), 5000);
    confirmButton.click();

    browser.wait(() => element(by.css('#reports-list li')).isPresent(), 30000);

    // make sure the reports are deleted
    expect(element.all(by.css('#reports-list li[data-record-id="' + savedUuids[1] + '"]')).count()).toBe(1);
  });
});
