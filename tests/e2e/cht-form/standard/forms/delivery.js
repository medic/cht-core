/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="delivery">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Delivery Report</h3>
<select id="form-languages" data-default-lang=""><option value="en">en</option> <option value="es">es</option> <option value="fr">fr</option> <option value="hi">hi</option> <option value="id">id</option> <option value="ne">ne</option> <option value="sw">sw</option> </select>
  
  
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/delivery/inputs" data-relevant="./source = 'user'"><h4>
<span lang="en" class="question-label active" data-itext-id="/delivery/inputs:label">Patient</span><span lang="es" class="question-label " data-itext-id="/delivery/inputs:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/inputs:label">Patient</span><span lang="hi" class="question-label " data-itext-id="/delivery/inputs:label">मरीज</span><span lang="id" class="question-label " data-itext-id="/delivery/inputs:label">Pasien</span><span lang="ne" class="question-label " data-itext-id="/delivery/inputs:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/inputs:label">-</span>
</h4>
<section class="or-group-data " name="/delivery/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/delivery/inputs/contact/_id:label">What is the patient's name?</span><span lang="es" class="question-label " data-itext-id="/delivery/inputs/contact/_id:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/inputs/contact/_id:label">Quel est le nom du patient ?</span><span lang="hi" class="question-label " data-itext-id="/delivery/inputs/contact/_id:label">मरीज का नाम क्या है?</span><span lang="id" class="question-label " data-itext-id="/delivery/inputs/contact/_id:label">Apa nama pasien?</span><span lang="ne" class="question-label " data-itext-id="/delivery/inputs/contact/_id:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/inputs/contact/_id:label">-</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/delivery/inputs/contact/_id:hint">Select a person from list</span><span lang="es" class="or-hint " data-itext-id="/delivery/inputs/contact/_id:hint">-</span><span lang="fr" class="or-hint " data-itext-id="/delivery/inputs/contact/_id:hint">Sélectionnez une personne dans la liste</span><span lang="hi" class="or-hint " data-itext-id="/delivery/inputs/contact/_id:hint">सूची में से एक व्यक्ति को चुनें</span><span lang="id" class="or-hint " data-itext-id="/delivery/inputs/contact/_id:hint">Pilih orang dari daftar</span><span lang="ne" class="or-hint " data-itext-id="/delivery/inputs/contact/_id:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/delivery/inputs/contact/_id:hint">-</span><input type="text" name="/delivery/inputs/contact/_id" data-required="true()" data-type-xml="person"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select or-appearance-hidden "><input type="text" name="/delivery/inputs/contact/patient_id" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/delivery/inputs/contact/name" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/delivery/inputs/contact/date_of_birth" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/delivery/inputs/contact/sex" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/delivery/inputs/contact/phone" data-type-xml="string"></label><section class="or-group-data " name="/delivery/inputs/contact/parent"><section class="or-group-data " name="/delivery/inputs/contact/parent/contact"><label class="question non-select or-appearance-hidden "><input type="text" name="/delivery/inputs/contact/parent/contact/phone" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/delivery/inputs/contact/parent/contact/name" data-type-xml="string"></label>
      </section><section class="or-group-data " name="/delivery/inputs/contact/parent/parent"><section class="or-group-data " name="/delivery/inputs/contact/parent/parent/parent"><label class="question non-select or-appearance-hidden "><input type="text" name="/delivery/inputs/contact/parent/parent/parent/use_cases" data-type-xml="string"></label>
      </section>
      </section>
      </section>
      </section><section class="or-group-data " name="/delivery/inputs/meta"><section class="or-group-data " name="/delivery/inputs/meta/location">
      </section>
      </section>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/delivery/group_chw_info" data-relevant=" /delivery/inputs/source  = 'task'"><h4>
<span lang="en" class="question-label active" data-itext-id="/delivery/group_chw_info:label">Missing Birth Report</span><span lang="es" class="question-label " data-itext-id="/delivery/group_chw_info:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_chw_info:label">Rapport d'accouchement manquant</span><span lang="hi" class="question-label " data-itext-id="/delivery/group_chw_info:label">लापता जन्म की रिपोर्ट</span><span lang="id" class="question-label " data-itext-id="/delivery/group_chw_info:label">Laporan Kelahiran Hilang</span><span lang="ne" class="question-label " data-itext-id="/delivery/group_chw_info:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_chw_info:label">-</span>
</h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/group_chw_info/chw_information:label">The birth report for <span class="or-output" data-value=" /delivery/patient_name "> </span> has not been recorded.</span><span lang="es" class="question-label " data-itext-id="/delivery/group_chw_info/chw_information:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_chw_info/chw_information:label">Le rapport d'accouchement pour <span class="or-output" data-value=" /delivery/patient_name "> </span> n'a pas été soumis</span><span lang="hi" class="question-label " data-itext-id="/delivery/group_chw_info/chw_information:label"><span class="or-output" data-value=" /delivery/patient_name "> </span> के लिए जन्म की रिपोर्ट दर्ज नहीं की गयी है</span><span lang="id" class="question-label " data-itext-id="/delivery/group_chw_info/chw_information:label">Laporan kelahiran untuk <span class="or-output" data-value=" /delivery/patient_name "> </span> belum terdata.</span><span lang="ne" class="question-label " data-itext-id="/delivery/group_chw_info/chw_information:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_chw_info/chw_information:label">-</span><input type="text" name="/delivery/group_chw_info/chw_information" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/group_chw_info/call_button:label"><strong>Please follow up with <span class="or-output" data-value=" /delivery/chw_name "> </span> to see if <span class="or-output" data-value=" /delivery/patient_name "> </span> is still pregnant.</strong><br>Call: <span class="or-output" data-value=" /delivery/chw_phone "> </span></span><span lang="es" class="question-label " data-itext-id="/delivery/group_chw_info/call_button:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_chw_info/call_button:label"><strong>Merci de faire un suivi avec <span class="or-output" data-value=" /delivery/chw_name "> </span> pour voir si <span class="or-output" data-value=" /delivery/patient_name "> </span> est toujours enceinte.</strong><br>Call: <span class="or-output" data-value=" /delivery/chw_phone "> </span></span><span lang="hi" class="question-label " data-itext-id="/delivery/group_chw_info/call_button:label"><strong>कृपया <span class="or-output" data-value=" /delivery/chw_name "> </span> के साथ मिल कर देखे के <span class="or-output" data-value=" /delivery/patient_name "> </span> अभी भी गर्भवती है |</strong> कॉल: <span class="or-output" data-value=" /delivery/chw_phone "> </span></span><span lang="id" class="question-label " data-itext-id="/delivery/group_chw_info/call_button:label"><strong>Ikuti dengan <span class="or-output" data-value=" /delivery/chw_name "> </span> untuk melihat apakah <span class="or-output" data-value=" /delivery/patient_name "> </span> masih hamil.</strong> Sebut: <span class="or-output" data-value=" /delivery/chw_phone "> </span></span><span lang="ne" class="question-label " data-itext-id="/delivery/group_chw_info/call_button:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_chw_info/call_button:label">-</span><input type="text" name="/delivery/group_chw_info/call_button" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/group_chw_info/still_pregnant:label">Is <span class="or-output" data-value=" /delivery/patient_name "> </span> still pregnant?</span><span lang="es" class="question-label " data-itext-id="/delivery/group_chw_info/still_pregnant:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_chw_info/still_pregnant:label">Est-ce que <span class="or-output" data-value=" /delivery/patient_name "> </span> est toujours enceinte ?</span><span lang="hi" class="question-label " data-itext-id="/delivery/group_chw_info/still_pregnant:label">क्या <span class="or-output" data-value=" /delivery/patient_name "> </span> अभी भी गर्भवती है?</span><span lang="id" class="question-label " data-itext-id="/delivery/group_chw_info/still_pregnant:label">Apakah <span class="or-output" data-value=" /delivery/patient_name "> </span> masih hamil?</span><span lang="ne" class="question-label " data-itext-id="/delivery/group_chw_info/still_pregnant:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_chw_info/still_pregnant:label">-</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/group_chw_info/still_pregnant" data-name="/delivery/group_chw_info/still_pregnant" value="yes" data-required="true()" data-constraint="selected(.,'no')" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_chw_info/still_pregnant/yes:label">Yes</span><span lang="es" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/yes:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/yes:label">Oui</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/yes:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/yes:label">Iya</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/yes:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/yes:label">-</span></label><label class=""><input type="radio" name="/delivery/group_chw_info/still_pregnant" data-name="/delivery/group_chw_info/still_pregnant" value="no" data-required="true()" data-constraint="selected(.,'no')" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_chw_info/still_pregnant/no:label">No</span><span lang="es" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/no:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/no:label">Non</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/no:label">नहीं</span><span lang="id" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/no:label">Tidak</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/no:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/no:label">-</span></label><label class=""><input type="radio" name="/delivery/group_chw_info/still_pregnant" data-name="/delivery/group_chw_info/still_pregnant" value="unknown" data-required="true()" data-constraint="selected(.,'no')" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_chw_info/still_pregnant/unknown:label">I'm not sure</span><span lang="es" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/unknown:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/unknown:label">Pas sûr</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/unknown:label">पता नहीं</span><span lang="id" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/unknown:label">Tidak yakin</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/unknown:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_chw_info/still_pregnant/unknown:label">-</span></label>
</div>
</fieldset>
<span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/group_chw_info/still_pregnant:jr:constraintMsg">Sorry, the pregnancy must be complete to continue.</span><span lang="es" class="or-constraint-msg " data-itext-id="/delivery/group_chw_info/still_pregnant:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/delivery/group_chw_info/still_pregnant:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/delivery/group_chw_info/still_pregnant:jr:constraintMsg">माफ़ कीजिये, आगे बढ़ने से पहले गर्भावस्था को पूरा करना होगा</span><span lang="id" class="or-constraint-msg " data-itext-id="/delivery/group_chw_info/still_pregnant:jr:constraintMsg">Maaf, kehamilan harus diselesaikan sebelum melanjutkan.</span><span lang="ne" class="or-constraint-msg " data-itext-id="/delivery/group_chw_info/still_pregnant:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/delivery/group_chw_info/still_pregnant:jr:constraintMsg">-</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/delivery/group_delivery_summary" data-relevant="selected(coalesce( /delivery/group_chw_info/still_pregnant , 'no'), 'no')"><h4>
<span lang="en" class="question-label active" data-itext-id="/delivery/group_delivery_summary:label">Delivery Info</span><span lang="es" class="question-label " data-itext-id="/delivery/group_delivery_summary:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_delivery_summary:label">Information sur l'accouchement</span><span lang="hi" class="question-label " data-itext-id="/delivery/group_delivery_summary:label">डिलीवरी की जानकारी</span><span lang="id" class="question-label " data-itext-id="/delivery/group_delivery_summary:label">Informasi persalinan</span><span lang="ne" class="question-label " data-itext-id="/delivery/group_delivery_summary:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_delivery_summary:label">-</span>
</h4>
<fieldset class="question simple-select or-appearance-horizontal or-appearance-columns ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome:label">Pregnancy Outcome</span><span lang="es" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome:label">Résultat de la grossesse</span><span lang="hi" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome:label">गर्भावस्था का परिणाम</span><span lang="id" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome:label">Kehamilan hasil</span><span lang="ne" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome:label">-</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/group_delivery_summary/g_pregnancy_outcome" data-name="/delivery/group_delivery_summary/g_pregnancy_outcome" value="healthy" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label">Live Birth</span><span lang="es" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label">Vivant</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label">जीवित जन्म</span><span lang="id" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label">Kelahiran hidup</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label">-</span></label><label class=""><input type="radio" name="/delivery/group_delivery_summary/g_pregnancy_outcome" data-name="/delivery/group_delivery_summary/g_pregnancy_outcome" value="still_birth" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label">Still Birth</span><span lang="es" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label">Mort-né</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label">मृत जन्म</span><span lang="id" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label">Kelahiran mati</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label">-</span></label><label class=""><input type="radio" name="/delivery/group_delivery_summary/g_pregnancy_outcome" data-name="/delivery/group_delivery_summary/g_pregnancy_outcome" value="miscarriage" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label">Miscarriage</span><span lang="es" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label">Fausse couche</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label">गर्भपात</span><span lang="id" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label">Keguguran</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label">-</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/group_delivery_summary/g_delivery_code:label">Location of Delivery</span><span lang="es" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code:label">Lieu d'accouchement</span><span lang="hi" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code:label">डिलीवरी कि स्थान</span><span lang="id" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code:label">Lokasi persalinan</span><span lang="ne" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code:label">-</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/group_delivery_summary/g_delivery_code" data-name="/delivery/group_delivery_summary/g_delivery_code" value="f" data-required="true()" data-relevant=" /delivery/group_delivery_summary/g_pregnancy_outcome  != 'miscarriage'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_delivery_summary/g_delivery_code/f:label">Facility</span><span lang="es" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/f:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/f:label">Centre de santé</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/f:label">स्वास्थ्य केंद्र</span><span lang="id" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/f:label">Fasilitas kesehatan</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/f:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/f:label">-</span></label><label class=""><input type="radio" name="/delivery/group_delivery_summary/g_delivery_code" data-name="/delivery/group_delivery_summary/g_delivery_code" value="s" data-required="true()" data-relevant=" /delivery/group_delivery_summary/g_pregnancy_outcome  != 'miscarriage'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_delivery_summary/g_delivery_code/s:label">Home with Skilled Attendant</span><span lang="es" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/s:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/s:label">Domicile avec personnel qualifié</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/s:label">घर पर, अनुभवी दाई के सहायता के साथ</span><span lang="id" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/s:label">Rumah dengan dukun bersalin</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/s:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/s:label">-</span></label><label class=""><input type="radio" name="/delivery/group_delivery_summary/g_delivery_code" data-name="/delivery/group_delivery_summary/g_delivery_code" value="ns" data-required="true()" data-relevant=" /delivery/group_delivery_summary/g_pregnancy_outcome  != 'miscarriage'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_delivery_summary/g_delivery_code/ns:label">Home with No Skilled Attendant</span><span lang="es" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/ns:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/ns:label">Domicile sans personnel qualifié</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/ns:label">घर पर, अनुभवी दाई के सहायता के बिना</span><span lang="id" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/ns:label">Rumah tanpa dukun bersalin</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/ns:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_delivery_summary/g_delivery_code/ns:label">-</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/group_delivery_summary/g_birth_date:label">Enter Delivery Date</span><span lang="es" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_birth_date:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_birth_date:label">Entrer la date d'accouchement</span><span lang="hi" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_birth_date:label">डिलीवरी की तारीख दर्ज करें</span><span lang="id" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_birth_date:label">Masukkan tanggal persalinan</span><span lang="ne" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_birth_date:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_delivery_summary/g_birth_date:label">-</span><input type="date" name="/delivery/group_delivery_summary/g_birth_date" data-constraint="(decimal-date-time(.) &lt;= decimal-date-time(now())) and ((decimal-date-time(now()) - decimal-date-time(.)) &lt; 365)" data-relevant=" /delivery/group_delivery_summary/g_pregnancy_outcome  != 'miscarriage'" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg">Date must be between a year ago and today</span><span lang="es" class="or-constraint-msg " data-itext-id="/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg">तारीख एक साल पहले और आज के बीच में होनी चाहिए</span><span lang="id" class="or-constraint-msg " data-itext-id="/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg">Tanggal harus antara satu tahun yang lalu dan hari ini.</span><span lang="ne" class="or-constraint-msg " data-itext-id="/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg">-</span></label>
      </section>
    <section class="or-group or-appearance-field-list " name="/delivery/group_note"><h4>
