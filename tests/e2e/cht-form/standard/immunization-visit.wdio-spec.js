const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
//const immVisitForm = require('@page-objects/standard/enketo/immunization-visit.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Immunization Visit Form', () => {

  it('should submit an immunization visit', async () => {
    await mockConfig.loadForm('standard', 'app', 'immunization_visit');

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

    const note = 'Test notes - immunization visit';
    const followUpSms = 'Nice work, Luna! Cleo (98765) attended their immunizations visit at the health facility. ' +
      `Keep up the good work. Thank you! ${note}`;
    const allVaccines = ['BCG', 'Cholera', 'Hepatitis A', 'Hepatitis B', 'HPV (Human Papillomavirus)', 'Influenza',
      'Japanese Encephalitis', 'Meningococcal', 'MMR (Measles, Mumps, Rubella)',
      'MMRV (Measles, Mumps, Rubella, Varicella)', 'Polio', 'Pentavalent', 'Pneumococcal Pneumonia',
      'Rotavirus', 'Typhoid', 'Vitamin A', 'Yellow Fever', 'DPT Booster'];

    for (const vaccine of allVaccines) {
      await commonEnketoPage.selectCheckBox(vaccine);
    }
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Did Cleo receive the BCG vaccine?', 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('Cholera 1');
    await commonEnketoPage.selectCheckBox('Cholera 2');
    await commonEnketoPage.selectCheckBox('Cholera 3');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('Hepatitis A 1');
    await commonEnketoPage.selectCheckBox('Hepatitis A 2');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Did Cleo receive Hepatitis B vaccine?', 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('HPV 1');
    await commonEnketoPage.selectCheckBox('HPV 2');
    await commonEnketoPage.selectCheckBox('HPV 3');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Did Cleo receive the flu vaccine?', 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Did Cleo receive the Japanese Encephalitis vaccine?', 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('Meningococcal 1');
    await commonEnketoPage.selectCheckBox('Meningococcal 2');
    await commonEnketoPage.selectCheckBox('Meningococcal 3');
    await commonEnketoPage.selectCheckBox('Meningococcal 4');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('MMR 1');
    await commonEnketoPage.selectCheckBox('MMR 2');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('MMRV 1');
    await commonEnketoPage.selectCheckBox('MMRV 2');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('Birth Polio');
    await commonEnketoPage.selectCheckBox('Oral Polio 1');
    await commonEnketoPage.selectCheckBox('Oral Polio 2');
    await commonEnketoPage.selectCheckBox('Oral Polio 3');
    await commonEnketoPage.selectCheckBox('Inactivated Polio 1');
    await commonEnketoPage.selectCheckBox('Inactivated Polio 2');
    await commonEnketoPage.selectCheckBox('Inactivated Polio 3');
    await commonEnketoPage.selectCheckBox('Fractional IPV 1');
    await commonEnketoPage.selectCheckBox('Fractional IPV 2');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('Pentavalent 1');
    await commonEnketoPage.selectCheckBox('Pentavalent 2');
    await commonEnketoPage.selectCheckBox('Pentavalent 3');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('DPT Booster 1');
    await commonEnketoPage.selectCheckBox('DPT Booster 2');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('Pneumococcal 1');
    await commonEnketoPage.selectCheckBox('Pneumococcal 2');
    await commonEnketoPage.selectCheckBox('Pneumococcal 3');
    await commonEnketoPage.selectCheckBox('Pneumococcal 4');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('Rotavirus 1');
    await commonEnketoPage.selectCheckBox('Rotavirus 2');
    await commonEnketoPage.selectCheckBox('Rotavirus 3');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('Typhoid 1');
    await commonEnketoPage.selectCheckBox('Typhoid 2');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Did Cleo receive a Vitamin A vaccine?', 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Did Cleo receive the Yellow Fever vaccine?', 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.setTextareaValue('You can add a personal note to the SMS here:', note);
    await genericForm.nextPage();

    const summaryTexts = [
      'Cleo', //patient name
      '98765', //patient id
      'BCG',
      'Cholera 1', 'Cholera 2', 'Cholera 3',
      'Hepatitis A 1', 'Hepatitis A 2',
      'Hepatitis B',
      'HPV 1', 'HPV 2', 'HPV 3',
      'Flu',
      'Japanese Encephalitis',
      'Meningococcal 1', 'Meningococcal 2', 'Meningococcal 3', 'Meningococcal 4',
      'MMR 1', 'MMR 2',
      'MMRV 1', 'MMRV 2',
      'Birth Polio',
      'Oral Polio 1', 'Oral Polio 2', 'Oral Polio 3',
      'Inactivated Polio 1', 'Inactivated Polio 2', 'Inactivated Polio 3',
      'Fractional Inactivated Polio 1', 'Fractional Inactivated Polio 2',
      'Pentavalent 1', 'Pentavalent 2', 'Pentavalent 3',
      'DPT Booster 1', 'DPT Booster 2',
      'Pneumococcal 1', 'Pneumococcal 2', 'Pneumococcal 3', 'Pneumococcal 4',
      'Rotavirus 1', 'Rotavirus 2', 'Rotavirus 3',
      'Typhoid 1', 'Typhoid 2',
      'Vitamin A',
      'Yellow Fever'
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    expect(await commonEnketoPage.isElementDisplayed('label',
      'The following will be sent as a SMS to Luna +50689252525')).to.be.true;
    expect(await commonEnketoPage.isElementDisplayed('label', followUpSms)).to.be.true;

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
