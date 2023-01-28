const moment = require('moment');
const utils = require('../../../utils');
const commonElements = require('../../../page-objects/default/common/common.wdio.page.js');
const loginPage = require('../../../page-objects/default/login/login.wdio.page.js');
const contactsPo = require('../../../page-objects/default/contacts/contacts.wdio.page.js');

describe('Contact summary info', () => {
  const SCRIPT = `
    let cards = [];
    let context = {};
    let fields = [
      { 
        label: "uhc_stats_count", 
        value: uhcStats.homeVisits ? uhcStats.homeVisits.count : '', 
        width: 3 
      },
      { 
        label: "uhc_stats_count_goal", 
        value: uhcStats.homeVisits ? uhcStats.homeVisits.countGoal : '', 
        width: 3 
      },
      { 
        label: "uhc_stats_last_visited_date", 
        value: uhcStats.homeVisits ? uhcStats.homeVisits.lastVisitedDate : '', 
        width: 3 
      },
      { 
        label: "uhc_stats_interval_start", 
        value: uhcStats.uhcInterval ? uhcStats.uhcInterval.start : '', 
        width: 3 
      },
      { 
        label: "uhc_stats_interval_end", 
        value: uhcStats.uhcInterval ? uhcStats.uhcInterval.end : '', 
        width: 3 
      },
      { 
        label: "can_configure", 
        value: cht.v1.hasPermissions('can_configure'), 
        width: 3 
      },
      { 
        label: "can_edit_or_can_create_people", 
        value: cht.v1.hasAnyPermission([['can_edit'], ['can_create_people']]), 
        width: 3 
      }
    ];
    
    if (contact.type === "person") {
      fields.push({ label: "test_pid", value: contact.patient_id, width: 3 });
      fields.push({ label: "test_sex", value: contact.sex, width: 3 });
     
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
    reported_date: moment().set('date', 5).valueOf(),
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
    fields: {
      visited_contact_uuid: BOB_PLACE._id,
      patient_id: CAROL.patient_id
    }
  };

  const DOCS = [ALICE, BOB_PLACE, CAROL, DAVID, PREGNANCY, VISIT, DAVID_VISIT];

  const USER_HOME_VISITS = {
    username: 'user-home-visits',
    password: 'Sup3rSecret!',
    place: BOB_PLACE._id,
    contact: {
      _id: 'fixture:user-home-visits:offline',
      name: 'user-home-visits'
    },
    roles: ['program_officer']
  };

  const USER_DISTRICT = {
    username: 'user-district',
    password: 'Sup3rSecret!',
    place: BOB_PLACE._id,
    contact: {
      _id: 'fixture:user-district:offline',
      name: 'user-district'
    },
    roles: ['chw_supervisor']
  };

  const SETTINGS = {
    uhc: {
      visit_count: {
        month_start_date: 1,
        visit_count_goal: 2
      }
    },
    contact_summary: SCRIPT,
    contact_types: [
      {
        id: 'clinic',
        count_visits: true
      },
      {
        id: 'person',
        count_visits: false
      }
    ]
  };

  before(async () => {
    await utils.saveDocs(DOCS);
    await loginPage.cookieLogin();
  });

  afterEach(async () => {
    await utils.revertSettings(true);
    await commonElements.closeReloadModal();
    await commonElements.logout();
  });

  after(async () => await utils.deleteUsers([ USER_HOME_VISITS, USER_DISTRICT ]));

  it('should load contact summary', async () => {
    await utils.updateSettings(SETTINGS, true);
    await commonElements.closeReloadModal();
    await commonElements.goToPeople();
    await contactsPo.selectLHSRowByText(CAROL.name);

    // assert the summary card has the right fields

    expect(await contactsPo.cardFieldLabelText('test_pid')).to.equal('test_pid');
    expect(await contactsPo.cardFieldText('test_pid')).to.equal(CAROL.patient_id);

    expect(await contactsPo.cardFieldLabelText('test_sex')).to.equal('test_sex');
    expect(await contactsPo.cardFieldText('test_sex')).to.equal(CAROL.sex);

    expect(await contactsPo.cardFieldLabelText('uhc_stats_count')).to.equal('uhc_stats_count');
    expect(await contactsPo.cardFieldText('uhc_stats_count')).to.equal('');

    expect(await contactsPo.cardFieldLabelText('uhc_stats_count_goal')).to.equal('uhc_stats_count_goal');
    expect(await contactsPo.cardFieldText('uhc_stats_count_goal')).to.equal('');

    expect(await contactsPo.cardFieldLabelText('uhc_stats_last_visited_date')).to.equal('uhc_stats_last_visited_date');
    expect(await contactsPo.cardFieldText('uhc_stats_last_visited_date')).to.equal('');

    expect(await contactsPo.cardFieldLabelText('uhc_stats_interval_start')).to.equal('uhc_stats_interval_start');
    const startDate = moment().startOf('month').valueOf().toString();
    expect(await contactsPo.cardFieldText('uhc_stats_interval_start')).to.equal(startDate);

    expect(await contactsPo.cardFieldLabelText('uhc_stats_interval_end')).to.equal('uhc_stats_interval_end');
    const endDate = moment().endOf('month').valueOf().toString();
    expect(await contactsPo.cardFieldText('uhc_stats_interval_end')).to.equal(endDate);

    expect(await contactsPo.cardFieldLabelText('alicetag')).to.equal('aliceTag');
    expect(await contactsPo.cardFieldText('alicetag')).to.equal(`${ALICE.name} ${ALICE.phone}`);

    expect(await contactsPo.cardFieldLabelText('davidtag')).to.equal('davidTag');
    expect(await contactsPo.cardFieldText('davidtag')).to.equal(`${DAVID.name} ${DAVID.phone}`);

    expect(await contactsPo.cardFieldLabelText('visittag')).to.equal('visitTag');
    expect(await contactsPo.cardFieldText('visittag')).to.equal(DAVID_VISIT.form);

    // assert that the pregnancy card exists and has the right fields.
    expect(await (await $('.content-pane .meta > div > .card .action-header h3')).getText()).to.equal('test.pregnancy');
    expect(await ( await $('.content-pane .meta > div > .card .row label')).getText()).to.equal('test.visits');
    expect(await (await $(('.content-pane .meta > div > .card .row p'))).getText() ).to.equal('1');
  });

  it('should display UHC Stats in contact summary, if contact counts visits and user has permission', async () => {
    await utils.createUsers([ USER_HOME_VISITS ]);
    await loginPage.login({username: USER_HOME_VISITS.username, password: USER_HOME_VISITS.password});
    await commonElements.closeTour();

    const originalSettings = await utils.getSettings();
    const permissions = originalSettings.permissions;
    permissions.can_view_uhc_stats = USER_HOME_VISITS.roles;
    await utils.updateSettings({ ...SETTINGS, permissions }, true);
    
    await commonElements.closeReloadModal();

    await commonElements.goToPeople();
    await contactsPo.selectLHSRowByText(BOB_PLACE.name);

    expect(await contactsPo.cardFieldLabelText('uhc_stats_count')).to.equal('uhc_stats_count');
    expect(await contactsPo.cardFieldText('uhc_stats_count')).to.equal('1');

    expect(await contactsPo.cardFieldLabelText('uhc_stats_count_goal')).to.equal('uhc_stats_count_goal');
    expect(await contactsPo.cardFieldText('uhc_stats_count_goal')).to.equal('2');

    expect(await contactsPo.cardFieldLabelText('uhc_stats_last_visited_date')).to.equal('uhc_stats_last_visited_date');
    expect(await contactsPo.cardFieldText('uhc_stats_last_visited_date')).to.equal(VISIT.reported_date.toString());

    expect(await contactsPo.cardFieldLabelText('uhc_stats_interval_start')).to.equal('uhc_stats_interval_start');
    const startDate = moment().startOf('month').valueOf().toString();
    expect(await contactsPo.cardFieldText('uhc_stats_interval_start')).to.equal(startDate);

    expect(await contactsPo.cardFieldLabelText('uhc_stats_interval_end')).to.equal('uhc_stats_interval_end');
    const endDate = moment().endOf('month').valueOf().toString();
    expect(await contactsPo.cardFieldText('uhc_stats_interval_end')).to.equal(endDate);
  });

  it('should have access to the "cht" global api variable', async () => {
    await utils.createUsers([ USER_DISTRICT ]);
    await loginPage.login({username: USER_DISTRICT.username, password: USER_DISTRICT.password});
    await commonElements.closeTour();
    const originalSettings = await utils.getSettings();
    const permissions = originalSettings.permissions;
    permissions.can_configure = USER_DISTRICT.roles;
    permissions.can_edit = USER_DISTRICT.roles;
    await utils.updateSettings({ ...SETTINGS, permissions }, true);
    await commonElements.closeReloadModal();

    await commonElements.goToPeople();
    await contactsPo.selectLHSRowByText(BOB_PLACE.name);

    expect(await contactsPo.cardFieldLabelText('can_configure')).to.equal('can_configure');
    expect(await contactsPo.cardFieldText('can_configure')).to.equal('true');
    expect(await contactsPo.cardFieldLabelText('can_edit_or_can_create_people'))
      .to.equal('can_edit_or_can_create_people');
    expect(await contactsPo.cardFieldText('can_edit_or_can_create_people')).to.equal('true');
  });
});