<span lang="en" class="question-label active" data-itext-id="/delivery/group_note:label">Note to the CHW</span><span lang="es" class="question-label " data-itext-id="/delivery/group_note:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_note:label">Notes à l'ASC</span><span lang="hi" class="question-label " data-itext-id="/delivery/group_note:label">सामुदायिक स्वास्थ्य कर्मी के लिए नोट</span><span lang="id" class="question-label " data-itext-id="/delivery/group_note:label">Catatan ke kader</span><span lang="ne" class="question-label " data-itext-id="/delivery/group_note:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_note:label">-</span>
</h4>
<fieldset class="question simple-select or-appearance-hidden "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/group_note/default_chw_sms:label">Default SMS to send to CHW</span><span lang="es" class="question-label " data-itext-id="/delivery/group_note/default_chw_sms:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_note/default_chw_sms:label">Message à envoyer à l'ASC</span><span lang="hi" class="question-label " data-itext-id="/delivery/group_note/default_chw_sms:label">-</span><span lang="id" class="question-label " data-itext-id="/delivery/group_note/default_chw_sms:label">-</span><span lang="ne" class="question-label " data-itext-id="/delivery/group_note/default_chw_sms:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_note/default_chw_sms:label">-</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="facility_birth" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/facility_birth:label">Good news, <span class="or-output" data-value=" /delivery/chw_name "> </span>! <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) has delivered at the health facility. We will alert you when it is time to refer them for PNC. Please monitor them for danger signs. Thank you!</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/facility_birth:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/facility_birth:label">Bonne nouvelle, <span class="or-output" data-value=" /delivery/chw_name "> </span>! <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a accouché au centre de santé. Nous vous avertirons lorsqu'il est temps de la référer pour les CPoN. S'il vous plaît surveillez la pour les signes de danger. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/facility_birth:label">खुशखबरी, <span class="or-output" data-value=" /delivery/chw_name "> </span>! <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) की स्वास्थ्य केंद्र में डिलीवरी हो चुकी है| जब उनकी गर्भावस्था की बाद की जांच का समय आएगा, हम आपको सूचित करेंगे | कृपया उनकी खतरे के संकेत पे निगरानी रखें | धन्यवाद!</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/facility_birth:label">Berita baik, <span class="or-output" data-value=" /delivery/chw_name "> </span>! <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) telah melahirkan di fasilitas kesehatan. Kami akan mengingatkan Anda bila waktu untuk merujuk mereka untuk PNC. Silahkan memantau mereka untuk tanda-tanda bahaya. Terima kasih!</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/facility_birth:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/facility_birth:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="home_sba_birth" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/home_sba_birth:label">Hi <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) has delivered at home with a skilled attendant. We will alert you when it is time for their PNC visits. Please monitor them for danger signs. Thank you!</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_sba_birth:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_sba_birth:label">Salut <span class="or-output" data-value=" /delivery/chw_name "> </span>! <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a accouché à domicile en présence d'un personnel qualifié. Nous vous avertirons lorsqu'il est temps de la référer pour les CPoN. S'il vous plaît surveillez la pour les signes de danger. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_sba_birth:label">नमस्ते <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) की घर पर, अनुभवी दाई के साथ डिलिवरी हो चुकी है | जब उनकी गर्भावस्था की बाद की जांच का समय आएगा, हम आपको सूचित करेंगे | कृपया उनकी खतरे के संकेत पे निगरानी रखें| धन्यवाद!</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_sba_birth:label">Halo <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) telah melahirkan di rumah dengan dukun bersalin. Kami akan mengingatkan Anda bila waktu untuk merujuk mereka untuk PNC. Silahkan memantau mereka untuk tanda-tanda bahaya. Terima kasih!</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_sba_birth:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_sba_birth:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="home_no_sba_birth" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/home_no_sba_birth:label">Hi <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) has delivered at home without a skilled attendant. We will alert you when it is time for their PNC visits. Please monitor them for danger signs. Thank you!</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_no_sba_birth:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_no_sba_birth:label">Salut <span class="or-output" data-value=" /delivery/chw_name "> </span>! <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a accouché à domicile en l'absence d'un personnel qualifié. Nous vous avertirons lorsqu'il est temps de la référer pour les CPoN. S'il vous plaît surveillez la pour les signes de danger. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_no_sba_birth:label">नमस्ते <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) की घर पर, अनुभवी दाई के बिना डिलिवरी हो चुकी है | जब उनकी गर्भावस्था की बाद की जांच का समय आएगा, हम आपको सूचित करेंगे | कृपया उनकी खतरे के संकेत पे निगरानी रखें| धन्यवाद!</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_no_sba_birth:label">Halo <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) telah melahirkan di rumah tanpa dukun bersalin. Kami akan mengingatkan Anda bila waktu untuk merujuk mereka untuk PNC. Silahkan memantau mereka untuk tanda-tanda bahaya. Terima kasih!</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_no_sba_birth:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_no_sba_birth:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="facility_stillbirth" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/facility_stillbirth:label">Hi <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) had a stillbirth at the health facility. We will alert you when it is time for their PNC visits. Please support <span class="or-output" data-value=" /delivery/patient_name "> </span> during this difficult time. Thank you.</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/facility_stillbirth:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/facility_stillbirth:label">Salut <span class="or-output" data-value=" /delivery/chw_name "> </span>! <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a accouché d'un mort-né au centre de santé. Nous vous avertirons lorsqu'il est temps de la référer pour les CPoN. S'il vous plaît encouragez la pendant ces moments difficiles. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/facility_stillbirth:label">नमस्ते <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) का बच्चा का स्वास्थ्य केंद्र में मृत जन्म हुआ | जब उनकी गर्भावस्था की बाद की जांच का समय आएगा, हम आपको सूचित करेंगे | कृपया उनकी खतरे के संकेत पे निगरानी रखें और इस मुश्किल समय में <span class="or-output" data-value=" /delivery/patient_name "> </span> को सहारा दे | धन्यवाद |</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/facility_stillbirth:label">Halo <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) memiliki kelahiran mati di fasilitas. Kami akan mengingatkan Anda bila waktu untuk merujuk mereka untuk PNC. Silahkan mendukung <span class="or-output" data-value=" /delivery/patient_name "> </span> selama masa sulit ini. Terima kasih.</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/facility_stillbirth:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/facility_stillbirth:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="home_sba_stillbirth" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/home_sba_stillbirth:label">Hi <span class="or-output" data-value=" /delivery/chw_name "> </span>, we received a report that <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) had a stillbirth at home with a skilled attendant. We will alert you when it is time for their PNC visits. Please monitor for danger signs and support <span class="or-output" data-value=" /delivery/patient_name "> </span> during this difficult time. Thank you.</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_sba_stillbirth:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_sba_stillbirth:label">Salut <span class="or-output" data-value=" /delivery/chw_name "> </span>! nous avions été informé que <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a accouché d'un mort-né à domicile en présence d'un personnel qualifié. Nous vous avertirons lorsqu'il est temps de la référer pour les CPoN. S'il vous plaît surveillez la pour les signes de danger et encouragez la pendant ces moments difficiles. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_sba_stillbirth:label">नमस्ते <span class="or-output" data-value=" /delivery/chw_name "> </span>, हमें रिपोर्ट मिली है के <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) का बच्चा का मृत जन्म हुआ घर पर, अनुभवी दाई के साथ | जब उनकी गर्भावस्था की बाद की जांच का समय आएगा, हम आपको सूचित करेंगे | कृपया उनकी खतरे के संकेत पे निगरानी रखें और इस मुश्किल समय में <span class="or-output" data-value=" /delivery/patient_name "> </span> को सहारा दे | धन्यवाद |</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_sba_stillbirth:label">Halo <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) memiliki kelahiran mati di rumah dengan dukun bersalin. Kami akan mengingatkan Anda bila waktu untuk merujuk mereka untuk PNC. Silahkan memantau mereka untuk tanda-tanda bahaya dan mendukung <span class="or-output" data-value=" /delivery/patient_name "> </span> selama masa sulit ini. Terima kasih.</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_sba_stillbirth:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_sba_stillbirth:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="home_no_sba_stillbirth" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label">Hi <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) had a stillbirth at home with no skilled attendant. We will alert you when it is time for their PNC visits. Please monitor for danger signs and support <span class="or-output" data-value=" /delivery/patient_name "> </span> during this difficult time. Thank you.</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label">Salut <span class="or-output" data-value=" /delivery/chw_name "> </span>! nous avions été informé que <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a accouché d'un mort-né à domicile en l'absence d'un personnel qualifié. Nous vous avertirons lorsqu'il est temps de la référer pour les CPoN. S'il vous plaît surveillez la pour les signes de danger et encouragez la pendant ces moments difficiles. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label">नमस्ते <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) का बच्चा का मृत जन्म हुआ घर पर, अनुभवी दाई के बिना | जब उनकी गर्भावस्था की बाद की जांच का समय आएगा, हम आपको सूचित करेंगे | कृपया उनकी खतरे के संकेत पे निगरानी रखें और इस मुश्किल समय में <span class="or-output" data-value=" /delivery/patient_name "> </span> को सहारा दे | धन्यवाद |</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label">Halo <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) memiliki kelahiran mati di rumah tanpa dukun bersalin. Kami akan mengingatkan Anda bila waktu untuk merujuk mereka untuk PNC. Silahkan memantau mereka untuk tanda-tanda bahaya dan mendukung <span class="or-output" data-value=" /delivery/patient_name "> </span> selama masa sulit ini. Terima kasih.</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="miscarriage" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/miscarriage:label">Hi <span class="or-output" data-value=" /delivery/chw_name "> </span>, we received a report from the facility that <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) had a miscarriage. Please support <span class="or-output" data-value=" /delivery/patient_name "> </span> during this difficult time. Thank you.</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/miscarriage:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/miscarriage:label">Salut <span class="or-output" data-value=" /delivery/chw_name "> </span>! nous avions été informé par le centre de santé que <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a fait une fausse couche. S'il vous plaît encouragez la pendant ces moments difficiles. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/miscarriage:label">नमस्ते <span class="or-output" data-value=" /delivery/chw_name "> </span>, हमें स्वास्थ्य केंद्र से रिपोर्ट मिली है के <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) का गर्भपात हुआ | कृपया इस मुश्किल समय में <span class="or-output" data-value=" /delivery/patient_name "> </span> को सहारा दे | धन्यवाद |</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/miscarriage:label">Halo <span class="or-output" data-value=" /delivery/chw_name "> </span>, kami menerima laporan dari fasilitas yang <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) memiliki keguguran. Silahkan mendukung <span class="or-output" data-value=" /delivery/patient_name "> </span> selama masa sulit ini. Terima kasih.</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/miscarriage:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/miscarriage:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="unknown" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/unknown:label">Hi <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) was seen at the facility for delivery. Thank you.</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/unknown:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/unknown:label">Salut <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a été au centre de santé pour son accouchement. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/unknown:label">नमस्ते <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) की डिलीवरी के लिए जांच स्वास्थ्य केंद्र में हो चुकी है |</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/unknown:label">Halo <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) telah datang ke fasilitas untuk persalinan. Terima kasih.</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/unknown:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/unknown:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="anc_only_facility_birth" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/anc_only_facility_birth:label">Good news, <span class="or-output" data-value=" /delivery/chw_name "> </span>! <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) delivered at the health facility. Please monitor them for danger signs. Thank you!</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_facility_birth:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_facility_birth:label">Bonne nouvelle, <span class="or-output" data-value=" /delivery/chw_name "> </span>! <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a accouché au centre de santé. S'il vous plaît surveillez la pour les signes de danger. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_facility_birth:label">खुशखबरी, <span class="or-output" data-value=" /delivery/chw_name "> </span>! <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) की स्वास्थ्य केंद्र में डिलीवरी हो चुकी है| कृपया उनकी खतरे के संकेत पे निगरानी रखें | धन्यवाद!</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_facility_birth:label">Berita baik, <span class="or-output" data-value=" /delivery/chw_name "> </span>! <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) telah melahirkan di fasilitas kesehatan. Silahkan kunjungi mereka dalam 40 hari kedepan untuk memantau tanda-tanda bahaya. Terima kasih!</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_facility_birth:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_facility_birth:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="anc_only_home_sba_birth" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label">Hi <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) delivered at home with a skilled attendant. Please monitor them for danger signs. Thank you!</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label">Salut <span class="or-output" data-value=" /delivery/chw_name "> </span>! <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a accouché à domicile en présence d'un personnel qualifié. S'il vous plaît surveillez la pour les signes de danger. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label">नमस्ते <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) की घर पर, अनुभवी दाई के साथ डिलिवरी हो चुकी है | कृपया उनकी खतरे के संकेत पे निगरानी रखें| धन्यवाद!</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label">Halo <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) telah melahirkan di rumah dengan bantuan dukun bersalin. Silahkan kunjungi mereka dalam 40 hari kedepan untuk memantau tanda-tanda bahaya.. Terima kasih!</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="anc_only_home_no_sba_birth" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label">Hi <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) delivered at home without a skilled attendant. Please monitor them for danger signs. Thank you!</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label">Salut <span class="or-output" data-value=" /delivery/chw_name "> </span>! <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a accouché à domicile en l'absence d'un personnel qualifié. S'il vous plaît surveillez la pour les signes de danger. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label">नमस्ते <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) की घर पर, अनुभवी दाई के बिना डिलिवरी हो चुकी है | कृपया उनकी खतरे के संकेत पे निगरानी रखें| धन्यवाद!</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label">Halo <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) telah melahirkan di rumah tanpa dukun bersalin. Silahkan kunjungi mereka dalam 40 hari kedepan untuk memantau tanda-tanda bahaya. Terima kasih!</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="anc_only_facility_stillbirth" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label">Hi <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) had a stillbirth at the health facility. Please support <span class="or-output" data-value=" /delivery/patient_name "> </span> during this difficult time. Thank you.</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label">Salut <span class="or-output" data-value=" /delivery/chw_name "> </span>! <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a accouché d'un mort-né au centre de santé. S'il vous plaît encouragez la pendant ces moments difficiles. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label">नमस्ते <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) का बच्चा का स्वास्थ्य केंद्र में मृत जन्म हुआ | कृपया इस मुश्किल समय में <span class="or-output" data-value=" /delivery/patient_name "> </span> को सहारा दे | धन्यवाद |</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label">Halo <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) telah melahirkan di fasilitas kesehatan namun anaknya meninggal. Mohon dukungan untuk <span class="or-output" data-value=" /delivery/patient_name "> </span> selama masa sulit ini. Terima kasih.</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="anc_only_home_sba_stillbirth" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label">Hi <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) had a stillbirth at home with a skilled attendant. Please support <span class="or-output" data-value=" /delivery/patient_name "> </span> during this difficult time. Thank you.</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label">Salut <span class="or-output" data-value=" /delivery/chw_name "> </span>! nous avions été informé que <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a accouché d'un mort-né à domicile en présence d'un personnel qualifié. S'il vous plaît surveillez la pour les signes de danger et encouragez la pendant ces moments difficiles. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label">नमस्ते <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) का बच्चा का मृत जन्म हुआ घर पर, अनुभवी दाई के साथ | कृपया इस मुश्किल समय में <span class="or-output" data-value=" /delivery/patient_name "> </span> को सहारा दे | धन्यवाद |</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label">Halo <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) telah melahirkan di rumah dengan dukun bersalin tapi anaknya meninggal. Mohon dukungan untuk <span class="or-output" data-value=" /delivery/patient_name "> </span> selama masa sulit ini. Terima kasih.</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="anc_only_home_no_sba_stillbirth" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label">Hi <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) had a stillbirth at home with no skilled attendant. Please support <span class="or-output" data-value=" /delivery/patient_name "> </span> during this difficult time. Thank you.</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label">Salut <span class="or-output" data-value=" /delivery/chw_name "> </span>! nous avions été informé que <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a accouché d'un mort-né à domicile en l'absence d'un personnel qualifié. S'il vous plaît surveillez la pour les signes de danger et encouragez la pendant ces moments difficiles. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label">नमस्ते <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) का बच्चा का मृत जन्म हुआ घर पर, अनुभवी दाई के बिना | कृपया इस मुश्किल समय में <span class="or-output" data-value=" /delivery/patient_name "> </span> को सहारा दे | धन्यवाद |</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label">Halo <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) telah melahirkan di rumah tanpa bantuan dukun bersalin tapi naknya meninggal. Mohon dukungan untuk<span class="or-output" data-value=" /delivery/patient_name "> </span> selama masa sulit ini. Terima kasih.</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="anc_only_miscarriage" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/anc_only_miscarriage:label">Hi <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) had a miscarriage at the health facility. Please support <span class="or-output" data-value=" /delivery/patient_name "> </span> during this difficult time. Thank you.</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_miscarriage:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_miscarriage:label">Salut <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a fait une fausse couche au centre de santé. S'il vous plaît encouragez la pendant ces moments difficiles. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_miscarriage:label">नमस्ते <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) का स्वास्थ्य केंद्र में गर्भपात हुआ | कृपया इस मुश्किल समय में <span class="or-output" data-value=" /delivery/patient_name "> </span> को सहारा दे | धन्यवाद |</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_miscarriage:label">Halo <span class="or-output" data-value=" /delivery/chw_name "> </span>, <span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) memiliki keguguran di fasilitas kesehatan. Silahkan mendukung <span class="or-output" data-value=" /delivery/patient_name "> </span> selama masa sulit ini. Terima kasih.</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_miscarriage:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/anc_only_miscarriage:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/default_chw_sms" data-name="/delivery/group_note/default_chw_sms" value="still_pregnant" data-calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',  'still_pregnant',  if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_birth',  if ( /delivery/delivery_code  = 's',  'anc_only_home_sba_birth',  'anc_only_home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'anc_only_facility_stillbirth',  if( /delivery/delivery_code  = 's',  'anc_only_home_sba_stillbirth',  'anc_only_home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'anc_only_miscarriage',  ''  )  )  ),  if( /delivery/pregnancy_outcome  = 'healthy',  if( /delivery/delivery_code  = 'f',  'facility_birth',  if ( /delivery/delivery_code  = 's',  'home_sba_birth',  'home_no_sba_birth'  )  ),  if( /delivery/pregnancy_outcome  = 'still_birth',  if( /delivery/delivery_code  = 'f',  'facility_stillbirth',  if( /delivery/delivery_code  = 's',  'home_sba_stillbirth',  'home_no_sba_stillbirth'  )  ),  if( /delivery/pregnancy_outcome  = 'miscarriage',  'miscarriage',  'unknown'  )  )  )  )  )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/default_chw_sms/still_pregnant:label"><span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) was seen at the facility and will deliver soon. Please refer her to the health facility for delivery. Thank you.</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/still_pregnant:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/still_pregnant:label"><span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) a été au centre de santé et va accoucher bientôt. S'il vous plaît référez la au centre de santé pour son accouchement. Merci !</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/still_pregnant:label"><span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) की स्वास्थ्य केंद्र में जांच हुई है और जल्द ही उसकी डिलीवरी होगी | कृपया उसे डिलीवरी के लिए स्वास्थ्य केंद्र भेजें | धन्यवाद |</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/still_pregnant:label"><span class="or-output" data-value=" /delivery/patient_name "> </span> (<span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span>) Telah berkunjung ke fasilitas kesehatan dan diperkirakan akan segera melahirkan. Mohon segera dirujuk ke Puskesmas. Terima kasih.)</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/still_pregnant:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/default_chw_sms/still_pregnant:label">-</span></label>
</div>
</fieldset></fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/group_note/default_chw_sms_note:label"><strong>The following message will be sent to <span class="or-output" data-value=" /delivery/chw_name "> </span> (<span class="or-output" data-value=" /delivery/chw_phone "> </span>):</strong><br> <span class="or-output" data-value=" /delivery/group_note/default_chw_sms_text "> </span></span><span lang="es" class="question-label " data-itext-id="/delivery/group_note/default_chw_sms_note:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_note/default_chw_sms_note:label"><strong>Le message suivant sera envoyé à <span class="or-output" data-value=" /delivery/chw_name "> </span> (<span class="or-output" data-value=" /delivery/chw_phone "> </span>):</strong><br> <span class="or-output" data-value=" /delivery/group_note/default_chw_sms_text "> </span></span><span lang="hi" class="question-label " data-itext-id="/delivery/group_note/default_chw_sms_note:label"><strong>यह संदेश <span class="or-output" data-value=" /delivery/chw_name "> </span> (<span class="or-output" data-value=" /delivery/chw_phone "> </span>) को भेजा जाएगा:</strong><br> <span class="or-output" data-value=" /delivery/group_note/default_chw_sms_text "> </span></span><span lang="id" class="question-label " data-itext-id="/delivery/group_note/default_chw_sms_note:label"><strong>Pesan ini akan dikirim ke <span class="or-output" data-value=" /delivery/chw_name "> </span> (<span class="or-output" data-value=" /delivery/chw_phone "> </span>):</strong><br> <span class="or-output" data-value=" /delivery/group_note/default_chw_sms_text "> </span></span><span lang="ne" class="question-label " data-itext-id="/delivery/group_note/default_chw_sms_note:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_note/default_chw_sms_note:label">-</span><input type="text" name="/delivery/group_note/default_chw_sms_note" data-type-xml="string" readonly></label><fieldset class="question simple-select or-appearance-hidden ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/group_note/is_sms_edited:label">Would you like to add a personal note to the message?</span><span lang="es" class="question-label " data-itext-id="/delivery/group_note/is_sms_edited:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_note/is_sms_edited:label">Voulez-vous ajouter une note personnelle au message ?</span><span lang="hi" class="question-label " data-itext-id="/delivery/group_note/is_sms_edited:label">क्या आप संदेश में कुछ और कहना चाहते हैं?</span><span lang="id" class="question-label " data-itext-id="/delivery/group_note/is_sms_edited:label">Apakah Anda ingin menambahkan pesan?</span><span lang="ne" class="question-label " data-itext-id="/delivery/group_note/is_sms_edited:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_note/is_sms_edited:label">-</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/group_note/is_sms_edited" data-name="/delivery/group_note/is_sms_edited" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/is_sms_edited/yes:label">Yes</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/is_sms_edited/yes:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/is_sms_edited/yes:label">Oui</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/is_sms_edited/yes:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/is_sms_edited/yes:label">Iya</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/is_sms_edited/yes:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/is_sms_edited/yes:label">-</span></label><label class=""><input type="radio" name="/delivery/group_note/is_sms_edited" data-name="/delivery/group_note/is_sms_edited" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/group_note/is_sms_edited/no:label">No</span><span lang="es" class="option-label " data-itext-id="/delivery/group_note/is_sms_edited/no:label">-</span><span lang="fr" class="option-label " data-itext-id="/delivery/group_note/is_sms_edited/no:label">Non</span><span lang="hi" class="option-label " data-itext-id="/delivery/group_note/is_sms_edited/no:label">नहीं</span><span lang="id" class="option-label " data-itext-id="/delivery/group_note/is_sms_edited/no:label">Tidak</span><span lang="ne" class="option-label " data-itext-id="/delivery/group_note/is_sms_edited/no:label">-</span><span lang="sw" class="option-label " data-itext-id="/delivery/group_note/is_sms_edited/no:label">-</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select or-appearance-multiline "><span lang="en" class="question-label active" data-itext-id="/delivery/group_note/g_chw_sms:label">You can add a personal note to the SMS here:</span><span lang="es" class="question-label " data-itext-id="/delivery/group_note/g_chw_sms:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_note/g_chw_sms:label">Vous pouvez ajouter ici une note personnelle au message.</span><span lang="hi" class="question-label " data-itext-id="/delivery/group_note/g_chw_sms:label">आप यहां संदेश में कुछ और जोड़ सकते हैं:</span><span lang="id" class="question-label " data-itext-id="/delivery/group_note/g_chw_sms:label">Anda dapat menambahkan sesuatu yang lain ke pesan di sini:</span><span lang="ne" class="question-label " data-itext-id="/delivery/group_note/g_chw_sms:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_note/g_chw_sms:label">-</span><span lang="en" class="or-hint active" data-itext-id="/delivery/group_note/g_chw_sms:hint">Messages are limited in length to avoid high SMS costs.</span><span lang="es" class="or-hint " data-itext-id="/delivery/group_note/g_chw_sms:hint">-</span><span lang="fr" class="or-hint " data-itext-id="/delivery/group_note/g_chw_sms:hint">-</span><span lang="hi" class="or-hint " data-itext-id="/delivery/group_note/g_chw_sms:hint"><span class="or-output" data-value=" /delivery/chw_name "> </span> (<span class="or-output" data-value=" /delivery/chw_phone "> </span>) को संदेश भेजा जायेगा | संदेश की लंबाई सीमित है ताकी SMS का मूल्य उच्च ना हो|</span><span lang="id" class="or-hint " data-itext-id="/delivery/group_note/g_chw_sms:hint">Pesan akan dikirim ke <span class="or-output" data-value=" /delivery/chw_name "> </span> (<span class="or-output" data-value=" /delivery/chw_phone "> </span>). Pesan dibatasi panjang untuk menghindari biaya SMS yang tinggi.</span><span lang="ne" class="or-hint " data-itext-id="/delivery/group_note/g_chw_sms:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/delivery/group_note/g_chw_sms:hint">-</span><textarea name="/delivery/group_note/g_chw_sms" data-constraint="string-length(.) &lt;= 715" data-type-xml="string"></textarea><span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/group_note/g_chw_sms:jr:constraintMsg">Your message cannot be longer than 5 SMS messages. Please shorten your message to reduce SMS costs.</span><span lang="es" class="or-constraint-msg " data-itext-id="/delivery/group_note/g_chw_sms:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/delivery/group_note/g_chw_sms:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/delivery/group_note/g_chw_sms:jr:constraintMsg">आपका सन्देश 5 SMS से ऊपर नहीं हो सकता है | कृपया SMS का मूल्य को कम करने के लिए अपना सन्देश छोटा करें |</span><span lang="id" class="or-constraint-msg " data-itext-id="/delivery/group_note/g_chw_sms:jr:constraintMsg">Pesan anda tidak boleh lebih dari 5 pesan SMS. Persingkat pesan Anda untuk mengurangi biaya SMS.</span><span lang="ne" class="or-constraint-msg " data-itext-id="/delivery/group_note/g_chw_sms:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/delivery/group_note/g_chw_sms:jr:constraintMsg">-</span></label>
      </section>
    <section class="or-group-data or-appearance-field-list or-appearance-summary " name="/delivery/group_summary"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/group_summary/submit:label"><h4 style="text-align:center;">Be sure you Submit to complete this action.</h4></span><span lang="es" class="question-label " data-itext-id="/delivery/group_summary/submit:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_summary/submit:label"><h4 style="text-align:center;">Assurez-vous d'avoir soumis pour compléter l'action.</h4></span><span lang="hi" class="question-label " data-itext-id="/delivery/group_summary/submit:label"><h4 style="text-align:center;"> सुनिश्चित कर��ं के यह कार्रवाई पूरा करने के लिए आप सबमिट दबाये |</h4></span><span lang="id" class="question-label " data-itext-id="/delivery/group_summary/submit:label"><h4 style="text-align:center;">Pastikan anda sudah mengirim untuk menyelesaikan tindakan ini.</h4></span><span lang="ne" class="question-label " data-itext-id="/delivery/group_summary/submit:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_summary/submit:label">-</span><input type="text" name="/delivery/group_summary/submit" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-yellow "><span lang="en" class="question-label active" data-itext-id="/delivery/group_summary/r_summary:label">Delivery Details<i class="fa fa-user"></i></span><span lang="es" class="question-label " data-itext-id="/delivery/group_summary/r_summary:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_summary/r_summary:label">Détails de l'accouchement<i class="fa fa-user"></i></span><span lang="hi" class="question-label " data-itext-id="/delivery/group_summary/r_summary:label">डिलीवरी के विवरण<i class="fa fa-user"></i></span><span lang="id" class="question-label " data-itext-id="/delivery/group_summary/r_summary:label">Rincian kelahiran<i class="fa fa-user"></i></span><span lang="ne" class="question-label " data-itext-id="/delivery/group_summary/r_summary:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_summary/r_summary:label">-</span><input type="text" name="/delivery/group_summary/r_summary" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h4 or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/delivery/group_summary/r_patient_info:label"><strong><span class="or-output" data-value=" /delivery/patient_name "> </span></strong><br>ID: <span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span></span><span lang="es" class="question-label " data-itext-id="/delivery/group_summary/r_patient_info:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_summary/r_patient_info:label"><strong><span class="or-output" data-value=" /delivery/patient_name "> </span></strong><br>ID: <span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span></span><span lang="hi" class="question-label " data-itext-id="/delivery/group_summary/r_patient_info:label"><strong><span class="or-output" data-value=" /delivery/patient_name "> </span></strong> ID: <span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span></span><span lang="id" class="question-label " data-itext-id="/delivery/group_summary/r_patient_info:label"><strong><span class="or-output" data-value=" /delivery/patient_name "> </span></strong> ID : <span class="or-output" data-value=" /delivery/group_summary/r_patient_id "> </span></span><span lang="ne" class="question-label " data-itext-id="/delivery/group_summary/r_patient_info:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_summary/r_patient_info:label">-</span><input type="text" name="/delivery/group_summary/r_patient_info" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h5 or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/delivery/group_summary/r_pregnancy_outcome:label">Outcome: <span class="or-output" data-value=" /delivery/group_delivery_summary/display_delivery_outcome "> </span></span><span lang="es" class="question-label " data-itext-id="/delivery/group_summary/r_pregnancy_outcome:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_summary/r_pregnancy_outcome:label">Résultat: <span class="or-output" data-value=" /delivery/group_delivery_summary/display_delivery_outcome "> </span></span><span lang="hi" class="question-label " data-itext-id="/delivery/group_summary/r_pregnancy_outcome:label">परिणाम: <span class="or-output" data-value=" /delivery/group_delivery_summary/display_delivery_outcome "> </span></span><span lang="id" class="question-label " data-itext-id="/delivery/group_summary/r_pregnancy_outcome:label">Hasil: <span class="or-output" data-value=" /delivery/group_delivery_summary/display_delivery_outcome "> </span></span><span lang="ne" class="question-label " data-itext-id="/delivery/group_summary/r_pregnancy_outcome:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_summary/r_pregnancy_outcome:label">-</span><input type="text" name="/delivery/group_summary/r_pregnancy_outcome" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h5 or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/delivery/group_summary/r_birth_date:label">Delivered <span class="or-output" data-value=" /delivery/group_delivery_summary/display_birth_date "> </span> at <span class="or-output" data-value=" /delivery/group_summary/r_delivery_location "> </span></span><span lang="es" class="question-label " data-itext-id="/delivery/group_summary/r_birth_date:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_summary/r_birth_date:label">A accouhé le <span class="or-output" data-value=" /delivery/group_delivery_summary/display_birth_date "> </span> à <span class="or-output" data-value=" /delivery/group_summary/r_delivery_location "> </span></span><span lang="hi" class="question-label " data-itext-id="/delivery/group_summary/r_birth_date:label"><span class="or-output" data-value=" /delivery/group_summary/r_delivery_location "> </span> पे डिलिवरी की गयी <span class="or-output" data-value=" /delivery/group_delivery_summary/display_birth_date "> </span></span><span lang="id" class="question-label " data-itext-id="/delivery/group_summary/r_birth_date:label">Disampaikan <span class="or-output" data-value=" /delivery/group_delivery_summary/display_birth_date "> </span> di <span class="or-output" data-value=" /delivery/group_summary/r_delivery_location "> </span></span><span lang="ne" class="question-label " data-itext-id="/delivery/group_summary/r_birth_date:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_summary/r_birth_date:label">-</span><input type="text" name="/delivery/group_summary/r_birth_date" data-relevant=" /delivery/pregnancy_outcome  != 'miscarriage'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h1 or-appearance-green "><span lang="en" class="question-label active" data-itext-id="/delivery/group_summary/r_followup:label">Follow Up Message <i class="fa fa-envelope"></i></span><span lang="es" class="question-label " data-itext-id="/delivery/group_summary/r_followup:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_summary/r_followup:label">Message de suivi <i class="fa fa-envelope"></i></span><span lang="hi" class="question-label " data-itext-id="/delivery/group_summary/r_followup:label">सुनिश्चित करने के लिए सन्देश <i class="fa fa-envelope"></i></span><span lang="id" class="question-label " data-itext-id="/delivery/group_summary/r_followup:label">Follow Up Pesan <i class="fa fa-envelope"></i></span><span lang="ne" class="question-label " data-itext-id="/delivery/group_summary/r_followup:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_summary/r_followup:label">-</span><input type="text" name="/delivery/group_summary/r_followup" data-relevant=" /delivery/chw_sms  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/group_summary/r_followup_note1:label"><strong>The following will be sent as a SMS to <span class="or-output" data-value=" /delivery/chw_name "> </span> (<span class="or-output" data-value=" /delivery/chw_phone "> </span>)</strong></span><span lang="es" class="question-label " data-itext-id="/delivery/group_summary/r_followup_note1:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_summary/r_followup_note1:label"><strong>Le contenu suivant sera envoyé par SMS à <span class="or-output" data-value=" /delivery/chw_name "> </span> (<span class="or-output" data-value=" /delivery/chw_phone "> </span>)</strong></span><span lang="hi" class="question-label " data-itext-id="/delivery/group_summary/r_followup_note1:label"><strong> ये SMS के रूप में <span class="or-output" data-value=" /delivery/chw_name "> </span> (<span class="or-output" data-value=" /delivery/chw_phone "> </span>) को भेजा जायेगा </strong></span><span lang="id" class="question-label " data-itext-id="/delivery/group_summary/r_followup_note1:label"><strong>Berikut ini akan dikirim sebagai SMS ke <span class="or-output" data-value=" /delivery/chw_name "> </span> (<span class="or-output" data-value=" /delivery/chw_phone "> </span>)</strong></span><span lang="ne" class="question-label " data-itext-id="/delivery/group_summary/r_followup_note1:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_summary/r_followup_note1:label">-</span><input type="text" name="/delivery/group_summary/r_followup_note1" data-relevant=" /delivery/chw_sms  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/group_summary/r_followup_note2:label"> <span class="or-output" data-value=" /delivery/chw_sms "> </span></span><span lang="es" class="question-label " data-itext-id="/delivery/group_summary/r_followup_note2:label">-</span><span lang="fr" class="question-label " data-itext-id="/delivery/group_summary/r_followup_note2:label"> <span class="or-output" data-value=" /delivery/chw_sms "> </span></span><span lang="hi" class="question-label " data-itext-id="/delivery/group_summary/r_followup_note2:label"> <span class="or-output" data-value=" /delivery/chw_sms "> </span></span><span lang="id" class="question-label " data-itext-id="/delivery/group_summary/r_followup_note2:label"> <span class="or-output" data-value=" /delivery/chw_sms "> </span></span><span lang="ne" class="question-label " data-itext-id="/delivery/group_summary/r_followup_note2:label">-</span><span lang="sw" class="question-label " data-itext-id="/delivery/group_summary/r_followup_note2:label">-</span><input type="text" name="/delivery/group_summary/r_followup_note2" data-relevant=" /delivery/chw_sms  != ''" data-type-xml="string" readonly></label>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/delivery/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/chw_name" data-calculate="../inputs/contact/parent/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/chw_phone" data-calculate="../inputs/contact/parent/contact/phone" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/birth_date" data-calculate=" /delivery/group_delivery_summary/g_birth_date " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/delivery_code" data-calculate=" /delivery/group_delivery_summary/g_delivery_code " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/label_delivery_code" data-calculate="jr:choice-name( /delivery/group_delivery_summary/g_delivery_code ,' /delivery/group_delivery_summary/g_delivery_code ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/pregnancy_outcome" data-calculate=" /delivery/group_delivery_summary/g_pregnancy_outcome " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/label_pregnancy_outcome" data-calculate="jr:choice-name( /delivery/group_delivery_summary/g_pregnancy_outcome ,' /delivery/group_delivery_summary/g_pregnancy_outcome ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/chw_sms" data-calculate="if( /delivery/group_note/g_chw_sms  != '', concat( /delivery/group_note/default_chw_sms_text ,concat(' ', /delivery/group_note/g_chw_sms )),  /delivery/group_note/default_chw_sms_text )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/geolocation" data-calculate="concat(../inputs/meta/location/lat, concat(' ', ../inputs/meta/location/long))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/patient_age_in_years" data-calculate="floor( difference-in-months(  /delivery/inputs/contact/date_of_birth , today() ) div 12 )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/patient_contact_phone" data-calculate="coalesce(../inputs/contact/phone,../inputs/contact/parent/contact/phone)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/group_delivery_summary/display_birth_date" data-calculate="format-date ( /delivery/group_delivery_summary/g_birth_date , '%b %e, %Y')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/group_delivery_summary/display_delivery_outcome" data-calculate="jr:choice-name( /delivery/group_delivery_summary/g_pregnancy_outcome ,' /delivery/group_delivery_summary/g_pregnancy_outcome ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/group_note/default_chw_sms_text" data-calculate="jr:choice-name( /delivery/group_note/default_chw_sms ,' /delivery/group_note/default_chw_sms ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/group_summary/r_patient_id" data-calculate="../../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/group_summary/r_delivery_location" data-calculate="jr:choice-name( /delivery/group_delivery_summary/g_delivery_code , ' /delivery/group_delivery_summary/g_delivery_code ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <delivery xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="delivery" prefix="J1!delivery!" version="2022-09-26 12-56">
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
              <patient_id/>
              <name/>
              <date_of_birth>0</date_of_birth>
              <sex/>
              <phone/>
              <parent>
                <contact>
                  <phone/>
                  <name/>
                </contact>
                <parent>
                  <parent>
                    <use_cases/>
                  </parent>
                </parent>
              </parent>
            </contact>
            <meta tag="hidden">
              <location>
                <lat/>
                <long/>
              </location>
            </meta>
          </inputs>
          <patient_uuid tag="hidden"/>
          <patient_id/>
          <patient_name/>
          <chw_name/>
          <chw_phone/>
          <birth_date/>
          <delivery_code/>
          <label_delivery_code/>
          <pregnancy_outcome tag="hidden"/>
          <label_pregnancy_outcome/>
          <chw_sms/>
          <geolocation tag="hidden"/>
          <patient_age_in_years tag="hidden">0</patient_age_in_years>
          <patient_contact_phone tag="hidden"/>
          <group_chw_info tag="hidden">
            <chw_information/>
            <call_button/>
            <still_pregnant/>
          </group_chw_info>
          <group_delivery_summary tag="hidden">
            <g_pregnancy_outcome/>
            <g_delivery_code/>
            <g_birth_date/>
            <display_birth_date/>
            <display_delivery_outcome/>
          </group_delivery_summary>
          <group_note tag="hidden">
            <default_chw_sms/>
            <default_chw_sms_text/>
            <default_chw_sms_note/>
            <is_sms_edited>yes</is_sms_edited>
            <g_chw_sms/>
          </group_note>
          <group_summary tag="hidden">
            <submit/>
            <r_summary/>
            <r_patient_id/>
            <r_delivery_location/>
            <r_patient_info/>
            <r_pregnancy_outcome/>
            <r_birth_date/>
            <r_followup/>
            <r_followup_note1/>
            <r_followup_note2/>
          </group_summary>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </delivery>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Delivery Report</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/delivery/chw_name:label">
            <value>CHW Name</value>
          </text>
          <text id="/delivery/chw_phone:label">
            <value>CHW Phone</value>
          </text>
          <text id="/delivery/chw_sms:label">
            <value>CHW's Note</value>
          </text>
          <text id="/delivery/geolocation:label">
            <value>Location</value>
          </text>
          <text id="/delivery/group_chw_info/call_button:label">
            <value>**Please follow up with <output value=" /delivery/chw_name "/> to see if <output value=" /delivery/patient_name "/> is still pregnant.**
