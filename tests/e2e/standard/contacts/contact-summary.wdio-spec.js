const moment = require('moment');
const utils = require('../../../utils');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const contactPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const reportFactory = require('../../../factories/cht/reports/generic-report');

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

  const placeBobClinic = placeFactory.place().build({ name: 'Bob Place', type: 'clinic' });
  const nationalAdminUser = userFactory.build(
    {
      username: 'national-user', place: placeBobClinic._id, roles: ['national_admin'],
      contact: {
        _id: 'fixture:national-user:offline',
        name: 'national-user'
      }
    });
  const districtAdminUser = userFactory.build(
    {
      username: 'user-district', place: placeBobClinic._id,
      contact: {
        _id: 'fixture:user-district:offline',
        name: 'user-district'
      },
      roles: ['district_admin'],
      known: false
    });
  const patientAlice = personFactory.build({ name: 'Alice Alison', phone: '+447765902001' });
  const patientDavid = personFactory.build({ name: 'David Davidson', phone: '+447765902002', parent: placeBobClinic });
  const davidVisit = reportFactory.build(
    { form: 'visit' }, { patient: patientDavid, submitter: nationalAdminUser.contact });
  const patientCarol = personFactory.build({
    name: 'Carol Carolina', sex: 'f', parent: placeBobClinic, patient_id: '05946',
    linked_docs: {
      aliceTag: patientAlice._id,
      davidTag: { _id: patientDavid._id },
      visitTag: { _id: davidVisit._id },
    }
  });
  const carolPregnancy = reportFactory.build(
    { form: 'P' },
    {
      patient: patientCarol,
      submitter: nationalAdminUser.contact
    });
  const carolVisit = reportFactory.build(
    { form: 'V' },
    {
      patient: patientCarol,
      submitter: nationalAdminUser.contact,
      reported_date: moment().set('date', 5).valueOf(),
      fields: {
        visited_contact_uuid: placeBobClinic._id,
        patient_id: patientCarol.patient_id
      }
    });

  const docs = [patientAlice, placeBobClinic, patientCarol, patientDavid, carolPregnancy, davidVisit, carolVisit];

  const settings = {
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
    await utils.saveDocs(docs);
    await utils.createUsers([districtAdminUser, nationalAdminUser]);
  });

  afterEach(async () => {
    await utils.revertSettings(true);
    await commonElements.closeReloadModal();
    await commonElements.logout();
  });

  after(async () => {
    await utils.deleteUsers([nationalAdminUser, districtAdminUser]);
    await utils.revertDb([/^form:/], true);
  });

  it('should load contact summary', async () => {
    await loginPage.cookieLogin();
    await commonElements.waitForPageLoaded();
    await utils.updateSettings(settings, true);
    await commonElements.closeReloadModal();
    await commonElements.goToPeople();
    await contactPage.selectLHSRowByText(patientCarol.name);
    await contactPage.waitForContactLoaded();
    // assert the summary card has the right fields

    expect(await contactPage.cardFieldLabelText('test_pid')).to.equal('test_pid');
    expect(await contactPage.cardFieldText('test_pid')).to.equal(patientCarol.patient_id);

    expect(await contactPage.cardFieldLabelText('test_sex')).to.equal('test_sex');
    expect(await contactPage.cardFieldText('test_sex')).to.equal(patientCarol.sex);

    expect(await contactPage.cardFieldLabelText('uhc_stats_count')).to.equal('uhc_stats_count');
    expect(await contactPage.cardFieldText('uhc_stats_count')).to.equal('');

    expect(await contactPage.cardFieldLabelText('uhc_stats_count_goal')).to.equal('uhc_stats_count_goal');
    expect(await contactPage.cardFieldText('uhc_stats_count_goal')).to.equal('');

    expect(await contactPage.cardFieldLabelText('uhc_stats_last_visited_date')).to.equal('uhc_stats_last_visited_date');
    expect(await contactPage.cardFieldText('uhc_stats_last_visited_date')).to.equal('');

    expect(await contactPage.cardFieldLabelText('uhc_stats_interval_start')).to.equal('uhc_stats_interval_start');
    const startDate = moment().startOf('month').valueOf().toString();
    expect(await contactPage.cardFieldText('uhc_stats_interval_start')).to.equal(startDate);

    expect(await contactPage.cardFieldLabelText('uhc_stats_interval_end')).to.equal('uhc_stats_interval_end');
    const endDate = moment().endOf('month').valueOf().toString();
    expect(await contactPage.cardFieldText('uhc_stats_interval_end')).to.equal(endDate);

    expect(await contactPage.cardFieldLabelText('alicetag')).to.equal('aliceTag');
    expect(await contactPage.cardFieldText('alicetag')).to.equal(`${patientAlice.name} ${patientAlice.phone}`);

    expect(await contactPage.cardFieldLabelText('davidtag')).to.equal('davidTag');
    expect(await contactPage.cardFieldText('davidtag')).to.equal(`${patientDavid.name} ${patientDavid.phone}`);

    expect(await contactPage.cardFieldLabelText('visittag')).to.equal('visitTag');
    expect(await contactPage.cardFieldText('visittag')).to.equal(davidVisit.form);

    // assert that the pregnancy card exists and has the right fields.

    expect(await contactPage.getPregnancyLabel()).to.equal('test.pregnancy');
    expect(await contactPage.getVisitLabel()).to.equal('test.visits');
    expect(await contactPage.getNumberOfReports()).to.equal('1');
  });

  it('should display UHC Stats in contact summary, if contact counts visits and user has permission', async () => {
    await loginPage.login({ username: nationalAdminUser.username, password: nationalAdminUser.password });
    await commonElements.waitForPageLoaded();
    await commonElements.closeTour();
    const originalSettings = await utils.getSettings();
    const permissions = originalSettings.permissions;
    permissions.can_view_uhc_stats = nationalAdminUser.roles;
    await utils.updateSettings({ ...settings, permissions }, true);

    await commonElements.closeReloadModal();

    await commonElements.goToPeople();
    await contactPage.selectLHSRowByText(placeBobClinic.name);

    expect(await contactPage.cardFieldLabelText('uhc_stats_count')).to.equal('uhc_stats_count');
    expect(await contactPage.cardFieldText('uhc_stats_count')).to.equal('1');

    expect(await contactPage.cardFieldLabelText('uhc_stats_count_goal')).to.equal('uhc_stats_count_goal');
    expect(await contactPage.cardFieldText('uhc_stats_count_goal')).to.equal('2');

    expect(await contactPage.cardFieldLabelText('uhc_stats_last_visited_date')).to.equal('uhc_stats_last_visited_date');
    expect(await contactPage.cardFieldText('uhc_stats_last_visited_date'))
      .to.equal(carolVisit.reported_date.toString());

    expect(await contactPage.cardFieldLabelText('uhc_stats_interval_start')).to.equal('uhc_stats_interval_start');
    const startDate = moment().startOf('month').valueOf().toString();
    expect(await contactPage.cardFieldText('uhc_stats_interval_start')).to.equal(startDate);

    expect(await contactPage.cardFieldLabelText('uhc_stats_interval_end')).to.equal('uhc_stats_interval_end');
    const endDate = moment().endOf('month').valueOf().toString();
    expect(await contactPage.cardFieldText('uhc_stats_interval_end')).to.equal(endDate);
  });

  it('should have access to the "cht" global api variable', async () => {
    await loginPage.login({ username: districtAdminUser.username, password: districtAdminUser.password });
    await commonElements.waitForPageLoaded();
    await commonElements.closeTour();
    const originalSettings = await utils.getSettings();
    const permissions = originalSettings.permissions;
    permissions.can_configure = districtAdminUser.roles;
    permissions.can_edit = districtAdminUser.roles;
    await utils.updateSettings({ ...settings, permissions }, true);

    await commonElements.closeReloadModal();

    await commonElements.goToPeople();
    await contactPage.selectLHSRowByText(placeBobClinic.name);
    await contactPage.waitForContactLoaded();
    expect(await contactPage.cardFieldLabelText('can_configure')).to.equal('can_configure');
    expect(await contactPage.cardFieldText('can_configure')).to.equal('true');
    expect(await contactPage.cardFieldLabelText('can_edit_or_can_create_people'))
      .to.equal('can_edit_or_can_create_people');
    expect(await contactPage.cardFieldText('can_edit_or_can_create_people')).to.equal('true');
  });
});
