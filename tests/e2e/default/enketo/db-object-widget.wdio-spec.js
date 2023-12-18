const fs = require('fs');

const utils = require('@utils');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');

describe('DB Object Widget', () => {
  const formId = 'db-object-widget';
  const form = fs.readFileSync(`${__dirname}/forms/${formId}.xml`, 'utf8');
  const formDocument = {
    _id: `form:${formId}`,
    internalId: formId,
    title: `Form ${formId}`,
    type: 'form',
    context: { person: true, place: true },
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(form).toString('base64')
      }
    }
  };

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
  const personArea1 = personFactory.build({ parent: { _id: area1._id, parent: area1.parent } });
  const personArea2 = personFactory.build({ name: 'Patricio', parent: { _id: area2._id, parent: area2.parent } });

  before(async () => {
    await utils.saveDocs([ ...places.values(), area2, personArea1, personArea2, formDocument ]);
    await utils.createUsers([ offlineUser ]);
    await loginPage.login(offlineUser);
  });

  it('should display only the contacts from the parent contact', async () => {
    await commonPage.goToPeople(area1._id);
    await commonPage.openFastActionReport(formId);

    const sameParent = await genericForm.getDBObjectWidgetValues('/db_object_form/people/person_test_same_parent');
    expect(sameParent.length).to.equal(1);
    expect(sameParent[0].name).to.equal('Mary Smith');
    await sameParent[0].click();

    const allContacts = await genericForm.getDBObjectWidgetValues('/db_object_form/people/person_test_all');
    expect(allContacts.length).to.equal(3);
    expect(allContacts[0].name).to.equal('Mary Smith');
    expect(allContacts[1].name).to.equal('OfflineUser');
    expect(allContacts[2].name).to.equal('Patricio');
    await allContacts[1].click();

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await commonPage.goToReports();

    const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());

    expect(firstReport.heading).to.equal('OfflineUser');
    expect(firstReport.form).to.equal('Form db-object-widget');
  });

});