Call: <output value=" /delivery/chw_phone "/></value></text>
          <text id="/delivery/group_chw_info/chw_information:label">
            <value>The birth report for <output value=" /delivery/patient_name "/> has not been recorded.</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/unknown:label">
            <value>I'm not sure</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant:jr:constraintMsg">
            <value>Sorry, the pregnancy must be complete to continue.</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant:label">
            <value>Is <output value=" /delivery/patient_name "/> still pregnant?</value>
          </text>
          <text id="/delivery/group_chw_info:label">
            <value>Missing Birth Report</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg">
            <value>Date must be between a year ago and today</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_birth_date:label">
            <value>Enter Delivery Date</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/f:label">
            <value>Facility</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/ns:label">
            <value>Home with No Skilled Attendant</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/s:label">
            <value>Home with Skilled Attendant</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code:label">
            <value>Location of Delivery</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label">
            <value>Live Birth</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label">
            <value>Miscarriage</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label">
            <value>Still Birth</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome:label">
            <value>Pregnancy Outcome</value>
          </text>
          <text id="/delivery/group_delivery_summary:label">
            <value>Delivery Info</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_facility_birth:label">
            <value>Good news, <output value=" /delivery/chw_name "/>! <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) delivered at the health facility. Please monitor them for danger signs. Thank you!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label">
            <value>Hi <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) had a stillbirth at the health facility. Please support <output value=" /delivery/patient_name "/> during this difficult time. Thank you.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label">
            <value>Hi <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) delivered at home without a skilled attendant. Please monitor them for danger signs. Thank you!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label">
            <value>Hi <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) had a stillbirth at home with no skilled attendant. Please support <output value=" /delivery/patient_name "/> during this difficult time. Thank you.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label">
            <value>Hi <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) delivered at home with a skilled attendant. Please monitor them for danger signs. Thank you!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label">
            <value>Hi <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) had a stillbirth at home with a skilled attendant. Please support <output value=" /delivery/patient_name "/> during this difficult time. Thank you.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_miscarriage:label">
            <value>Hi <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) had a miscarriage at the health facility. Please support <output value=" /delivery/patient_name "/> during this difficult time. Thank you.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/facility_birth:label">
            <value>Good news, <output value=" /delivery/chw_name "/>! <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) has delivered at the health facility. We will alert you when it is time to refer them for PNC. Please monitor them for danger signs. Thank you!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/facility_stillbirth:label">
            <value>Hi <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) had a stillbirth at the health facility. We will alert you when it is time for their PNC visits. Please support <output value=" /delivery/patient_name "/> during this difficult time. Thank you.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_no_sba_birth:label">
            <value>Hi <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) has delivered at home without a skilled attendant. We will alert you when it is time for their PNC visits. Please monitor them for danger signs. Thank you!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label">
            <value>Hi <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) had a stillbirth at home with no skilled attendant. We will alert you when it is time for their PNC visits. Please monitor for danger signs and support <output value=" /delivery/patient_name "/> during this difficult time. Thank you.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_sba_birth:label">
            <value>Hi <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) has delivered at home with a skilled attendant. We will alert you when it is time for their PNC visits. Please monitor them for danger signs. Thank you!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_sba_stillbirth:label">
            <value>Hi <output value=" /delivery/chw_name "/>, we received a report that <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) had a stillbirth at home with a skilled attendant. We will alert you when it is time for their PNC visits. Please monitor for danger signs and support <output value=" /delivery/patient_name "/> during this difficult time. Thank you.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/miscarriage:label">
            <value>Hi <output value=" /delivery/chw_name "/>, we received a report from the facility that <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) had a miscarriage. Please support <output value=" /delivery/patient_name "/> during this difficult time. Thank you.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/still_pregnant:label">
            <value><output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) was seen at the facility and will deliver soon. Please refer her to the health facility for delivery. Thank you.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/unknown:label">
            <value>Hi <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) was seen at the facility for delivery. Thank you.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms:label">
            <value>Default SMS to send to CHW</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms_note:label">
            <value>**The following message will be sent to <output value=" /delivery/chw_name "/> (<output value=" /delivery/chw_phone "/>):**
 <output value=" /delivery/group_note/default_chw_sms_text "/></value></text>
          <text id="/delivery/group_note/g_chw_sms:hint">
            <value>Messages are limited in length to avoid high SMS costs.</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:jr:constraintMsg">
            <value>Your message cannot be longer than 5 SMS messages. Please shorten your message to reduce SMS costs.</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:label">
            <value>You can add a personal note to the SMS here:</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited:label">
            <value>Would you like to add a personal note to the message?</value>
          </text>
          <text id="/delivery/group_note:label">
            <value>Note to the CHW</value>
          </text>
          <text id="/delivery/group_summary/r_birth_date:label">
            <value>Delivered <output value=" /delivery/group_delivery_summary/display_birth_date "/> at <output value=" /delivery/group_summary/r_delivery_location "/></value></text>
          <text id="/delivery/group_summary/r_followup:label">
            <value>Follow Up Message &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/delivery/group_summary/r_followup_note1:label">
            <value>**The following will be sent as a SMS to <output value=" /delivery/chw_name "/> (<output value=" /delivery/chw_phone "/>)**</value>
          </text>
          <text id="/delivery/group_summary/r_followup_note2:label">
            <value><output value=" /delivery/chw_sms "/></value>
          </text>
          <text id="/delivery/group_summary/r_patient_info:label">
            <value>**<output value=" /delivery/patient_name "/>**
