const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const deathReportForm = require('@page-objects/default/enketo/death-report.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('Mute/Unmute contacts using a specific form - ', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');

  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const person = personFactory.build({ parent: {_id: healthCenter._id, parent: healthCenter.parent} });
  const mutePerson = personFactory.build({
    patient_id: 12345,
    name: 'mutedPerson',
    muted: new Date(),
    parent: {_id: healthCenter._id, parent: healthCenter.parent}
  });

  const settings_mute = {
    transitions: {
      death_reporting: true,
      muting: true
    },
    muting: {
      mute_forms: ['death_report'],
      unmute_forms: ['undo_death_report']
    }
  };

  before(async () => {
    await utils.saveDocs([...places.values(), person, mutePerson]);
    await utils.updateSettings(settings_mute, true);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });

  it('should mute a contact using the defined mute_forms (death_report).', async () => {
    await commonPage.goToPeople(person._id);
    await commonPage.openFastActionReport('death_report');
    await deathReportForm.submitDeathReport();
    await commonPage.waitForPageLoaded();
    await commonPage.sync();

    expect(await (await contactPage.contactCardSelectors.contactMuted()).isDisplayed()).to.be.true;
  });

  it('should unmute a contact using the defined unmute_forms (undo_death_report).', async () => {
    await commonPage.goToPeople(person._id);
    await commonPage.openFastActionReport('undo_death_report');
    await commonEnketoPage.selectRadioButton(
      'Submitting this form will undo the death report of ' +
      person.name +
      '. Are you sure you want to undo the death report?',
      'Yes'
    );
    await genericForm.submitForm();
    await commonPage.sync();

    expect(await (await contactPage.contactCardSelectors.contactMuted()).isDisplayed()).to.be.false;
  });

  it('should show a popup when trying to submit a non-unmuting form against a muted contact', async () => {
    await utils.revertSettings(true);
    await commonPage.sync(true);
    await commonPage.goToPeople(mutePerson._id);

    const modalDetails = await contactPage.openFormWithWarning('death_report');
    expect(modalDetails.header).to.contain('Muted contact');

    await modalPage.cancel();
  });

});
