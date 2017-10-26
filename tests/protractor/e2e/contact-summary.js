const utils = require('../utils'),
      common = require('../page-objects/common/common.po');

describe('Contact summary info', () => {

  'use strict';

  const SCRIPT = `
    let cards = [];
    let context = {};
    let fields = [];
    if (contact.type === "person") {
      fields = [
        { label: "test.pid", value: contact.patient_id, width: 3 },
        { label: "test.sex", value: contact.sex, width: 3 }
      ];
      let pregnancy;
      let pregnancyDate;
      reports.forEach(report=> {
        if (report.form === "P") {
          const subsequentDeliveries = reports.filter(report2=> {
            return report2.form === "D" && report2.reported_date > report.reported_date;
          });
          if (subsequentDeliveries.length > 0) {
            return;
          }
          const subsequentVisits = reports.filter(report2=> {
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
  const ALICE = {
    _id: 'alice-contact',
    reported_date: 1,
    type: 'person',
    name: 'Alice Alison',
    phone: '+447765902001'
  };
  const BOB_PLACE = {
    _id: 'bob-contact',
    reported_date: 1,
    type: 'clinic',
    name: 'Bob Place'
  };
  const CAROL = {
    _id: 'carol-contact',
    reported_date: 1,
    type: 'person',
    name: 'Carol Carolina',
    parent: BOB_PLACE,
    patient_id: '05946',
    sex: 'f',
    date_of_birth: 1462333250374
  };
  const DAVID = {
    _id: 'david-contact',
    reported_date: 1,
    type: 'person',
    name: 'David Davidson',
    phone: '+447765902002',
    parent: BOB_PLACE
  };

  // reports
  const PREGNANCY = {
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
  const VISIT = {
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

  const DOCS = [ALICE, BOB_PLACE, CAROL, DAVID, PREGNANCY, VISIT];

  beforeEach(done => {
    utils.updateSettings({ contact_summary: SCRIPT })
      .then(() => {
        return protractor.promise.all(DOCS.map(utils.saveDoc));
      })
      .then(done)
      .catch(done.fail);
  });

  afterEach(utils.afterEach);

  const selectContact = term => {
    common.goToPeople();
    element(by.id('freetext')).sendKeys(term);
    element(by.id('search')).click();
    browser.wait(() => {
      return element(by.css('#contacts-list .filtered .content')).isPresent();
    }, 10000);
    element(by.css('#contacts-list .filtered .content')).click();
  };

  it('contact summary', () => {
    selectContact('carol');

    // assert the summary card has the right fields
    browser.wait(() => {
      return element(by.css('.content-pane .meta > .card .col-sm-3:nth-child(1) label')).isPresent();
    }, 10000);
    expect(element(by.css('.content-pane .meta > .card .col-sm-3:nth-child(1) label')).getText()).toBe('test.pid');
    expect(element(by.css('.content-pane .meta > .card .col-sm-3:nth-child(1) p')).getText()).toBe(CAROL.patient_id);
    expect(element(by.css('.content-pane .meta > .card .col-sm-3:nth-child(2) label')).getText()).toBe('test.sex');
    expect(element(by.css('.content-pane .meta > .card .col-sm-3:nth-child(2) p')).getText()).toBe(CAROL.sex);

    // assert that the pregnancy card exists and has the right fields
    expect(element(by.css('.content-pane .meta > div > .card .action-header h3')).getText()).toBe('test.pregnancy');
    expect(element(by.css('.content-pane .meta > div > .card .row label')).getText()).toBe('test.visits');
    expect(element(by.css('.content-pane .meta > div > .card .row p')).getText()).toBe('1');
  });
});