ID: <output value=" /delivery/group_summary/r_patient_id "/></value></text>
          <text id="/delivery/group_summary/r_pregnancy_outcome:label">
            <value>Outcome: <output value=" /delivery/group_delivery_summary/display_delivery_outcome "/></value>
          </text>
          <text id="/delivery/group_summary/r_summary:label">
            <value>Delivery Details&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/delivery/group_summary/submit:label">
            <value>&lt;h4 style="text-align:center;"&gt;Be sure you Submit to complete this action.&lt;/h4&gt;</value>
          </text>
          <text id="/delivery/inputs/contact/_id:hint">
            <value>Select a person from list</value>
          </text>
          <text id="/delivery/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/delivery/inputs:label">
            <value>Patient</value>
          </text>
          <text id="/delivery/patient_age_in_years:label">
            <value>Years</value>
          </text>
          <text id="/delivery/patient_contact_phone:label">
            <value>Patient Phone</value>
          </text>
          <text id="/delivery/patient_id:label">
            <value>Patient ID</value>
          </text>
          <text id="/delivery/patient_name:label">
            <value>Patient Name</value>
          </text>
          <text id="/delivery/patient_uuid:label">
            <value>Patient UUID</value>
          </text>
        </translation>
        <translation lang="es">
          <text id="/delivery/chw_name:label">
            <value>-</value>
          </text>
          <text id="/delivery/chw_phone:label">
            <value>-</value>
          </text>
          <text id="/delivery/chw_sms:label">
            <value>-</value>
          </text>
          <text id="/delivery/geolocation:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/call_button:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/chw_information:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/no:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/unknown:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/yes:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_birth_date:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/f:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/ns:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/s:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_facility_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_miscarriage:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/facility_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/facility_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_no_sba_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_sba_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_sba_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/miscarriage:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/still_pregnant:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/unknown:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms_note:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:hint">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited/no:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited/yes:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_birth_date:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_followup:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_followup_note1:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_followup_note2:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_patient_info:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_pregnancy_outcome:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_summary:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/submit:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/contact/_id:hint">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location/lat:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location/long:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_age_in_years:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_contact_phone:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_id:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_name:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_uuid:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="fr">
          <text id="/delivery/chw_name:label">
            <value>Nom de l'ASC</value>
          </text>
          <text id="/delivery/chw_phone:label">
            <value>Téléphone de l'ASC</value>
          </text>
          <text id="/delivery/chw_sms:label">
            <value>Notes de l'ASC</value>
          </text>
          <text id="/delivery/geolocation:label">
            <value>Emplacement</value>
          </text>
          <text id="/delivery/group_chw_info/call_button:label">
            <value>**Merci de faire un suivi avec <output value=" /delivery/chw_name "/> pour voir si <output value=" /delivery/patient_name "/> est toujours enceinte.**
