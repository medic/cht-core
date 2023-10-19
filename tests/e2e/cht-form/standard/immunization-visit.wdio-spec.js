const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const immVisitForm = require('@page-objects/standard/enketo/immunization-visit.wdio.page');

describe('cht-form web component - Immunization Visit Form', () => {

  it('should submit an immunization visit', async () => {
    await mockConfig.startMockApp('standard', 'app', 'immunization_visit');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = {
        contact: {
          _id: '12345',
          patient_id: '98765',
          name: 'Cleo',
          parent: { contact: { phone: '+50689252525', name: 'Luna' } }
        }
      };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Immunization Visit');

    let countAppliedVaccines = 0;
    const note = 'Test notes - immunization visit';
    const followUpSms = 'Nice work, Luna! Cleo (98765) attended their immunizations visit at the health facility. ' +
      `Keep up the good work. Thank you! ${note}`;

    await immVisitForm.selectAllVaccines();
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.BCG_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.CHOLERA_VACCINE, 'CH');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.HEPATITIS_A_VACCINE, 'HA');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.HEPATITIS_B_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.HPV_VACCINE, 'HPV');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.FLU_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.JAP_ENCEPHALITIS_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.MENINGOCOCCAL_VACCINE, 'MN');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.MMR_VACCINE, 'MMR');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.MMRV_VACCINE, 'MMRV');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.POLIO_VACCINE, 'PV');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.PENTAVALENT_VACCINE, 'DT');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.DPT_BOOSTER_VACCINE, 'DPT');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.PNEUMOCOCCAL_VACCINE, 'PCV');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.ROTAVIRUS_VACCINE, 'RV');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.TYPHOID_VACCINE, 'TY');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.VITAMIN_A_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.YELLOW_FEVER_VACCINE, 'yes');
    await genericForm.nextPage();
    await immVisitForm.addNotes(note);
    await genericForm.nextPage();

    const summaryDetails = await immVisitForm.getSummaryDetails();
    expect(summaryDetails.patientName).to.equal('Cleo');
    expect(summaryDetails.patientId).to.equal('98765');
    expect(summaryDetails.appliedVaccines).to.equal(countAppliedVaccines);
    expect(summaryDetails.followUpSmsNote1).to.include('The following will be sent as a SMS to Luna +50689252525');
    expect(summaryDetails.followUpSmsNote2).to.include(followUpSms);

    const data = await mockConfig.submitForm();
    const jsonObj = data[0].fields;

    expect(jsonObj.chw_sms).to.equal(followUpSms);
    expect(jsonObj.visit_confirmed).to.equal('yes');
    expect(jsonObj.vaccines_received.received_bcg).to.equal('yes');
    expect(jsonObj.vaccines_received.received_cholera_1).to.equal('yes');
    expect(jsonObj.vaccines_received.received_cholera_2).to.equal('yes');
    expect(jsonObj.vaccines_received.received_cholera_3).to.equal('yes');
    expect(jsonObj.vaccines_received.received_hep_a_1).to.equal('yes');
    expect(jsonObj.vaccines_received.received_hep_a_2).to.equal('yes');
    expect(jsonObj.vaccines_received.received_hep_b).to.equal('yes');
    expect(jsonObj.vaccines_received.received_hpv_1).to.equal('yes');
    expect(jsonObj.vaccines_received.received_hpv_2).to.equal('yes');
    expect(jsonObj.vaccines_received.received_hpv_3).to.equal('yes');
    expect(jsonObj.vaccines_received.received_flu).to.equal('yes');
    expect(jsonObj.vaccines_received.received_jap_enc).to.equal('yes');
    expect(jsonObj.vaccines_received.received_meningococcal_1).to.equal('yes');
    expect(jsonObj.vaccines_received.received_meningococcal_2).to.equal('yes');
    expect(jsonObj.vaccines_received.received_meningococcal_3).to.equal('yes');
    expect(jsonObj.vaccines_received.received_meningococcal_4).to.equal('yes');
    expect(jsonObj.vaccines_received.received_mmr_1).to.equal('yes');
    expect(jsonObj.vaccines_received.received_mmr_2).to.equal('yes');
    expect(jsonObj.vaccines_received.received_mmrv_1).to.equal('yes');
    expect(jsonObj.vaccines_received.received_mmrv_2).to.equal('yes');
    expect(jsonObj.vaccines_received.received_polio_0).to.equal('yes');
    expect(jsonObj.vaccines_received.received_polio_1).to.equal('yes');
    expect(jsonObj.vaccines_received.received_polio_2).to.equal('yes');
    expect(jsonObj.vaccines_received.received_polio_3).to.equal('yes');
    expect(jsonObj.vaccines_received.received_ipv_1).to.equal('yes');
    expect(jsonObj.vaccines_received.received_ipv_2).to.equal('yes');
    expect(jsonObj.vaccines_received.received_ipv_3).to.equal('yes');
    expect(jsonObj.vaccines_received.received_fipv_1).to.equal('yes');
    expect(jsonObj.vaccines_received.received_fipv_2).to.equal('yes');
    expect(jsonObj.vaccines_received.received_penta_1).to.equal('yes');
    expect(jsonObj.vaccines_received.received_penta_2).to.equal('yes');
    expect(jsonObj.vaccines_received.received_penta_3).to.equal('yes');
    expect(jsonObj.vaccines_received.received_dpt_4).to.equal('yes');
    expect(jsonObj.vaccines_received.received_dpt_5).to.equal('yes');
    expect(jsonObj.vaccines_received.received_pneumococcal_1).to.equal('yes');
    expect(jsonObj.vaccines_received.received_pneumococcal_2).to.equal('yes');
    expect(jsonObj.vaccines_received.received_pneumococcal_3).to.equal('yes');
    expect(jsonObj.vaccines_received.received_pneumococcal_4).to.equal('yes');
    expect(jsonObj.vaccines_received.received_rotavirus_1).to.equal('yes');
    expect(jsonObj.vaccines_received.received_rotavirus_2).to.equal('yes');
    expect(jsonObj.vaccines_received.received_rotavirus_3).to.equal('yes');
    expect(jsonObj.vaccines_received.received_typhoid_1).to.equal('yes');
    expect(jsonObj.vaccines_received.received_typhoid_2).to.equal('yes');
    expect(jsonObj.vaccines_received.received_vitamin_a).to.equal('yes');
    expect(jsonObj.vaccines_received.received_yellow_fever).to.equal('yes');
  });

});
