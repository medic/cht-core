const utils = require('../utils');
const helper = require('../helper');

describe('Contact summary info', () => {
  const SCRIPT = `
    let cards = [];
    let context = {};
    let fields = [];
    if (contact.type === "person") {
      fields = [
        { label: "test.pid", value: contact.patient_id, width: 3 },
        { label: "test.sex", value: contact.sex, width: 3 },
      ];
      Object.keys(contact.linked_docs).forEach(key => {
        const linkedDoc = contact.linked_docs[key];
        if (!linkedDoc) {
          return;
        }

        if (linkedDoc.type === 'data_record') {
          fields.push({
            label: key,
            value: linkedDoc.form,
            width: 3,
          });
        } else {
          fields.push({
            label: key,
            value: linkedDoc.name + ' ' + linkedDoc.phone,
            width: 3,
          });
        }
      });
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
    phone: '+447765902001',
  };
  const BOB_PLACE = {
    _id: 'bob-contact',
    reported_date: 1,
    type: 'clinic',
    name: 'Bob Place',
  };
  const DAVID = {
    _id: 'david-contact',
    reported_date: 1,
    type: 'person',
    name: 'David Davidson',
    phone: '+447765902002',
    parent: BOB_PLACE,
  };

  const DAVID_VISIT = {
    _id: 'david_visit_form',
    form: 'VISIT',
    type: 'data_record',
    content_type: 'xml',
    reported_date: 1462538250374,
    patient_id: DAVID.patient_id,
    contact: {
      name: 'Sharon',
      phone: '+555',
      type: 'person',
      _id: '3305E3D0-2970-7B0E-AB97-C3239CD22D32',
      _rev: '1-fb7fbda241dbf6c2239485c655818a69',
    },
    from: '+555',
    hidden_fields: [],
  };

  const CAROL = {
    _id: 'carol-contact',
    reported_date: 1,
    type: 'person',
    name: 'Carol Carolina',
    parent: { _id: BOB_PLACE._id },
    patient_id: '05946',
    sex: 'f',
    date_of_birth: 1462333250374,
    linked_docs: {
      aliceTag: ALICE._id,
      davidTag: { _id: DAVID._id },
      visitTag: { _id: DAVID_VISIT._id },
    },
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
      _rev: '1-fb7fbda241dbf6c2239485c655818a69',
    },
    from: '+555',
    hidden_fields: [],
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
      _rev: '1-fb7fbda241dbf6c2239485c655818a69',
    },
    from: '+555',
    hidden_fields: [],
  };

  const DOCS = [ALICE, BOB_PLACE, CAROL, DAVID, PREGNANCY, VISIT, DAVID_VISIT];

  beforeEach(done => {
    utils
      .updateSettings({ contact_summary: SCRIPT })
      .then(() => utils.saveDocs(DOCS))
      .then(done)
      .catch(done.fail);
  });

  afterEach(utils.afterEach);

  const selectContact = term => {
    helper.waitElementToBeVisible(element(by.id('freetext')));
    element(by.id('freetext')).sendKeys(term);
    helper.clickElement(element(by.id('search')));
    helper.waitElementToPresent(
      element(by.css('#contacts-list .filtered .content'))
    );
    helper.clickElement(element(by.css('#contacts-list .filtered .content')));
    helper.waitElementToPresent(element(by.css('#contacts-list')));
  };

  it('contact summary', () => {
    //disabled.
    helper.clickElement(element(by.css('#contacts-tab')));
    try {
      selectContact('carol');
    } catch (err) {
      browser.refresh();
      //helper.waitForAngularComplete();
      helper.waitUntilReady(element(by.css('#contacts-tab')));
      helper.clickElement(element(by.css('#contacts-tab')));
      selectContact('carol');
    }
    // assert the summary card has the right fields
    helper.waitElementToPresent(
      element(
        by.css('.content-pane .meta > .card .col-sm-3:nth-child(1) label')
      )
    );
    expect(
      helper.getTextFromElement(
        element(
          by.css('.content-pane .meta > .card .col-sm-3:nth-child(1) label')
        )
      )
    ).toBe('test.pid');
    expect(
      helper.getTextFromElement(
        element(by.css('.content-pane .meta > .card .col-sm-3:nth-child(1) p'))
      )
    ).toBe(CAROL.patient_id);
    expect(
      helper.getTextFromElement(
        element(
          by.css('.content-pane .meta > .card .col-sm-3:nth-child(2) label')
        )
      )
    ).toBe('test.sex');
    expect(
      helper.getTextFromElement(
        element(by.css('.content-pane .meta > .card .col-sm-3:nth-child(2) p'))
      )
    ).toBe(CAROL.sex);

    expect(helper.getTextFromElement(element(by.css('.content-pane .meta > .card .col-sm-3:nth-child(3) label'))))
      .toBe('aliceTag');
    expect(helper.getTextFromElement(element(by.css('.content-pane .meta > .card .col-sm-3:nth-child(3) p'))))
      .toBe(ALICE.name + ' ' + ALICE.phone);

    expect(helper.getTextFromElement(element(by.css('.content-pane .meta > .card .col-sm-3:nth-child(4) label'))))
      .toBe('davidTag');
    expect(helper.getTextFromElement(element(by.css('.content-pane .meta > .card .col-sm-3:nth-child(4) p'))))
      .toBe(DAVID.name + ' ' + DAVID.phone);

    expect(helper.getTextFromElement(element(by.css('.content-pane .meta > .card .col-sm-3:nth-child(5) label'))))
      .toBe('visitTag');
    expect(helper.getTextFromElement(element(by.css('.content-pane .meta > .card .col-sm-3:nth-child(5) p'))))
      .toBe(DAVID_VISIT.form);

    // assert that the pregnancy card exists and has the right fields.
    expect(
      helper.getTextFromElement(
        element(by.css('.content-pane .meta > div > .card .action-header h3'))
      )
    ).toBe('test.pregnancy');
    expect(
      helper.getTextFromElement(
        element(by.css('.content-pane .meta > div > .card .row label'))
      )
    ).toBe('test.visits');
    expect(
      helper.getTextFromElement(
        element(by.css('.content-pane .meta > div > .card .row p'))
      )
    ).toBe('1');
  });
});
