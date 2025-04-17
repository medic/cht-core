const utils = require('@utils');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');

describe('DB Object Widget', () => {
  const places = placeFactory.generateHierarchy();
  const districtHospital = places.get('district_hospital');
  const area1 = places.get('health_center');
  const area2 = placeFactory.place().build({
    _id: 'area2',
    name: 'area 2',
    type: 'health_center',
    parent: { _id: districtHospital._id }
  });

  const offlineUser = userFactory.build({ place: districtHospital._id, roles: [ 'chw' ] });
  offlineUser.contact.sex = 'female';
  const personArea1 = personFactory.build({ parent: { _id: area1._id, parent: area1.parent } });
  const personArea2 = personFactory.build({ name: 'Patricio', parent: { _id: area2._id, parent: area2.parent } });

  before(async () => {
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/db-object-form`));
    await utils.saveDocs([ ...places.values(), area2, personArea1, personArea2 ]);
    await utils.createUsers([ offlineUser ]);
    await loginPage.login(offlineUser);
  });

  after(async () => {
    await utils.deleteUsers([ offlineUser ]);
    await utils.deleteDocs(['form:db-object-form']);
    await utils.revertDb([/^form:/], true);
  });

  it('should load contacts in non-relevant inputs group and from calculations', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport('db-object-form', false);

    await genericForm.submitForm();

    const reportId = await reportsPage.getCurrentReportId();
    await commonPage.sync();
    const { fields } = await utils.getDoc(reportId);
    expect(fields).excluding(['meta']).to.deep.equal({
      inputs: {
        meta: { location: { lat: '', long: '', error: '', message: '' } },
        user: {
          contact_id: offlineUser.contact._id,
          name: offlineUser.contact.name,
          sex: offlineUser.contact.sex
        },
        user_contact: {
          _id: offlineUser.contact._id,
          name: offlineUser.contact.name,
          sex: offlineUser.contact.sex
        },
      },
      people: {
        user_contact: {
          _id: offlineUser.contact._id,
          name: offlineUser.contact.name,
          sex: offlineUser.contact.sex
        },
        person_test_same_parent: '',
        person_test_all: ''
      },
    });
  });

  it('should display only the contacts from the parent contact', async () => {
    await commonPage.goToPeople(area1._id);
    await commonPage.openFastActionReport('db-object-form');

    const sameParent = await genericForm.getDBObjectWidgetValues('/db-object-form/people/person_test_same_parent');
    await sameParent[0].click();
    expect(sameParent.length).to.equal(1);
    expect(sameParent[0].name).to.equal(personArea1.name);

    const allContacts = await genericForm.getDBObjectWidgetValues('/db-object-form/people/person_test_all');
    await allContacts[2].click();
    expect(allContacts.length).to.equal(3);
    expect(allContacts[0].name).to.equal(personArea1.name);
    expect(allContacts[1].name).to.equal(offlineUser.contact.name);
    expect(allContacts[2].name).to.equal(personArea2.name);

    await genericForm.submitForm();
    await commonPage.goToReports();

    const firstReport = await reportsPage.getListReportInfo(await reportsPage.leftPanelSelectors.firstReport());
    expect(firstReport.heading).to.equal(offlineUser.contact.name);
    expect(firstReport.form).to.equal('db-object-form');

    await reportsPage.openReport(firstReport.dataId);
    expect((await reportsPage.getDetailReportRowContent('report.db-object-form.people.person_test_same_parent'))
      .rowValues[0]).to.equal(personArea1._id);
    expect((await reportsPage.getDetailReportRowContent('report.db-object-form.people.person_test_all'))
      .rowValues[0]).to.equal(personArea2._id);
  });

});