Call: <output value=" /delivery/chw_phone "/></value></text>
          <text id="/delivery/group_chw_info/chw_information:label">
            <value>Le rapport d'accouchement pour <output value=" /delivery/patient_name "/> n'a pas été soumis</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/no:label">
            <value>Non</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/unknown:label">
            <value>Pas sûr</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/yes:label">
            <value>Oui</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant:label">
            <value>Est-ce que <output value=" /delivery/patient_name "/> est toujours enceinte ?</value>
          </text>
          <text id="/delivery/group_chw_info:label">
            <value>Rapport d'accouchement manquant</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_birth_date:label">
            <value>Entrer la date d'accouchement</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/f:label">
            <value>Centre de santé</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/ns:label">
            <value>Domicile sans personnel qualifié</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/s:label">
            <value>Domicile avec personnel qualifié</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code:label">
            <value>Lieu d'accouchement</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label">
            <value>Vivant</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label">
            <value>Fausse couche</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label">
            <value>Mort-né</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome:label">
            <value>Résultat de la grossesse</value>
          </text>
          <text id="/delivery/group_delivery_summary:label">
            <value>Information sur l'accouchement</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_facility_birth:label">
            <value>Bonne nouvelle, <output value=" /delivery/chw_name "/>! <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a accouché au centre de santé. S'il vous plaît surveillez la pour les signes de danger. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label">
            <value>Salut <output value=" /delivery/chw_name "/>! <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a accouché d'un mort-né au centre de santé. S'il vous plaît encouragez la pendant ces moments difficiles. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label">
            <value>Salut <output value=" /delivery/chw_name "/>! <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a accouché à domicile en l'absence d'un personnel qualifié. S'il vous plaît surveillez la pour les signes de danger. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label">
            <value>Salut <output value=" /delivery/chw_name "/>! nous avions été informé que <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a accouché d'un mort-né à domicile en l'absence d'un personnel qualifié. S'il vous plaît surveillez la pour les signes de danger et encouragez la pendant ces moments difficiles. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label">
            <value>Salut <output value=" /delivery/chw_name "/>! <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a accouché à domicile en présence d'un personnel qualifié. S'il vous plaît surveillez la pour les signes de danger. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label">
            <value>Salut <output value=" /delivery/chw_name "/>! nous avions été informé que <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a accouché d'un mort-né à domicile en présence d'un personnel qualifié. S'il vous plaît surveillez la pour les signes de danger et encouragez la pendant ces moments difficiles. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_miscarriage:label">
            <value>Salut <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a fait une fausse couche au centre de santé. S'il vous plaît encouragez la pendant ces moments difficiles. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/facility_birth:label">
            <value>Bonne nouvelle, <output value=" /delivery/chw_name "/>! <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a accouché au centre de santé. Nous vous avertirons lorsqu'il est temps de la référer pour les CPoN. S'il vous plaît surveillez la pour les signes de danger. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/facility_stillbirth:label">
            <value>Salut <output value=" /delivery/chw_name "/>! <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a accouché d'un mort-né au centre de santé. Nous vous avertirons lorsqu'il est temps de la référer pour les CPoN. S'il vous plaît encouragez la pendant ces moments difficiles. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_no_sba_birth:label">
            <value>Salut <output value=" /delivery/chw_name "/>! <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a accouché à domicile en l'absence d'un personnel qualifié. Nous vous avertirons lorsqu'il est temps de la référer pour les CPoN. S'il vous plaît surveillez la pour les signes de danger. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label">
            <value>Salut <output value=" /delivery/chw_name "/>! nous avions été informé que <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a accouché d'un mort-né à domicile en l'absence d'un personnel qualifié. Nous vous avertirons lorsqu'il est temps de la référer pour les CPoN. S'il vous plaît surveillez la pour les signes de danger et encouragez la pendant ces moments difficiles. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_sba_birth:label">
            <value>Salut <output value=" /delivery/chw_name "/>! <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a accouché à domicile en présence d'un personnel qualifié. Nous vous avertirons lorsqu'il est temps de la référer pour les CPoN. S'il vous plaît surveillez la pour les signes de danger. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_sba_stillbirth:label">
            <value>Salut <output value=" /delivery/chw_name "/>! nous avions été informé que <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a accouché d'un mort-né à domicile en présence d'un personnel qualifié. Nous vous avertirons lorsqu'il est temps de la référer pour les CPoN. S'il vous plaît surveillez la pour les signes de danger et encouragez la pendant ces moments difficiles. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/miscarriage:label">
            <value>Salut <output value=" /delivery/chw_name "/>! nous avions été informé par le centre de santé que <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a fait une fausse couche. S'il vous plaît encouragez la pendant ces moments difficiles. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/still_pregnant:label">
            <value><output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a été au centre de santé et va accoucher bientôt. S'il vous plaît référez la au centre de santé pour son accouchement. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/unknown:label">
            <value>Salut <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) a été au centre de santé pour son accouchement. Merci !</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms:label">
            <value>Message à envoyer à l'ASC</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms_note:label">
            <value>**Le message suivant sera envoyé à <output value=" /delivery/chw_name "/> (<output value=" /delivery/chw_phone "/>):**
 <output value=" /delivery/group_note/default_chw_sms_text "/></value></text>
          <text id="/delivery/group_note/g_chw_sms:hint">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:label">
            <value>Vous pouvez ajouter ici une note personnelle au message.</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited/no:label">
            <value>Non</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited/yes:label">
            <value>Oui</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited:label">
            <value>Voulez-vous ajouter une note personnelle au message ?</value>
          </text>
          <text id="/delivery/group_note:label">
            <value>Notes à l'ASC</value>
          </text>
          <text id="/delivery/group_summary/r_birth_date:label">
            <value>A accouhé le <output value=" /delivery/group_delivery_summary/display_birth_date "/> à <output value=" /delivery/group_summary/r_delivery_location "/></value></text>
          <text id="/delivery/group_summary/r_followup:label">
            <value>Message de suivi &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/delivery/group_summary/r_followup_note1:label">
            <value>**Le contenu suivant sera envoyé par SMS à <output value=" /delivery/chw_name "/> (<output value=" /delivery/chw_phone "/>)**</value>
          </text>
          <text id="/delivery/group_summary/r_followup_note2:label">
            <value><output value=" /delivery/chw_sms "/></value>
          </text>
          <text id="/delivery/group_summary/r_patient_info:label">
            <value>**<output value=" /delivery/patient_name "/>**
