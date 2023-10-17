/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="death_confirmation">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Death Confirmation</h3>
<select id="form-languages" data-default-lang=""><option value="en">en</option> <option value="es">es</option> <option value="fr">fr</option> <option value="hi">hi</option> <option value="id">id</option> <option value="ne">ne</option> </select>
  
  
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/death_confirmation/inputs" data-relevant="./source = 'user'"><h4>
<span lang="en" class="question-label active" data-itext-id="/death_confirmation/inputs:label">Patient</span><span lang="es" class="question-label " data-itext-id="/death_confirmation/inputs:label">-</span><span lang="fr" class="question-label " data-itext-id="/death_confirmation/inputs:label">Patient</span><span lang="hi" class="question-label " data-itext-id="/death_confirmation/inputs:label">मरीज</span><span lang="id" class="question-label " data-itext-id="/death_confirmation/inputs:label">Pasien</span><span lang="ne" class="question-label " data-itext-id="/death_confirmation/inputs:label">-</span>
</h4>
<label class="question non-select or-appearance-hidden "><input type="text" name="/death_confirmation/inputs/source" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/death_confirmation/inputs/source_id" data-type-xml="string"></label><section class="or-group-data " name="/death_confirmation/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/death_confirmation/inputs/contact/_id:label">What is the patient's name?</span><span lang="es" class="question-label " data-itext-id="/death_confirmation/inputs/contact/_id:label">-</span><span lang="fr" class="question-label " data-itext-id="/death_confirmation/inputs/contact/_id:label">Quel est l'identifiant du patient?</span><span lang="hi" class="question-label " data-itext-id="/death_confirmation/inputs/contact/_id:label">मरीज का नाम क्या है?</span><span lang="id" class="question-label " data-itext-id="/death_confirmation/inputs/contact/_id:label">Apa nama pasien?</span><span lang="ne" class="question-label " data-itext-id="/death_confirmation/inputs/contact/_id:label">-</span><span lang="" class="or-hint active">Select a person from list</span><input type="text" name="/death_confirmation/inputs/contact/_id" data-type-xml="person"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/death_confirmation/inputs/contact/name" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/death_confirmation/inputs/contact/patient_id" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/death_confirmation/inputs/contact/date_of_birth" data-type-xml="string"></label><section class="or-group-data " name="/death_confirmation/inputs/contact/parent"><section class="or-group-data " name="/death_confirmation/inputs/contact/parent/contact"><label class="question non-select or-appearance-hidden "><input type="text" name="/death_confirmation/inputs/contact/parent/contact/phone" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/death_confirmation/inputs/contact/parent/contact/name" data-type-xml="string"></label>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group-data or-appearance-field-list " name="/death_confirmation/death_report"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/death_confirmation/death_report/n_1:label">Death report for <span class="or-output" data-value=" /death_confirmation/child_name "> </span> has been submitted.</span><span lang="es" class="question-label " data-itext-id="/death_confirmation/death_report/n_1:label">Se ha enviado el informe de fallecimiento de <span class="or-output" data-value=" /death_confirmation/child_name "> </span>.</span><span lang="fr" class="question-label " data-itext-id="/death_confirmation/death_report/n_1:label">Le rapport de décès pour <span class="or-output" data-value=" /death_confirmation/child_name "> </span> a été soumis.</span><span lang="hi" class="question-label " data-itext-id="/death_confirmation/death_report/n_1:label"><span class="or-output" data-value=" /death_confirmation/child_name "> </span> के लिए मौत की रिपोर्ट प्रस्तुत की गई है।</span><span lang="id" class="question-label " data-itext-id="/death_confirmation/death_report/n_1:label">Laporan kematian untuk <span class="or-output" data-value=" /death_confirmation/child_name "> </span> telah dikirimkan.</span><span lang="ne" class="question-label " data-itext-id="/death_confirmation/death_report/n_1:label"><span class="or-output" data-value=" /death_confirmation/child_name "> </span> का लागि मृत्यु रिपोर्ट पेश गरिएको छ।</span><input type="text" name="/death_confirmation/death_report/n_1" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/death_confirmation/death_report/n_2:label"><a href="#" target="_blank" rel="noopener" class="dynamic-url">Please follow up with <span class="or-output" data-value=" /death_confirmation/chw_name "> </span> to see if <span class="or-output" data-value=" /death_confirmation/child_name "> </span> died.<br>Click here to call: <span class="or-output" data-value=" /death_confirmation/chw_phone "> </span><span class="url hidden">tel:<span class="or-output" data-value=" /death_confirmation/chw_phone "> </span></span></a></span><span lang="es" class="question-label " data-itext-id="/death_confirmation/death_report/n_2:label"><a href="#" target="_blank" rel="noopener" class="dynamic-url">Por favor haga un seguimiento con <span class="or-output" data-value=" /death_confirmation/chw_name "> </span> para ver si falleció <span class="or-output" data-value=" /death_confirmation/child_name "> </span>.<br>Haga clic aquí para llamar: <span class="or-output" data-value=" /death_confirmation/chw_phone "> </span><span class="url hidden">tel:<span class="or-output" data-value=" /death_confirmation/chw_phone "> </span></span></a></span><span lang="fr" class="question-label " data-itext-id="/death_confirmation/death_report/n_2:label"><a href="#" target="_blank" rel="noopener" class="dynamic-url">Veuillez faire un suivi avec <span class="or-output" data-value=" /death_confirmation/chw_name "> </span> pour voir si <span class="or-output" data-value=" /death_confirmation/child_name "> </span> est décédé.<br>Cliquez ici pour appeler: <span class="or-output" data-value=" /death_confirmation/chw_phone "> </span><span class="url hidden">tel:<span class="or-output" data-value=" /death_confirmation/chw_phone "> </span></span></a></span><span lang="hi" class="question-label " data-itext-id="/death_confirmation/death_report/n_2:label"><a href="#" target="_blank" rel="noopener" class="dynamic-url">कृपया देखने के लिए <span class="or-output" data-value=" /death_confirmation/chw_name "> </span> के साथ पालन करें अगर <span class="or-output" data-value=" /death_confirmation/child_name "> </span> मर गया।<br>कॉल करने के लिए यहां क्लिक करें: <span class="or-output" data-value=" /death_confirmation/chw_phone "> </span><span class="url hidden">tel:<span class="or-output" data-value=" /death_confirmation/chw_phone "> </span></span></a></span><span lang="id" class="question-label " data-itext-id="/death_confirmation/death_report/n_2:label"><a href="#" target="_blank" rel="noopener" class="dynamic-url">Harap ikuti dengan <span class="or-output" data-value=" /death_confirmation/chw_name "> </span> untuk melihat apakah <span class="or-output" data-value=" /death_confirmation/child_name "> </span> meninggal.<br>Klik di sini untuk menelepon: <span class="or-output" data-value=" /death_confirmation/chw_phone "> </span><span class="url hidden">tel:<span class="or-output" data-value=" /death_confirmation/chw_phone "> </span></span></a></span><span lang="ne" class="question-label " data-itext-id="/death_confirmation/death_report/n_2:label"><a href="#" target="_blank" rel="noopener" class="dynamic-url">कृपया <span class="or-output" data-value=" /death_confirmation/child_name "> </span> को मृत्यु भएको हेर्न को लागी <span class="or-output" data-value=" /death_confirmation/chw_name "> </span> सँग पछ्याउनुहोस्।<br>कल गर्न यहाँ क्लिक गर्नुहोस्: <span class="or-output" data-value=" /death_confirmation/chw_phone "> </span><span class="url hidden">tel:<span class="or-output" data-value=" /death_confirmation/chw_phone "> </span></span></a></span><input type="text" name="/death_confirmation/death_report/n_2" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/death_confirmation/death_report/death:label">Did <span class="or-output" data-value=" /death_confirmation/child_name "> </span> die</span><span lang="es" class="question-label " data-itext-id="/death_confirmation/death_report/death:label">¿Murió <span class="or-output" data-value=" /death_confirmation/child_name "> </span></span><span lang="fr" class="question-label " data-itext-id="/death_confirmation/death_report/death:label">Est-ce que <span class="or-output" data-value=" /death_confirmation/child_name "> </span> est mort</span><span lang="hi" class="question-label " data-itext-id="/death_confirmation/death_report/death:label">क्या <span class="or-output" data-value=" /death_confirmation/child_name "> </span> मर गया</span><span lang="id" class="question-label " data-itext-id="/death_confirmation/death_report/death:label">Apakah <span class="or-output" data-value=" /death_confirmation/child_name "> </span> mati</span><span lang="ne" class="question-label " data-itext-id="/death_confirmation/death_report/death:label"><span class="or-output" data-value=" /death_confirmation/child_name "> </span> मर्नुभयो</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/death_confirmation/death_report/death" data-name="/death_confirmation/death_report/death" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/death_confirmation/death_report/death/yes:label">Yes</span><span lang="es" class="option-label " data-itext-id="/death_confirmation/death_report/death/yes:label">Sí</span><span lang="fr" class="option-label " data-itext-id="/death_confirmation/death_report/death/yes:label">Oui</span><span lang="hi" class="option-label " data-itext-id="/death_confirmation/death_report/death/yes:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/death_confirmation/death_report/death/yes:label">iya nih</span><span lang="ne" class="option-label " data-itext-id="/death_confirmation/death_report/death/yes:label">हो</span></label><label class=""><input type="radio" name="/death_confirmation/death_report/death" data-name="/death_confirmation/death_report/death" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/death_confirmation/death_report/death/no:label">No</span><span lang="es" class="option-label " data-itext-id="/death_confirmation/death_report/death/no:label">No</span><span lang="fr" class="option-label " data-itext-id="/death_confirmation/death_report/death/no:label">Non</span><span lang="hi" class="option-label " data-itext-id="/death_confirmation/death_report/death/no:label">नहीं</span><span lang="id" class="option-label " data-itext-id="/death_confirmation/death_report/death/no:label">Tidak</span><span lang="ne" class="option-label " data-itext-id="/death_confirmation/death_report/death/no:label">होइन</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/death_confirmation/death_report/date_of_death:label">Date of death</span><span lang="es" class="question-label " data-itext-id="/death_confirmation/death_report/date_of_death:label">Fecha de muerte</span><span lang="fr" class="question-label " data-itext-id="/death_confirmation/death_report/date_of_death:label">Date de décès</span><span lang="hi" class="question-label " data-itext-id="/death_confirmation/death_report/date_of_death:label">मृत्यु तिथि</span><span lang="id" class="question-label " data-itext-id="/death_confirmation/death_report/date_of_death:label">Tanggal kematian</span><span lang="ne" class="question-label " data-itext-id="/death_confirmation/death_report/date_of_death:label">मृत्युको मिति</span><span class="required">*</span><input type="date" name="/death_confirmation/death_report/date_of_death" data-required="true()" data-constraint=". &lt;= now()" data-relevant=" /death_confirmation/death_report/death  = 'yes'" data-type-xml="date"><span class="or-constraint-msg active" lang="" data-i18n="constraint.invalid">Value not allowed</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/death_confirmation/death_report/place:label">Place of death</span><span lang="es" class="question-label " data-itext-id="/death_confirmation/death_report/place:label">Lugar de la muerte</span><span lang="fr" class="question-label " data-itext-id="/death_confirmation/death_report/place:label">Lieu du décès</span><span lang="hi" class="question-label " data-itext-id="/death_confirmation/death_report/place:label">मौत की जगह</span><span lang="id" class="question-label " data-itext-id="/death_confirmation/death_report/place:label">Tempat meninggal</span><span lang="ne" class="question-label " data-itext-id="/death_confirmation/death_report/place:label">मृत्युको स्थान</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/death_confirmation/death_report/place" data-name="/death_confirmation/death_report/place" value="home" data-required="true()" data-relevant=" /death_confirmation/death_report/death  = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/death_confirmation/death_report/place/home:label">Home</span><span lang="es" class="option-label " data-itext-id="/death_confirmation/death_report/place/home:label">casa</span><span lang="fr" class="option-label " data-itext-id="/death_confirmation/death_report/place/home:label">maison</span><span lang="hi" class="option-label " data-itext-id="/death_confirmation/death_report/place/home:label">होम</span><span lang="id" class="option-label " data-itext-id="/death_confirmation/death_report/place/home:label">rumah</span><span lang="ne" class="option-label " data-itext-id="/death_confirmation/death_report/place/home:label">घर</span></label><label class=""><input type="radio" name="/death_confirmation/death_report/place" data-name="/death_confirmation/death_report/place" value="facility" data-required="true()" data-relevant=" /death_confirmation/death_report/death  = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/death_confirmation/death_report/place/facility:label">Health facility</span><span lang="es" class="option-label " data-itext-id="/death_confirmation/death_report/place/facility:label">Facilidad de salud</span><span lang="fr" class="option-label " data-itext-id="/death_confirmation/death_report/place/facility:label">Établissement de santé</span><span lang="hi" class="option-label " data-itext-id="/death_confirmation/death_report/place/facility:label">स्वास्थ्य सुविधा</span><span lang="id" class="option-label " data-itext-id="/death_confirmation/death_report/place/facility:label">Fasilitas kesehatan</span><span lang="ne" class="option-label " data-itext-id="/death_confirmation/death_report/place/facility:label">स्वास्थ्य सुविधा</span></label><label class=""><input type="radio" name="/death_confirmation/death_report/place" data-name="/death_confirmation/death_report/place" value="other" data-required="true()" data-relevant=" /death_confirmation/death_report/death  = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/death_confirmation/death_report/place/other:label">Other</span><span lang="es" class="option-label " data-itext-id="/death_confirmation/death_report/place/other:label">Otra</span><span lang="fr" class="option-label " data-itext-id="/death_confirmation/death_report/place/other:label">Autre</span><span lang="hi" class="option-label " data-itext-id="/death_confirmation/death_report/place/other:label">अन्य</span><span lang="id" class="option-label " data-itext-id="/death_confirmation/death_report/place/other:label">Lain</span><span lang="ne" class="option-label " data-itext-id="/death_confirmation/death_report/place/other:label">अन्य</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/death_confirmation/death_report/other_place:label">Specify other place of death</span><span lang="es" class="question-label " data-itext-id="/death_confirmation/death_report/other_place:label">Especificar otro lugar de muerte.</span><span lang="fr" class="question-label " data-itext-id="/death_confirmation/death_report/other_place:label">Précisez un autre lieu de décès</span><span lang="hi" class="question-label " data-itext-id="/death_confirmation/death_report/other_place:label">मृत्यु के अन्य स्थान निर्दिष्ट करें</span><span lang="id" class="question-label " data-itext-id="/death_confirmation/death_report/other_place:label">Tentukan tempat kematian lain</span><span lang="ne" class="question-label " data-itext-id="/death_confirmation/death_report/other_place:label">मृत्युको अन्य स्थान निर्दिष्ट गर्नुहोस्</span><span class="required">*</span><input type="text" name="/death_confirmation/death_report/other_place" data-required="true()" data-relevant=" /death_confirmation/death_report/place  = 'other'" data-type-xml="string"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/death_confirmation/death_report/n_3:label">Notify <span class="or-output" data-value=" /death_confirmation/chw_name "> </span> that <span class="or-output" data-value=" /death_confirmation/child_name "> </span> did not die and therefore schedules will continue as usual</span><span lang="es" class="question-label " data-itext-id="/death_confirmation/death_report/n_3:label">Notifique a <span class="or-output" data-value=" /death_confirmation/chw_name "> </span> que <span class="or-output" data-value=" /death_confirmation/child_name "> </span> no murió y, por lo tanto, los horarios continuarán como siempre</span><span lang="fr" class="question-label " data-itext-id="/death_confirmation/death_report/n_3:label">Notifier <span class="or-output" data-value=" /death_confirmation/chw_name "> </span> que <span class="or-output" data-value=" /death_confirmation/child_name "> </span> n'est pas mort et que les programmes continueront donc normalement</span><span lang="hi" class="question-label " data-itext-id="/death_confirmation/death_report/n_3:label"><span class="or-output" data-value=" /death_confirmation/chw_name "> </span> को सूचित करें कि <span class="or-output" data-value=" /death_confirmation/child_name "> </span> की मृत्यु नहीं हुई और इसलिए शेड्यूल हमेशा की तरह जारी रहेगा</span><span lang="id" class="question-label " data-itext-id="/death_confirmation/death_report/n_3:label">Beri tahu <span class="or-output" data-value=" /death_confirmation/chw_name "> </span> bahwa <span class="or-output" data-value=" /death_confirmation/child_name "> </span> tidak mati dan karenanya jadwal akan dilanjutkan seperti biasa</span><span lang="ne" class="question-label " data-itext-id="/death_confirmation/death_report/n_3:label"><span class="or-output" data-value=" /death_confirmation/chw_name "> </span> लाई सूचित गर्नुहोस् कि <span class="or-output" data-value=" /death_confirmation/child_name "> </span> लाई मर्न सकेन र त्यसैले कार्यक्रमहरू सामान्यको रूपमा जारी रहनेछ</span><input type="text" name="/death_confirmation/death_report/n_3" data-relevant=" /death_confirmation/death_report/death  = 'no'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/death_confirmation/death_report/n_4:label">Thank you for confirming death report for <span class="or-output" data-value=" /death_confirmation/child_name "> </span></span><span lang="es" class="question-label " data-itext-id="/death_confirmation/death_report/n_4:label">Gracias por confirmar el informe de fallecimiento de <span class="or-output" data-value=" /death_confirmation/child_name "> </span></span><span lang="fr" class="question-label " data-itext-id="/death_confirmation/death_report/n_4:label">Merci de confirmer le rapport de décès pour <span class="or-output" data-value=" /death_confirmation/child_name "> </span></span><span lang="hi" class="question-label " data-itext-id="/death_confirmation/death_report/n_4:label"><span class="or-output" data-value=" /death_confirmation/child_name "> </span> के लिए मौत की रिपोर्ट की पुष्टि करने के लिए धन्यवाद</span><span lang="id" class="question-label " data-itext-id="/death_confirmation/death_report/n_4:label">Terima kasih telah mengkonfirmasi laporan kematian sebesar <span class="or-output" data-value=" /death_confirmation/child_name "> </span></span><span lang="ne" class="question-label " data-itext-id="/death_confirmation/death_report/n_4:label"><span class="or-output" data-value=" /death_confirmation/child_name "> </span> को लागि मृत्यु रिपोर्ट को पुष्टि को लागि धन्यवाद</span><input type="text" name="/death_confirmation/death_report/n_4" data-relevant=" /death_confirmation/death_report/death  = 'yes'" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/death_confirmation/death_report/notes:label">Additional notes</span><span lang="es" class="question-label " data-itext-id="/death_confirmation/death_report/notes:label">Notas adicionales</span><span lang="fr" class="question-label " data-itext-id="/death_confirmation/death_report/notes:label">Notes complémentaires</span><span lang="hi" class="question-label " data-itext-id="/death_confirmation/death_report/notes:label">अतिरिक्त नोट्स</span><span lang="id" class="question-label " data-itext-id="/death_confirmation/death_report/notes:label">Catatan tambahan</span><span lang="ne" class="question-label " data-itext-id="/death_confirmation/death_report/notes:label">थप नोटहरू</span><input type="text" name="/death_confirmation/death_report/notes" data-type-xml="string"></label>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/death_confirmation/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_confirmation/child_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_confirmation/patient_id" data-constraint="regex(., '[0-9]{5,13}')" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_confirmation/chw_name" data-calculate="../inputs/contact/parent/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_confirmation/chw_phone" data-calculate="../inputs/contact/parent/contact/phone" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_confirmation/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <death_confirmation xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="death_confirmation" prefix="J1!death_confirmation!" version="2022-09-26 12-31">
          <inputs>
            <meta>
              <location>
                <lat/>
                <long/>
                <error/>
                <message/>
              </location>
            </meta>
            <source>user</source>
            <source_id/>
            <contact>
              <_id/>
              <name/>
              <patient_id/>
              <date_of_birth/>
              <parent>
                <contact>
                  <phone/>
                  <name/>
                </contact>
              </parent>
            </contact>
          </inputs>
          <patient_uuid/>
          <child_name/>
          <patient_id/>
          <chw_name/>
          <chw_phone/>
          <death_report>
            <n_1/>
            <n_2/>
            <death/>
            <date_of_death/>
            <place/>
            <other_place/>
            <n_3/>
            <n_4/>
            <notes/>
          </death_report>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </death_confirmation>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Death Confirmation</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/death_confirmation/death_report/date_of_death:label">
            <value>Date of death</value>
          </text>
          <text id="/death_confirmation/death_report/death/no:label">
            <value>No</value>
          </text>
          <text id="/death_confirmation/death_report/death/yes:label">
            <value>Yes</value>
          </text>
          <text id="/death_confirmation/death_report/death:label">
            <value>Did <output value=" /death_confirmation/child_name "/> die</value>
          </text>
          <text id="/death_confirmation/death_report/n_1:label">
            <value>Death report for <output value=" /death_confirmation/child_name "/> has been submitted.</value>
          </text>
          <text id="/death_confirmation/death_report/n_2:label">
            <value>[Please follow up with <output value=" /death_confirmation/chw_name "/> to see if <output value=" /death_confirmation/child_name "/> died.
Click here to call: <output value=" /death_confirmation/chw_phone "/>](tel:<output value=" /death_confirmation/chw_phone "/>)</value>
          </text>
          <text id="/death_confirmation/death_report/n_3:label">
            <value>Notify <output value=" /death_confirmation/chw_name "/> that <output value=" /death_confirmation/child_name "/> did not die and therefore schedules will continue as usual</value>
          </text>
          <text id="/death_confirmation/death_report/n_4:label">
            <value>Thank you for confirming death report for <output value=" /death_confirmation/child_name "/></value>
          </text>
          <text id="/death_confirmation/death_report/notes:label">
            <value>Additional notes</value>
          </text>
          <text id="/death_confirmation/death_report/other_place:label">
            <value>Specify other place of death</value>
          </text>
          <text id="/death_confirmation/death_report/place/facility:label">
            <value>Health facility</value>
          </text>
          <text id="/death_confirmation/death_report/place/home:label">
            <value>Home</value>
          </text>
          <text id="/death_confirmation/death_report/place/other:label">
            <value>Other</value>
          </text>
          <text id="/death_confirmation/death_report/place:label">
            <value>Place of death</value>
          </text>
          <text id="/death_confirmation/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/death_confirmation/inputs:label">
            <value>Patient</value>
          </text>
        </translation>
        <translation lang="es">
          <text id="/death_confirmation/death_report/date_of_death:label">
            <value>Fecha de muerte</value>
          </text>
          <text id="/death_confirmation/death_report/death/no:label">
            <value>No</value>
          </text>
          <text id="/death_confirmation/death_report/death/yes:label">
            <value>Sí</value>
          </text>
          <text id="/death_confirmation/death_report/death:label">
            <value>¿Murió <output value=" /death_confirmation/child_name "/></value>
          </text>
          <text id="/death_confirmation/death_report/n_1:label">
            <value>Se ha enviado el informe de fallecimiento de <output value=" /death_confirmation/child_name "/>.</value>
          </text>
          <text id="/death_confirmation/death_report/n_2:label">
            <value>[Por favor haga un seguimiento con <output value=" /death_confirmation/chw_name "/> para ver si falleció <output value=" /death_confirmation/child_name "/>.
Haga clic aquí para llamar: <output value=" /death_confirmation/chw_phone "/>](tel:<output value=" /death_confirmation/chw_phone "/>)</value>
          </text>
          <text id="/death_confirmation/death_report/n_3:label">
            <value>Notifique a <output value=" /death_confirmation/chw_name "/> que <output value=" /death_confirmation/child_name "/> no murió y, por lo tanto, los horarios continuarán como siempre</value>
          </text>
          <text id="/death_confirmation/death_report/n_4:label">
            <value>Gracias por confirmar el informe de fallecimiento de <output value=" /death_confirmation/child_name "/></value>
          </text>
          <text id="/death_confirmation/death_report/notes:label">
            <value>Notas adicionales</value>
          </text>
          <text id="/death_confirmation/death_report/other_place:label">
            <value>Especificar otro lugar de muerte.</value>
          </text>
          <text id="/death_confirmation/death_report/place/facility:label">
            <value>Facilidad de salud</value>
          </text>
          <text id="/death_confirmation/death_report/place/home:label">
            <value>casa</value>
          </text>
          <text id="/death_confirmation/death_report/place/other:label">
            <value>Otra</value>
          </text>
          <text id="/death_confirmation/death_report/place:label">
            <value>Lugar de la muerte</value>
          </text>
          <text id="/death_confirmation/death_report:label">
            <value>-</value>
          </text>
          <text id="/death_confirmation/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/death_confirmation/inputs:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="fr">
          <text id="/death_confirmation/death_report/date_of_death:label">
            <value>Date de décès</value>
          </text>
          <text id="/death_confirmation/death_report/death/no:label">
            <value>Non</value>
          </text>
          <text id="/death_confirmation/death_report/death/yes:label">
            <value>Oui</value>
          </text>
          <text id="/death_confirmation/death_report/death:label">
            <value>Est-ce que <output value=" /death_confirmation/child_name "/> est mort</value>
          </text>
          <text id="/death_confirmation/death_report/n_1:label">
            <value>Le rapport de décès pour <output value=" /death_confirmation/child_name "/> a été soumis.</value>
          </text>
          <text id="/death_confirmation/death_report/n_2:label">
            <value>[Veuillez faire un suivi avec <output value=" /death_confirmation/chw_name "/> pour voir si <output value=" /death_confirmation/child_name "/> est décédé.
Cliquez ici pour appeler: <output value=" /death_confirmation/chw_phone "/>](tel:<output value=" /death_confirmation/chw_phone "/>)</value>
          </text>
          <text id="/death_confirmation/death_report/n_3:label">
            <value>Notifier <output value=" /death_confirmation/chw_name "/> que <output value=" /death_confirmation/child_name "/> n'est pas mort et que les programmes continueront donc normalement</value>
          </text>
          <text id="/death_confirmation/death_report/n_4:label">
            <value>Merci de confirmer le rapport de décès pour <output value=" /death_confirmation/child_name "/></value>
          </text>
          <text id="/death_confirmation/death_report/notes:label">
            <value>Notes complémentaires</value>
          </text>
          <text id="/death_confirmation/death_report/other_place:label">
            <value>Précisez un autre lieu de décès</value>
          </text>
          <text id="/death_confirmation/death_report/place/facility:label">
            <value>Établissement de santé</value>
          </text>
          <text id="/death_confirmation/death_report/place/home:label">
            <value>maison</value>
          </text>
          <text id="/death_confirmation/death_report/place/other:label">
            <value>Autre</value>
          </text>
          <text id="/death_confirmation/death_report/place:label">
            <value>Lieu du décès</value>
          </text>
          <text id="/death_confirmation/death_report:label">
            <value>-</value>
          </text>
          <text id="/death_confirmation/inputs/contact/_id:label">
            <value>Quel est l'identifiant du patient?</value>
          </text>
          <text id="/death_confirmation/inputs:label">
            <value>Patient</value>
          </text>
        </translation>
        <translation lang="hi">
          <text id="/death_confirmation/death_report/date_of_death:label">
            <value>मृत्यु तिथि</value>
          </text>
          <text id="/death_confirmation/death_report/death/no:label">
            <value>नहीं</value>
          </text>
          <text id="/death_confirmation/death_report/death/yes:label">
            <value>हाँ</value>
          </text>
          <text id="/death_confirmation/death_report/death:label">
            <value>क्या <output value=" /death_confirmation/child_name "/> मर गया</value>
          </text>
          <text id="/death_confirmation/death_report/n_1:label">
            <value><output value=" /death_confirmation/child_name "/> के लिए मौत की रिपोर्ट प्रस्तुत की गई है।</value>
          </text>
          <text id="/death_confirmation/death_report/n_2:label">
            <value>[कृपया देखने के लिए <output value=" /death_confirmation/chw_name "/> के साथ पालन करें अगर <output value=" /death_confirmation/child_name "/> मर गया।
कॉल करने के लिए यहां क्लिक करें: <output value=" /death_confirmation/chw_phone "/>](tel:<output value=" /death_confirmation/chw_phone "/>)</value>
          </text>
          <text id="/death_confirmation/death_report/n_3:label">
            <value><output value=" /death_confirmation/chw_name "/> को सूचित करें कि <output value=" /death_confirmation/child_name "/> की मृत्यु नहीं हुई और इसलिए शेड्यूल हमेशा की तरह जारी रहेगा</value>
          </text>
          <text id="/death_confirmation/death_report/n_4:label">
            <value><output value=" /death_confirmation/child_name "/> के लिए मौत की रिपोर्ट की पुष्टि करने के लिए धन्यवाद</value>
          </text>
          <text id="/death_confirmation/death_report/notes:label">
            <value>अतिरिक्त नोट्स</value>
          </text>
          <text id="/death_confirmation/death_report/other_place:label">
            <value>मृत्यु के अन्य स्थान निर्दिष्ट करें</value>
          </text>
          <text id="/death_confirmation/death_report/place/facility:label">
            <value>स्वास्थ्य सुविधा</value>
          </text>
          <text id="/death_confirmation/death_report/place/home:label">
            <value>होम</value>
          </text>
          <text id="/death_confirmation/death_report/place/other:label">
            <value>अन्य</value>
          </text>
          <text id="/death_confirmation/death_report/place:label">
            <value>मौत की जगह</value>
          </text>
          <text id="/death_confirmation/death_report:label">
            <value>-</value>
          </text>
          <text id="/death_confirmation/inputs/contact/_id:label">
            <value>मरीज का नाम क्या है?</value>
          </text>
          <text id="/death_confirmation/inputs:label">
            <value>मरीज</value>
          </text>
        </translation>
        <translation lang="id">
          <text id="/death_confirmation/death_report/date_of_death:label">
            <value>Tanggal kematian</value>
          </text>
          <text id="/death_confirmation/death_report/death/no:label">
            <value>Tidak</value>
          </text>
          <text id="/death_confirmation/death_report/death/yes:label">
            <value>iya nih</value>
          </text>
          <text id="/death_confirmation/death_report/death:label">
            <value>Apakah <output value=" /death_confirmation/child_name "/> mati</value>
          </text>
          <text id="/death_confirmation/death_report/n_1:label">
            <value>Laporan kematian untuk <output value=" /death_confirmation/child_name "/> telah dikirimkan.</value>
          </text>
          <text id="/death_confirmation/death_report/n_2:label">
            <value>[Harap ikuti dengan <output value=" /death_confirmation/chw_name "/> untuk melihat apakah <output value=" /death_confirmation/child_name "/> meninggal.
Klik di sini untuk menelepon: <output value=" /death_confirmation/chw_phone "/>](tel:<output value=" /death_confirmation/chw_phone "/>)</value>
          </text>
          <text id="/death_confirmation/death_report/n_3:label">
            <value>Beri tahu <output value=" /death_confirmation/chw_name "/> bahwa <output value=" /death_confirmation/child_name "/> tidak mati dan karenanya jadwal akan dilanjutkan seperti biasa</value>
          </text>
          <text id="/death_confirmation/death_report/n_4:label">
            <value>Terima kasih telah mengkonfirmasi laporan kematian sebesar <output value=" /death_confirmation/child_name "/></value>
          </text>
          <text id="/death_confirmation/death_report/notes:label">
            <value>Catatan tambahan</value>
          </text>
          <text id="/death_confirmation/death_report/other_place:label">
            <value>Tentukan tempat kematian lain</value>
          </text>
          <text id="/death_confirmation/death_report/place/facility:label">
            <value>Fasilitas kesehatan</value>
          </text>
          <text id="/death_confirmation/death_report/place/home:label">
            <value>rumah</value>
          </text>
          <text id="/death_confirmation/death_report/place/other:label">
            <value>Lain</value>
          </text>
          <text id="/death_confirmation/death_report/place:label">
            <value>Tempat meninggal</value>
          </text>
          <text id="/death_confirmation/death_report:label">
            <value>-</value>
          </text>
          <text id="/death_confirmation/inputs/contact/_id:label">
            <value>Apa nama pasien?</value>
          </text>
          <text id="/death_confirmation/inputs:label">
            <value>Pasien</value>
          </text>
        </translation>
        <translation lang="ne">
          <text id="/death_confirmation/death_report/date_of_death:label">
            <value>मृत्युको मिति</value>
          </text>
          <text id="/death_confirmation/death_report/death/no:label">
            <value>होइन</value>
          </text>
          <text id="/death_confirmation/death_report/death/yes:label">
            <value>हो</value>
          </text>
          <text id="/death_confirmation/death_report/death:label">
            <value><output value=" /death_confirmation/child_name "/> मर्नुभयो</value>
          </text>
          <text id="/death_confirmation/death_report/n_1:label">
            <value><output value=" /death_confirmation/child_name "/> का लागि मृत्यु रिपोर्ट पेश गरिएको छ।</value>
          </text>
          <text id="/death_confirmation/death_report/n_2:label">
            <value>[कृपया <output value=" /death_confirmation/child_name "/> को मृत्यु भएको हेर्न को लागी <output value=" /death_confirmation/chw_name "/> सँग पछ्याउनुहोस्।
कल गर्न यहाँ क्लिक गर्नुहोस्: <output value=" /death_confirmation/chw_phone "/>](tel:<output value=" /death_confirmation/chw_phone "/>)</value>
          </text>
          <text id="/death_confirmation/death_report/n_3:label">
            <value><output value=" /death_confirmation/chw_name "/> लाई सूचित गर्नुहोस् कि <output value=" /death_confirmation/child_name "/> लाई मर्न सकेन र त्यसैले कार्यक्रमहरू सामान्यको रूपमा जारी रहनेछ</value>
          </text>
          <text id="/death_confirmation/death_report/n_4:label">
            <value><output value=" /death_confirmation/child_name "/> को लागि मृत्यु रिपोर्ट को पुष्टि को लागि धन्यवाद</value>
          </text>
          <text id="/death_confirmation/death_report/notes:label">
            <value>थप नोटहरू</value>
          </text>
          <text id="/death_confirmation/death_report/other_place:label">
            <value>मृत्युको अन्य स्थान निर्दिष्ट गर्नुहोस्</value>
          </text>
          <text id="/death_confirmation/death_report/place/facility:label">
            <value>स्वास्थ्य सुविधा</value>
          </text>
          <text id="/death_confirmation/death_report/place/home:label">
            <value>घर</value>
          </text>
          <text id="/death_confirmation/death_report/place/other:label">
            <value>अन्य</value>
          </text>
          <text id="/death_confirmation/death_report/place:label">
            <value>मृत्युको स्थान</value>
          </text>
          <text id="/death_confirmation/death_report:label">
            <value>-</value>
          </text>
          <text id="/death_confirmation/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/death_confirmation/inputs:label">
            <value>-</value>
          </text>
        </translation>
      </itext>
      <instance>
        <death_confirmation delimiter="#" id="death_confirmation" prefix="J1!death_confirmation!" version="2022-09-26 12-31">
          <inputs>
            <meta>
              <location>
                <lat/>
                <long/>
                <error/>
                <message/>
              </location>
            </meta>
            <source>user</source>
            <source_id/>
            <contact>
              <_id/>
              <name/>
              <patient_id/>
              <date_of_birth/>
              <parent>
                <contact>
                  <phone/>
                  <name/>
                </contact>
              </parent>
            </contact>
          </inputs>
          <patient_uuid/>
          <child_name/>
          <patient_id/>
          <chw_name/>
          <chw_phone/>
          <death_report>
            <n_1/>
            <n_2/>
            <death/>
            <date_of_death/>
            <place/>
            <other_place/>
            <n_3/>
            <n_4/>
            <notes/>
          </death_report>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </death_confirmation>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/death_confirmation/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/death_confirmation/inputs/source" type="string"/>
      <bind nodeset="/death_confirmation/inputs/source_id" type="string"/>
      <bind nodeset="/death_confirmation/inputs/contact/_id" type="db:person"/>
      <bind nodeset="/death_confirmation/inputs/contact/name" type="string"/>
      <bind nodeset="/death_confirmation/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/death_confirmation/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/death_confirmation/inputs/contact/parent/contact/phone" type="string"/>
      <bind nodeset="/death_confirmation/inputs/contact/parent/contact/name" type="string"/>
      <bind calculate="../inputs/contact/_id" nodeset="/death_confirmation/patient_uuid" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/death_confirmation/child_name" type="string"/>
      <bind calculate="../inputs/contact/patient_id" constraint="regex(., '[0-9]{5,13}')" nodeset="/death_confirmation/patient_id" type="string"/>
      <bind calculate="../inputs/contact/parent/contact/name" nodeset="/death_confirmation/chw_name" type="string"/>
      <bind calculate="../inputs/contact/parent/contact/phone" nodeset="/death_confirmation/chw_phone" type="string"/>
      <bind nodeset="/death_confirmation/death_report/n_1" readonly="true()" type="string"/>
      <bind nodeset="/death_confirmation/death_report/n_2" readonly="true()" type="string"/>
      <bind nodeset="/death_confirmation/death_report/death" required="true()" type="select1"/>
      <bind constraint=". &lt;= now()" nodeset="/death_confirmation/death_report/date_of_death" relevant=" /death_confirmation/death_report/death  = 'yes'" required="true()" type="date"/>
      <bind nodeset="/death_confirmation/death_report/place" relevant=" /death_confirmation/death_report/death  = 'yes'" required="true()" type="select1"/>
      <bind nodeset="/death_confirmation/death_report/other_place" relevant=" /death_confirmation/death_report/place  = 'other'" required="true()" type="string"/>
      <bind nodeset="/death_confirmation/death_report/n_3" readonly="true()" relevant=" /death_confirmation/death_report/death  = 'no'" type="string"/>
      <bind nodeset="/death_confirmation/death_report/n_4" readonly="true()" relevant=" /death_confirmation/death_report/death  = 'yes'" type="string"/>
      <bind nodeset="/death_confirmation/death_report/notes" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/death_confirmation/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/death_confirmation/inputs">
      <label ref="jr:itext('/death_confirmation/inputs:label')"/>
      <input appearance="hidden" ref="/death_confirmation/inputs/source"/>
      <input appearance="hidden" ref="/death_confirmation/inputs/source_id"/>
      <group ref="/death_confirmation/inputs/contact">
        <input appearance="db-object" ref="/death_confirmation/inputs/contact/_id">
          <label ref="jr:itext('/death_confirmation/inputs/contact/_id:label')"/>
          <hint>Select a person from list</hint>
        </input>
        <input appearance="hidden" ref="/death_confirmation/inputs/contact/name"/>
        <input appearance="hidden" ref="/death_confirmation/inputs/contact/patient_id"/>
        <input appearance="hidden" ref="/death_confirmation/inputs/contact/date_of_birth"/>
        <group ref="/death_confirmation/inputs/contact/parent">
          <group ref="/death_confirmation/inputs/contact/parent/contact">
            <input appearance="hidden" ref="/death_confirmation/inputs/contact/parent/contact/phone"/>
            <input appearance="hidden" ref="/death_confirmation/inputs/contact/parent/contact/name"/>
          </group>
        </group>
      </group>
    </group>
    <group appearance="field-list" ref="/death_confirmation/death_report">
      <input ref="/death_confirmation/death_report/n_1">
        <label ref="jr:itext('/death_confirmation/death_report/n_1:label')"/>
      </input>
      <input ref="/death_confirmation/death_report/n_2">
        <label ref="jr:itext('/death_confirmation/death_report/n_2:label')"/>
      </input>
      <select1 ref="/death_confirmation/death_report/death">
        <label ref="jr:itext('/death_confirmation/death_report/death:label')"/>
        <item>
          <label ref="jr:itext('/death_confirmation/death_report/death/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/death_confirmation/death_report/death/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <input ref="/death_confirmation/death_report/date_of_death">
        <label ref="jr:itext('/death_confirmation/death_report/date_of_death:label')"/>
      </input>
      <select1 ref="/death_confirmation/death_report/place">
        <label ref="jr:itext('/death_confirmation/death_report/place:label')"/>
        <item>
          <label ref="jr:itext('/death_confirmation/death_report/place/home:label')"/>
          <value>home</value>
        </item>
        <item>
          <label ref="jr:itext('/death_confirmation/death_report/place/facility:label')"/>
          <value>facility</value>
        </item>
        <item>
          <label ref="jr:itext('/death_confirmation/death_report/place/other:label')"/>
          <value>other</value>
        </item>
      </select1>
      <input ref="/death_confirmation/death_report/other_place">
        <label ref="jr:itext('/death_confirmation/death_report/other_place:label')"/>
      </input>
      <input ref="/death_confirmation/death_report/n_3">
        <label ref="jr:itext('/death_confirmation/death_report/n_3:label')"/>
      </input>
      <input ref="/death_confirmation/death_report/n_4">
        <label ref="jr:itext('/death_confirmation/death_report/n_4:label')"/>
      </input>
      <input ref="/death_confirmation/death_report/notes">
        <label ref="jr:itext('/death_confirmation/death_report/notes:label')"/>
      </input>
    </group>
  </h:body>
</h:html>
`,   
};
