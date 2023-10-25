const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyFacilityVisitReminderPage = require(
  '@page-objects/default/enketo/pregnancy-facility-visit-reminder.wdio.page'
);

describe('cht-form web component - Pregnancy Facility Visit Reminder Form', () => {

  it('should submit a pregnancy facility visit reminder form', async () => {
    await mockConfig.startMockApp('default', 'app', 'pregnancy_facility_visit_reminder');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.contactSummary = { pregnancy_uuid: 'pregnancy test UUID' };
      myForm.content = {
        contact: { _id: '12345', patient_id: '79376', name: 'Pregnant Woman'},
        source_visit_date: '2023-07-25'
      };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Health facility ANC reminder');

    const { visitDate} = await pregnancyFacilityVisitReminderPage.getAncReminderInfo();
    expect(Date.parse(visitDate)).to.equal(Date.parse('25 Jul, 2023'));
    await pregnancyFacilityVisitReminderPage.selectReminderMethod();

    const [doc, ...additionalDocs] = await mockConfig.submitForm();
    const jsonObj = doc.fields;

    expect(additionalDocs).to.be.empty;

    expect(jsonObj.patient_uuid).to.equal('12345');
    expect(jsonObj.patient_id).to.equal('79376');
    expect(jsonObj.patient_name).to.equal('Pregnant Woman');
    expect(jsonObj.pregnancy_uuid_ctx).to.equal('pregnancy test UUID');
    expect(jsonObj.visit_date_for_task).to.equal('25 Jul, 2023');
    expect(jsonObj.facility_visit_reminder.remind_method).to.equal('in_person');
  });

});
