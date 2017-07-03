var utils = require('../utils');

describe('Contact summary info', function() {

  'use strict';

  var SCRIPT = `
    var cards = [];
    var context = {};
    var fields = [];
    if (contact.type === "person") {
      fields = [
        { label: "test.pid", value: contact.patient_id, width: 3 },
        { label: "test.sex", value: contact.sex, width: 3 }
      ];
      var pregnancy;
      var pregnancyDate;
      reports.forEach(function(report) {
        if (report.form === "P") {
          var subsequentDeliveries = reports.filter(function(report2) {
            return report2.form === "D" && report2.reported_date > report.reported_date;
          });
          if (subsequentDeliveries.length > 0) {
            return;
          }
          var subsequentVisits = reports.filter(function(report2) {
            return report2.form === "V" && report2.reported_date > report.reported_date;
          });
          context.pregnant = true;
          if (!pregnancy || pregnancyDate < report.reported_date) {
            pregnancyDate = report.reported_date;
            pregnancy = {
              label: "test.pregnancy",
              fields: [
                { label: "test.visits", value: subsequentVisits.length }
              ]
            };
          }
        }
      });
      if (pregnancy) {
        cards.push(pregnancy);
      }
    }
    return {
      fields: fields,
      cards: cards,
      context: context
    };
  `;

  // contacts
  var ALICE = {
    _id: 'alice-contact',
    reported_date: 1,
    type: 'person',
    name: 'Alice Alison',
    phone: '+447765902001'
  };
  var BOB_PLACE = {
    _id: 'bob-contact',
    reported_date: 1,
    type: 'clinic',
    name: 'Bob Place'
  };
  var CAROL = {
    _id: 'carol-contact',
    reported_date: 1,
    type: 'person',
    name: 'Carol Carolina',
    parent: BOB_PLACE,
    patient_id: '05946',
    sex: 'f',
    date_of_birth: 1462333250374
  };
  var DAVID = {
    _id: 'david-contact',
    reported_date: 1,
    type: 'person',
    name: 'David Davidson',
    phone: '+447765902002',
    parent: BOB_PLACE
  };

  // reports
  var PREGNANCY = {
    form: 'P',
    type: 'data_record',
    content_type: 'xml',
    reported_date: 1462333250374,
    expected_date: 1464333250374,
    patient_id: CAROL.patient_id,
    contact: {
      name: 'Sharon',
      phone: '+555',
      type: 'person',
      _id: '3305E3D0-2970-7B0E-AB97-C3239CD22D32',
      _rev: '1-fb7fbda241dbf6c2239485c655818a69'
    },
    from: '+555',
    hidden_fields: []
  };
  var VISIT = {
    form: 'V',
    type: 'data_record',
    content_type: 'xml',
    reported_date: 1462538250374,
    patient_id: CAROL.patient_id,
    contact: {
      name: 'Sharon',
      phone: '+555',
      type: 'person',
      _id: '3305E3D0-2970-7B0E-AB97-C3239CD22D32',
      _rev: '1-fb7fbda241dbf6c2239485c655818a69'
    },
    from: '+555',
    hidden_fields: []
  };

  var DOCS = [ ALICE, BOB_PLACE, CAROL, DAVID, PREGNANCY, VISIT ];

  beforeEach(function(done) {
    browser.ignoreSynchronization = true;
    utils.updateSettings({ contact_summary: SCRIPT })
      .then(function() {
        return protractor.promise.all(DOCS.map(utils.saveDoc));
      })
      .then(done)
      .catch(done);
  });

  afterEach(done => {
    utils.afterEach()
      .catch(() => {})
      .then(() => {
        browser.driver.navigate().refresh();
        browser.wait(() => {
          return element(by.id('contacts-tab')).isPresent();
        }, 10000);
        done();
      });
  });

  var selectContact = function(term) {
    element(by.id('contacts-tab')).click();
    element(by.id('freetext')).sendKeys(term);
    element(by.id('search')).click();
    browser.wait(function() {
      return element(by.css('#contacts-list .filtered .item-summary')).isPresent();
    }, 10000);
    element(by.css('#contacts-list .filtered .item-summary')).click();
  };

  it('contact summary', function() {

    // select contact
    browser.driver.navigate().refresh();
    browser.wait(function() {
      return element(by.id('contacts-tab')).isPresent();
    }, 10000);
    selectContact('carol');

    // assert the summary card has the right fields
    browser.wait(function() {
      return element(by.css('.content-pane .item-body .meta .card .col-sm-3:nth-child(1) label')).isPresent();
    }, 10000);
    expect(element(by.css('.content-pane .item-body .meta > .card .col-sm-3:nth-child(1) label')).getText()).toBe('test.pid');
    expect(element(by.css('.content-pane .item-body .meta > .card .col-sm-3:nth-child(1) p')).getText()).toBe(CAROL.patient_id);
    expect(element(by.css('.content-pane .item-body .meta > .card .col-sm-3:nth-child(2) label')).getText()).toBe('test.sex');
    expect(element(by.css('.content-pane .item-body .meta > .card .col-sm-3:nth-child(2) p')).getText()).toBe(CAROL.sex);

    // assert that the pregnancy card exists and has the right fields
    expect(element(by.css('.content-pane .item-body .meta .action-header h4')).getText()).toBe('test.pregnancy');
    expect(element(by.css('.content-pane .item-body .meta .action-list label')).getText()).toBe('test.visits');
    expect(element(by.css('.content-pane .item-body .meta .action-list p')).getText()).toBe('1');
  });
});

