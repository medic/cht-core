var utils = require('../utils');

describe('Medic Reporter modal', function() {
  'use strict';

  var forms = JSON.parse('{ "OFF": { "meta": { "code": "OFF", "label": { "en": "Disable Notifications" } }, "fields": { "patient_id": { "labels": { "tiny": { "en": "ID" }, "description": { "en": "Patient ID" }, "short": { "en": "ID" } }, "position": 0, "flags": { "input_digits_only": true }, "length": [ 5, 5 ], "type": "string" }, "notes": { "labels": { "tiny": { "en": "r", "sw": "r" }, "description": { "en": "Reason" }, "short": { "en": "Reason" } }, "position": 1, "length": [ 2, 100 ], "type": "string" } } }, "ON": { "meta": { "code": "ON", "label": { "en": "Enable Notifications" } }, "fields": { "patient_id": { "labels": { "tiny": { "en": "ID" }, "description": { "en": "Patient ID" }, "short": { "en": "ID" } }, "position": 0, "flags": { "input_digits_only": true }, "length": [ 5, 5 ], "type": "string" } } } }');

  beforeAll(function(done) {
    browser.ignoreSynchronization = true;
    utils.updateSettings({
      forms: forms,
      muvuku_webapp_url: '/medic-test-reporter/_design/medic-reporter/_rewrite/'})
      .then(function() {
        console.log('Uploaded forms.');
        done();
      })
      .catch(function(err) {
        console.error('Error uploading forms', err);
        done();
      });
  });

  afterAll(function(done) {
    utils.revertSettings()
      .then(function() {
        console.log('Removed forms from settings.');
        done();
      })
      .catch(function(err) {
        console.error('Could not remove forms from settings.', err);
        done();
      });
  });


  it('can send report', function(done) {
    // Refresh to get the new forms.
    browser.refresh();
    browser.driver.wait(function() {
      return browser.driver.isElementPresent(by.css('body.bootstrapped'));
    }, 10 * 1000, 'Refresh should be complete within 10 seconds');

    element(by.id('reports-tab')).click();
    expect(element.all(by.css('#reports-list .unfiltered li')).count()).toBe(0);

    var sendReportButton = element(by.css('.general-actions .submit-report'));
    expect(sendReportButton.isDisplayed()).toBeTruthy();

    var dropDownMenu = element(by.css('.general-actions .submit-report-menu'));
    expect(dropDownMenu.isDisplayed()).toBeFalsy();

    sendReportButton.click();
    expect(dropDownMenu.isDisplayed()).toBeTruthy();

    var forms = element.all(by.css('.general-actions .submit-report-menu li'));
    expect(forms.count()).toBe(2);

    var formCode = 'OFF';
    var form = element(by.css('.general-actions .submit-report-menu li .' + formCode));
    form.click();

    browser.wait(function() {
      return browser.findElement(by.css('#medic-reporter-modal'));
    }, 10 * 1000);

    browser.wait(function() {
      return browser.findElement(by.css('#medic-reporter-iframe'));
    }, 10 * 1000);

    browser.switchTo().frame(browser.driver.findElement(by.css('#medic-reporter-iframe')))
      .then(function() {
        // We're not in an angular page any more! Use the underlying WebDriver (browser.driver)
        // instead of Protractor (browser).
        browser.driver.wait(function() {
          return browser.driver.isElementPresent(by.css('#je0-patient_id-input-1'));
        }, 10 * 1000, 'Refresh should be complete within 10 seconds');

        browser.driver.findElement(by.css('#je0-patient_id-input-1')).sendKeys('12345');
        browser.driver.findElement(by.css('#je0-notes-input-3')).sendKeys('R1');
        browser.driver.findElement(by.css('.submit button')).click();

        return browser.switchTo().defaultContent();
        // Back to angular page!
      }).then(function() {
        // Dismiss modal.
        element(by.css('#medic-reporter-modal .modal-header button')).click();

        // Reload page so that report appears in livelist (no changes feed in e2e, so no updating of livelist)
        browser.refresh();
        browser.driver.wait(function() {
          return browser.driver.isElementPresent(by.css('body.bootstrapped'));
        }, 10 * 1000, 'Refresh should be complete within 10 seconds');

        browser.driver.wait(function() {
          return browser.driver.isElementPresent(by.css('#reports-list .unfiltered li'));
        }, 10 * 1000, 'Report should appear in list');

        expect(element.all(by.css('#reports-list .unfiltered li')).count()).toBe(1);
        expect(element(by.css('#reports-list .unfiltered li .relative-date-content')).getText()).toEqual('today');
        expect(element(by.css('#reports-list .unfiltered li .description')).getText()).toEqual('Disable Notifications');
        done();
      });
  });
});
