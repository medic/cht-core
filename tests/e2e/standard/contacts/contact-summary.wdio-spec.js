const moment = require('moment');
const utils = require('../../../utils');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const contactPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const reportFactory = require('../../../factories/cht/reports/generic-report');


const validateCardField = async (label, value) => {
  expect((await contactPage.getCardFieldInfo(label)).label).to.equal(label);
  expect((await contactPage.getCardFieldInfo(label)).value).to.equal(value);
};

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
  const districtAdminUser = userFactory.build(
    {
      username: 'user-district', place: placeBobClinic._id,
      contact: {
        _id: 'fixture:user-district:offline',
        name: 'user-district',
      },
      roles: ['district_admin'],
      known: false,
    });
  const patientAlice = personFactory.build({ name: 'Alice Alison', phone: '+447765902001' });
  const patientDavid = personFactory.build({ name: 'David Davidson', phone: '+447765902002', parent: placeBobClinic });
  const davidVisit = reportFactory.build(
    { form: 'visit' },
    { patient: patientDavid, submitter: districtAdminUser.contact },
  );
  const patientCarol = personFactory.build({
    name: 'Carol Carolina', sex: 'f', parent: placeBobClinic, patient_id: '05946',
    linked_docs: {
      aliceTag: patientAlice._id,
      davidTag: { _id: patientDavid._id },
      visitTag: { _id: davidVisit._id },
    },
  });
  const carolPregnancy = reportFactory.build(
    { form: 'P' },
    { patient: patientCarol, submitter: districtAdminUser.contact },
  );
  const carolVisit = reportFactory.build(
    { form: 'V' },
    {
      patient: patientCarol,
      submitter: districtAdminUser.contact,
      reported_date: moment().set('date', 5).valueOf(),
      fields: {
        visited_contact_uuid: placeBobClinic._id,
        patient_id: patientCarol.patient_id,
      },
    },
  );

  const docs = [ patientAlice, placeBobClinic, patientCarol, patientDavid, carolPregnancy, davidVisit, carolVisit ];

  const settings = {
    uhc: {
      visit_count: {
        month_start_date: 1,
        visit_count_goal: 2,
      },
    },
    contact_summary: SCRIPT,
    contact_types: [
      {
        id: 'clinic',
        count_visits: true,
      },
      {
        id: 'person',
        count_visits: false,
      },
    ]
  };

  before(async () => {
    await utils.saveDocs(docs);
    await utils.createUsers([ districtAdminUser ]);
  });

  afterEach(async () => {
    await utils.revertSettings(true);
    await commonElements.closeReloadModal();
    await commonElements.logout();
  });

  after(async () => {
    await utils.deleteUsers([ districtAdminUser ]);
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
    validateCardField('test_pid', patientCarol.patient_id);
    validateCardField('test_sex', patientCarol.sex);
    validateCardField('uhc_stats_count', '');
    validateCardField('uhc_stats_count_goal', '');
    validateCardField('uhc_stats_last_visited_date', '');
    const startDate = moment().startOf('month').valueOf().toString();
    validateCardField('uhc_stats_interval_start', startDate);
    const endDate = moment().endOf('month').valueOf().toString();
    validateCardField('uhc_stats_interval_end', endDate);
    validateCardField('alicetag', `${patientAlice.name} ${patientAlice.phone}`);
    validateCardField('davidtag', `${patientDavid.name} ${patientDavid.phone}`);
    validateCardField('visittag', davidVisit.form);

    // assert that the pregnancy card exists and has the right fields.
    expect(await contactPage.getPregnancyLabel()).to.equal('test.pregnancy');
    expect(await contactPage.getVisitLabel()).to.equal('test.visits');
    expect(await contactPage.getNumberOfReports()).to.equal('1');
  });

  it('should display UHC Stats in contact summary, if contact counts visits and user has permission', async () => {
    await loginPage.login({ username: districtAdminUser.username, password: districtAdminUser.password });
    await commonElements.waitForPageLoaded();
    await commonElements.closeTour();
    const originalSettings = await utils.getSettings();
    const permissions = originalSettings.permissions;
    permissions.can_view_uhc_stats = districtAdminUser.roles;
    await utils.updateSettings({ ...settings, permissions }, true);

    await commonElements.closeReloadModal();

    await commonElements.goToPeople();
    await contactPage.selectLHSRowByText(placeBobClinic.name);

    validateCardField('uhc_stats_count', '1');
    validateCardField('uhc_stats_count_goal', '2');
    validateCardField('uhc_stats_last_visited_date', carolVisit.reported_date.toString());
    const startDate = moment().startOf('month').valueOf().toString();
    validateCardField('uhc_stats_interval_start', startDate);
    const endDate = moment().endOf('month').valueOf().toString();
    validateCardField('uhc_stats_interval_end', endDate);
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
    validateCardField('can_configure', 'true');
    validateCardField('can_edit_or_can_create_people', 'true');
  });
});
