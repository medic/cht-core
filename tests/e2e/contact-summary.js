const utils = require('../utils');
const helper = require('../helper');
const contactsPo = require('../page-objects/contacts/contacts.po');

describe('Contact summary info', () => {
  const SCRIPT = `
    let cards = [];
    let context = {};
    let fields = [];
    if (contact.type === "person") {
      fields = [
        { label: "test_pid", value: contact.patient_id, width: 3 },
        { label: "test_sex", value: contact.sex, width: 3 },
        { label: "stats_visit_count", value: stats.visit.count, width: 3 },
        { label: "stats_visit_count_goal", value: stats.visit.countGoal, width: 3 },
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
  const CAROL_HOME_VISIT = {
    form: 'home_visit',
    type: 'data_record',
    content_type: 'xml',
    reported_date: 1617804258004,
    contact: {
      name: 'Sharon',
      phone: '+555',
      type: 'person',
      _id: '3305E3D0-2970-7B0E-AB97-C3239CD22D32',
      _rev: '1-fb7fbda241dbf6c2239485c655818a69',
    },
    from: '',
    hidden_fields: [],
    fields: {
      visited_contact_uuid: 'carol-contact',
      patient_id: 'carol-contact'
    }
  };

  const DOCS = [ALICE, BOB_PLACE, CAROL, DAVID, PREGNANCY, VISIT, DAVID_VISIT, CAROL_HOME_VISIT];

  const SETTINGS = {
    uhc: {
      visit_count: {
        month_start_date: 26,
        visit_count_goal: 2
      }
    },
    contact_summary: SCRIPT
  };

  beforeEach(async () => {
    await utils.updateSettings(SETTINGS);
    await utils.saveDocs(DOCS);
  });

  afterEach(async () => { await utils.afterEach(); });

  const selectContact = async term => {
    await helper.waitUntilReadyNative(contactsPo.searchBox);
    await contactsPo.searchBox.sendKeys(term);
    await helper.clickElementNative(contactsPo.searchButton);
    await helper.waitUntilReadyNative(contactsPo.contactContent());
    await helper.clickElementNative(contactsPo.contactContent());
    await helper.waitUntilReadyNative(contactsPo.contactsList());
  };

  it('contact summary', async () => {
    //disabled.
    await helper.waitUntilReadyNative(contactsPo.contactsTab);
    await helper.clickElementNative(contactsPo.contactsTab);
    try {
      await selectContact('carol');
    } catch (err) {
      await browser.refresh();
      await helper.clickElementNative(contactsPo.contactsTab);
      await selectContact('carol');
    }
    // assert the summary card has the right fields

    await helper.waitUntilReadyNative(contactsPo.cardFieldLabel('test_pid'));
    expect(await contactsPo.cardFieldLabelText('test_pid')).toBe('test_pid');
    expect(await contactsPo.cardFieldText('test_pid')).toBe(CAROL.patient_id);

    expect(await contactsPo.cardFieldLabelText('test_sex')).toBe('test_sex');
    expect(await contactsPo.cardFieldText('test_sex')).toBe(CAROL.sex);

    expect(await contactsPo.cardFieldLabelText('stats_visit_count')).toBe('stats_visit_count');
    expect(await contactsPo.cardFieldText('stats_visit_count')).toBe(1);

    expect(await contactsPo.cardFieldLabelText('stats_visit_count_goal')).toBe('stats_visit_count_goal');
    expect(await contactsPo.cardFieldText('stats_visit_count_goal')).toBe(1);

    expect(await contactsPo.cardFieldLabelText('alicetag')).toBe('aliceTag');
    expect(await contactsPo.cardFieldText('alicetag')).toBe(`${ALICE.name} ${ALICE.phone}`);

    expect(await contactsPo.cardFieldLabelText('davidtag')).toBe('davidTag');
    expect(await contactsPo.cardFieldText('davidtag')).toBe(`${DAVID.name} ${DAVID.phone}`);

    expect(await contactsPo.cardFieldLabelText('visittag')).toBe('visitTag');
    expect(await contactsPo.cardFieldText('visittag')).toBe(DAVID_VISIT.form);

    // assert that the pregnancy card exists and has the right fields.
    expect(
      await helper.getTextFromElementNative(
        element(by.css('.content-pane .meta > div > .card .action-header h3'))
      )
    ).toBe('test.pregnancy');
    expect(
      await helper.getTextFromElementNative(
        element(by.css('.content-pane .meta > div > .card .row label'))
      )
    ).toBe('test.visits');
    expect(
      await helper.getTextFromElementNative(
        element(by.css('.content-pane .meta > div > .card .row p'))
      )
    ).toBe('1');
  });
});