ID: <output value=" /delivery/group_summary/r_patient_id "/></value></text>
          <text id="/delivery/group_summary/r_pregnancy_outcome:label">
            <value>Résultat: <output value=" /delivery/group_delivery_summary/display_delivery_outcome "/></value>
          </text>
          <text id="/delivery/group_summary/r_summary:label">
            <value>Détails de l'accouchement&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/delivery/group_summary/submit:label">
            <value>&lt;h4 style="text-align:center;"&gt;Assurez-vous d'avoir soumis pour compléter l'action.&lt;/h4&gt;</value>
          </text>
          <text id="/delivery/inputs/contact/_id:hint">
            <value>Sélectionnez une personne dans la liste</value>
          </text>
          <text id="/delivery/inputs/contact/_id:label">
            <value>Quel est le nom du patient ?</value>
          </text>
          <text id="/delivery/inputs/meta/location/lat:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location/long:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs:label">
            <value>Patient</value>
          </text>
          <text id="/delivery/patient_age_in_years:label">
            <value>Années</value>
          </text>
          <text id="/delivery/patient_contact_phone:label">
            <value>Tépéhone du patient</value>
          </text>
          <text id="/delivery/patient_id:label">
            <value>ID du patient</value>
          </text>
          <text id="/delivery/patient_name:label">
            <value>Nom du patient</value>
          </text>
          <text id="/delivery/patient_uuid:label">
            <value>UUID du patient</value>
          </text>
        </translation>
        <translation lang="hi">
          <text id="/delivery/chw_name:label">
            <value>सामुदायिक स्वास्थ्य कर्मी का नाम</value>
          </text>
          <text id="/delivery/chw_phone:label">
            <value>सामुदायिक स्वास्थ्य कर्मी का फोन नंबर</value>
          </text>
          <text id="/delivery/chw_sms:label">
            <value>सामुदायिक स्वास्थ्य कर्मी का नोट</value>
          </text>
          <text id="/delivery/geolocation:label">
            <value>स्थान</value>
          </text>
          <text id="/delivery/group_chw_info/call_button:label">
            <value>**कृपया <output value=" /delivery/chw_name "/> के साथ मिल कर देखे के <output value=" /delivery/patient_name "/> अभी भी गर्भवती है |** कॉल: <output value=" /delivery/chw_phone "/></value></text>
          <text id="/delivery/group_chw_info/chw_information:label">
            <value><output value=" /delivery/patient_name "/> के लिए जन्म की रिपोर्ट दर्ज नहीं की गयी है</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/no:label">
            <value>नहीं</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/unknown:label">
            <value>पता नहीं</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/yes:label">
            <value>हाँ</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant:jr:constraintMsg">
            <value>माफ़ कीजिये, आगे बढ़ने से पहले गर्भावस्था को पूरा करना होगा</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant:label">
            <value>क्या <output value=" /delivery/patient_name "/> अभी भी गर्भवती है?</value>
          </text>
          <text id="/delivery/group_chw_info:label">
            <value>लापता जन्म की रिपोर्ट</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg">
            <value>तारीख एक साल पहले और आज के बीच में होनी चाहिए</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_birth_date:label">
            <value>डिलीवरी की तारीख दर्ज करें</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/f:label">
            <value>स्वास्थ्य केंद्र</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/ns:label">
            <value>घर पर, अनुभवी दाई के सहायता के बिना</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/s:label">
            <value>घर पर, अनुभवी दाई के सहायता के साथ</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code:label">
            <value>डिलीवरी कि स्थान</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label">
            <value>जीवित जन्म</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label">
            <value>गर्भपात</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label">
            <value>मृत जन्म</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome:label">
            <value>गर्भावस्था का परिणाम</value>
          </text>
          <text id="/delivery/group_delivery_summary:label">
            <value>डिलीवरी की जानकारी</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_facility_birth:label">
            <value>खुशखबरी, <output value=" /delivery/chw_name "/>! <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) की स्वास्थ्य केंद्र में डिलीवरी हो चुकी है| कृपया उनकी खतरे के संकेत पे निगरानी रखें | धन्यवाद!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label">
            <value>नमस्ते <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) का बच्चा का स्वास्थ्य केंद्र में मृत जन्म हुआ | कृपया इस मुश्किल समय में <output value=" /delivery/patient_name "/> को सहारा दे | धन्यवाद |</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label">
            <value>नमस्ते <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) की घर पर, अनुभवी दाई के बिना डिलिवरी हो चुकी है | कृपया उनकी खतरे के संकेत पे निगरानी रखें| धन्यवाद!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label">
            <value>नमस्ते <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) का बच्चा का मृत जन्म हुआ घर पर, अनुभवी दाई के बिना | कृपया इस मुश्किल समय में <output value=" /delivery/patient_name "/> को सहारा दे | धन्यवाद |</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label">
            <value>नमस्ते <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) की घर पर, अनुभवी दाई के साथ डिलिवरी हो चुकी है | कृपया उनकी खतरे के संकेत पे निगरानी रखें| धन्यवाद!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label">
            <value>नमस्ते <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) का बच्चा का मृत जन्म हुआ घर पर, अनुभवी दाई के साथ | कृपया इस मुश्किल समय में <output value=" /delivery/patient_name "/> को सहारा दे | धन्यवाद |</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_miscarriage:label">
            <value>नमस्ते <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) का स्वास्थ्य केंद्र में गर्भपात हुआ | कृपया इस मुश्किल समय में <output value=" /delivery/patient_name "/> को सहारा दे | धन्यवाद |</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/facility_birth:label">
            <value>खुशखबरी, <output value=" /delivery/chw_name "/>! <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) की स्वास्थ्य केंद्र में डिलीवरी हो चुकी है| जब उनकी गर्भावस्था की बाद की जांच का समय आएगा, हम आपको सूचित करेंगे | कृपया उनकी खतरे के संकेत पे निगरानी रखें | धन्यवाद!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/facility_stillbirth:label">
            <value>नमस्ते <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) का बच्चा का स्वास्थ्य केंद्र में मृत जन्म हुआ | जब उनकी गर्भावस्था की बाद की जांच का समय आएगा, हम आपको सूचित करेंगे | कृपया उनकी खतरे के संकेत पे निगरानी रखें और इस मुश्किल समय में <output value=" /delivery/patient_name "/> को सहारा दे | धन्यवाद |</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_no_sba_birth:label">
            <value>नमस्ते <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) की घर पर, अनुभवी दाई के बिना डिलिवरी हो चुकी है | जब उनकी गर्भावस्था की बाद की जांच का समय आएगा, हम आपको सूचित करेंगे | कृपया उनकी खतरे के संकेत पे निगरानी रखें| धन्यवाद!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label">
            <value>नमस्ते <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) का बच्चा का मृत जन्म हुआ घर पर, अनुभवी दाई के बिना | जब उनकी गर्भावस्था की बाद की जांच का समय आएगा, हम आपको सूचित करेंगे | कृपया उनकी खतरे के संकेत पे निगरानी रखें और इस मुश्किल समय में <output value=" /delivery/patient_name "/> को सहारा दे | धन्यवाद |</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_sba_birth:label">
            <value>नमस्ते <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) की घर पर, अनुभवी दाई के साथ डिलिवरी हो चुकी है | जब उनकी गर्भावस्था की बाद की जांच का समय आएगा, हम आपको सूचित करेंगे | कृपया उनकी खतरे के संकेत पे निगरानी रखें| धन्यवाद!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_sba_stillbirth:label">
            <value>नमस्ते <output value=" /delivery/chw_name "/>, हमें रिपोर्ट मिली है के <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) का बच्चा का मृत जन्म हुआ घर पर, अनुभवी दाई के साथ | जब उनकी गर्भावस्था की बाद की जांच का समय आएगा, हम आपको सूचित करेंगे | कृपया उनकी खतरे के संकेत पे निगरानी रखें और इस मुश्किल समय में <output value=" /delivery/patient_name "/> को सहारा दे | धन्यवाद |</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/miscarriage:label">
            <value>नमस्ते <output value=" /delivery/chw_name "/>, हमें स्वास्थ्य केंद्र से रिपोर्ट मिली है के <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) का गर्भपात हुआ | कृपया इस मुश्किल समय में <output value=" /delivery/patient_name "/> को सहारा दे | धन्यवाद |</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/still_pregnant:label">
            <value><output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) की स्वास्थ्य केंद्र में जांच हुई है और जल्द ही उसकी डिलीवरी होगी | कृपया उसे डिलीवरी के लिए स्वास्थ्य केंद्र भेजें | धन्यवाद |</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/unknown:label">
            <value>नमस्ते <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) की डिलीवरी के लिए जांच स्वास्थ्य केंद्र में हो चुकी है |</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms_note:label">
            <value>**यह संदेश <output value=" /delivery/chw_name "/> (<output value=" /delivery/chw_phone "/>) को भेजा जाएगा:**
 <output value=" /delivery/group_note/default_chw_sms_text "/></value></text>
          <text id="/delivery/group_note/g_chw_sms:hint">
            <value><output value=" /delivery/chw_name "/> (<output value=" /delivery/chw_phone "/>) को संदेश भेजा जायेगा | संदेश की लंबाई सीमित है ताकी SMS का मूल्य उच्च ना हो|</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:jr:constraintMsg">
            <value>आपका सन्देश 5 SMS से ऊपर नहीं हो सकता है | कृपया SMS का मूल्य को कम करने के लिए अपना सन्देश छोटा करें |</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:label">
            <value>आप यहां संदेश में कुछ और जोड़ सकते हैं:</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited/no:label">
            <value>नहीं</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited/yes:label">
            <value>हाँ</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited:label">
            <value>क्या आप संदेश में कुछ और कहना चाहते हैं?</value>
          </text>
          <text id="/delivery/group_note:label">
            <value>सामुदायिक स्वास्थ्य कर्मी के लिए नोट</value>
          </text>
          <text id="/delivery/group_summary/r_birth_date:label">
            <value><output value=" /delivery/group_summary/r_delivery_location "/> पे डिलिवरी की गयी <output value=" /delivery/group_delivery_summary/display_birth_date "/></value></text>
          <text id="/delivery/group_summary/r_followup:label">
            <value>सुनिश्चित करने के लिए सन्देश &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/delivery/group_summary/r_followup_note1:label">
            <value>** ये SMS के रूप में <output value=" /delivery/chw_name "/> (<output value=" /delivery/chw_phone "/>) को भेजा जायेगा **</value>
          </text>
          <text id="/delivery/group_summary/r_followup_note2:label">
            <value><output value=" /delivery/chw_sms "/></value>
          </text>
          <text id="/delivery/group_summary/r_patient_info:label">
            <value>**<output value=" /delivery/patient_name "/>** ID: <output value=" /delivery/group_summary/r_patient_id "/></value></text>
          <text id="/delivery/group_summary/r_pregnancy_outcome:label">
            <value>परिणाम: <output value=" /delivery/group_delivery_summary/display_delivery_outcome "/></value>
          </text>
          <text id="/delivery/group_summary/r_summary:label">
            <value>डिलीवरी के विवरण&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/delivery/group_summary/submit:label">
            <value>&lt;h4 style="text-align:center;"&gt; सुनिश्चित करें के यह कार्रवाई पूरा करने के लिए आप सबमिट दबाये |&lt;/h4&gt;</value>
          </text>
          <text id="/delivery/inputs/contact/_id:hint">
            <value>सूची में से एक व्यक्ति को चुनें</value>
          </text>
          <text id="/delivery/inputs/contact/_id:label">
            <value>मरीज का नाम क्या है?</value>
          </text>
          <text id="/delivery/inputs/meta/location/lat:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location/long:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs:label">
            <value>मरीज</value>
          </text>
          <text id="/delivery/patient_age_in_years:label">
            <value>साल</value>
          </text>
          <text id="/delivery/patient_contact_phone:label">
            <value>मरीज का फोन नंबर</value>
          </text>
          <text id="/delivery/patient_id:label">
            <value>मरीज का ID</value>
          </text>
          <text id="/delivery/patient_name:label">
            <value>मरीज का नाम</value>
          </text>
          <text id="/delivery/patient_uuid:label">
            <value>मरीज UUID</value>
          </text>
        </translation>
        <translation lang="id">
          <text id="/delivery/chw_name:label">
            <value>Nama Kader</value>
          </text>
          <text id="/delivery/chw_phone:label">
            <value>Nomor Telepon Kader</value>
          </text>
          <text id="/delivery/chw_sms:label">
            <value>Catatan kader</value>
          </text>
          <text id="/delivery/geolocation:label">
            <value>Tempat</value>
          </text>
          <text id="/delivery/group_chw_info/call_button:label">
            <value>**Ikuti dengan <output value=" /delivery/chw_name "/> untuk melihat apakah <output value=" /delivery/patient_name "/> masih hamil.** Sebut: <output value=" /delivery/chw_phone "/></value></text>
          <text id="/delivery/group_chw_info/chw_information:label">
            <value>Laporan kelahiran untuk <output value=" /delivery/patient_name "/> belum terdata.</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/no:label">
            <value>Tidak</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/unknown:label">
            <value>Tidak yakin</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/yes:label">
            <value>Iya</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant:jr:constraintMsg">
            <value>Maaf, kehamilan harus diselesaikan sebelum melanjutkan.</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant:label">
            <value>Apakah <output value=" /delivery/patient_name "/> masih hamil?</value>
          </text>
          <text id="/delivery/group_chw_info:label">
            <value>Laporan Kelahiran Hilang</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg">
            <value>Tanggal harus antara satu tahun yang lalu dan hari ini.</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_birth_date:label">
            <value>Masukkan tanggal persalinan</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/f:label">
            <value>Fasilitas kesehatan</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/ns:label">
            <value>Rumah tanpa dukun bersalin</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/s:label">
            <value>Rumah dengan dukun bersalin</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code:label">
            <value>Lokasi persalinan</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label">
            <value>Kelahiran hidup</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label">
            <value>Keguguran</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label">
            <value>Kelahiran mati</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome:label">
            <value>Kehamilan hasil</value>
          </text>
          <text id="/delivery/group_delivery_summary:label">
            <value>Informasi persalinan</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_facility_birth:label">
            <value>Berita baik, <output value=" /delivery/chw_name "/>! <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) telah melahirkan di fasilitas kesehatan. Silahkan kunjungi mereka dalam 40 hari kedepan untuk memantau tanda-tanda bahaya. Terima kasih!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label">
            <value>Halo <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) telah melahirkan di fasilitas kesehatan namun anaknya meninggal. Mohon dukungan untuk <output value=" /delivery/patient_name "/> selama masa sulit ini. Terima kasih.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label">
            <value>Halo <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) telah melahirkan di rumah tanpa dukun bersalin. Silahkan kunjungi mereka dalam 40 hari kedepan untuk memantau tanda-tanda bahaya. Terima kasih!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label">
            <value>Halo <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) telah melahirkan di rumah tanpa bantuan dukun bersalin tapi naknya meninggal. Mohon dukungan untuk<output value=" /delivery/patient_name "/> selama masa sulit ini. Terima kasih.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label">
            <value>Halo <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) telah melahirkan di rumah dengan bantuan dukun bersalin. Silahkan kunjungi mereka dalam 40 hari kedepan untuk memantau tanda-tanda bahaya.. Terima kasih!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label">
            <value>Halo <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) telah melahirkan di rumah dengan dukun bersalin tapi anaknya meninggal. Mohon dukungan untuk <output value=" /delivery/patient_name "/> selama masa sulit ini. Terima kasih.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_miscarriage:label">
            <value>Halo <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) memiliki keguguran di fasilitas kesehatan. Silahkan mendukung <output value=" /delivery/patient_name "/> selama masa sulit ini. Terima kasih.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/facility_birth:label">
            <value>Berita baik, <output value=" /delivery/chw_name "/>! <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) telah melahirkan di fasilitas kesehatan. Kami akan mengingatkan Anda bila waktu untuk merujuk mereka untuk PNC. Silahkan memantau mereka untuk tanda-tanda bahaya. Terima kasih!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/facility_stillbirth:label">
            <value>Halo <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) memiliki kelahiran mati di fasilitas. Kami akan mengingatkan Anda bila waktu untuk merujuk mereka untuk PNC. Silahkan mendukung <output value=" /delivery/patient_name "/> selama masa sulit ini. Terima kasih.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_no_sba_birth:label">
            <value>Halo <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) telah melahirkan di rumah tanpa dukun bersalin. Kami akan mengingatkan Anda bila waktu untuk merujuk mereka untuk PNC. Silahkan memantau mereka untuk tanda-tanda bahaya. Terima kasih!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label">
            <value>Halo <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) memiliki kelahiran mati di rumah tanpa dukun bersalin. Kami akan mengingatkan Anda bila waktu untuk merujuk mereka untuk PNC. Silahkan memantau mereka untuk tanda-tanda bahaya dan mendukung <output value=" /delivery/patient_name "/> selama masa sulit ini. Terima kasih.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_sba_birth:label">
            <value>Halo <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) telah melahirkan di rumah dengan dukun bersalin. Kami akan mengingatkan Anda bila waktu untuk merujuk mereka untuk PNC. Silahkan memantau mereka untuk tanda-tanda bahaya. Terima kasih!</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_sba_stillbirth:label">
            <value>Halo <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) memiliki kelahiran mati di rumah dengan dukun bersalin. Kami akan mengingatkan Anda bila waktu untuk merujuk mereka untuk PNC. Silahkan memantau mereka untuk tanda-tanda bahaya dan mendukung <output value=" /delivery/patient_name "/> selama masa sulit ini. Terima kasih.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/miscarriage:label">
            <value>Halo <output value=" /delivery/chw_name "/>, kami menerima laporan dari fasilitas yang <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) memiliki keguguran. Silahkan mendukung <output value=" /delivery/patient_name "/> selama masa sulit ini. Terima kasih.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/still_pregnant:label">
            <value><output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) Telah berkunjung ke fasilitas kesehatan dan diperkirakan akan segera melahirkan. Mohon segera dirujuk ke Puskesmas. Terima kasih.)</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/unknown:label">
            <value>Halo <output value=" /delivery/chw_name "/>, <output value=" /delivery/patient_name "/> (<output value=" /delivery/group_summary/r_patient_id "/>) telah datang ke fasilitas untuk persalinan. Terima kasih.</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms_note:label">
            <value>**Pesan ini akan dikirim ke <output value=" /delivery/chw_name "/> (<output value=" /delivery/chw_phone "/>):**
 <output value=" /delivery/group_note/default_chw_sms_text "/></value></text>
          <text id="/delivery/group_note/g_chw_sms:hint">
            <value>Pesan akan dikirim ke <output value=" /delivery/chw_name "/> (<output value=" /delivery/chw_phone "/>). Pesan dibatasi panjang untuk menghindari biaya SMS yang tinggi.</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:jr:constraintMsg">
            <value>Pesan anda tidak boleh lebih dari 5 pesan SMS. Persingkat pesan Anda untuk mengurangi biaya SMS.</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:label">
            <value>Anda dapat menambahkan sesuatu yang lain ke pesan di sini:</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited/no:label">
            <value>Tidak</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited/yes:label">
            <value>Iya</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited:label">
            <value>Apakah Anda ingin menambahkan pesan?</value>
          </text>
          <text id="/delivery/group_note:label">
            <value>Catatan ke kader</value>
          </text>
          <text id="/delivery/group_summary/r_birth_date:label">
            <value>Disampaikan <output value=" /delivery/group_delivery_summary/display_birth_date "/> di <output value=" /delivery/group_summary/r_delivery_location "/></value></text>
          <text id="/delivery/group_summary/r_followup:label">
            <value>Follow Up Pesan &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/delivery/group_summary/r_followup_note1:label">
            <value>**Berikut ini akan dikirim sebagai SMS ke <output value=" /delivery/chw_name "/> (<output value=" /delivery/chw_phone "/>)**</value>
          </text>
          <text id="/delivery/group_summary/r_followup_note2:label">
            <value><output value=" /delivery/chw_sms "/></value>
          </text>
          <text id="/delivery/group_summary/r_patient_info:label">
            <value>**<output value=" /delivery/patient_name "/>** ID : <output value=" /delivery/group_summary/r_patient_id "/></value></text>
          <text id="/delivery/group_summary/r_pregnancy_outcome:label">
            <value>Hasil: <output value=" /delivery/group_delivery_summary/display_delivery_outcome "/></value>
          </text>
          <text id="/delivery/group_summary/r_summary:label">
            <value>Rincian kelahiran&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/delivery/group_summary/submit:label">
            <value>&lt;h4 style="text-align:center;"&gt;Pastikan anda sudah mengirim untuk menyelesaikan tindakan ini.&lt;/h4&gt;</value>
          </text>
          <text id="/delivery/inputs/contact/_id:hint">
            <value>Pilih orang dari daftar</value>
          </text>
          <text id="/delivery/inputs/contact/_id:label">
            <value>Apa nama pasien?</value>
          </text>
          <text id="/delivery/inputs/meta/location/lat:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location/long:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs:label">
            <value>Pasien</value>
          </text>
          <text id="/delivery/patient_age_in_years:label">
            <value>Umur</value>
          </text>
          <text id="/delivery/patient_contact_phone:label">
            <value>Nomor Telepon Pasien</value>
          </text>
          <text id="/delivery/patient_id:label">
            <value>Pasien ID</value>
          </text>
          <text id="/delivery/patient_name:label">
            <value>Nama Pasien</value>
          </text>
          <text id="/delivery/patient_uuid:label">
            <value>Pasien UUID</value>
          </text>
        </translation>
        <translation lang="ne">
          <text id="/delivery/chw_name:label">
            <value>-</value>
          </text>
          <text id="/delivery/chw_phone:label">
            <value>-</value>
          </text>
          <text id="/delivery/chw_sms:label">
            <value>-</value>
          </text>
          <text id="/delivery/geolocation:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/call_button:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/chw_information:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/no:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/unknown:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/yes:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_birth_date:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/f:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/ns:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/s:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_facility_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_miscarriage:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/facility_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/facility_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_no_sba_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_sba_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_sba_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/miscarriage:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/still_pregnant:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/unknown:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms_note:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:hint">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited/no:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited/yes:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_birth_date:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_followup:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_followup_note1:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_followup_note2:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_patient_info:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_pregnancy_outcome:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_summary:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/submit:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/contact/_id:hint">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location/lat:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location/long:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_age_in_years:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_contact_phone:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_id:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_name:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_uuid:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="sw">
          <text id="/delivery/chw_name:label">
            <value>-</value>
          </text>
          <text id="/delivery/chw_phone:label">
            <value>-</value>
          </text>
          <text id="/delivery/chw_sms:label">
            <value>-</value>
          </text>
          <text id="/delivery/geolocation:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/call_button:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/chw_information:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/no:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/unknown:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant/yes:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info/still_pregnant:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_chw_info:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_birth_date:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/f:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/ns:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code/s:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_delivery_code:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary/g_pregnancy_outcome:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_delivery_summary:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_facility_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/anc_only_miscarriage:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/facility_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/facility_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_no_sba_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_sba_birth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/home_sba_stillbirth:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/miscarriage:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/still_pregnant:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms/unknown:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/default_chw_sms_note:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:hint">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/g_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited/no:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited/yes:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note/is_sms_edited:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_note:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_birth_date:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_followup:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_followup_note1:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_followup_note2:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_patient_info:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_pregnancy_outcome:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/r_summary:label">
            <value>-</value>
          </text>
          <text id="/delivery/group_summary/submit:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/contact/_id:hint">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location/lat:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location/long:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta/location:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs/meta:label">
            <value>-</value>
          </text>
          <text id="/delivery/inputs:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_age_in_years:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_contact_phone:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_id:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_name:label">
            <value>-</value>
          </text>
          <text id="/delivery/patient_uuid:label">
            <value>-</value>
          </text>
        </translation>
      </itext>
      <instance>
        <delivery delimiter="#" id="delivery" prefix="J1!delivery!" version="2022-09-26 12-56">
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
              <patient_id/>
              <name/>
              <date_of_birth>0</date_of_birth>
              <sex/>
              <phone/>
              <parent>
                <contact>
                  <phone/>
                  <name/>
                </contact>
                <parent>
                  <parent>
                    <use_cases/>
                  </parent>
                </parent>
              </parent>
            </contact>
            <meta tag="hidden">
              <location>
                <lat/>
                <long/>
              </location>
            </meta>
          </inputs>
          <patient_uuid tag="hidden"/>
          <patient_id/>
          <patient_name/>
          <chw_name/>
          <chw_phone/>
          <birth_date/>
          <delivery_code/>
          <label_delivery_code/>
          <pregnancy_outcome tag="hidden"/>
          <label_pregnancy_outcome/>
          <chw_sms/>
          <geolocation tag="hidden"/>
          <patient_age_in_years tag="hidden">0</patient_age_in_years>
          <patient_contact_phone tag="hidden"/>
          <group_chw_info tag="hidden">
            <chw_information/>
            <call_button/>
            <still_pregnant/>
          </group_chw_info>
          <group_delivery_summary tag="hidden">
            <g_pregnancy_outcome/>
            <g_delivery_code/>
            <g_birth_date/>
            <display_birth_date/>
            <display_delivery_outcome/>
          </group_delivery_summary>
          <group_note tag="hidden">
            <default_chw_sms/>
            <default_chw_sms_text/>
            <default_chw_sms_note/>
            <is_sms_edited>yes</is_sms_edited>
            <g_chw_sms/>
          </group_note>
          <group_summary tag="hidden">
            <submit/>
            <r_summary/>
            <r_patient_id/>
            <r_delivery_location/>
            <r_patient_info/>
            <r_pregnancy_outcome/>
            <r_birth_date/>
            <r_followup/>
            <r_followup_note1/>
            <r_followup_note2/>
          </group_summary>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </delivery>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/delivery/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/delivery/inputs/source" type="string"/>
      <bind nodeset="/delivery/inputs/source_id" type="string"/>
      <bind nodeset="/delivery/inputs/contact/_id" required="true()" type="db:person"/>
      <bind nodeset="/delivery/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/delivery/inputs/contact/name" type="string"/>
      <bind nodeset="/delivery/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/delivery/inputs/contact/sex" type="string"/>
      <bind nodeset="/delivery/inputs/contact/phone" type="string"/>
      <bind nodeset="/delivery/inputs/contact/parent/contact/phone" type="string"/>
      <bind nodeset="/delivery/inputs/contact/parent/contact/name" type="string"/>
      <bind nodeset="/delivery/inputs/contact/parent/parent/parent/use_cases" type="string"/>
      <bind nodeset="/delivery/inputs/meta/location/lat" type="string"/>
      <bind nodeset="/delivery/inputs/meta/location/long" type="string"/>
      <bind calculate="../inputs/contact/_id" nodeset="/delivery/patient_uuid" type="string"/>
      <bind calculate="../inputs/contact/patient_id" nodeset="/delivery/patient_id" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/delivery/patient_name" type="string"/>
      <bind calculate="../inputs/contact/parent/contact/name" nodeset="/delivery/chw_name" type="string"/>
      <bind calculate="../inputs/contact/parent/contact/phone" nodeset="/delivery/chw_phone" type="string"/>
      <bind calculate=" /delivery/group_delivery_summary/g_birth_date " nodeset="/delivery/birth_date" type="string"/>
      <bind calculate=" /delivery/group_delivery_summary/g_delivery_code " nodeset="/delivery/delivery_code" type="string"/>
      <bind calculate="jr:choice-name( /delivery/group_delivery_summary/g_delivery_code ,' /delivery/group_delivery_summary/g_delivery_code ')" nodeset="/delivery/label_delivery_code" type="string"/>
      <bind calculate=" /delivery/group_delivery_summary/g_pregnancy_outcome " nodeset="/delivery/pregnancy_outcome" type="string"/>
      <bind calculate="jr:choice-name( /delivery/group_delivery_summary/g_pregnancy_outcome ,' /delivery/group_delivery_summary/g_pregnancy_outcome ')" nodeset="/delivery/label_pregnancy_outcome" type="string"/>
      <bind calculate="if( /delivery/group_note/g_chw_sms  != '', concat( /delivery/group_note/default_chw_sms_text ,concat('
', /delivery/group_note/g_chw_sms )),  /delivery/group_note/default_chw_sms_text )" nodeset="/delivery/chw_sms" type="string"/>
      <bind calculate="concat(../inputs/meta/location/lat, concat(' ', ../inputs/meta/location/long))" nodeset="/delivery/geolocation" type="string"/>
      <bind calculate="floor( difference-in-months(  /delivery/inputs/contact/date_of_birth , today() ) div 12 )" nodeset="/delivery/patient_age_in_years" type="string"/>
      <bind calculate="coalesce(../inputs/contact/phone,../inputs/contact/parent/contact/phone)" nodeset="/delivery/patient_contact_phone" type="string"/>
      <bind nodeset="/delivery/group_chw_info" relevant=" /delivery/inputs/source  = 'task'"/>
      <bind nodeset="/delivery/group_chw_info/chw_information" readonly="true()" type="string"/>
      <bind nodeset="/delivery/group_chw_info/call_button" readonly="true()" type="string"/>
      <bind constraint="selected(.,'no')" jr:constraintMsg="jr:itext('/delivery/group_chw_info/still_pregnant:jr:constraintMsg')" nodeset="/delivery/group_chw_info/still_pregnant" required="true()" type="select1"/>
      <bind nodeset="/delivery/group_delivery_summary" relevant="selected(coalesce( /delivery/group_chw_info/still_pregnant , 'no'), 'no')"/>
      <bind nodeset="/delivery/group_delivery_summary/g_pregnancy_outcome" required="true()" type="select1"/>
      <bind nodeset="/delivery/group_delivery_summary/g_delivery_code" relevant=" /delivery/group_delivery_summary/g_pregnancy_outcome  != 'miscarriage'" required="true()" type="select1"/>
      <bind constraint="(decimal-date-time(.) &lt;= decimal-date-time(now())) and ((decimal-date-time(now()) - decimal-date-time(.)) &lt; 365)" jr:constraintMsg="jr:itext('/delivery/group_delivery_summary/g_birth_date:jr:constraintMsg')" nodeset="/delivery/group_delivery_summary/g_birth_date" relevant=" /delivery/group_delivery_summary/g_pregnancy_outcome  != 'miscarriage'" type="date"/>
      <bind calculate="format-date ( /delivery/group_delivery_summary/g_birth_date , '%b %e, %Y')" nodeset="/delivery/group_delivery_summary/display_birth_date" type="string"/>
      <bind calculate="jr:choice-name( /delivery/group_delivery_summary/g_pregnancy_outcome ,' /delivery/group_delivery_summary/g_pregnancy_outcome ')" nodeset="/delivery/group_delivery_summary/display_delivery_outcome" type="string"/>
      <bind calculate="if(coalesce( /delivery/group_chw_info/still_pregnant , 'no') = 'yes',
 'still_pregnant',
 if( /delivery/inputs/contact/parent/parent/parent/use_cases  = 'anc',
 if( /delivery/pregnancy_outcome  = 'healthy',
 if( /delivery/delivery_code  = 'f',
 'anc_only_facility_birth',
 if ( /delivery/delivery_code  = 's',
 'anc_only_home_sba_birth',
 'anc_only_home_no_sba_birth'
 )
 ),
 if( /delivery/pregnancy_outcome  = 'still_birth',
 if( /delivery/delivery_code  = 'f',
 'anc_only_facility_stillbirth',
 if( /delivery/delivery_code  = 's',
 'anc_only_home_sba_stillbirth',
 'anc_only_home_no_sba_stillbirth'
 )
 ),
 if( /delivery/pregnancy_outcome  = 'miscarriage',
 'anc_only_miscarriage',
 ''
 )
 )
 ),
 if( /delivery/pregnancy_outcome  = 'healthy',
 if( /delivery/delivery_code  = 'f',
 'facility_birth',
 if ( /delivery/delivery_code  = 's',
 'home_sba_birth',
 'home_no_sba_birth'
 )
 ),
 if( /delivery/pregnancy_outcome  = 'still_birth',
 if( /delivery/delivery_code  = 'f',
 'facility_stillbirth',
 if( /delivery/delivery_code  = 's',
 'home_sba_stillbirth',
 'home_no_sba_stillbirth'
 )
 ),
 if( /delivery/pregnancy_outcome  = 'miscarriage',
 'miscarriage',
 'unknown'
 )
 )
 )
 )
 )" nodeset="/delivery/group_note/default_chw_sms" type="select1"/>
      <bind calculate="jr:choice-name( /delivery/group_note/default_chw_sms ,' /delivery/group_note/default_chw_sms ')" nodeset="/delivery/group_note/default_chw_sms_text" type="string"/>
      <bind nodeset="/delivery/group_note/default_chw_sms_note" readonly="true()" type="string"/>
      <bind nodeset="/delivery/group_note/is_sms_edited" required="true()" type="select1"/>
      <bind constraint="string-length(.) &lt;= 715" jr:constraintMsg="jr:itext('/delivery/group_note/g_chw_sms:jr:constraintMsg')" nodeset="/delivery/group_note/g_chw_sms" type="string"/>
      <bind nodeset="/delivery/group_summary/submit" readonly="true()" type="string"/>
      <bind nodeset="/delivery/group_summary/r_summary" readonly="true()" type="string"/>
      <bind calculate="../../inputs/contact/patient_id" nodeset="/delivery/group_summary/r_patient_id" type="string"/>
      <bind calculate="jr:choice-name( /delivery/group_delivery_summary/g_delivery_code , ' /delivery/group_delivery_summary/g_delivery_code ')" nodeset="/delivery/group_summary/r_delivery_location" type="string"/>
      <bind nodeset="/delivery/group_summary/r_patient_info" readonly="true()" type="string"/>
      <bind nodeset="/delivery/group_summary/r_pregnancy_outcome" readonly="true()" type="string"/>
      <bind nodeset="/delivery/group_summary/r_birth_date" readonly="true()" relevant=" /delivery/pregnancy_outcome  != 'miscarriage'" type="string"/>
      <bind nodeset="/delivery/group_summary/r_followup" readonly="true()" relevant=" /delivery/chw_sms  != ''" type="string"/>
      <bind nodeset="/delivery/group_summary/r_followup_note1" readonly="true()" relevant=" /delivery/chw_sms  != ''" type="string"/>
      <bind nodeset="/delivery/group_summary/r_followup_note2" readonly="true()" relevant=" /delivery/chw_sms  != ''" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/delivery/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/delivery/inputs">
      <label ref="jr:itext('/delivery/inputs:label')"/>
      <group ref="/delivery/inputs/contact">
        <input appearance="db-object" ref="/delivery/inputs/contact/_id">
          <label ref="jr:itext('/delivery/inputs/contact/_id:label')"/>
          <hint ref="jr:itext('/delivery/inputs/contact/_id:hint')"/>
        </input>
        <input appearance="hidden" ref="/delivery/inputs/contact/patient_id"/>
        <input appearance="hidden" ref="/delivery/inputs/contact/name"/>
        <input appearance="hidden" ref="/delivery/inputs/contact/date_of_birth"/>
        <input appearance="hidden" ref="/delivery/inputs/contact/sex"/>
        <input appearance="hidden" ref="/delivery/inputs/contact/phone"/>
        <group ref="/delivery/inputs/contact/parent">
          <group ref="/delivery/inputs/contact/parent/contact">
            <input appearance="hidden" ref="/delivery/inputs/contact/parent/contact/phone"/>
            <input appearance="hidden" ref="/delivery/inputs/contact/parent/contact/name"/>
          </group>
          <group ref="/delivery/inputs/contact/parent/parent">
            <group ref="/delivery/inputs/contact/parent/parent/parent">
              <input appearance="hidden" ref="/delivery/inputs/contact/parent/parent/parent/use_cases"/>
            </group>
          </group>
        </group>
      </group>
      <group ref="/delivery/inputs/meta">
        <group ref="/delivery/inputs/meta/location"/>
      </group>
    </group>
    <group appearance="field-list" ref="/delivery/group_chw_info">
      <label ref="jr:itext('/delivery/group_chw_info:label')"/>
      <input ref="/delivery/group_chw_info/chw_information">
        <label ref="jr:itext('/delivery/group_chw_info/chw_information:label')"/>
      </input>
      <input ref="/delivery/group_chw_info/call_button">
        <label ref="jr:itext('/delivery/group_chw_info/call_button:label')"/>
      </input>
      <select1 ref="/delivery/group_chw_info/still_pregnant">
        <label ref="jr:itext('/delivery/group_chw_info/still_pregnant:label')"/>
        <item>
          <label ref="jr:itext('/delivery/group_chw_info/still_pregnant/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_chw_info/still_pregnant/no:label')"/>
          <value>no</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_chw_info/still_pregnant/unknown:label')"/>
          <value>unknown</value>
        </item>
      </select1>
    </group>
    <group appearance="field-list" ref="/delivery/group_delivery_summary">
      <label ref="jr:itext('/delivery/group_delivery_summary:label')"/>
      <select1 appearance="horizontal" ref="/delivery/group_delivery_summary/g_pregnancy_outcome">
        <label ref="jr:itext('/delivery/group_delivery_summary/g_pregnancy_outcome:label')"/>
        <item>
          <label ref="jr:itext('/delivery/group_delivery_summary/g_pregnancy_outcome/healthy:label')"/>
          <value>healthy</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_delivery_summary/g_pregnancy_outcome/still_birth:label')"/>
          <value>still_birth</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_delivery_summary/g_pregnancy_outcome/miscarriage:label')"/>
          <value>miscarriage</value>
        </item>
      </select1>
      <select1 ref="/delivery/group_delivery_summary/g_delivery_code">
        <label ref="jr:itext('/delivery/group_delivery_summary/g_delivery_code:label')"/>
        <item>
          <label ref="jr:itext('/delivery/group_delivery_summary/g_delivery_code/f:label')"/>
          <value>f</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_delivery_summary/g_delivery_code/s:label')"/>
          <value>s</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_delivery_summary/g_delivery_code/ns:label')"/>
          <value>ns</value>
        </item>
      </select1>
      <input ref="/delivery/group_delivery_summary/g_birth_date">
        <label ref="jr:itext('/delivery/group_delivery_summary/g_birth_date:label')"/>
      </input>
    </group>
    <group appearance="field-list" ref="/delivery/group_note">
      <label ref="jr:itext('/delivery/group_note:label')"/>
      <select1 appearance="hidden" ref="/delivery/group_note/default_chw_sms">
        <label ref="jr:itext('/delivery/group_note/default_chw_sms:label')"/>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/facility_birth:label')"/>
          <value>facility_birth</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/home_sba_birth:label')"/>
          <value>home_sba_birth</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/home_no_sba_birth:label')"/>
          <value>home_no_sba_birth</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/facility_stillbirth:label')"/>
          <value>facility_stillbirth</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/home_sba_stillbirth:label')"/>
          <value>home_sba_stillbirth</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/home_no_sba_stillbirth:label')"/>
          <value>home_no_sba_stillbirth</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/miscarriage:label')"/>
          <value>miscarriage</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/unknown:label')"/>
          <value>unknown</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/anc_only_facility_birth:label')"/>
          <value>anc_only_facility_birth</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/anc_only_home_sba_birth:label')"/>
          <value>anc_only_home_sba_birth</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/anc_only_home_no_sba_birth:label')"/>
          <value>anc_only_home_no_sba_birth</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/anc_only_facility_stillbirth:label')"/>
          <value>anc_only_facility_stillbirth</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/anc_only_home_sba_stillbirth:label')"/>
          <value>anc_only_home_sba_stillbirth</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/anc_only_home_no_sba_stillbirth:label')"/>
          <value>anc_only_home_no_sba_stillbirth</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/anc_only_miscarriage:label')"/>
          <value>anc_only_miscarriage</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/default_chw_sms/still_pregnant:label')"/>
          <value>still_pregnant</value>
        </item>
      </select1>
      <input ref="/delivery/group_note/default_chw_sms_note">
        <label ref="jr:itext('/delivery/group_note/default_chw_sms_note:label')"/>
      </input>
      <select1 appearance="hidden" ref="/delivery/group_note/is_sms_edited">
        <label ref="jr:itext('/delivery/group_note/is_sms_edited:label')"/>
        <item>
          <label ref="jr:itext('/delivery/group_note/is_sms_edited/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/group_note/is_sms_edited/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <input appearance="multiline" ref="/delivery/group_note/g_chw_sms">
        <label ref="jr:itext('/delivery/group_note/g_chw_sms:label')"/>
        <hint ref="jr:itext('/delivery/group_note/g_chw_sms:hint')"/>
      </input>
    </group>
    <group appearance="field-list summary" ref="/delivery/group_summary">
      <input ref="/delivery/group_summary/submit">
        <label ref="jr:itext('/delivery/group_summary/submit:label')"/>
      </input>
      <input appearance="h1 yellow" ref="/delivery/group_summary/r_summary">
        <label ref="jr:itext('/delivery/group_summary/r_summary:label')"/>
      </input>
      <input appearance="h4 center" ref="/delivery/group_summary/r_patient_info">
        <label ref="jr:itext('/delivery/group_summary/r_patient_info:label')"/>
      </input>
      <input appearance="h5 center" ref="/delivery/group_summary/r_pregnancy_outcome">
        <label ref="jr:itext('/delivery/group_summary/r_pregnancy_outcome:label')"/>
      </input>
      <input appearance="h5 center" ref="/delivery/group_summary/r_birth_date">
        <label ref="jr:itext('/delivery/group_summary/r_birth_date:label')"/>
      </input>
      <input appearance="h1 green" ref="/delivery/group_summary/r_followup">
        <label ref="jr:itext('/delivery/group_summary/r_followup:label')"/>
      </input>
      <input ref="/delivery/group_summary/r_followup_note1">
        <label ref="jr:itext('/delivery/group_summary/r_followup_note1:label')"/>
      </input>
      <input appearance="li" ref="/delivery/group_summary/r_followup_note2">
        <label ref="jr:itext('/delivery/group_summary/r_followup_note2:label')"/>
      </input>
    </group>
  </h:body>
</h:html>
`,   
};
