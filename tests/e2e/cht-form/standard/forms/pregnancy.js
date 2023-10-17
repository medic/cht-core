/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="pregnancy">
<section class="form-logo"></section><h3 dir="auto" id="form-title">New Pregnancy</h3>
<select id="form-languages" data-default-lang=""><option value="en">en</option> <option value="es">es</option> <option value="fr">fr</option> <option value="hi">hi</option> <option value="id">id</option> <option value="ne">ne</option> <option value="sw">sw</option> </select>
  
  
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/pregnancy/inputs" data-relevant="./source = 'user'"><h4>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/inputs:label">Patient</span><span lang="es" class="question-label " data-itext-id="/pregnancy/inputs:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/inputs:label">Patient</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/inputs:label">मरीज</span><span lang="id" class="question-label " data-itext-id="/pregnancy/inputs:label">Pasien</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/inputs:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/inputs:label">-</span>
</h4>
<section class="or-group-data " name="/pregnancy/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/pregnancy/inputs/contact/_id:label">What is the patient's name?</span><span lang="es" class="question-label " data-itext-id="/pregnancy/inputs/contact/_id:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/inputs/contact/_id:label">Quel est l'identifiant du patient?</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/inputs/contact/_id:label">मरीज का नाम क्या है?</span><span lang="id" class="question-label " data-itext-id="/pregnancy/inputs/contact/_id:label">Apa nama pasien?</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/inputs/contact/_id:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/inputs/contact/_id:label">-</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy/inputs/contact/_id:hint">Select a person from list</span><span lang="es" class="or-hint " data-itext-id="/pregnancy/inputs/contact/_id:hint">-</span><span lang="fr" class="or-hint " data-itext-id="/pregnancy/inputs/contact/_id:hint">Sélectionner une personne dans la liste</span><span lang="hi" class="or-hint " data-itext-id="/pregnancy/inputs/contact/_id:hint">सूची से एक व्यक्ति का चयन करें</span><span lang="id" class="or-hint " data-itext-id="/pregnancy/inputs/contact/_id:hint">Pilih orang dari daftar</span><span lang="ne" class="or-hint " data-itext-id="/pregnancy/inputs/contact/_id:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/pregnancy/inputs/contact/_id:hint">-</span><input type="text" name="/pregnancy/inputs/contact/_id" data-required="true()" data-type-xml="person"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select or-appearance-hidden "><input type="text" name="/pregnancy/inputs/contact/patient_id" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/pregnancy/inputs/contact/name" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/pregnancy/inputs/contact/date_of_birth" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/pregnancy/inputs/contact/sex" data-type-xml="string"></label><section class="or-group-data " name="/pregnancy/inputs/contact/parent"><section class="or-group-data " name="/pregnancy/inputs/contact/parent/contact"><label class="question non-select or-appearance-hidden "><input type="text" name="/pregnancy/inputs/contact/parent/contact/phone" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/pregnancy/inputs/contact/parent/contact/name" data-type-xml="string"></label>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group or-appearance-field-list " name="/pregnancy/group_lmp"><h4>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/group_lmp:label">Last Menstrual Period</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_lmp:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_lmp:label">Date des Dernières Régles</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_lmp:label">पिछली मासिक</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_lmp:label">Periode Menstruasi Terakhir</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_lmp:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_lmp:label">-</span>
</h4>
<fieldset class="question simple-select or-appearance-horizontal or-appearance-columns ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/group_lmp/g_lmp_method:label">Does the woman know the date of the last cycle?</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method:label">La femme connaït-elle la date de ses dernières régles?</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method:label">क्या महिला को अपने पिछली मासिक का तारीख पता है?</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method:label">Apakah wanita tahu tanggal siklus menstruasi terakhir?</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method:label">-</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/group_lmp/g_lmp_method" data-name="/pregnancy/group_lmp/g_lmp_method" value="calendar" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_lmp/g_lmp_method/calendar:label">Yes</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method/calendar:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method/calendar:label">Oui</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method/calendar:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method/calendar:label">Iya</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method/calendar:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method/calendar:label">-</span></label><label class=""><input type="radio" name="/pregnancy/group_lmp/g_lmp_method" data-name="/pregnancy/group_lmp/g_lmp_method" value="approx" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_lmp/g_lmp_method/approx:label">No</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method/approx:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method/approx:label">Non</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method/approx:label">नहीं</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method/approx:label">Tidak</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method/approx:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_method/approx:label">-</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_lmp/g_lmp_calendar:label">Start date of last cycle</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_calendar:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_calendar:label">Donner la date des dernières régles</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_calendar:label">पिछली मासिक के शूरू होने की तारीख</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_calendar:label">Tanggal mulai siklus menstruasi terakhir</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_calendar:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_calendar:label">-</span><span class="required">*</span><input type="date" name="/pregnancy/group_lmp/g_lmp_calendar" data-required="true()" data-constraint=". &lt; now() and ((decimal-date-time(.)+294) &gt;= decimal-date-time(today()))" data-relevant="selected( /pregnancy/group_lmp/g_lmp_method ,'calendar')" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg">Date must be in the previous 42 weeks</span><span lang="es" class="or-constraint-msg " data-itext-id="/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg">La date doit être dans les 42 dernières semaines</span><span lang="hi" class="or-constraint-msg " data-itext-id="/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg">तारीख पिछले 42 सप्ताह में होना चाहिए</span><span lang="id" class="or-constraint-msg " data-itext-id="/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg">Tanggal harus dalam 42 minggu sebelumnya</span><span lang="ne" class="or-constraint-msg " data-itext-id="/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg">-</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/group_lmp/g_lmp_approx:label">Approximate start date of last cycle</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx:label">Estimer la date des dernères régles</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx:label">पिछली मासिक के शूरू होने की अंदाज़न तारीख</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx:label">Tanggal perkiraan mulai siklus menstruasi terakhir</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx:label">-</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/group_lmp/g_lmp_approx" data-name="/pregnancy/group_lmp/g_lmp_approx" value="61" data-required="true()" data-relevant="selected( /pregnancy/group_lmp/g_lmp_method ,'approx')" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_lmp/g_lmp_approx/61:label">up to 2 months ago</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/61:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/61:label">Jusqu'à 2 mois</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/61:label">2 महीने पहले तक</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/61:label">Hingga 2 bulan yang lalu</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/61:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/61:label">-</span></label><label class=""><input type="radio" name="/pregnancy/group_lmp/g_lmp_approx" data-name="/pregnancy/group_lmp/g_lmp_approx" value="91" data-required="true()" data-relevant="selected( /pregnancy/group_lmp/g_lmp_method ,'approx')" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_lmp/g_lmp_approx/91:label">up to 3 months ago</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/91:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/91:label">Jusqu'à 3 mois</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/91:label">3 महीने पहले तक</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/91:label">Hingga 3 bulan yang lalu</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/91:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/91:label">-</span></label><label class=""><input type="radio" name="/pregnancy/group_lmp/g_lmp_approx" data-name="/pregnancy/group_lmp/g_lmp_approx" value="122" data-required="true()" data-relevant="selected( /pregnancy/group_lmp/g_lmp_method ,'approx')" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_lmp/g_lmp_approx/122:label">up to 4 months ago</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/122:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/122:label">Jusqu'à 4 mois</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/122:label">4 महीने पहले तक</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/122:label">Hingga 4 bulan yang lalu</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/122:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/122:label">-</span></label><label class=""><input type="radio" name="/pregnancy/group_lmp/g_lmp_approx" data-name="/pregnancy/group_lmp/g_lmp_approx" value="183" data-required="true()" data-relevant="selected( /pregnancy/group_lmp/g_lmp_method ,'approx')" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_lmp/g_lmp_approx/183:label">between 5 to 6 months ago</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/183:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/183:label">Entre 5 et 6 mois</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/183:label">5 से 6 महीने पहले</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/183:label">Beween 5 sampai 6 bulan yang lalu</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/183:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/183:label">-</span></label><label class=""><input type="radio" name="/pregnancy/group_lmp/g_lmp_approx" data-name="/pregnancy/group_lmp/g_lmp_approx" value="244" data-required="true()" data-relevant="selected( /pregnancy/group_lmp/g_lmp_method ,'approx')" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_lmp/g_lmp_approx/244:label">between 7 to 8 months ago</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/244:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/244:label">Entre 7 et 8 mois</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/244:label">7 से 8 महीने पहले</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/244:label">Beween 7 sampai 8 bulan yang lalu</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/244:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_lmp/g_lmp_approx/244:label">-</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_lmp/g_display_edd:label"><strong>Estimated delivery date is</strong><br><span class="or-output" data-value=" /pregnancy/group_lmp/g_edd "> </span></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_lmp/g_display_edd:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_lmp/g_display_edd:label"><strong>La Date Probable d'Accouchement (DPA) est </strong><br><span class="or-output" data-value=" /pregnancy/group_lmp/g_edd "> </span></span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_lmp/g_display_edd:label"><strong>डेलिवरी की अपेक्षित तारीख है</strong><br><span class="or-output" data-value=" /pregnancy/group_lmp/g_edd "> </span></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_lmp/g_display_edd:label"><strong>Tanggal taksiran persalinan adalah</strong> <span class="or-output" data-value=" /pregnancy/group_lmp/g_edd "> </span></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_lmp/g_display_edd:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_lmp/g_display_edd:label">-</span><input type="text" name="/pregnancy/group_lmp/g_display_edd" data-relevant=' /pregnancy/group_lmp/g_edd  != "Invalid Date" and  /pregnancy/group_lmp/g_edd  != ""' data-type-xml="string" readonly></label>
      </section>
    <section class="or-group or-appearance-field-list " name="/pregnancy/group_risk_factors"><h4>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/group_risk_factors:label">Risk Factors</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_risk_factors:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_risk_factors:label">Facteurs de risques</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_risk_factors:label">खतरे का कारण</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_risk_factors:label">Faktor risiko</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_risk_factors:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_risk_factors:label">-</span>
</h4>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:label">Does the woman have any of the following risk factors?</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:label">La femme a-t-elle un de ces facteurs de risques?</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:label">क्या महिला को इनमें से कोई ख़तरे का कारण है?</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:label">Apakah wanita memiliki salah satu dari faktor risiko berikut?</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:label">-</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:hint">Select all that apply</span><span lang="es" class="or-hint " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:hint">-</span><span lang="fr" class="or-hint " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:hint">Sélectionnez tout ce qui s'applique</span><span lang="hi" class="or-hint " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:hint">लागू होने वाले सभी का चयन करें</span><span lang="id" class="or-hint " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:hint">Pilih semua yang berlaku</span><span lang="ne" class="or-hint " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:hint">-</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/pregnancy/group_risk_factors/g_risk_factors" value="r1" data-constraint="not(selected(.,'r1')) or (selected(.,'r1') and not(selected(.,'r2') or selected(.,'r3') or selected(.,'r4')))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r1:label">First pregnancy</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r1:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r1:label">Première grossesse</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r1:label">प्रथम गर्भावस्था</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r1:label">Kehamilan pertama</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r1:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r1:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy/group_risk_factors/g_risk_factors" value="r2" data-constraint="not(selected(.,'r1')) or (selected(.,'r1') and not(selected(.,'r2') or selected(.,'r3') or selected(.,'r4')))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r2:label">More than 4 children</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r2:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r2:label">Plus de 4 enfants</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r2:label">4 से अधिक बच्चों</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r2:label">Lebih dari 4 anak</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r2:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r2:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy/group_risk_factors/g_risk_factors" value="r3" data-constraint="not(selected(.,'r1')) or (selected(.,'r1') and not(selected(.,'r2') or selected(.,'r3') or selected(.,'r4')))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r3:label">Last baby born less than 1 year before</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r3:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r3:label">Le dernier enfant est né il y a moins d'une année</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r3:label">अंतिम बच्चा 1 वर्ष से कम समय पहले पैदा हुआ था</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r3:label">Bayi terakhir lahir kurang dari 1 tahun sebelumnya</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r3:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r3:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy/group_risk_factors/g_risk_factors" value="r4" data-constraint="not(selected(.,'r1')) or (selected(.,'r1') and not(selected(.,'r2') or selected(.,'r3') or selected(.,'r4')))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r4:label">Had previous miscarriages or previous difficulties in childbirth</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r4:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r4:label">La femme avait des fausses couches ou des difficultés antérieures à l'accouchement</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r4:label">पिछली गर्भावस्था या गर्भपात में कोई कठिनाइयाँ</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r4:label">Mengalami keguguran sebelumnya atau kesulitan sebelumnya saat melahirkan</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r4:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r4:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy/group_risk_factors/g_risk_factors" value="r5" data-constraint="not(selected(.,'r1')) or (selected(.,'r1') and not(selected(.,'r2') or selected(.,'r3') or selected(.,'r4')))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r5:label">Has any of the following conditions: 
heart conditions, asthma, high blood pressure, known diabetes</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r5:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r5:label">La femme a l'une des conditions suivantes:
problèmes cardiaques, asthme, hypertension artérielle, diabète connu</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r5:label">निम्न कारणों में से एक: दिल की बीमारी, अस्थमा, ब्लड प्रेशर, या डायबिटीज</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r5:label">Salah satu kondisi berikut: kondisi jantung, asma, tekanan darah tinggi, diketahui diabetes</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r5:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r5:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy/group_risk_factors/g_risk_factors" value="r6" data-constraint="not(selected(.,'r1')) or (selected(.,'r1') and not(selected(.,'r2') or selected(.,'r3') or selected(.,'r4')))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r6:label">HIV positive</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r6:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r6:label">VIH positif</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r6:label">HIV पॉजिटिव</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r6:label">HIV positif</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r6:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors/r6:label">-</span></label>
</div>
</fieldset>
<span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg">Please correct conflicting risk factors</span><span lang="es" class="or-constraint-msg " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg">Veuillez corriger les facteurs de risque contradictoires</span><span lang="hi" class="or-constraint-msg " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg">कृपया ख़तरे के कारण को सही करें जो असंगत है</span><span lang="id" class="or-constraint-msg " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg">Harap perbaiki faktor risiko yang bertentangan</span><span lang="ne" class="or-constraint-msg " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg">-</span>
</fieldset>
      </section>
    <section class="or-group or-appearance-field-list " name="/pregnancy/group_danger_signs"><h4>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/group_danger_signs:label">Danger Signs</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_danger_signs:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_danger_signs:label">Signes de danger</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_danger_signs:label">ख़तरे के संकेत</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_danger_signs:label">Tanda-tanda bahaya</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_danger_signs:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_danger_signs:label">-</span>
</h4>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:label">Does the woman have any of the following danger signs?</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:label">La femme a-t-elle un de ces signes de danger?</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:label">क्या महिला को इनमें से कोइ खतरे के संकेत है?</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:label">Apakah wanita memiliki salah satu dari tanda-tanda bahaya berikut?</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:label">-</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:hint">Select all that apply</span><span lang="es" class="or-hint " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:hint">-</span><span lang="fr" class="or-hint " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:hint">Sélectionnez tout ce qui s'applique</span><span lang="hi" class="or-hint " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:hint">लागू होने वाले सभी का चयन करें</span><span lang="id" class="or-hint " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:hint">Pilih semua yang berlaku</span><span lang="ne" class="or-hint " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:hint">-</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/pregnancy/group_danger_signs/g_danger_signs" value="d1" data-constraint="not(selected( .,'d7') and (decimal-date-time( /pregnancy/lmp_date_8601 ) &gt;= decimal-date-time(today())-150))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d1:label">Pain or cramping in abdomen</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d1:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d1:label">Douleur ou crampes dans l'abdomen</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d1:label">पेट में दर्द, दबाव या ऐंठन</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d1:label">Nyeri, tekanan atau kram di perut</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d1:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d1:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy/group_danger_signs/g_danger_signs" value="d2" data-constraint="not(selected( .,'d7') and (decimal-date-time( /pregnancy/lmp_date_8601 ) &gt;= decimal-date-time(today())-150))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d2:label">Bleeding or fluid leaking from vagina or vaginal discharge with bad odour</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d2:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d2:label">Saignement ou fuite de liquide du vagin ou des pertes vaginales avec mauvaise odeur</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d2:label">योनि से खून या द्रव पदार्थ का बहाव, या खराब बू के साथ योनि से बहाव</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d2:label">Perdarahan atau cairan merembes dari vagina atau mengalir dari vagina dengan bau busuk</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d2:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d2:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy/group_danger_signs/g_danger_signs" value="d3" data-constraint="not(selected( .,'d7') and (decimal-date-time( /pregnancy/lmp_date_8601 ) &gt;= decimal-date-time(today())-150))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d3:label">Severe nausea or vomiting</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d3:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d3:label">Nausées sévères ou vomissements</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d3:label">गंभीर उबकाई या उल्टी</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d3:label">Mual muntah berat</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d3:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d3:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy/group_danger_signs/g_danger_signs" value="d4" data-constraint="not(selected( .,'d7') and (decimal-date-time( /pregnancy/lmp_date_8601 ) &gt;= decimal-date-time(today())-150))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d4:label">Fever of 38 degrees or higher</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d4:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d4:label">Fièvre de 38 degrés ou plus</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d4:label">38 डिग्री या अधिक का बुखार</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d4:label">Demam 38 derajat atau lebih tinggi</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d4:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d4:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy/group_danger_signs/g_danger_signs" value="d5" data-constraint="not(selected( .,'d7') and (decimal-date-time( /pregnancy/lmp_date_8601 ) &gt;= decimal-date-time(today())-150))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d5:label">Severe headache or new, blurry vision problems</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d5:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d5:label">Maux de tête sévères ou nouveaux, problèmes de vision floue</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d5:label">गंभीर सिरदर्द या नए, धुंधली दृष्टि की समस्याएं</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d5:label">Parah sakit kepala atau baru, masalah penglihatan kabur</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d5:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d5:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy/group_danger_signs/g_danger_signs" value="d6" data-constraint="not(selected( .,'d7') and (decimal-date-time( /pregnancy/lmp_date_8601 ) &gt;= decimal-date-time(today())-150))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d6:label">Sudden weight gain or severe swelling of feet, ankles, face, or hands</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d6:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d6:label">Prise de poids soudaine ou gonflement important des pieds, des chevilles, du visage ou des mains</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d6:label">अचानक वजन का बढ़ना या पैर, टखनों, चेहरे या हाथों में गंभीर सूजन</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d6:label">Lonjakan berat badan atau berat pembengkakan kaki, pergelangan kaki, wajah, atau tangan</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d6:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d6:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy/group_danger_signs/g_danger_signs" value="d7" data-constraint="not(selected( .,'d7') and (decimal-date-time( /pregnancy/lmp_date_8601 ) &gt;= decimal-date-time(today())-150))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d7:label">Less movement and kicking from the baby (after week 20 of pregnancy)</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d7:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d7:label">Moins de mouvement et de coups de pied du bébé (après 20 semaines de grossesse)</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d7:label">बच्चे का कम हिलना या लात मारना (गर्भावस्था के 20 सप्ताह के बाद)</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d7:label">Kurang gerak dan menendang dari bayi (setelah minggu 20 kehamilan)</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d7:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d7:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy/group_danger_signs/g_danger_signs" value="d8" data-constraint="not(selected( .,'d7') and (decimal-date-time( /pregnancy/lmp_date_8601 ) &gt;= decimal-date-time(today())-150))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d8:label">Blood in the urine or painful, burning urination</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d8:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d8:label">Du sang dans l'urine ou une miction douloureuse et brûlante</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d8:label">पेशाब में खून या दर्दनाक, जलता हुआ पेशाब</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d8:label">Darah dalam urin atau menyakitkan, terbakar buang air kecil</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d8:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d8:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy/group_danger_signs/g_danger_signs" value="d9" data-constraint="not(selected( .,'d7') and (decimal-date-time( /pregnancy/lmp_date_8601 ) &gt;= decimal-date-time(today())-150))" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d9:label">Diarrhea that doesn't go away</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d9:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d9:label">La diarrhée qui ne disparaît pas</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d9:label">दस्त जो कम नहीं होता</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d9:label">Diare yang tidak mengurangi</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d9:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs/d9:label">-</span></label>
</div>
</fieldset>
<span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg">Cannot report less movement for pregnancies under 5 months</span><span lang="es" class="or-constraint-msg " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg">Impossible de choisir "Moins de mouvements..." pour les grossesses de moins de 5 mois</span><span lang="hi" class="or-constraint-msg " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg">5 महीनों से कम के गर्भावस्था में कम हलचल की शिकायत नहीं की जा सकती है</span><span lang="id" class="or-constraint-msg " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg">Tidak dapat melaporkan gerakan kurang untuk kehamilan di bawah 5 bulan</span><span lang="ne" class="or-constraint-msg " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg">-</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_danger_signs/g_danger_signs_note:label"><strong>The woman should be treated immediately if she is experiencing any of these danger signs.</strong></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs_note:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs_note:label"><strong>La femme devrait être traitée immédiatement si elle présente un de ces signes de danger.</strong></span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs_note:label"><strong>अगर महिला इन खतरों के संकेतों मे��� से किसी का सामना कर रही है तो महिला को तुरंत इलाज किया जाना चाहिए.</strong></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs_note:label"><strong>Wanita itu harus segera diobati jika dia mengalami salah tanda-tanda bahaya ini.</strong></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs_note:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_danger_signs/g_danger_signs_note:label">-</span><input type="text" name="/pregnancy/group_danger_signs/g_danger_signs_note" data-type-xml="string" readonly></label>
      </section>
    <section class="or-group or-appearance-field-list " name="/pregnancy/group_note"><h4>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/group_note:label">Note to the CHW</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_note:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_note:label">Notes à l'ASC</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_note:label">सामुदायिक स्वास्थ्य कर्मी के लिए नोट</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_note:label">Catatan ke kader</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_note:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_note:label">-</span>
</h4>
<fieldset class="question simple-select or-appearance-hidden "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/group_note/default_chw_sms:label">Default SMS to send to CHW</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_note/default_chw_sms:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_note/default_chw_sms:label">Message à envoyer à l'ASC</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_note/default_chw_sms:label">सामुदायिक स्वास्थ्य कर्मी के लिए संदेश</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_note/default_chw_sms:label">-</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_note/default_chw_sms:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_note/default_chw_sms:label">-</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/group_note/default_chw_sms" data-name="/pregnancy/group_note/default_chw_sms" value="default" data-calculate="if( /pregnancy/group_danger_signs/g_danger_signs  != '' or  /pregnancy/group_risk_factors/g_risk_factors  != '',  'highrisk',  'default' )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_note/default_chw_sms/default:label">Hi <span class="or-output" data-value=" /pregnancy/chw_name "> </span>, a pregnancy for <span class="or-output" data-value=" /pregnancy/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy/group_review/r_patient_id "> </span>) has been registered at the facility. You will receive ANC notifications for this patient. Please follow up to identify the patient. Thank you!</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_note/default_chw_sms/default:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_note/default_chw_sms/default:label">Bonjour <span class="or-output" data-value=" /pregnancy/chw_name "> </span>, une grossesse pour <span class="or-output" data-value=" /pregnancy/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy/group_review/r_patient_id "> </span>) a été enregistrée au centre de santé. Vous recevrez des notifications CPN pour ce patient. Veuillez faire un suivi pour identifier le patient. Merci !</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_note/default_chw_sms/default:label">नमस्ते <span class="or-output" data-value=" /pregnancy/chw_name "> </span>, <span class="or-output" data-value=" /pregnancy/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy/group_review/r_patient_id "> </span>) के लिए स्वास्थ्य केंद्र में गर्भावस्था दर्ज की गयी है | आपको इस मरीज़ के लिए एएनसी सन्देश मिलेंगे | कृपया मरीज़ को पहचाने | धन्यवाद!</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_note/default_chw_sms/default:label">Halo <span class="or-output" data-value=" /pregnancy/chw_name "> </span>, kehamilan untuk <span class="or-output" data-value=" /pregnancy/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy/group_review/r_patient_id "> </span>) telah mendaftarkan di fasilitas. Anda akan menerima pemberitahuan ANC untuk pasien ini. Silahkan tindak lanjut untuk mengidentifikasi pasien. Terima kasih!</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_note/default_chw_sms/default:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_note/default_chw_sms/default:label">-</span></label><label class=""><input type="radio" name="/pregnancy/group_note/default_chw_sms" data-name="/pregnancy/group_note/default_chw_sms" value="highrisk" data-calculate="if( /pregnancy/group_danger_signs/g_danger_signs  != '' or  /pregnancy/group_risk_factors/g_risk_factors  != '',  'highrisk',  'default' )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_note/default_chw_sms/highrisk:label">Hi <span class="or-output" data-value=" /pregnancy/chw_name "> </span>, a pregnancy with danger signs for <span class="or-output" data-value=" /pregnancy/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy/group_review/r_patient_id "> </span>) has been registered by the health facility. This is a high-risk pregnancy. You will receive ANC notifications for this patient. Please follow up with the nurse to identify the patient. Thank you!</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_note/default_chw_sms/highrisk:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_note/default_chw_sms/highrisk:label">Bonjour <span class="or-output" data-value=" /pregnancy/chw_name "> </span>, une grossesse avec des signes de danger pour <span class="or-output" data-value=" /pregnancy/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy/group_review/r_patient_id "> </span>) a été enregistrée au centre de santé. C'est une grossesse à haut risque. Vous recevrez des notifications CPN pour ce patient. Veuillez faire un suivi avec l'infirmière pour identifier le patient. Merci !</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_note/default_chw_sms/highrisk:label">नमस्ते <span class="or-output" data-value=" /pregnancy/chw_name "> </span>, <span class="or-output" data-value=" /pregnancy/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy/group_review/r_patient_id "> </span>) के लिए स्वास्थ्य केंद्र में एक खतरे के संकेत वाला गर्भावस्था दर्ज की गयी है | यह एक जोखिम वाला गर्भावस्था है | आपको इस मरीज़ के लिए एएनसी सन्देश मिलेंगे | कृपया नर्स के साथ मिल के मरीज़ को पहचाने | धन्यवाद!</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_note/default_chw_sms/highrisk:label">Halo <span class="or-output" data-value=" /pregnancy/chw_name "> </span>, 
kehamilan dengan tanda-tanda bahaya untuk <span class="or-output" data-value=" /pregnancy/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy/group_review/r_patient_id "> </span>) telah didaftarkan di fasilitas kesehatan. Ini adalah kehamilan dengan resiko tinggi. Anda akan menerima sms pemberitahuan tentang  jadwal pemeriksaan (ANC) untuk pasien ini. Silahkan menghubungi bidan anda untuk tindakan selanjutnya.Terima kasih!</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_note/default_chw_sms/highrisk:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_note/default_chw_sms/highrisk:label">-</span></label>
</div>
</fieldset></fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_note/default_chw_sms_note:label"><strong>The following message will be sent to <span class="or-output" data-value=" /pregnancy/chw_name "> </span> (<span class="or-output" data-value=" /pregnancy/chw_phone "> </span>):</strong><br> <span class="or-output" data-value=" /pregnancy/group_note/default_chw_sms_text "> </span></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_note/default_chw_sms_note:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_note/default_chw_sms_note:label"><strong>Le message suivant sera envoyé à <span class="or-output" data-value=" /pregnancy/chw_name "> </span> (<span class="or-output" data-value=" /pregnancy/chw_phone "> </span>):</strong><br> <span class="or-output" data-value=" /pregnancy/group_note/default_chw_sms_text "> </span></span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_note/default_chw_sms_note:label"><strong>यह संदेश <span class="or-output" data-value=" /pregnancy/chw_name "> </span> (<span class="or-output" data-value=" /pregnancy/chw_phone "> </span>) को भेजा जाएगा:</strong><br> <span class="or-output" data-value=" /pregnancy/group_note/default_chw_sms_text "> </span></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_note/default_chw_sms_note:label"><strong>Pesan ini akan dikirim ke <span class="or-output" data-value=" /pregnancy/chw_name "> </span> (<span class="or-output" data-value=" /pregnancy/chw_phone "> </span>):</strong><br> <span class="or-output" data-value=" /pregnancy/group_note/default_chw_sms_text "> </span></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_note/default_chw_sms_note:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_note/default_chw_sms_note:label">-</span><input type="text" name="/pregnancy/group_note/default_chw_sms_note" data-type-xml="string" readonly></label><fieldset class="question simple-select or-appearance-hidden ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/group_note/is_sms_edited:label">Would you like to add a personal note to the message?</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_note/is_sms_edited:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_note/is_sms_edited:label">Souhaitez-vous ajouter une note personnelle au message?</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_note/is_sms_edited:label">क्या आप संदेश में कुछ और कहना चाहते हैं?</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_note/is_sms_edited:label">Apakah Anda ingin menambahkan pesan?</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_note/is_sms_edited:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_note/is_sms_edited:label">-</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/group_note/is_sms_edited" data-name="/pregnancy/group_note/is_sms_edited" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_note/is_sms_edited/yes:label">Yes</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_note/is_sms_edited/yes:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_note/is_sms_edited/yes:label">Oui</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_note/is_sms_edited/yes:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_note/is_sms_edited/yes:label">Iya</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_note/is_sms_edited/yes:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_note/is_sms_edited/yes:label">-</span></label><label class=""><input type="radio" name="/pregnancy/group_note/is_sms_edited" data-name="/pregnancy/group_note/is_sms_edited" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/group_note/is_sms_edited/no:label">No</span><span lang="es" class="option-label " data-itext-id="/pregnancy/group_note/is_sms_edited/no:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy/group_note/is_sms_edited/no:label">Non</span><span lang="hi" class="option-label " data-itext-id="/pregnancy/group_note/is_sms_edited/no:label">नहीं</span><span lang="id" class="option-label " data-itext-id="/pregnancy/group_note/is_sms_edited/no:label">Tidak</span><span lang="ne" class="option-label " data-itext-id="/pregnancy/group_note/is_sms_edited/no:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy/group_note/is_sms_edited/no:label">-</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select or-appearance-multiline "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_note/g_chw_sms:label">You can add a personal note to the SMS here:</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_note/g_chw_sms:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_note/g_chw_sms:label">Vous pouvez ajouter une note personnelle au SMS ici:</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_note/g_chw_sms:label">आप यहां संदेश में कुछ और जोड़ सकते हैं:</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_note/g_chw_sms:label">Anda dapat menambahkan sesuatu yang lain ke pesan di sini:</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_note/g_chw_sms:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_note/g_chw_sms:label">-</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy/group_note/g_chw_sms:hint">Messages are limited in length to avoid high SMS costs.</span><span lang="es" class="or-hint " data-itext-id="/pregnancy/group_note/g_chw_sms:hint">-</span><span lang="fr" class="or-hint " data-itext-id="/pregnancy/group_note/g_chw_sms:hint">Les messages sont limités en longueur pour éviter les coûts élevés de SMS.</span><span lang="hi" class="or-hint " data-itext-id="/pregnancy/group_note/g_chw_sms:hint"><span class="or-output" data-value=" /pregnancy/chw_name "> </span> (<span class="or-output" data-value=" /pregnancy/chw_phone "> </span>) को संदेश भेजा जायेगा | संदेश की लंबाई सीमित है ताकी SMS का मूल्य उच्च ना हो|</span><span lang="id" class="or-hint " data-itext-id="/pregnancy/group_note/g_chw_sms:hint">Pesan akan dikirim ke <span class="or-output" data-value=" /pregnancy/chw_name "> </span> (<span class="or-output" data-value=" /pregnancy/chw_phone "> </span>). Pesan dibatasi panjang untuk menghindari biaya SMS yang tinggi.</span><span lang="ne" class="or-hint " data-itext-id="/pregnancy/group_note/g_chw_sms:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/pregnancy/group_note/g_chw_sms:hint">-</span><textarea name="/pregnancy/group_note/g_chw_sms" data-constraint="string-length(.) &lt;= 715" data-type-xml="string"></textarea><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/group_note/g_chw_sms:jr:constraintMsg">Your message cannot be longer than 5 SMS messages. Please shorten your message to reduce SMS costs.</span><span lang="es" class="or-constraint-msg " data-itext-id="/pregnancy/group_note/g_chw_sms:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/pregnancy/group_note/g_chw_sms:jr:constraintMsg">Votre message ne peut pas dépasser 5 SMS. Veuillez raccourcir votre message pour réduire les coûts de SMS.</span><span lang="hi" class="or-constraint-msg " data-itext-id="/pregnancy/group_note/g_chw_sms:jr:constraintMsg">आपका सन्देश 5 SMS से ऊपर नहीं हो सकता है | कृपया SMS का मूल्य को कम करने के लिए अपना सन्देश छोटा करें |</span><span lang="id" class="or-constraint-msg " data-itext-id="/pregnancy/group_note/g_chw_sms:jr:constraintMsg">Pesan anda tidak boleh lebih dari 5 pesan SMS. Persingkat pesan Anda untuk mengurangi biaya SMS.</span><span lang="ne" class="or-constraint-msg " data-itext-id="/pregnancy/group_note/g_chw_sms:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/pregnancy/group_note/g_chw_sms:jr:constraintMsg">-</span></label>
      </section>
    <section class="or-group-data or-appearance-field-list or-appearance-summary " name="/pregnancy/group_review"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/submit:label"><h4 style="text-align:center;">Be sure you Submit to complete this action.</h4></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/submit:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/submit:label"><h4 style = "text-align: center;"> Assurez-vous d'avoir soumis pour effectuer cette action. </h4></span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/submit:label"><h4 style="text-align:center;"> सुनिश्चित करें के यह कार्रवाई पूरा करने के लिए आप सबमिट दबाये | </h4></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/submit:label"><h4 style="text-align:center;">Pastikan anda sudah mengirim untuk menyelesaikan tindakan ini.</h4></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/submit:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/submit:label">-</span><input type="text" name="/pregnancy/group_review/submit" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-yellow "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_summary:label">Pregnancy Details<I class="fa fa-user"></i></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_summary:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_summary:label">Détails sur la grossesse <i class = "fa fa-user"> </i></span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_summary:label">गर्भावस्था का विवरण<I class="fa fa-user"></i></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_summary:label">Kehamilan rincian<I class="fa fa-user"></i></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_summary:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_summary:label">-</span><input type="text" name="/pregnancy/group_review/r_summary" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h4 or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_pregnancy_details:label"><strong><span class="or-output" data-value=" /pregnancy/patient_name "> </span></strong><br>ID: <span class="or-output" data-value=" /pregnancy/group_review/r_patient_id "> </span><br>Estimated delivery date: <span class="or-output" data-value=" /pregnancy/group_lmp/g_edd "> </span></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_pregnancy_details:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_pregnancy_details:label"><strong><span class="or-output" data-value=" /pregnancy/patient_name "> </span></strong><br>ID: <span class="or-output" data-value=" /pregnancy/group_review/r_patient_id "> </span><br>Date Probable d'Accouchement: <span class="or-output" data-value=" /pregnancy/group_lmp/g_edd "> </span></span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_pregnancy_details:label"><strong><span class="or-output" data-value=" /pregnancy/patient_name "> </span></strong><br>आईडी: <span class="or-output" data-value=" /pregnancy/group_review/r_patient_id "> </span><br>डेलिवरी की अपेक्षित तारीख है: <span class="or-output" data-value=" /pregnancy/group_lmp/g_edd "> </span></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_pregnancy_details:label"><strong><span class="or-output" data-value=" /pregnancy/patient_name "> </span></strong><br>ID: <span class="or-output" data-value=" /pregnancy/group_review/r_patient_id "> </span><br>Tanggal taksiran persalinan: <span class="or-output" data-value=" /pregnancy/group_lmp/g_edd "> </span></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_pregnancy_details:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_pregnancy_details:label">-</span><input type="text" name="/pregnancy/group_review/r_pregnancy_details" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h2 or-appearance-yellow "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_risk_factors:label">Risk Factors</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factors:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factors:label">Facteurs de risques</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factors:label">खतरे का कारण</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factors:label">Faktor risiko</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factors:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factors:label">-</span><input type="text" name="/pregnancy/group_review/r_risk_factors" data-relevant=" /pregnancy/group_risk_factors/g_risk_factors  !='' or ( /pregnancy/inputs/contact/date_of_birth !='' and ( /pregnancy/patient_age_at_lmp  &lt; 18 or  /pregnancy/patient_age_at_lmp  &gt;= 35))" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_risk_factor1:label">First pregnancy</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor1:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor1:label">Première grossesse</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor1:label">प्रथम गर्भावस्था</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor1:label">Kehamilan pertama</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor1:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor1:label">-</span><input type="text" name="/pregnancy/group_review/r_risk_factor1" data-relevant="selected( /pregnancy/group_risk_factors/g_risk_factors , 'r1')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_risk_factor2:label">More than 4 children</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor2:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor2:label">Plus de 4 enfants</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor2:label">चार बच्चों से ज़्यादा</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor2:label">Lebih dari 4 anak</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor2:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor2:label">-</span><input type="text" name="/pregnancy/group_review/r_risk_factor2" data-relevant="selected( /pregnancy/group_risk_factors/g_risk_factors , 'r2')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_risk_factor3:label">Last baby born less than 1 year before</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor3:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor3:label">Le dernier enfant est né il y a moins d'une année</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor3:label">अंतिम बच्चा 1 वर्ष से कम समय पहले पैदा हुआ था</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor3:label">Bayi terakhir lahir kurang dari 1 tahun sebelumnya</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor3:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor3:label">-</span><input type="text" name="/pregnancy/group_review/r_risk_factor3" data-relevant="selected( /pregnancy/group_risk_factors/g_risk_factors , 'r3')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_risk_factor4:label">Had previous miscarriages or previous difficulties in childbirth</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor4:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor4:label">La femme avait des fausses couches ou des difficultés antérieures à l'accouchement</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor4:label">पिछली गर्भावस्था या गर्भपात में कोई कठिनाइयाँ</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor4:label">Mengalami keguguran sebelumnya atau kesulitan sebelumnya saat melahirkan</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor4:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor4:label">-</span><input type="text" name="/pregnancy/group_review/r_risk_factor4" data-relevant="selected( /pregnancy/group_risk_factors/g_risk_factors , 'r4')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_risk_factor5:label">One of the following conditions: heart conditions, asthma, high blood pressure, known diabetes</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor5:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor5:label">Une des affections suivantes: problèmes cardiaques, asthme, hypertension artérielle, diabète connu</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor5:label">निम्न कारणों में से एक: दिल की बीमारी, अस्थमा, ब्लड प्रेशर, या डायबिटीज</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor5:label">Salah satu kondisi berikut: kondisi jantung, asma, tekanan darah tinggi, diketahui diabetes</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor5:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor5:label">-</span><input type="text" name="/pregnancy/group_review/r_risk_factor5" data-relevant="selected( /pregnancy/group_risk_factors/g_risk_factors , 'r5')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_risk_factor6:label">HIV positive</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor6:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor6:label">VIH Positif</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor6:label">HIV पॉजिटिव</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor6:label">HIV positif</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor6:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor6:label">-</span><input type="text" name="/pregnancy/group_review/r_risk_factor6" data-relevant="selected( /pregnancy/group_risk_factors/g_risk_factors , 'r6')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_risk_factor7:label">Under 18 years old</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor7:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor7:label">Moins de 18 ans</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor7:label">18 साल से कम उम्र के</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor7:label">Di bawah 18 tahun</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor7:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor7:label">-</span><input type="text" name="/pregnancy/group_review/r_risk_factor7" data-relevant=" /pregnancy/inputs/contact/date_of_birth !='' and  /pregnancy/patient_age_at_lmp  &lt; 18" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_risk_factor8:label">Over 35 years old</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor8:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor8:label">Plus de 35 ans</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor8:label">35 साल से अधिक</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor8:label">Lebih dari 35 tahun</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor8:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_risk_factor8:label">-</span><input type="text" name="/pregnancy/group_review/r_risk_factor8" data-relevant=" /pregnancy/inputs/contact/date_of_birth !='' and  /pregnancy/patient_age_at_lmp  &gt;= 35" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h1 or-appearance-red "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_referral:label">Refer to a health facility<i class="fa fa-warning"></i></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_referral:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_referral:label">Référez à un établissement de santé <i class = "fa fa-warning"> </i></span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_referral:label">उसे स्वास्थ्य केंद्र भेजें।<i class="fa fa-warning"></i></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_referral:label">Merujuk ke fasilitas kesehatan<i class="fa fa-warning"></i></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_referral:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_referral:label">-</span><input type="text" name="/pregnancy/group_review/r_referral" data-relevant=" /pregnancy/group_danger_signs/g_danger_signs  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_referral_note:label"><b>Refer to the health facility for danger signs.</b></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_referral_note:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_referral_note:label"><b> Référez la femme à l'établissement de santé pour signes de danger. </b></span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_referral_note:label"><b>खतरे की सूचना होने पर उसे स्वास्थ्य केंद्र भेजें.</b></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_referral_note:label"><b>Merujuk ke fasilitas kesehatan untuk tanda bahaya.</b></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_referral_note:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_referral_note:label">-</span><input type="text" name="/pregnancy/group_review/r_referral_note" data-relevant=" /pregnancy/group_danger_signs/g_danger_signs  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_danger_sign1:label">Pain or cramping in abdomen</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign1:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign1:label">Douleur ou crampes dans l'abdomen</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign1:label">पेट में दर्द, दबाव या ऐंठन</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign1:label">Nyeri, tekanan atau kram di perut</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign1:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign1:label">-</span><input type="text" name="/pregnancy/group_review/r_danger_sign1" data-relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd1')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_danger_sign2:label">Bleeding or fluid leaking from vagina or vaginal discharge with bad odour</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign2:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign2:label">Saignement ou fuite de liquide du vagin ou des pertes vaginales avec mauvaise odeur</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign2:label">योनि से खून या द्रव पदार्थ का बहाव, या खराब बू के साथ योनि से बहाव</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign2:label">Perdarahan atau cairan merembes dari vagina atau mengalir dari vagina dengan bau busuk</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign2:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign2:label">-</span><input type="text" name="/pregnancy/group_review/r_danger_sign2" data-relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd2')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_danger_sign3:label">Severe nausea or vomiting</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign3:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign3:label">Nausées sévères ou vomissements</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign3:label">गंभीर उबकाई या उल्टी</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign3:label">Parah mual atau muntah</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign3:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign3:label">-</span><input type="text" name="/pregnancy/group_review/r_danger_sign3" data-relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd3')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_danger_sign4:label">Fever of 38 degrees or higher</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign4:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign4:label">Fièvre de 38 degrés ou plus</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign4:label">38 डिग्री या अधिक का बुखार</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign4:label">Demam 38 derajat atau lebih tinggi</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign4:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign4:label">-</span><input type="text" name="/pregnancy/group_review/r_danger_sign4" data-relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd4')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_danger_sign5:label">Severe headache or new, blurry vision problems</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign5:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign5:label">Maux de tête sévères ou nouveaux, problèmes de vision floue</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign5:label">गंभीर सिरदर्द या नए, धुंधली दृष्टि की समस्याएं</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign5:label">Parah sakit kepala atau baru, masalah penglihatan kabur</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign5:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign5:label">-</span><input type="text" name="/pregnancy/group_review/r_danger_sign5" data-relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd5')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_danger_sign6:label">Sudden weight gain or severe swelling of feet, ankles, face, or hands</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign6:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign6:label">Prise de poids soudaine ou gonflement important des pieds, des chevilles, du visage ou des mains</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign6:label">अचानक वजन का बढ़ना या पैर, टखनों, चेहरे या हाथों में गंभीर सूजन</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign6:label">Lonjakan berat badan atau berat pembengkakan kaki, pergelangan kaki, wajah, atau tangan</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign6:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign6:label">-</span><input type="text" name="/pregnancy/group_review/r_danger_sign6" data-relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd6')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_danger_sign7:label">Less movement and kicking from the baby (after week 20 of pregnancy)</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign7:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign7:label">Moins de mouvement et de coups de pied du bébé (après 20 semaines de grossesse)</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign7:label">बच्चे का कम हिलना या लात मारना (गर्भावस्था के 20 सप्ताह के बाद)</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign7:label">Kurang gerak dan menendang dari bayi (setelah minggu 20 kehamilan)</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign7:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign7:label">-</span><input type="text" name="/pregnancy/group_review/r_danger_sign7" data-relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd7')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_danger_sign8:label">Blood in the urine or painful, burning urination</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign8:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign8:label">Du sang dans l'urine ou une miction douloureuse et brûlante</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign8:label">पेशाब में खून या दर्दनाक, जलता हुआ पेशाब</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign8:label">Darah dalam urin atau menyakitkan, terbakar buang air kecil</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign8:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign8:label">-</span><input type="text" name="/pregnancy/group_review/r_danger_sign8" data-relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd8')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_danger_sign9:label">Diarrhea that doesn't go away</span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign9:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign9:label">La diarrhée qui ne disparaît pas</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign9:label">दस्त जो कम नहीं होता</span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign9:label">Diare yang tidak mengurangi</span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign9:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_danger_sign9:label">-</span><input type="text" name="/pregnancy/group_review/r_danger_sign9" data-relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd9')" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-blue "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_reminders:label">Healthy Pregnancy Tips<i class="fa fa-heart"></i></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_reminders:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_reminders:label">Conseils pour une grossesse en bonne santé <i class = "fa-coeur"> </i></span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_reminders:label">स्वस्थ्य गर्भावस्था के सुझाव <i class="fa fa-heart"></i></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_reminders:label">Tips kehamilan sehat<i class="fa fa-heart"></i></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_reminders:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_reminders:label">-</span><input type="text" name="/pregnancy/group_review/r_reminders" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_reminder_trim1:label"><p>Remind woman of the <strong>6 STEPS TO A HEALTHY PREGNANCY:</strong></p> <ol style="margin-left:1em; list-style: decimal inside;"><li>Attend regular ANC visits</li><li>Sleep under a treated net <strong>every</strong> night</li><li><span class="or-output" data-value=" /pregnancy/patient_name "> </span> is in her <strong>first trimester</strong>. Remind her to take supplements:<ul style="margin-left:1em; list-style: disc inside;"><li><em>Take Iron Folate daily</em></li></ul></li><li>Eat well: Eat more often than usual and eat a variety of foods to give you strength and to help your baby grow</li><li>Deliver your child at a health center</li><li>Breastfeed the baby <strong>immediately</strong> after birth</ol></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim1:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim1:label"><p>Rappelez à la femme les <strong> 6 ÉTAPES POUR UNE GROSSESSE EN BONNE SANTÉ: </strong></p> &lt;ol style = "margin-left: 1em; list-style: decimal inside;"&gt; &lt;li&gt; Faire des visites CPN régulières &lt;/ li&gt; &lt;li&gt; Dormir sous un moustiquaire imprégné <strong> tous les </strong> soirs &lt;/ li&gt; &lt; li&gt; $ {patient<em>name} est dans son <strong> premier trimestre </strong>. Lui rappeler de prendre des suppléments: &lt;ul style = "margin-left: 1em; style-liste: disc inside;"&gt; &lt;li&gt; </em>Prendre du fer tous les jours _ &lt;/ li&gt; &lt;/ ul&gt; &lt;/ li&gt; &lt;li&gt; : Mangez plus souvent que d'habitude et mangez une variété d'aliments pour vous donner de la force et pour aider votre bébé à grandir &lt;/ li&gt; &lt;li&gt; Accoucher dans un centre de santé &lt;/ li&gt; &lt;li&gt; Allaiter le bébé <em>* immédiatement </em> * après la naissance &lt;/ ol&gt;</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim1:label">कृपया महिला को <strong>स्वस्थ गर्भावस्था से जुड़े 6 सुझावों की याद दिलायें</strong> <ol style="margin-left:1em; list-style: decimal inside;"><li> नियमित रूप से उपस्थित रहें गर्भावस्था की देख भाल के लिए</li><li> <strong>हर</strong> रात दवाइया वाली मच्छरदानी मच्छरदानी में सोएँ</li><li><span class="or-output" data-value=" /pregnancy/patient_name "> </span> वह अपने <strong>पहले तिमाही</strong> में है कृपया उसे दवा लेने के लिए याद दिलायें:<ul style="margin-left:1em; list-style: disc inside;"><li>_आयरन फोलेट को दैनिक ले</li></ul></li><li>ज़्यादा खाएं: सामान्य से अधिक बार खाएं और आपको ताकत देने के लिए कई प्रकार के खाद्य पदार्थ खाएं, ये आपको शक्ती देगा एवं बच्चे के विकास में मदद करेगा</li><li>एक स्वास्थ्य केंद्र में अपने बच्चे को डिलीवर करें</li><li>बच्चे को जन्म के बाद <strong>तुरंत</strong> स्तनपान करायें</ol></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim1:label"><p>Mengingatkan wanita tentang <strong>6 LANGKAH A KEHAMILAN SEHAT:</strong></p><ol style="margin-left:1em; list-style: decimal inside;"><li>Datang untuk kunjungan ANC Rutin</li><li>Tidur menggunakan kelambu berinsektisida <strong>setiap</strong> malam</li><li><span class="or-output" data-value=" /pregnancy/patient_name "> </span> sedang di <strong>trimester pertama nya</strong>. Ingatkan dia untuk mengambil suplemen:<ul style="margin-left:1em; list-style: disc inside;"><li>_ Ambil Besi Folat harian_</li></ul></li><li>Makan dengan baik: Makan lebih sering dari biasanya dan makan beragam makanan untuk memberi mu kekuatan dan untuk membantu bayi Anda tumbuh</li><li>Melahirkan bayi di fasilitas kesehatan</li><li>Menyusui bayi <strong>segera setelah lahir</strong></ol></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim1:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim1:label">-</span><input type="text" name="/pregnancy/group_review/r_reminder_trim1" data-relevant="( /pregnancy/weeks_since_lmp  &lt;= 12) and ( /pregnancy/weeks_since_lmp  &gt; 0)" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_reminder_trim2:label"><p>Remind woman of the <strong>6 STEPS TO A HEALTHY PREGNANCY:</strong></p> <ol style="margin-left:1em; list-style: decimal inside;"><li>Attend regular ANC visits</li><li>Sleep under a treated net <strong>every</strong> night</li><li><span class="or-output" data-value=" /pregnancy/patient_name "> </span> is in her <strong>second trimester</strong>. Remind her to take supplements:<ul style="margin-left:1em; list-style: disc inside;"><li><em>Take Iron Folate daily</em></li><li><em>Take Deworming/Albendazole once</em></li><li><em>Take Malaria Prophylaxis/Fansidar every month</em></li></ul></li><li>Eat well: Eat more often than usual and eat a variety of foods to give you strength and to help your baby grow</li><li>Deliver your child at a health center</li><li>Breastfeed the baby <strong>immediately</strong> after birth</ol></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim2:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim2:label"><p>Rappelez à la femme les <strong>6 ÉTAPES POUR UNE GROSSESSE EN BONNE SANTÉ:</strong></p> &lt;ol style = "margin-left: 1em; list-style: decimal inside;"&gt; &lt;li&gt; Faire des visites CPN régulières &lt;/ li&gt; &lt;li&gt; Dormir sous un moustiquaire imprégné <strong>tous les</strong> soirs &lt;/ li&gt; &lt; li&gt; $ {patient<em>name} est dans son <strong>second trimestre</strong>. Lui rappeler de prendre des suppléments: &lt;ul style = "margin-left: 1em; style-liste: disc inside;"&gt; &lt;li&gt; </em>Prendre du fer tous les jours _ &lt;/ li&gt;&lt;li&gt;<em>Faire un déparasitage/Albendazole une seule fois</em>&lt;/li&gt; &lt;li&gt;<em>prendre du Prophylaxis/Fansidar chaque mois</em>&lt;/li&gt;&lt;/ ul&gt; &lt;/ li&gt; &lt;li&gt; : Mangez plus souvent que d'habitude et mangez une variété d'aliments pour vous donner de la force et pour aider votre bébé à grandir &lt;/ li&gt; &lt;li&gt; Accoucher dans un centre de santé &lt;/ li&gt; &lt;li&gt; Allaiter le bébé <strong>immédiatement</strong> après la naissance &lt;/ ol&gt;</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim2:label">कृपया महिला को <strong>स्वस्थ गर्भावस्था से जुड़े 6 सुझावों की याद दिलायें</strong> <ol style="margin-left:1em; list-style: decimal inside;"><li> नियमित रूप से उपस्थित रहें गर्भावस्था की देख भाल के लिए</li><li> <strong>हर</strong> रात दवाइया वाली मच्छरदानी मच्छरदानी में सोएँ</li><li><span class="or-output" data-value=" /pregnancy/patient_name "> </span> वह अपने <strong>दूसरे तिमाही</strong> में है कृपया उसे दवा लेने के लिए याद दिलायें:<ul style="margin-left:1em; list-style: disc inside;"><li><em>आयरन फोलेट को दैनिक ले</em></li><li><em>डीवर्मिंग / अल्बेन्डाजोल को एक बार ले</em></li><li>_हर महीने मलेरिया प्रोफिलैक्सिस / फंसिदर ले</li></ul></li><li>ज़्यादा खाएं: सामान्य से अधिक बार खाएं और आपको ताकत देने के लिए कई प्रकार के खाद्य पदार्थ खाएं, ये आपको शक्ती देगा एवं बच्चे के विकास में मदद करेगा</li><li>एक स्वास्थ्य केंद्र में अपने बच्चे को डिलीवर करें</li><li>बच्चे को जन्म के बाद <strong>तुरंत</strong> स्तनपान करायें</ol></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim2:label"><p>Mengingatkan wanita tentang <strong>6 LANGKAH A KEHAMILAN SEHAT:</strong></p><ol style="margin-left:1em; list-style: decimal inside;"><li>Datang untuk kunjungan ANC Rutin</li><li>Tidur menggunakan kelambu berinsektisida <strong>setiap</strong> malam</li><li><span class="or-output" data-value=" /pregnancy/patient_name "> </span> sedang di <strong>trimester kedua nya</strong>. Ingatkan dia untuk mengambil suplemen:<ul style="margin-left:1em; list-style: disc inside;"><li>_ Ambil Besi Folat harian<em></li><li></em> Mengambil deworming/ albendazole sekali<em></li><li></em> Mengambil Malaria Profilaksis / Fansidar setiap bulan_</li></ul></li><li>Makan dengan baik: Makan lebih sering dari biasanya dan makan beragam makanan untuk memberi mu kekuatan dan untuk membantu bayi Anda tumbuh</li><li>Melahirkan bayi di fasilitas kesehatan</li><li>Menyusui bayi <strong>segera setelah lahir</strong></ol></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim2:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim2:label">-</span><input type="text" name="/pregnancy/group_review/r_reminder_trim2" data-relevant="( /pregnancy/weeks_since_lmp  &lt;= 27) and ( /pregnancy/weeks_since_lmp  &gt; 12)" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_reminder_trim3:label"><p>Remind woman of the <strong>6 STEPS TO A HEALTHY PREGNANCY:</strong></p> <ol style="margin-left:1em; list-style: decimal inside;"><li>Attend regular ANC visits</li><li>Sleep under a treated net <strong>every</strong> night</li><li><span class="or-output" data-value=" /pregnancy/patient_name "> </span> is in her <strong>third trimester</strong>. Remind her to take supplements:<ul style="margin-left:1em; list-style: disc inside;"><li><em>Take Iron Folate daily</em></li><li><em>Take Deworming/Albendazole once</em></li><li><em>Take Malaria Prophylaxis/Fansidar every month</em></li></ul></li><li>Eat well: Eat more often than usual and eat a variety of foods to give you strength and to help your baby grow</li><li>Deliver your child at a health center</li><li>Breastfeed the baby <strong>immediately</strong> after birth. Do NOT give baby anything else to eat or drink.</ol></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim3:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim3:label"><p>Rappelez à la femme les <strong>6 ÉTAPES POUR UNE GROSSESSE EN BONNE SANTÉ:</strong></p> &lt;ol style = "margin-left: 1em; list-style: decimal inside;"&gt; &lt;li&gt; Faire des visites CPN régulières &lt;/ li&gt; &lt;li&gt; Dormir sous un moustiquaire imprégné <strong>tous les</strong> soirs &lt;/ li&gt; &lt; li&gt; $ {patient<em>name} est dans son <strong>troisième trimestre</strong>. Lui rappeler de prendre des suppléments: &lt;ul style = "margin-left: 1em; style-liste: disc inside;"&gt; &lt;li&gt; </em>Prendre du fer tous les jours _ &lt;/ li&gt; &lt;li&gt;<em>Faire un déparasitage/Albendazole une seule fois</em>&lt;/li&gt; &lt;li&gt;<em>prendre du Prophylaxis/Fansidar chaque mois</em>&lt;/li&gt; &lt;/ ul&gt; &lt;/ li&gt; &lt;li&gt; : Mangez plus souvent que d'habitude et mangez une variété d'aliments pour vous donner de la force et pour aider votre bébé à grandir &lt;/ li&gt; &lt;li&gt; Accoucher dans un centre de santé &lt;/ li&gt; &lt;li&gt; Allaiter le bébé <strong>immédiatement</strong> après la naissance &lt;/ ol&gt;</span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim3:label">"कृपया महिला को <strong> स्वस्थ गर्भावस्था से जुड़े 6 सुझावों की याद दिलायें </strong> <ol style="margin-left:1em; list-style: decimal inside;"><li> नियमित रूप से उपस्थित रहें गर्भावस्था की देख भाल के लिए</li><li> <em>हर</em> रात दवाइया वाली मच्छरदानी मच्छरदानी में सोएँ</li><li><span class="or-output" data-value=" /pregnancy/patient_name "> </span> वह अपने <em>तीसरी तिमाही</em> में है कृपया उसे दवा लेने के लिए याद दिलायें:<ul style="margin-left:1em; list-style: disc inside;"><li><em>आयरन फोलेट को दैनिक ले</em></li><li><em>डीवर्मिंग / अल्बेन्डाजोल को एक बार ले</em></li><li>_हर महीने मलेरिया प्रोफिलैक्सिस / फंसिदर ले</li></ul></li><li>ज़्यादा खाएं: सामान्य से अधिक बार खाएं और आपको ताकत देने के लिए कई प्रकार के खाद्य पदार्थ खाएं, ये आपको शक्ती देगा एवं बच्चे के विकास में मदद करेगा</li><li>एक स्वास्थ्य केंद्र में अपने बच्चे को डिलीवर करें</li><li>बच्चे को जन्म के बाद <em>तुरंत</em> स्तनपान करायें.बच्चे को जन्म के बाद तुरंत स्तनपान करायें. बच्चे को कुछ और खाना या पीने के लिए बिल्कुल नही दें </ol></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim3:label"><p>Mengingatkan wanita tentang <strong>6 LANGKAH A KEHAMILAN SEHAT:</strong></p><ol style="margin-left:1em; list-style: decimal inside;"><li>Datang untuk kunjungan ANC Rutin</li><li>Tidur menggunakan kelambu berinsektisida <strong>setiap</strong> malam</li><li><span class="or-output" data-value=" /pregnancy/patient_name "> </span> sedang di <strong>trimester ketiga nya</strong>. Ingatkan dia untuk mengambil suplemen:<ul style="margin-left:1em; list-style: disc inside;"><li><em>Ambil Besi Folat harian</em></li><li><em>Mengambil deworming/ albendazole sekali</em></li><li><em>Mengambil Malaria Profilaksis / Fansidar setiap bulan</em></li></ul></li><li>Makan dengan baik: Makan lebih sering dari biasanya dan makan beragam makanan untuk memberi mu kekuatan dan untuk membantu bayi Anda tumbuh</li><li>Melahirkan bayi di fasilitas kesehatan</li><li>Menyusui bayi <strong>segera setelah lahir</strong>. Tidak memberikan bayi apa-apa lagi untuk dimakan atau diminum.</ol></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim3:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_reminder_trim3:label">-</span><input type="text" name="/pregnancy/group_review/r_reminder_trim3" data-relevant=" /pregnancy/weeks_since_lmp  &gt; 27" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h1 or-appearance-green "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_followup:label">Follow Up Message <i class="fa fa-envelope"></i></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_followup:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_followup:label">Message de suivi <i class="fa fa-envelope"></i></span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_followup:label">सुनिश्चित करने के लिए सन्देश <i class="fa fa-envelope"></i></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_followup:label">Follow Up Pesan <i class="fa fa-envelope"></i></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_followup:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_followup:label">-</span><input type="text" name="/pregnancy/group_review/r_followup" data-relevant=" /pregnancy/chw_sms  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_followup_note1:label"><strong>The following will be sent as a SMS to <span class="or-output" data-value=" /pregnancy/chw_name "> </span> <span class="or-output" data-value=" /pregnancy/chw_phone "> </span></strong></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_followup_note1:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_followup_note1:label"><strong>Ce qui suit sera envoyé par SMS à <span class="or-output" data-value=" /pregnancy/chw_name "> </span> <span class="or-output" data-value=" /pregnancy/chw_phone "> </span></strong></span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_followup_note1:label"><strong>ये SMS के रूप में <span class="or-output" data-value=" /pregnancy/chw_name "> </span> <span class="or-output" data-value=" /pregnancy/chw_phone "> </span> को भेजा जायेगा</strong></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_followup_note1:label"><strong>Berikut ini akan dikirim sebagai SMS ke <span class="or-output" data-value=" /pregnancy/chw_name "> </span> <span class="or-output" data-value=" /pregnancy/chw_phone "> </span></strong></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_followup_note1:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_followup_note1:label">-</span><input type="text" name="/pregnancy/group_review/r_followup_note1" data-relevant=" /pregnancy/chw_sms  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/group_review/r_followup_note2:label"> <span class="or-output" data-value=" /pregnancy/chw_sms "> </span></span><span lang="es" class="question-label " data-itext-id="/pregnancy/group_review/r_followup_note2:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy/group_review/r_followup_note2:label"> <span class="or-output" data-value=" /pregnancy/chw_sms "> </span></span><span lang="hi" class="question-label " data-itext-id="/pregnancy/group_review/r_followup_note2:label"> <span class="or-output" data-value=" /pregnancy/chw_sms "> </span></span><span lang="id" class="question-label " data-itext-id="/pregnancy/group_review/r_followup_note2:label"> <span class="or-output" data-value=" /pregnancy/chw_sms "> </span></span><span lang="ne" class="question-label " data-itext-id="/pregnancy/group_review/r_followup_note2:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy/group_review/r_followup_note2:label">-</span><input type="text" name="/pregnancy/group_review/r_followup_note2" data-relevant=" /pregnancy/chw_sms  != ''" data-type-xml="string" readonly></label>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/pregnancy/patient_age_in_years" data-calculate="if (  /pregnancy/inputs/contact/date_of_birth ='', '', floor( difference-in-months(  /pregnancy/inputs/contact/date_of_birth , today() ) div 12 ) )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/chw_name" data-calculate="../inputs/contact/parent/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/chw_phone" data-calculate="../inputs/contact/parent/contact/phone" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/chw_sms" data-calculate="if( /pregnancy/group_note/g_chw_sms  != '', concat( /pregnancy/group_note/default_chw_sms_text ,concat(' ', /pregnancy/group_note/g_chw_sms )),  /pregnancy/group_note/default_chw_sms_text )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/lmp_method" data-calculate=" /pregnancy/group_lmp/g_lmp_method " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/lmp_date_8601" data-calculate=" /pregnancy/group_lmp/g_lmp_date_8601 " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/lmp_date" data-calculate=" /pregnancy/group_lmp/g_lmp_date " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/edd_8601" data-calculate=" /pregnancy/group_lmp/g_edd_8601 " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/edd" data-calculate=" /pregnancy/group_lmp/g_edd " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/risk_factors" data-calculate=" /pregnancy/group_risk_factors/g_risk_factors " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/danger_signs" data-calculate=" /pregnancy/group_danger_signs/g_danger_signs " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/patient_age_at_lmp" data-calculate="floor( difference-in-months(  /pregnancy/inputs/contact/date_of_birth ,  /pregnancy/lmp_date_8601  ) div 12 )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/days_since_lmp" data-calculate="round(decimal-date-time(today()) - decimal-date-time( /pregnancy/group_lmp/g_lmp_date_8601 ), 2)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/weeks_since_lmp" data-calculate="round( /pregnancy/days_since_lmp  div 7, 2)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/group_lmp/g_lmp_date_raw" data-calculate="if(selected(  /pregnancy/group_lmp/g_lmp_method ,'calendar'),  /pregnancy/group_lmp/g_lmp_calendar ,date-time(decimal-date-time(today()- /pregnancy/group_lmp/g_lmp_approx )))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/group_lmp/g_lmp_date_8601" data-calculate="format-date-time(if(selected(  /pregnancy/group_lmp/g_lmp_method ,'calendar'),  /pregnancy/group_lmp/g_lmp_calendar ,date-time(decimal-date-time(today()- /pregnancy/group_lmp/g_lmp_approx ))),&quot;%Y-%m-%d&quot;)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/group_lmp/g_lmp_date" data-calculate="format-date-time(if(selected( /pregnancy/group_lmp/g_lmp_method ,'calendar'),  /pregnancy/group_lmp/g_lmp_calendar ,date-time(decimal-date-time(today()- /pregnancy/group_lmp/g_lmp_approx ))),&quot;%b %e, %Y&quot;)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/group_lmp/g_edd_8601" data-calculate='format-date-time(date-time(decimal-date-time( /pregnancy/group_lmp/g_lmp_date_8601 )+280),"%Y-%m-%dT00:00:00.000Z")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/group_lmp/g_edd" data-calculate='format-date-time(date-time(decimal-date-time( /pregnancy/group_lmp/g_lmp_date_8601 )+280),"%b %e, %Y")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/group_note/default_chw_sms_text" data-calculate="jr:choice-name( /pregnancy/group_note/default_chw_sms ,' /pregnancy/group_note/default_chw_sms ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/group_review/r_patient_id" data-calculate="../../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <pregnancy xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="pregnancy" prefix="J1!pregnancy!" version="2022-09-26 12-39">
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
              <date_of_birth/>
              <sex/>
              <parent>
                <contact>
                  <phone/>
                  <name/>
                </contact>
              </parent>
            </contact>
          </inputs>
          <patient_age_in_years tag="hidden"/>
          <patient_uuid tag="hidden"/>
          <patient_id/>
          <patient_name/>
          <chw_name/>
          <chw_phone/>
          <chw_sms/>
          <lmp_method tag="hidden"/>
          <lmp_date_8601 tag="hidden"/>
          <lmp_date/>
          <edd_8601 tag="hidden"/>
          <edd/>
          <risk_factors/>
          <danger_signs/>
          <patient_age_at_lmp tag="hidden"/>
          <days_since_lmp tag="hidden"/>
          <weeks_since_lmp tag="hidden"/>
          <group_lmp tag="hidden">
            <g_lmp_method>calendar</g_lmp_method>
            <g_lmp_calendar/>
            <g_lmp_approx/>
            <g_lmp_date_raw/>
            <g_lmp_date_8601/>
            <g_lmp_date/>
            <g_edd_8601/>
            <g_edd/>
            <g_display_edd/>
          </group_lmp>
          <group_risk_factors tag="hidden">
            <g_risk_factors/>
          </group_risk_factors>
          <group_danger_signs tag="hidden">
            <g_danger_signs/>
            <g_danger_signs_note/>
          </group_danger_signs>
          <group_note tag="hidden">
            <default_chw_sms/>
            <default_chw_sms_text/>
            <default_chw_sms_note/>
            <is_sms_edited>yes</is_sms_edited>
            <g_chw_sms/>
          </group_note>
          <group_review tag="hidden">
            <submit/>
            <r_summary/>
            <r_patient_id/>
            <r_pregnancy_details/>
            <r_risk_factors/>
            <r_risk_factor1/>
            <r_risk_factor2/>
            <r_risk_factor3/>
            <r_risk_factor4/>
            <r_risk_factor5/>
            <r_risk_factor6/>
            <r_risk_factor7/>
            <r_risk_factor8/>
            <r_referral/>
            <r_referral_note/>
            <r_danger_sign1/>
            <r_danger_sign2/>
            <r_danger_sign3/>
            <r_danger_sign4/>
            <r_danger_sign5/>
            <r_danger_sign6/>
            <r_danger_sign7/>
            <r_danger_sign8/>
            <r_danger_sign9/>
            <r_reminders/>
            <r_reminder_trim1/>
            <r_reminder_trim2/>
            <r_reminder_trim3/>
            <r_followup/>
            <r_followup_note1/>
            <r_followup_note2/>
          </group_review>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </pregnancy>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>New Pregnancy</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/pregnancy/chw_name:label">
            <value>CHW Name</value>
          </text>
          <text id="/pregnancy/chw_phone:label">
            <value>CHW Phone</value>
          </text>
          <text id="/pregnancy/chw_sms:label">
            <value>Note to the CHW</value>
          </text>
          <text id="/pregnancy/danger_signs:label">
            <value>Danger Signs</value>
          </text>
          <text id="/pregnancy/edd:label">
            <value>EDD</value>
          </text>
          <text id="/pregnancy/edd_8601:label">
            <value>EDD</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d1:label">
            <value>Pain or cramping in abdomen</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d2:label">
            <value>Bleeding or fluid leaking from vagina or vaginal discharge with bad odour</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d3:label">
            <value>Severe nausea or vomiting</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d4:label">
            <value>Fever of 38 degrees or higher</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d5:label">
            <value>Severe headache or new, blurry vision problems</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d6:label">
            <value>Sudden weight gain or severe swelling of feet, ankles, face, or hands</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d7:label">
            <value>Less movement and kicking from the baby (after week 20 of pregnancy)</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d8:label">
            <value>Blood in the urine or painful, burning urination</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d9:label">
            <value>Diarrhea that doesn't go away</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:hint">
            <value>Select all that apply</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg">
            <value>Cannot report less movement for pregnancies under 5 months</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:label">
            <value>Does the woman have any of the following danger signs?</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs_note:label">
            <value>**The woman should be treated immediately if she is experiencing any of these danger signs.**</value>
          </text>
          <text id="/pregnancy/group_danger_signs:label">
            <value>Danger Signs</value>
          </text>
          <text id="/pregnancy/group_lmp/g_display_edd:label">
            <value>**Estimated delivery date is**
<output value=" /pregnancy/group_lmp/g_edd "/></value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/122:label">
            <value>up to 4 months ago</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/183:label">
            <value>between 5 to 6 months ago</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/244:label">
            <value>between 7 to 8 months ago</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/61:label">
            <value>up to 2 months ago</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/91:label">
            <value>up to 3 months ago</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx:label">
            <value>Approximate start date of last cycle</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg">
            <value>Date must be in the previous 42 weeks</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_calendar:label">
            <value>Start date of last cycle</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_date:label">
            <value>LMP</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method/approx:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method/calendar:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method:label">
            <value>Does the woman know the date of the last cycle?</value>
          </text>
          <text id="/pregnancy/group_lmp:label">
            <value>Last Menstrual Period</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms/default:label">
            <value>Hi <output value=" /pregnancy/chw_name "/>, a pregnancy for <output value=" /pregnancy/patient_name "/> (<output value=" /pregnancy/group_review/r_patient_id "/>) has been registered at the facility. You will receive ANC notifications for this patient. Please follow up to identify the patient. Thank you!</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms/highrisk:label">
            <value>Hi <output value=" /pregnancy/chw_name "/>, a pregnancy with danger signs for <output value=" /pregnancy/patient_name "/> (<output value=" /pregnancy/group_review/r_patient_id "/>) has been registered by the health facility. This is a high-risk pregnancy. You will receive ANC notifications for this patient. Please follow up with the nurse to identify the patient. Thank you!</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms:label">
            <value>Default SMS to send to CHW</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms_note:label">
            <value>**The following message will be sent to <output value=" /pregnancy/chw_name "/> (<output value=" /pregnancy/chw_phone "/>):**
 <output value=" /pregnancy/group_note/default_chw_sms_text "/></value></text>
          <text id="/pregnancy/group_note/g_chw_sms:hint">
            <value>Messages are limited in length to avoid high SMS costs.</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:jr:constraintMsg">
            <value>Your message cannot be longer than 5 SMS messages. Please shorten your message to reduce SMS costs.</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:label">
            <value>You can add a personal note to the SMS here:</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited:label">
            <value>Would you like to add a personal note to the message?</value>
          </text>
          <text id="/pregnancy/group_note:label">
            <value>Note to the CHW</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign1:label">
            <value>Pain or cramping in abdomen</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign2:label">
            <value>Bleeding or fluid leaking from vagina or vaginal discharge with bad odour</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign3:label">
            <value>Severe nausea or vomiting</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign4:label">
            <value>Fever of 38 degrees or higher</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign5:label">
            <value>Severe headache or new, blurry vision problems</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign6:label">
            <value>Sudden weight gain or severe swelling of feet, ankles, face, or hands</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign7:label">
            <value>Less movement and kicking from the baby (after week 20 of pregnancy)</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign8:label">
            <value>Blood in the urine or painful, burning urination</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign9:label">
            <value>Diarrhea that doesn't go away</value>
          </text>
          <text id="/pregnancy/group_review/r_followup:label">
            <value>Follow Up Message &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_followup_note1:label">
            <value>**The following will be sent as a SMS to <output value=" /pregnancy/chw_name "/> <output value=" /pregnancy/chw_phone "/>**</value>
          </text>
          <text id="/pregnancy/group_review/r_followup_note2:label">
            <value><output value=" /pregnancy/chw_sms "/></value>
          </text>
          <text id="/pregnancy/group_review/r_pregnancy_details:label">
            <value>**<output value=" /pregnancy/patient_name "/>**
ID: <output value=" /pregnancy/group_review/r_patient_id "/>
Estimated delivery date: <output value=" /pregnancy/group_lmp/g_edd "/></value></text>
          <text id="/pregnancy/group_review/r_referral:label">
            <value>Refer to a health facility&lt;i class="fa fa-warning"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_referral_note:label">
            <value>&lt;b&gt;Refer to the health facility for danger signs.&lt;/b&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim1:label">
            <value>Remind woman of the **6 STEPS TO A HEALTHY PREGNANCY:**

 &lt;ol style=&quot;margin-left:1em; list-style: decimal inside;&quot;&gt;&lt;li&gt;Attend regular ANC visits&lt;/li&gt;&lt;li&gt;Sleep under a treated net **every** night&lt;/li&gt;&lt;li&gt;<output value=" /pregnancy/patient_name "/> is in her **first trimester**. Remind her to take supplements:&lt;ul style=&quot;margin-left:1em; list-style: disc inside;&quot;&gt;&lt;li&gt;_Take Iron Folate daily_&lt;/li&gt;&lt;/ul&gt;&lt;/li&gt;&lt;li&gt;Eat well: Eat more often than usual and eat a variety of foods to give you strength and to help your baby grow&lt;/li&gt;&lt;li&gt;Deliver your child at a health center&lt;/li&gt;&lt;li&gt;Breastfeed the baby **immediately** after birth&lt;/ol&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim2:label">
            <value>Remind woman of the **6 STEPS TO A HEALTHY PREGNANCY:**

 &lt;ol style=&quot;margin-left:1em; list-style: decimal inside;&quot;&gt;&lt;li&gt;Attend regular ANC visits&lt;/li&gt;&lt;li&gt;Sleep under a treated net **every** night&lt;/li&gt;&lt;li&gt;<output value=" /pregnancy/patient_name "/> is in her **second trimester**. Remind her to take supplements:&lt;ul style=&quot;margin-left:1em; list-style: disc inside;&quot;&gt;&lt;li&gt;_Take Iron Folate daily_&lt;/li&gt;&lt;li&gt;_Take Deworming/Albendazole once_&lt;/li&gt;&lt;li&gt;_Take Malaria Prophylaxis/Fansidar every month_&lt;/li&gt;&lt;/ul&gt;&lt;/li&gt;&lt;li&gt;Eat well: Eat more often than usual and eat a variety of foods to give you strength and to help your baby grow&lt;/li&gt;&lt;li&gt;Deliver your child at a health center&lt;/li&gt;&lt;li&gt;Breastfeed the baby **immediately** after birth&lt;/ol&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim3:label">
            <value>Remind woman of the **6 STEPS TO A HEALTHY PREGNANCY:**

 &lt;ol style=&quot;margin-left:1em; list-style: decimal inside;&quot;&gt;&lt;li&gt;Attend regular ANC visits&lt;/li&gt;&lt;li&gt;Sleep under a treated net **every** night&lt;/li&gt;&lt;li&gt;<output value=" /pregnancy/patient_name "/> is in her **third trimester**. Remind her to take supplements:&lt;ul style=&quot;margin-left:1em; list-style: disc inside;&quot;&gt;&lt;li&gt;_Take Iron Folate daily_&lt;/li&gt;&lt;li&gt;_Take Deworming/Albendazole once_&lt;/li&gt;&lt;li&gt;_Take Malaria Prophylaxis/Fansidar every month_&lt;/li&gt;&lt;/ul&gt;&lt;/li&gt;&lt;li&gt;Eat well: Eat more often than usual and eat a variety of foods to give you strength and to help your baby grow&lt;/li&gt;&lt;li&gt;Deliver your child at a health center&lt;/li&gt;&lt;li&gt;Breastfeed the baby **immediately** after birth. Do NOT give baby anything else to eat or drink.&lt;/ol&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminders:label">
            <value>Healthy Pregnancy Tips&lt;i class="fa fa-heart"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor1:label">
            <value>First pregnancy</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor2:label">
            <value>More than 4 children</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor3:label">
            <value>Last baby born less than 1 year before</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor4:label">
            <value>Had previous miscarriages or previous difficulties in childbirth</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor5:label">
            <value>One of the following conditions: heart conditions, asthma, high blood pressure, known diabetes</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor6:label">
            <value>HIV positive</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor7:label">
            <value>Under 18 years old</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor8:label">
            <value>Over 35 years old</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factors:label">
            <value>Risk Factors</value>
          </text>
          <text id="/pregnancy/group_review/r_summary:label">
            <value>Pregnancy Details&lt;I class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/submit:label">
            <value>&lt;h4 style="text-align:center;"&gt;Be sure you Submit to complete this action.&lt;/h4&gt;</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r1:label">
            <value>First pregnancy</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r2:label">
            <value>More than 4 children</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r3:label">
            <value>Last baby born less than 1 year before</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r4:label">
            <value>Had previous miscarriages or previous difficulties in childbirth</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r5:label">
            <value>Has any of the following conditions: 
heart conditions, asthma, high blood pressure, known diabetes</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r6:label">
            <value>HIV positive</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:hint">
            <value>Select all that apply</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg">
            <value>Please correct conflicting risk factors</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:label">
            <value>Does the woman have any of the following risk factors?</value>
          </text>
          <text id="/pregnancy/group_risk_factors:label">
            <value>Risk Factors</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:hint">
            <value>Select a person from list</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/pregnancy/inputs:label">
            <value>Patient</value>
          </text>
          <text id="/pregnancy/lmp_date:label">
            <value>LMP</value>
          </text>
          <text id="/pregnancy/lmp_date_8601:label">
            <value>LMP</value>
          </text>
          <text id="/pregnancy/lmp_method:label">
            <value>LMP Method</value>
          </text>
          <text id="/pregnancy/patient_age_at_lmp:label">
            <value>Age at LMP</value>
          </text>
          <text id="/pregnancy/patient_age_in_years:label">
            <value>Years</value>
          </text>
          <text id="/pregnancy/patient_id:label">
            <value>Patient ID</value>
          </text>
          <text id="/pregnancy/patient_name:label">
            <value>Patient Name</value>
          </text>
          <text id="/pregnancy/patient_uuid:label">
            <value>Patient UUID</value>
          </text>
          <text id="/pregnancy/risk_factors:label">
            <value>Risk Factors</value>
          </text>
        </translation>
        <translation lang="es">
          <text id="/pregnancy/chw_name:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/chw_phone:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/edd:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/edd_8601:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d7:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d8:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d9:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_display_edd:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/122:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/183:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/244:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/61:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/91:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_calendar:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_date:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method/approx:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method/calendar:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms/default:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms/highrisk:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited/no:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited/yes:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign7:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign8:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign9:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_followup:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_followup_note1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_followup_note2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_pregnancy_details:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_referral:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_referral_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_reminders:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor7:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor8:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factors:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_summary:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/submit:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/inputs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/lmp_date:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/lmp_date_8601:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/lmp_method:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_age_at_lmp:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_age_in_years:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_id:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_name:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_uuid:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/risk_factors:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="fr">
          <text id="/pregnancy/chw_name:label">
            <value>Nom de l'ASC</value>
          </text>
          <text id="/pregnancy/chw_phone:label">
            <value>Téléphone de l'ASC</value>
          </text>
          <text id="/pregnancy/chw_sms:label">
            <value>Notes pour l'ASC</value>
          </text>
          <text id="/pregnancy/danger_signs:label">
            <value>Signes de danger</value>
          </text>
          <text id="/pregnancy/edd:label">
            <value>Date Probable d'Accouchement</value>
          </text>
          <text id="/pregnancy/edd_8601:label">
            <value>Date Probable d'Accouchement</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d1:label">
            <value>Douleur ou crampes dans l'abdomen</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d2:label">
            <value>Saignement ou fuite de liquide du vagin ou des pertes vaginales avec mauvaise odeur</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d3:label">
            <value>Nausées sévères ou vomissements</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d4:label">
            <value>Fièvre de 38 degrés ou plus</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d5:label">
            <value>Maux de tête sévères ou nouveaux, problèmes de vision floue</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d6:label">
            <value>Prise de poids soudaine ou gonflement important des pieds, des chevilles, du visage ou des mains</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d7:label">
            <value>Moins de mouvement et de coups de pied du bébé (après 20 semaines de grossesse)</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d8:label">
            <value>Du sang dans l'urine ou une miction douloureuse et brûlante</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d9:label">
            <value>La diarrhée qui ne disparaît pas</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:hint">
            <value>Sélectionnez tout ce qui s'applique</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg">
            <value>Impossible de choisir "Moins de mouvements..." pour les grossesses de moins de 5 mois</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:label">
            <value>La femme a-t-elle un de ces signes de danger?</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs_note:label">
            <value>**La femme devrait être traitée immédiatement si elle présente un de ces signes de danger.**</value>
          </text>
          <text id="/pregnancy/group_danger_signs:label">
            <value>Signes de danger</value>
          </text>
          <text id="/pregnancy/group_lmp/g_display_edd:label">
            <value>**La Date Probable d'Accouchement (DPA) est **
<output value=" /pregnancy/group_lmp/g_edd "/></value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/122:label">
            <value>Jusqu'à 4 mois</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/183:label">
            <value>Entre 5 et 6 mois</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/244:label">
            <value>Entre 7 et 8 mois</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/61:label">
            <value>Jusqu'à 2 mois</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/91:label">
            <value>Jusqu'à 3 mois</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx:label">
            <value>Estimer la date des dernères régles</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg">
            <value>La date doit être dans les 42 dernières semaines</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_calendar:label">
            <value>Donner la date des dernières régles</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_date:label">
            <value>Date des Dernières Régles (DDR)</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method/approx:label">
            <value>Non</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method/calendar:label">
            <value>Oui</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method:label">
            <value>La femme connaït-elle la date de ses dernières régles?</value>
          </text>
          <text id="/pregnancy/group_lmp:label">
            <value>Date des Dernières Régles</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms/default:label">
            <value>Bonjour <output value=" /pregnancy/chw_name "/>, une grossesse pour <output value=" /pregnancy/patient_name "/> (<output value=" /pregnancy/group_review/r_patient_id "/>) a été enregistrée au centre de santé. Vous recevrez des notifications CPN pour ce patient. Veuillez faire un suivi pour identifier le patient. Merci !</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms/highrisk:label">
            <value>Bonjour <output value=" /pregnancy/chw_name "/>, une grossesse avec des signes de danger pour <output value=" /pregnancy/patient_name "/> (<output value=" /pregnancy/group_review/r_patient_id "/>) a été enregistrée au centre de santé. C'est une grossesse à haut risque. Vous recevrez des notifications CPN pour ce patient. Veuillez faire un suivi avec l'infirmière pour identifier le patient. Merci !</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms:label">
            <value>Message à envoyer à l'ASC</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms_note:label">
            <value>**Le message suivant sera envoyé à <output value=" /pregnancy/chw_name "/> (<output value=" /pregnancy/chw_phone "/>):**
 <output value=" /pregnancy/group_note/default_chw_sms_text "/></value></text>
          <text id="/pregnancy/group_note/g_chw_sms:hint">
            <value>Les messages sont limités en longueur pour éviter les coûts élevés de SMS.</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:jr:constraintMsg">
            <value>Votre message ne peut pas dépasser 5 SMS. Veuillez raccourcir votre message pour réduire les coûts de SMS.</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:label">
            <value>Vous pouvez ajouter une note personnelle au SMS ici:</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited/no:label">
            <value>Non</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited/yes:label">
            <value>Oui</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited:label">
            <value>Souhaitez-vous ajouter une note personnelle au message?</value>
          </text>
          <text id="/pregnancy/group_note:label">
            <value>Notes à l'ASC</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign1:label">
            <value>Douleur ou crampes dans l'abdomen</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign2:label">
            <value>Saignement ou fuite de liquide du vagin ou des pertes vaginales avec mauvaise odeur</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign3:label">
            <value>Nausées sévères ou vomissements</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign4:label">
            <value>Fièvre de 38 degrés ou plus</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign5:label">
            <value>Maux de tête sévères ou nouveaux, problèmes de vision floue</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign6:label">
            <value>Prise de poids soudaine ou gonflement important des pieds, des chevilles, du visage ou des mains</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign7:label">
            <value>Moins de mouvement et de coups de pied du bébé (après 20 semaines de grossesse)</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign8:label">
            <value>Du sang dans l'urine ou une miction douloureuse et brûlante</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign9:label">
            <value>La diarrhée qui ne disparaît pas</value>
          </text>
          <text id="/pregnancy/group_review/r_followup:label">
            <value>Message de suivi &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_followup_note1:label">
            <value>**Ce qui suit sera envoyé par SMS à <output value=" /pregnancy/chw_name "/> <output value=" /pregnancy/chw_phone "/>**</value>
          </text>
          <text id="/pregnancy/group_review/r_followup_note2:label">
            <value><output value=" /pregnancy/chw_sms "/></value>
          </text>
          <text id="/pregnancy/group_review/r_pregnancy_details:label">
            <value>**<output value=" /pregnancy/patient_name "/>**
ID: <output value=" /pregnancy/group_review/r_patient_id "/>
Date Probable d'Accouchement: <output value=" /pregnancy/group_lmp/g_edd "/></value></text>
          <text id="/pregnancy/group_review/r_referral:label">
            <value>Référez à un établissement de santé &lt;i class = "fa fa-warning"&gt; &lt;/ i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_referral_note:label">
            <value>&lt;b&gt; Référez la femme à l'établissement de santé pour signes de danger. &lt;/ b&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim1:label">
            <value>Rappelez à la femme les ** 6 ÉTAPES POUR UNE GROSSESSE EN BONNE SANTÉ: **

 &amp;lt;ol style = "margin-left: 1em; list-style: decimal inside;"&amp;gt; &amp;lt;li&amp;gt; Faire des visites CPN régulières &amp;lt;/ li&amp;gt; &amp;lt;li&amp;gt; Dormir sous un moustiquaire imprégné ** tous les ** soirs &amp;lt;/ li&amp;gt; &amp;lt; li&amp;gt; $ {patient_name} est dans son ** premier trimestre **. Lui rappeler de prendre des suppléments: &amp;lt;ul style = "margin-left: 1em; style-liste: disc inside;"&amp;gt; &amp;lt;li&amp;gt; _Prendre du fer tous les jours _ &amp;lt;/ li&amp;gt; &amp;lt;/ ul&amp;gt; &amp;lt;/ li&amp;gt; &amp;lt;li&amp;gt; : Mangez plus souvent que d'habitude et mangez une variété d'aliments pour vous donner de la force et pour aider votre bébé à grandir &amp;lt;/ li&amp;gt; &amp;lt;li&amp;gt; Accoucher dans un centre de santé &amp;lt;/ li&amp;gt; &amp;lt;li&amp;gt; Allaiter le bébé ** immédiatement * * après la naissance &amp;lt;/ ol&amp;gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim2:label">
            <value>Rappelez à la femme les **6 ÉTAPES POUR UNE GROSSESSE EN BONNE SANTÉ:**

 &amp;lt;ol style = "margin-left: 1em; list-style: decimal inside;"&amp;gt; &amp;lt;li&amp;gt; Faire des visites CPN régulières &amp;lt;/ li&amp;gt; &amp;lt;li&amp;gt; Dormir sous un moustiquaire imprégné **tous les** soirs &amp;lt;/ li&amp;gt; &amp;lt; li&amp;gt; $ {patient_name} est dans son **second trimestre**. Lui rappeler de prendre des suppléments: &amp;lt;ul style = "margin-left: 1em; style-liste: disc inside;"&amp;gt; &amp;lt;li&amp;gt; _Prendre du fer tous les jours _ &amp;lt;/ li&amp;gt;&amp;lt;li&amp;gt;_Faire un déparasitage/Albendazole une seule fois_&amp;lt;/li&amp;gt; &amp;lt;li&amp;gt;_prendre du Prophylaxis/Fansidar chaque mois_&amp;lt;/li&amp;gt;&amp;lt;/ ul&amp;gt; &amp;lt;/ li&amp;gt; &amp;lt;li&amp;gt; : Mangez plus souvent que d'habitude et mangez une variété d'aliments pour vous donner de la force et pour aider votre bébé à grandir &amp;lt;/ li&amp;gt; &amp;lt;li&amp;gt; Accoucher dans un centre de santé &amp;lt;/ li&amp;gt; &amp;lt;li&amp;gt; Allaiter le bébé **immédiatement** après la naissance &amp;lt;/ ol&amp;gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim3:label">
            <value>Rappelez à la femme les **6 ÉTAPES POUR UNE GROSSESSE EN BONNE SANTÉ:**

 &amp;lt;ol style = "margin-left: 1em; list-style: decimal inside;"&amp;gt; &amp;lt;li&amp;gt; Faire des visites CPN régulières &amp;lt;/ li&amp;gt; &amp;lt;li&amp;gt; Dormir sous un moustiquaire imprégné **tous les** soirs &amp;lt;/ li&amp;gt; &amp;lt; li&amp;gt; $ {patient_name} est dans son **troisième trimestre**. Lui rappeler de prendre des suppléments: &amp;lt;ul style = "margin-left: 1em; style-liste: disc inside;"&amp;gt; &amp;lt;li&amp;gt; _Prendre du fer tous les jours _ &amp;lt;/ li&amp;gt; &amp;lt;li&amp;gt;_Faire un déparasitage/Albendazole une seule fois_&amp;lt;/li&amp;gt; &amp;lt;li&amp;gt;_prendre du Prophylaxis/Fansidar chaque mois_&amp;lt;/li&amp;gt; &amp;lt;/ ul&amp;gt; &amp;lt;/ li&amp;gt; &amp;lt;li&amp;gt; : Mangez plus souvent que d'habitude et mangez une variété d'aliments pour vous donner de la force et pour aider votre bébé à grandir &amp;lt;/ li&amp;gt; &amp;lt;li&amp;gt; Accoucher dans un centre de santé &amp;lt;/ li&amp;gt; &amp;lt;li&amp;gt; Allaiter le bébé **immédiatement** après la naissance &amp;lt;/ ol&amp;gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminders:label">
            <value>Conseils pour une grossesse en bonne santé &lt;i class = "fa-coeur"&gt; &lt;/ i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor1:label">
            <value>Première grossesse</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor2:label">
            <value>Plus de 4 enfants</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor3:label">
            <value>Le dernier enfant est né il y a moins d'une année</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor4:label">
            <value>La femme avait des fausses couches ou des difficultés antérieures à l'accouchement</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor5:label">
            <value>Une des affections suivantes: problèmes cardiaques, asthme, hypertension artérielle, diabète connu</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor6:label">
            <value>VIH Positif</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor7:label">
            <value>Moins de 18 ans</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor8:label">
            <value>Plus de 35 ans</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factors:label">
            <value>Facteurs de risques</value>
          </text>
          <text id="/pregnancy/group_review/r_summary:label">
            <value>Détails sur la grossesse &lt;i class = "fa fa-user"&gt; &lt;/ i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/submit:label">
            <value>&lt;h4 style = "text-align: center;"&gt; Assurez-vous d'avoir soumis pour effectuer cette action. &lt;/ h4&gt;</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r1:label">
            <value>Première grossesse</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r2:label">
            <value>Plus de 4 enfants</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r3:label">
            <value>Le dernier enfant est né il y a moins d'une année</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r4:label">
            <value>La femme avait des fausses couches ou des difficultés antérieures à l'accouchement</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r5:label">
            <value>La femme a l'une des conditions suivantes:
problèmes cardiaques, asthme, hypertension artérielle, diabète connu</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r6:label">
            <value>VIH positif</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:hint">
            <value>Sélectionnez tout ce qui s'applique</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg">
            <value>Veuillez corriger les facteurs de risque contradictoires</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:label">
            <value>La femme a-t-elle un de ces facteurs de risques?</value>
          </text>
          <text id="/pregnancy/group_risk_factors:label">
            <value>Facteurs de risques</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:hint">
            <value>Sélectionner une personne dans la liste</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:label">
            <value>Quel est l'identifiant du patient?</value>
          </text>
          <text id="/pregnancy/inputs:label">
            <value>Patient</value>
          </text>
          <text id="/pregnancy/lmp_date:label">
            <value>Date des Dernières Régles</value>
          </text>
          <text id="/pregnancy/lmp_date_8601:label">
            <value>Date des Dernières Régles</value>
          </text>
          <text id="/pregnancy/lmp_method:label">
            <value>Méthode Date des Dernières Régles</value>
          </text>
          <text id="/pregnancy/patient_age_at_lmp:label">
            <value>Age à la Date des Dernières Régles</value>
          </text>
          <text id="/pregnancy/patient_age_in_years:label">
            <value>Années</value>
          </text>
          <text id="/pregnancy/patient_id:label">
            <value>Identifiant du patient</value>
          </text>
          <text id="/pregnancy/patient_name:label">
            <value>Nom du patient</value>
          </text>
          <text id="/pregnancy/patient_uuid:label">
            <value>UUID du patient</value>
          </text>
          <text id="/pregnancy/risk_factors:label">
            <value>Facteurs de risques</value>
          </text>
        </translation>
        <translation lang="hi">
          <text id="/pregnancy/chw_name:label">
            <value>सामुदायिक स्वास्थ्य कर्मी का नाम</value>
          </text>
          <text id="/pregnancy/chw_phone:label">
            <value>सामुदायिक स्वास्थ्य कर्मी का फोन नंबर</value>
          </text>
          <text id="/pregnancy/chw_sms:label">
            <value>सामुदायिक स्वास्थ्य कर्मी के लिए नोट</value>
          </text>
          <text id="/pregnancy/danger_signs:label">
            <value>ख़तरे के संकेत</value>
          </text>
          <text id="/pregnancy/edd:label">
            <value>डेलिवरी की अपेक्षित तारीख</value>
          </text>
          <text id="/pregnancy/edd_8601:label">
            <value>डेलिवरी की अपेक्षित तारीख</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d1:label">
            <value>पेट में दर्द, दबाव या ऐंठन</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d2:label">
            <value>योनि से खून या द्रव पदार्थ का बहाव, या खराब बू के साथ योनि से बहाव</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d3:label">
            <value>गंभीर उबकाई या उल्टी</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d4:label">
            <value>38 डिग्री या अधिक का बुखार</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d5:label">
            <value>गंभीर सिरदर्द या नए, धुंधली दृष्टि की समस्याएं</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d6:label">
            <value>अचानक वजन का बढ़ना या पैर, टखनों, चेहरे या हाथों में गंभीर सूजन</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d7:label">
            <value>बच्चे का कम हिलना या लात मारना (गर्भावस्था के 20 सप्ताह के बाद)</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d8:label">
            <value>पेशाब में खून या दर्दनाक, जलता हुआ पेशाब</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d9:label">
            <value>दस्त जो कम नहीं होता</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:hint">
            <value>लागू होने वाले सभी का चयन करें</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg">
            <value>5 महीनों से कम के गर्भावस्था में कम हलचल की शिकायत नहीं की जा सकती है</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:label">
            <value>क्या महिला को इनमें से कोइ खतरे के संकेत है?</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs_note:label">
            <value>**अगर महिला इन खतरों के संकेतों में से किसी का सामना कर रही है तो महिला को तुरंत इलाज किया जाना चाहिए.**</value>
          </text>
          <text id="/pregnancy/group_danger_signs:label">
            <value>ख़तरे के संकेत</value>
          </text>
          <text id="/pregnancy/group_lmp/g_display_edd:label">
            <value>**डेलिवरी की अपेक्षित तारीख है**
<output value=" /pregnancy/group_lmp/g_edd "/></value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/122:label">
            <value>4 महीने पहले तक</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/183:label">
            <value>5 से 6 महीने पहले</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/244:label">
            <value>7 से 8 महीने पहले</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/61:label">
            <value>2 महीने पहले तक</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/91:label">
            <value>3 महीने पहले तक</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx:label">
            <value>पिछली मासिक के शूरू होने की अंदाज़न तारीख</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg">
            <value>तारीख पिछले 42 सप्ताह में होना चाहिए</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_calendar:label">
            <value>पिछली मासिक के शूरू होने की तारीख</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_date:label">
            <value>पिछली मासिक</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method/approx:label">
            <value>नहीं</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method/calendar:label">
            <value>हाँ</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method:label">
            <value>क्या महिला को अपने पिछली मासिक का तारीख पता है?</value>
          </text>
          <text id="/pregnancy/group_lmp:label">
            <value>पिछली मासिक</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms/default:label">
            <value>नमस्ते <output value=" /pregnancy/chw_name "/>, <output value=" /pregnancy/patient_name "/> (<output value=" /pregnancy/group_review/r_patient_id "/>) के लिए स्वास्थ्य केंद्र में गर्भावस्था दर्ज की गयी है | आपको इस मरीज़ के लिए एएनसी सन्देश मिलेंगे | कृपया मरीज़ को पहचाने | धन्यवाद!</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms/highrisk:label">
            <value>नमस्ते <output value=" /pregnancy/chw_name "/>, <output value=" /pregnancy/patient_name "/> (<output value=" /pregnancy/group_review/r_patient_id "/>) के लिए स्वास्थ्य केंद्र में एक खतरे के संकेत वाला गर्भावस्था दर्ज की गयी है | यह एक जोखिम वाला गर्भावस्था है | आपको इस मरीज़ के लिए एएनसी सन्देश मिलेंगे | कृपया नर्स के साथ मिल के मरीज़ को पहचाने | धन्यवाद!</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms:label">
            <value>सामुदायिक स्वास्थ्य कर्मी के लिए संदेश</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms_note:label">
            <value>**यह संदेश <output value=" /pregnancy/chw_name "/> (<output value=" /pregnancy/chw_phone "/>) को भेजा जाएगा:**
 <output value=" /pregnancy/group_note/default_chw_sms_text "/></value></text>
          <text id="/pregnancy/group_note/g_chw_sms:hint">
            <value><output value=" /pregnancy/chw_name "/> (<output value=" /pregnancy/chw_phone "/>) को संदेश भेजा जायेगा | संदेश की लंबाई सीमित है ताकी SMS का मूल्य उच्च ना हो|</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:jr:constraintMsg">
            <value>आपका सन्देश 5 SMS से ऊपर नहीं हो सकता है | कृपया SMS का मूल्य को कम करने के लिए अपना सन्देश छोटा करें |</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:label">
            <value>आप यहां संदेश में कुछ और जोड़ सकते हैं:</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited/no:label">
            <value>नहीं</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited/yes:label">
            <value>हाँ</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited:label">
            <value>क्या आप संदेश में कुछ और कहना चाहते हैं?</value>
          </text>
          <text id="/pregnancy/group_note:label">
            <value>सामुदायिक स्वास्थ्य कर्मी के लिए नोट</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign1:label">
            <value>पेट में दर्द, दबाव या ऐंठन</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign2:label">
            <value>योनि से खून या द्रव पदार्थ का बहाव, या खराब बू के साथ योनि से बहाव</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign3:label">
            <value>गंभीर उबकाई या उल्टी</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign4:label">
            <value>38 डिग्री या अधिक का बुखार</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign5:label">
            <value>गंभीर सिरदर्द या नए, धुंधली दृष्टि की समस्याएं</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign6:label">
            <value>अचानक वजन का बढ़ना या पैर, टखनों, चेहरे या हाथों में गंभीर सूजन</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign7:label">
            <value>बच्चे का कम हिलना या लात मारना (गर्भावस्था के 20 सप्ताह के बाद)</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign8:label">
            <value>पेशाब में खून या दर्दनाक, जलता हुआ पेशाब</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign9:label">
            <value>दस्त जो कम नहीं होता</value>
          </text>
          <text id="/pregnancy/group_review/r_followup:label">
            <value>सुनिश्चित करने के लिए सन्देश &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_followup_note1:label">
            <value>**ये SMS के रूप में <output value=" /pregnancy/chw_name "/> <output value=" /pregnancy/chw_phone "/> को भेजा जायेगा**</value>
          </text>
          <text id="/pregnancy/group_review/r_followup_note2:label">
            <value><output value=" /pregnancy/chw_sms "/></value>
          </text>
          <text id="/pregnancy/group_review/r_pregnancy_details:label">
            <value>**<output value=" /pregnancy/patient_name "/>**
आईडी: <output value=" /pregnancy/group_review/r_patient_id "/>
डेलिवरी की अपेक्षित तारीख है: <output value=" /pregnancy/group_lmp/g_edd "/></value></text>
          <text id="/pregnancy/group_review/r_referral:label">
            <value>उसे स्वास्थ्य केंद्र भेजें।&lt;i class="fa fa-warning"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_referral_note:label">
            <value>&lt;b&gt;खतरे की सूचना होने पर उसे स्वास्थ्य केंद्र भेजें.&lt;/b&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim1:label">
            <value>कृपया महिला को **स्वस्थ गर्भावस्था से जुड़े 6 सुझावों की याद दिलायें** &lt;ol style=&quot;margin-left:1em; list-style: decimal inside;&quot;&gt;&lt;li&gt; नियमित रूप से उपस्थित रहें गर्भावस्था की देख भाल के लिए&lt;/li&gt;&lt;li&gt; **हर** रात दवाइया वाली मच्छरदानी मच्छरदानी में सोएँ&lt;/li&gt;&lt;li&gt;<output value=" /pregnancy/patient_name "/> वह अपने **पहले तिमाही** में है कृपया उसे दवा लेने के लिए याद दिलायें:&lt;ul style=&quot;margin-left:1em; list-style: disc inside;&quot;&gt;&lt;li&gt;_आयरन फोलेट को दैनिक ले&lt;/li&gt;&lt;/ul&gt;&lt;/li&gt;&lt;li&gt;ज़्यादा खाएं: सामान्य से अधिक बार खाएं और आपको ताकत देने के लिए कई प्रकार के खाद्य पदार्थ खाएं, ये आपको शक्ती देगा एवं बच्चे के विकास में मदद करेगा&lt;/li&gt;&lt;li&gt;एक स्वास्थ्य केंद्र में अपने बच्चे को डिलीवर करें&lt;/li&gt;&lt;li&gt;बच्चे को जन्म के बाद **तुरंत** स्तनपान करायें&lt;/ol&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim2:label">
            <value>कृपया महिला को **स्वस्थ गर्भावस्था से जुड़े 6 सुझावों की याद दिलायें** &lt;ol style=&quot;margin-left:1em; list-style: decimal inside;&quot;&gt;&lt;li&gt; नियमित रूप से उपस्थित रहें गर्भावस्था की देख भाल के लिए&lt;/li&gt;&lt;li&gt; **हर** रात दवाइया वाली मच्छरदानी मच्छरदानी में सोएँ&lt;/li&gt;&lt;li&gt;<output value=" /pregnancy/patient_name "/> वह अपने **दूसरे तिमाही** में है कृपया उसे दवा लेने के लिए याद दिलायें:&lt;ul style=&quot;margin-left:1em; list-style: disc inside;&quot;&gt;&lt;li&gt;_आयरन फोलेट को दैनिक ले_&lt;/li&gt;&lt;li&gt;_डीवर्मिंग / अल्बेन्डाजोल को एक बार ले_&lt;/li&gt;&lt;li&gt;_हर महीने मलेरिया प्रोफिलैक्सिस / फंसिदर ले&lt;/li&gt;&lt;/ul&gt;&lt;/li&gt;&lt;li&gt;ज़्यादा खाएं: सामान्य से अधिक बार खाएं और आपको ताकत देने के लिए कई प्रकार के खाद्य पदार्थ खाएं, ये आपको शक्ती देगा एवं बच्चे के विकास में मदद करेगा&lt;/li&gt;&lt;li&gt;एक स्वास्थ्य केंद्र में अपने बच्चे को डिलीवर करें&lt;/li&gt;&lt;li&gt;बच्चे को जन्म के बाद **तुरंत** स्तनपान करायें&lt;/ol&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim3:label">
            <value>&quot;कृपया महिला को ** स्वस्थ गर्भावस्था से जुड़े 6 सुझावों की याद दिलायें ** &lt;ol style=&quot;margin-left:1em; list-style: decimal inside;&quot;&gt;&lt;li&gt; नियमित रूप से उपस्थित रहें गर्भावस्था की देख भाल के लिए&lt;/li&gt;&lt;li&gt; *हर* रात दवाइया वाली मच्छरदानी मच्छरदानी में सोएँ&lt;/li&gt;&lt;li&gt;<output value=" /pregnancy/patient_name "/> वह अपने *तीसरी तिमाही* में है कृपया उसे दवा लेने के लिए याद दिलायें:&lt;ul style=&quot;margin-left:1em; list-style: disc inside;&quot;&gt;&lt;li&gt;_आयरन फोलेट को दैनिक ले_&lt;/li&gt;&lt;li&gt;_डीवर्मिंग / अल्बेन्डाजोल को एक बार ले_&lt;/li&gt;&lt;li&gt;_हर महीने मलेरिया प्रोफिलैक्सिस / फंसिदर ले&lt;/li&gt;&lt;/ul&gt;&lt;/li&gt;&lt;li&gt;ज़्यादा खाएं: सामान्य से अधिक बार खाएं और आपको ताकत देने के लिए कई प्रकार के खाद्य पदार्थ खाएं, ये आपको शक्ती देगा एवं बच्चे के विकास में मदद करेगा&lt;/li&gt;&lt;li&gt;एक स्वास्थ्य केंद्र में अपने बच्चे को डिलीवर करें&lt;/li&gt;&lt;li&gt;बच्चे को जन्म के बाद *तुरंत* स्तनपान करायें.बच्चे को जन्म के बाद तुरंत स्तनपान करायें. बच्चे को कुछ और खाना या पीने के लिए बिल्कुल नही दें &lt;/ol&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminders:label">
            <value>स्वस्थ्य गर्भावस्था के सुझाव &lt;i class="fa fa-heart"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor1:label">
            <value>प्रथम गर्भावस्था</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor2:label">
            <value>चार बच्चों से ज़्यादा</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor3:label">
            <value>अंतिम बच्चा 1 वर्ष से कम समय पहले पैदा हुआ था</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor4:label">
            <value>पिछली गर्भावस्था या गर्भपात में कोई कठिनाइयाँ</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor5:label">
            <value>निम्न कारणों में से एक: दिल की बीमारी, अस्थमा, ब्लड प्रेशर, या डायबिटीज</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor6:label">
            <value>HIV पॉजिटिव</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor7:label">
            <value>18 साल से कम उम्र के</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor8:label">
            <value>35 साल से अधिक</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factors:label">
            <value>खतरे का कारण</value>
          </text>
          <text id="/pregnancy/group_review/r_summary:label">
            <value>गर्भावस्था का विवरण&lt;I class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/submit:label">
            <value>&lt;h4 style="text-align:center;"&gt; सुनिश्चित करें के यह कार्रवाई पूरा करने के लिए आप सबमिट दबाये | &lt;/h4&gt;</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r1:label">
            <value>प्रथम गर्भावस्था</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r2:label">
            <value>4 से अधिक बच्चों</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r3:label">
            <value>अंतिम बच्चा 1 वर्ष से कम समय पहले पैदा हुआ था</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r4:label">
            <value>पिछली गर्भावस्था या गर्भपात में कोई कठिनाइयाँ</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r5:label">
            <value>निम्न कारणों में से एक: दिल की बीमारी, अस्थमा, ब्लड प्रेशर, या डायबिटीज</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r6:label">
            <value>HIV पॉजिटिव</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:hint">
            <value>लागू होने वाले सभी का चयन करें</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg">
            <value>कृपया ख़तरे के कारण को सही करें जो असंगत है</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:label">
            <value>क्या महिला को इनमें से कोई ख़तरे का कारण है?</value>
          </text>
          <text id="/pregnancy/group_risk_factors:label">
            <value>खतरे का कारण</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:hint">
            <value>सूची से एक व्यक्ति का चयन करें</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:label">
            <value>मरीज का नाम क्या है?</value>
          </text>
          <text id="/pregnancy/inputs:label">
            <value>मरीज</value>
          </text>
          <text id="/pregnancy/lmp_date:label">
            <value>पिछली मासिक</value>
          </text>
          <text id="/pregnancy/lmp_date_8601:label">
            <value>पिछली मासिक</value>
          </text>
          <text id="/pregnancy/lmp_method:label">
            <value>पिछली मासिक का तरीका</value>
          </text>
          <text id="/pregnancy/patient_age_at_lmp:label">
            <value>पिछली मासिक का उम्र</value>
          </text>
          <text id="/pregnancy/patient_age_in_years:label">
            <value>साल</value>
          </text>
          <text id="/pregnancy/patient_id:label">
            <value>मरीज का आईडी</value>
          </text>
          <text id="/pregnancy/patient_name:label">
            <value>मरीज का नाम</value>
          </text>
          <text id="/pregnancy/patient_uuid:label">
            <value>मरीज UUID</value>
          </text>
          <text id="/pregnancy/risk_factors:label">
            <value>खतरे का कारण</value>
          </text>
        </translation>
        <translation lang="id">
          <text id="/pregnancy/chw_name:label">
            <value>Nama Kader</value>
          </text>
          <text id="/pregnancy/chw_phone:label">
            <value>Nomor Telepon Kader</value>
          </text>
          <text id="/pregnancy/chw_sms:label">
            <value>Catatan ke kader</value>
          </text>
          <text id="/pregnancy/danger_signs:label">
            <value>Tanda-tanda bahaya</value>
          </text>
          <text id="/pregnancy/edd:label">
            <value>Tanggal taksiran persalinan</value>
          </text>
          <text id="/pregnancy/edd_8601:label">
            <value>Tanggal taksiran persalinan</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d1:label">
            <value>Nyeri, tekanan atau kram di perut</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d2:label">
            <value>Perdarahan atau cairan merembes dari vagina atau mengalir dari vagina dengan bau busuk</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d3:label">
            <value>Mual muntah berat</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d4:label">
            <value>Demam 38 derajat atau lebih tinggi</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d5:label">
            <value>Parah sakit kepala atau baru, masalah penglihatan kabur</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d6:label">
            <value>Lonjakan berat badan atau berat pembengkakan kaki, pergelangan kaki, wajah, atau tangan</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d7:label">
            <value>Kurang gerak dan menendang dari bayi (setelah minggu 20 kehamilan)</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d8:label">
            <value>Darah dalam urin atau menyakitkan, terbakar buang air kecil</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d9:label">
            <value>Diare yang tidak mengurangi</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:hint">
            <value>Pilih semua yang berlaku</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg">
            <value>Tidak dapat melaporkan gerakan kurang untuk kehamilan di bawah 5 bulan</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:label">
            <value>Apakah wanita memiliki salah satu dari tanda-tanda bahaya berikut?</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs_note:label">
            <value>**Wanita itu harus segera diobati jika dia mengalami salah tanda-tanda bahaya ini.**</value>
          </text>
          <text id="/pregnancy/group_danger_signs:label">
            <value>Tanda-tanda bahaya</value>
          </text>
          <text id="/pregnancy/group_lmp/g_display_edd:label">
            <value>**Tanggal taksiran persalinan adalah** <output value=" /pregnancy/group_lmp/g_edd "/></value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/122:label">
            <value>Hingga 4 bulan yang lalu</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/183:label">
            <value>Beween 5 sampai 6 bulan yang lalu</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/244:label">
            <value>Beween 7 sampai 8 bulan yang lalu</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/61:label">
            <value>Hingga 2 bulan yang lalu</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/91:label">
            <value>Hingga 3 bulan yang lalu</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx:label">
            <value>Tanggal perkiraan mulai siklus menstruasi terakhir</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg">
            <value>Tanggal harus dalam 42 minggu sebelumnya</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_calendar:label">
            <value>Tanggal mulai siklus menstruasi terakhir</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_date:label">
            <value>Periode menstruasi terakhir</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method/approx:label">
            <value>Tidak</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method/calendar:label">
            <value>Iya</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method:label">
            <value>Apakah wanita tahu tanggal siklus menstruasi terakhir?</value>
          </text>
          <text id="/pregnancy/group_lmp:label">
            <value>Periode Menstruasi Terakhir</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms/default:label">
            <value>Halo <output value=" /pregnancy/chw_name "/>, kehamilan untuk <output value=" /pregnancy/patient_name "/> (<output value=" /pregnancy/group_review/r_patient_id "/>) telah mendaftarkan di fasilitas. Anda akan menerima pemberitahuan ANC untuk pasien ini. Silahkan tindak lanjut untuk mengidentifikasi pasien. Terima kasih!</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms/highrisk:label">
            <value>Halo <output value=" /pregnancy/chw_name "/>, 
kehamilan dengan tanda-tanda bahaya untuk <output value=" /pregnancy/patient_name "/> (<output value=" /pregnancy/group_review/r_patient_id "/>) telah didaftarkan di fasilitas kesehatan. Ini adalah kehamilan dengan resiko tinggi. Anda akan menerima sms pemberitahuan tentang  jadwal pemeriksaan (ANC) untuk pasien ini. Silahkan menghubungi bidan anda untuk tindakan selanjutnya.Terima kasih!</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms_note:label">
            <value>**Pesan ini akan dikirim ke <output value=" /pregnancy/chw_name "/> (<output value=" /pregnancy/chw_phone "/>):**
 <output value=" /pregnancy/group_note/default_chw_sms_text "/></value></text>
          <text id="/pregnancy/group_note/g_chw_sms:hint">
            <value>Pesan akan dikirim ke <output value=" /pregnancy/chw_name "/> (<output value=" /pregnancy/chw_phone "/>). Pesan dibatasi panjang untuk menghindari biaya SMS yang tinggi.</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:jr:constraintMsg">
            <value>Pesan anda tidak boleh lebih dari 5 pesan SMS. Persingkat pesan Anda untuk mengurangi biaya SMS.</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:label">
            <value>Anda dapat menambahkan sesuatu yang lain ke pesan di sini:</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited/no:label">
            <value>Tidak</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited/yes:label">
            <value>Iya</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited:label">
            <value>Apakah Anda ingin menambahkan pesan?</value>
          </text>
          <text id="/pregnancy/group_note:label">
            <value>Catatan ke kader</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign1:label">
            <value>Nyeri, tekanan atau kram di perut</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign2:label">
            <value>Perdarahan atau cairan merembes dari vagina atau mengalir dari vagina dengan bau busuk</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign3:label">
            <value>Parah mual atau muntah</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign4:label">
            <value>Demam 38 derajat atau lebih tinggi</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign5:label">
            <value>Parah sakit kepala atau baru, masalah penglihatan kabur</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign6:label">
            <value>Lonjakan berat badan atau berat pembengkakan kaki, pergelangan kaki, wajah, atau tangan</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign7:label">
            <value>Kurang gerak dan menendang dari bayi (setelah minggu 20 kehamilan)</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign8:label">
            <value>Darah dalam urin atau menyakitkan, terbakar buang air kecil</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign9:label">
            <value>Diare yang tidak mengurangi</value>
          </text>
          <text id="/pregnancy/group_review/r_followup:label">
            <value>Follow Up Pesan &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_followup_note1:label">
            <value>**Berikut ini akan dikirim sebagai SMS ke <output value=" /pregnancy/chw_name "/> <output value=" /pregnancy/chw_phone "/>**</value>
          </text>
          <text id="/pregnancy/group_review/r_followup_note2:label">
            <value><output value=" /pregnancy/chw_sms "/></value>
          </text>
          <text id="/pregnancy/group_review/r_pregnancy_details:label">
            <value>**<output value=" /pregnancy/patient_name "/>**
ID: <output value=" /pregnancy/group_review/r_patient_id "/>
Tanggal taksiran persalinan: <output value=" /pregnancy/group_lmp/g_edd "/></value></text>
          <text id="/pregnancy/group_review/r_referral:label">
            <value>Merujuk ke fasilitas kesehatan&lt;i class="fa fa-warning"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_referral_note:label">
            <value>&lt;b&gt;Merujuk ke fasilitas kesehatan untuk tanda bahaya.&lt;/b&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim1:label">
            <value>Mengingatkan wanita tentang **6 LANGKAH A KEHAMILAN SEHAT:**

&lt;ol style=&quot;margin-left:1em; list-style: decimal inside;&quot;&gt;&lt;li&gt;Datang untuk kunjungan ANC Rutin&lt;/li&gt;&lt;li&gt;Tidur menggunakan kelambu berinsektisida **setiap** malam&lt;/li&gt;&lt;li&gt;<output value=" /pregnancy/patient_name "/> sedang di **trimester pertama nya**. Ingatkan dia untuk mengambil suplemen:&lt;ul style=&quot;margin-left:1em; list-style: disc inside;&quot;&gt;&lt;li&gt;_ Ambil Besi Folat harian_&lt;/li&gt;&lt;/ul&gt;&lt;/li&gt;&lt;li&gt;Makan dengan baik: Makan lebih sering dari biasanya dan makan beragam makanan untuk memberi mu kekuatan dan untuk membantu bayi Anda tumbuh&lt;/li&gt;&lt;li&gt;Melahirkan bayi di fasilitas kesehatan&lt;/li&gt;&lt;li&gt;Menyusui bayi **segera setelah lahir**&lt;/ol&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim2:label">
            <value>Mengingatkan wanita tentang **6 LANGKAH A KEHAMILAN SEHAT:**

&lt;ol style=&quot;margin-left:1em; list-style: decimal inside;&quot;&gt;&lt;li&gt;Datang untuk kunjungan ANC Rutin&lt;/li&gt;&lt;li&gt;Tidur menggunakan kelambu berinsektisida **setiap** malam&lt;/li&gt;&lt;li&gt;<output value=" /pregnancy/patient_name "/> sedang di **trimester kedua nya**. Ingatkan dia untuk mengambil suplemen:&lt;ul style=&quot;margin-left:1em; list-style: disc inside;&quot;&gt;&lt;li&gt;_ Ambil Besi Folat harian_&lt;/li&gt;&lt;li&gt;_ Mengambil deworming/ albendazole sekali_&lt;/li&gt;&lt;li&gt;_ Mengambil Malaria Profilaksis / Fansidar setiap bulan_&lt;/li&gt;&lt;/ul&gt;&lt;/li&gt;&lt;li&gt;Makan dengan baik: Makan lebih sering dari biasanya dan makan beragam makanan untuk memberi mu kekuatan dan untuk membantu bayi Anda tumbuh&lt;/li&gt;&lt;li&gt;Melahirkan bayi di fasilitas kesehatan&lt;/li&gt;&lt;li&gt;Menyusui bayi **segera setelah lahir**&lt;/ol&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim3:label">
            <value>Mengingatkan wanita tentang **6 LANGKAH A KEHAMILAN SEHAT:**

&lt;ol style=&quot;margin-left:1em; list-style: decimal inside;&quot;&gt;&lt;li&gt;Datang untuk kunjungan ANC Rutin&lt;/li&gt;&lt;li&gt;Tidur menggunakan kelambu berinsektisida **setiap** malam&lt;/li&gt;&lt;li&gt;<output value=" /pregnancy/patient_name "/> sedang di **trimester ketiga nya**. Ingatkan dia untuk mengambil suplemen:&lt;ul style=&quot;margin-left:1em; list-style: disc inside;&quot;&gt;&lt;li&gt;_Ambil Besi Folat harian_&lt;/li&gt;&lt;li&gt;_Mengambil deworming/ albendazole sekali_&lt;/li&gt;&lt;li&gt;_Mengambil Malaria Profilaksis / Fansidar setiap bulan_&lt;/li&gt;&lt;/ul&gt;&lt;/li&gt;&lt;li&gt;Makan dengan baik: Makan lebih sering dari biasanya dan makan beragam makanan untuk memberi mu kekuatan dan untuk membantu bayi Anda tumbuh&lt;/li&gt;&lt;li&gt;Melahirkan bayi di fasilitas kesehatan&lt;/li&gt;&lt;li&gt;Menyusui bayi **segera setelah lahir**. Tidak memberikan bayi apa-apa lagi untuk dimakan atau diminum.&lt;/ol&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_reminders:label">
            <value>Tips kehamilan sehat&lt;i class="fa fa-heart"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor1:label">
            <value>Kehamilan pertama</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor2:label">
            <value>Lebih dari 4 anak</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor3:label">
            <value>Bayi terakhir lahir kurang dari 1 tahun sebelumnya</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor4:label">
            <value>Mengalami keguguran sebelumnya atau kesulitan sebelumnya saat melahirkan</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor5:label">
            <value>Salah satu kondisi berikut: kondisi jantung, asma, tekanan darah tinggi, diketahui diabetes</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor6:label">
            <value>HIV positif</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor7:label">
            <value>Di bawah 18 tahun</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor8:label">
            <value>Lebih dari 35 tahun</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factors:label">
            <value>Faktor risiko</value>
          </text>
          <text id="/pregnancy/group_review/r_summary:label">
            <value>Kehamilan rincian&lt;I class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/group_review/submit:label">
            <value>&lt;h4 style="text-align:center;"&gt;Pastikan anda sudah mengirim untuk menyelesaikan tindakan ini.&lt;/h4&gt;</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r1:label">
            <value>Kehamilan pertama</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r2:label">
            <value>Lebih dari 4 anak</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r3:label">
            <value>Bayi terakhir lahir kurang dari 1 tahun sebelumnya</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r4:label">
            <value>Mengalami keguguran sebelumnya atau kesulitan sebelumnya saat melahirkan</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r5:label">
            <value>Salah satu kondisi berikut: kondisi jantung, asma, tekanan darah tinggi, diketahui diabetes</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r6:label">
            <value>HIV positif</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:hint">
            <value>Pilih semua yang berlaku</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg">
            <value>Harap perbaiki faktor risiko yang bertentangan</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:label">
            <value>Apakah wanita memiliki salah satu dari faktor risiko berikut?</value>
          </text>
          <text id="/pregnancy/group_risk_factors:label">
            <value>Faktor risiko</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:hint">
            <value>Pilih orang dari daftar</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:label">
            <value>Apa nama pasien?</value>
          </text>
          <text id="/pregnancy/inputs:label">
            <value>Pasien</value>
          </text>
          <text id="/pregnancy/lmp_date:label">
            <value>Periode menstruasi terakhir</value>
          </text>
          <text id="/pregnancy/lmp_date_8601:label">
            <value>Periode menstruasi terakhir</value>
          </text>
          <text id="/pregnancy/lmp_method:label">
            <value>Cara menstruasi periode terakhir</value>
          </text>
          <text id="/pregnancy/patient_age_at_lmp:label">
            <value>Umur di periode menstruasi terakhir</value>
          </text>
          <text id="/pregnancy/patient_age_in_years:label">
            <value>Umur</value>
          </text>
          <text id="/pregnancy/patient_id:label">
            <value>Pasien ID</value>
          </text>
          <text id="/pregnancy/patient_name:label">
            <value>Nama Pasien</value>
          </text>
          <text id="/pregnancy/patient_uuid:label">
            <value>Pasien UUID</value>
          </text>
          <text id="/pregnancy/risk_factors:label">
            <value>Faktor risiko</value>
          </text>
        </translation>
        <translation lang="ne">
          <text id="/pregnancy/chw_name:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/chw_phone:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/edd:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/edd_8601:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d7:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d8:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d9:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_display_edd:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/122:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/183:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/244:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/61:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/91:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_calendar:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_date:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method/approx:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method/calendar:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms/default:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms/highrisk:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited/no:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited/yes:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign7:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign8:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign9:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_followup:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_followup_note1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_followup_note2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_pregnancy_details:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_referral:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_referral_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_reminders:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor7:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor8:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factors:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_summary:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/submit:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/inputs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/lmp_date:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/lmp_date_8601:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/lmp_method:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_age_at_lmp:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_age_in_years:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_id:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_name:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_uuid:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/risk_factors:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="sw">
          <text id="/pregnancy/chw_name:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/chw_phone:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/edd:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/edd_8601:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d7:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d8:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs/d9:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs/g_danger_signs_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_display_edd:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/122:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/183:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/244:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/61:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx/91:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_approx:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_calendar:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_date:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method/approx:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method/calendar:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp/g_lmp_method:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_lmp:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms/default:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms/highrisk:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/default_chw_sms_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/g_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited/no:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited/yes:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note/is_sms_edited:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign7:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign8:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_danger_sign9:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_followup:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_followup_note1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_followup_note2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_pregnancy_details:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_referral:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_referral_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_reminder_trim3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_reminders:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor7:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factor8:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_risk_factors:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/r_summary:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_review/submit:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors/r6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors/g_risk_factors:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/group_risk_factors:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/inputs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/lmp_date:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/lmp_date_8601:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/lmp_method:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_age_at_lmp:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_age_in_years:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_id:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_name:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/patient_uuid:label">
            <value>-</value>
          </text>
          <text id="/pregnancy/risk_factors:label">
            <value>-</value>
          </text>
        </translation>
      </itext>
      <instance>
        <pregnancy delimiter="#" id="pregnancy" prefix="J1!pregnancy!" version="2022-09-26 12-39">
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
              <date_of_birth/>
              <sex/>
              <parent>
                <contact>
                  <phone/>
                  <name/>
                </contact>
              </parent>
            </contact>
          </inputs>
          <patient_age_in_years tag="hidden"/>
          <patient_uuid tag="hidden"/>
          <patient_id/>
          <patient_name/>
          <chw_name/>
          <chw_phone/>
          <chw_sms/>
          <lmp_method tag="hidden"/>
          <lmp_date_8601 tag="hidden"/>
          <lmp_date/>
          <edd_8601 tag="hidden"/>
          <edd/>
          <risk_factors/>
          <danger_signs/>
          <patient_age_at_lmp tag="hidden"/>
          <days_since_lmp tag="hidden"/>
          <weeks_since_lmp tag="hidden"/>
          <group_lmp tag="hidden">
            <g_lmp_method>calendar</g_lmp_method>
            <g_lmp_calendar/>
            <g_lmp_approx/>
            <g_lmp_date_raw/>
            <g_lmp_date_8601/>
            <g_lmp_date/>
            <g_edd_8601/>
            <g_edd/>
            <g_display_edd/>
          </group_lmp>
          <group_risk_factors tag="hidden">
            <g_risk_factors/>
          </group_risk_factors>
          <group_danger_signs tag="hidden">
            <g_danger_signs/>
            <g_danger_signs_note/>
          </group_danger_signs>
          <group_note tag="hidden">
            <default_chw_sms/>
            <default_chw_sms_text/>
            <default_chw_sms_note/>
            <is_sms_edited>yes</is_sms_edited>
            <g_chw_sms/>
          </group_note>
          <group_review tag="hidden">
            <submit/>
            <r_summary/>
            <r_patient_id/>
            <r_pregnancy_details/>
            <r_risk_factors/>
            <r_risk_factor1/>
            <r_risk_factor2/>
            <r_risk_factor3/>
            <r_risk_factor4/>
            <r_risk_factor5/>
            <r_risk_factor6/>
            <r_risk_factor7/>
            <r_risk_factor8/>
            <r_referral/>
            <r_referral_note/>
            <r_danger_sign1/>
            <r_danger_sign2/>
            <r_danger_sign3/>
            <r_danger_sign4/>
            <r_danger_sign5/>
            <r_danger_sign6/>
            <r_danger_sign7/>
            <r_danger_sign8/>
            <r_danger_sign9/>
            <r_reminders/>
            <r_reminder_trim1/>
            <r_reminder_trim2/>
            <r_reminder_trim3/>
            <r_followup/>
            <r_followup_note1/>
            <r_followup_note2/>
          </group_review>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </pregnancy>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/pregnancy/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/pregnancy/inputs/source" type="string"/>
      <bind nodeset="/pregnancy/inputs/source_id" type="string"/>
      <bind nodeset="/pregnancy/inputs/contact/_id" required="true()" type="db:person"/>
      <bind nodeset="/pregnancy/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/pregnancy/inputs/contact/name" type="string"/>
      <bind nodeset="/pregnancy/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/pregnancy/inputs/contact/sex" type="string"/>
      <bind nodeset="/pregnancy/inputs/contact/parent/contact/phone" type="string"/>
      <bind nodeset="/pregnancy/inputs/contact/parent/contact/name" type="string"/>
      <bind calculate="if (  /pregnancy/inputs/contact/date_of_birth ='', '', floor( difference-in-months(  /pregnancy/inputs/contact/date_of_birth , today() ) div 12 ) )" nodeset="/pregnancy/patient_age_in_years" type="string"/>
      <bind calculate="../inputs/contact/_id" nodeset="/pregnancy/patient_uuid" type="string"/>
      <bind calculate="../inputs/contact/patient_id" nodeset="/pregnancy/patient_id" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/pregnancy/patient_name" type="string"/>
      <bind calculate="../inputs/contact/parent/contact/name" nodeset="/pregnancy/chw_name" type="string"/>
      <bind calculate="../inputs/contact/parent/contact/phone" nodeset="/pregnancy/chw_phone" type="string"/>
      <bind calculate="if( /pregnancy/group_note/g_chw_sms  != '', concat( /pregnancy/group_note/default_chw_sms_text ,concat('
', /pregnancy/group_note/g_chw_sms )),  /pregnancy/group_note/default_chw_sms_text )" nodeset="/pregnancy/chw_sms" type="string"/>
      <bind calculate=" /pregnancy/group_lmp/g_lmp_method " nodeset="/pregnancy/lmp_method" type="string"/>
      <bind calculate=" /pregnancy/group_lmp/g_lmp_date_8601 " nodeset="/pregnancy/lmp_date_8601" type="string"/>
      <bind calculate=" /pregnancy/group_lmp/g_lmp_date " nodeset="/pregnancy/lmp_date" type="string"/>
      <bind calculate=" /pregnancy/group_lmp/g_edd_8601 " nodeset="/pregnancy/edd_8601" type="string"/>
      <bind calculate=" /pregnancy/group_lmp/g_edd " nodeset="/pregnancy/edd" type="string"/>
      <bind calculate=" /pregnancy/group_risk_factors/g_risk_factors " nodeset="/pregnancy/risk_factors" type="string"/>
      <bind calculate=" /pregnancy/group_danger_signs/g_danger_signs " nodeset="/pregnancy/danger_signs" type="string"/>
      <bind calculate="floor( difference-in-months(  /pregnancy/inputs/contact/date_of_birth ,  /pregnancy/lmp_date_8601  ) div 12 )" nodeset="/pregnancy/patient_age_at_lmp" type="string"/>
      <bind calculate="round(decimal-date-time(today()) - decimal-date-time( /pregnancy/group_lmp/g_lmp_date_8601 ), 2)" nodeset="/pregnancy/days_since_lmp" type="string"/>
      <bind calculate="round( /pregnancy/days_since_lmp  div 7, 2)" nodeset="/pregnancy/weeks_since_lmp" type="string"/>
      <bind nodeset="/pregnancy/group_lmp/g_lmp_method" required="true()" type="select1"/>
      <bind constraint=". &lt; now() and ((decimal-date-time(.)+294) &gt;= decimal-date-time(today()))" jr:constraintMsg="jr:itext('/pregnancy/group_lmp/g_lmp_calendar:jr:constraintMsg')" nodeset="/pregnancy/group_lmp/g_lmp_calendar" relevant="selected( /pregnancy/group_lmp/g_lmp_method ,'calendar')" required="true()" type="date"/>
      <bind nodeset="/pregnancy/group_lmp/g_lmp_approx" relevant="selected( /pregnancy/group_lmp/g_lmp_method ,'approx')" required="true()" type="select1"/>
      <bind calculate="if(selected(  /pregnancy/group_lmp/g_lmp_method ,'calendar'),  /pregnancy/group_lmp/g_lmp_calendar ,date-time(decimal-date-time(today()- /pregnancy/group_lmp/g_lmp_approx )))" nodeset="/pregnancy/group_lmp/g_lmp_date_raw" type="string"/>
      <bind calculate="format-date-time(if(selected(  /pregnancy/group_lmp/g_lmp_method ,'calendar'),  /pregnancy/group_lmp/g_lmp_calendar ,date-time(decimal-date-time(today()- /pregnancy/group_lmp/g_lmp_approx ))),&quot;%Y-%m-%d&quot;)" nodeset="/pregnancy/group_lmp/g_lmp_date_8601" type="string"/>
      <bind calculate="format-date-time(if(selected( /pregnancy/group_lmp/g_lmp_method ,'calendar'),  /pregnancy/group_lmp/g_lmp_calendar ,date-time(decimal-date-time(today()- /pregnancy/group_lmp/g_lmp_approx ))),&quot;%b %e, %Y&quot;)" nodeset="/pregnancy/group_lmp/g_lmp_date" type="string"/>
      <bind calculate="format-date-time(date-time(decimal-date-time( /pregnancy/group_lmp/g_lmp_date_8601 )+280),&quot;%Y-%m-%dT00:00:00.000Z&quot;)" nodeset="/pregnancy/group_lmp/g_edd_8601" type="string"/>
      <bind calculate="format-date-time(date-time(decimal-date-time( /pregnancy/group_lmp/g_lmp_date_8601 )+280),&quot;%b %e, %Y&quot;)" nodeset="/pregnancy/group_lmp/g_edd" type="string"/>
      <bind nodeset="/pregnancy/group_lmp/g_display_edd" readonly="true()" relevant=" /pregnancy/group_lmp/g_edd  != &quot;Invalid Date&quot; and  /pregnancy/group_lmp/g_edd  != &quot;&quot;" type="string"/>
      <bind constraint="not(selected(.,'r1')) or (selected(.,'r1') and not(selected(.,'r2') or selected(.,'r3') or selected(.,'r4')))" jr:constraintMsg="jr:itext('/pregnancy/group_risk_factors/g_risk_factors:jr:constraintMsg')" nodeset="/pregnancy/group_risk_factors/g_risk_factors" type="select"/>
      <bind constraint="not(selected( .,'d7') and (decimal-date-time( /pregnancy/lmp_date_8601 ) &gt;= decimal-date-time(today())-150))" jr:constraintMsg="jr:itext('/pregnancy/group_danger_signs/g_danger_signs:jr:constraintMsg')" nodeset="/pregnancy/group_danger_signs/g_danger_signs" type="select"/>
      <bind nodeset="/pregnancy/group_danger_signs/g_danger_signs_note" readonly="true()" type="string"/>
      <bind calculate="if( /pregnancy/group_danger_signs/g_danger_signs  != '' or  /pregnancy/group_risk_factors/g_risk_factors  != '',
 'highrisk',
 'default'
)" nodeset="/pregnancy/group_note/default_chw_sms" type="select1"/>
      <bind calculate="jr:choice-name( /pregnancy/group_note/default_chw_sms ,' /pregnancy/group_note/default_chw_sms ')" nodeset="/pregnancy/group_note/default_chw_sms_text" type="string"/>
      <bind nodeset="/pregnancy/group_note/default_chw_sms_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/group_note/is_sms_edited" required="true()" type="select1"/>
      <bind constraint="string-length(.) &lt;= 715" jr:constraintMsg="jr:itext('/pregnancy/group_note/g_chw_sms:jr:constraintMsg')" nodeset="/pregnancy/group_note/g_chw_sms" type="string"/>
      <bind nodeset="/pregnancy/group_review/submit" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_summary" readonly="true()" type="string"/>
      <bind calculate="../../inputs/contact/patient_id" nodeset="/pregnancy/group_review/r_patient_id" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_pregnancy_details" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_risk_factors" readonly="true()" relevant=" /pregnancy/group_risk_factors/g_risk_factors  !='' or ( /pregnancy/inputs/contact/date_of_birth !='' and ( /pregnancy/patient_age_at_lmp  &lt; 18 or  /pregnancy/patient_age_at_lmp  &gt;= 35))" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_risk_factor1" readonly="true()" relevant="selected( /pregnancy/group_risk_factors/g_risk_factors , 'r1')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_risk_factor2" readonly="true()" relevant="selected( /pregnancy/group_risk_factors/g_risk_factors , 'r2')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_risk_factor3" readonly="true()" relevant="selected( /pregnancy/group_risk_factors/g_risk_factors , 'r3')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_risk_factor4" readonly="true()" relevant="selected( /pregnancy/group_risk_factors/g_risk_factors , 'r4')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_risk_factor5" readonly="true()" relevant="selected( /pregnancy/group_risk_factors/g_risk_factors , 'r5')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_risk_factor6" readonly="true()" relevant="selected( /pregnancy/group_risk_factors/g_risk_factors , 'r6')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_risk_factor7" readonly="true()" relevant=" /pregnancy/inputs/contact/date_of_birth !='' and  /pregnancy/patient_age_at_lmp  &lt; 18" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_risk_factor8" readonly="true()" relevant=" /pregnancy/inputs/contact/date_of_birth !='' and  /pregnancy/patient_age_at_lmp  &gt;= 35" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_referral" readonly="true()" relevant=" /pregnancy/group_danger_signs/g_danger_signs  != ''" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_referral_note" readonly="true()" relevant=" /pregnancy/group_danger_signs/g_danger_signs  != ''" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_danger_sign1" readonly="true()" relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd1')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_danger_sign2" readonly="true()" relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd2')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_danger_sign3" readonly="true()" relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd3')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_danger_sign4" readonly="true()" relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd4')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_danger_sign5" readonly="true()" relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd5')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_danger_sign6" readonly="true()" relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd6')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_danger_sign7" readonly="true()" relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd7')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_danger_sign8" readonly="true()" relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd8')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_danger_sign9" readonly="true()" relevant="selected( /pregnancy/group_danger_signs/g_danger_signs , 'd9')" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_reminders" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_reminder_trim1" readonly="true()" relevant="( /pregnancy/weeks_since_lmp  &lt;= 12) and ( /pregnancy/weeks_since_lmp  &gt; 0)" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_reminder_trim2" readonly="true()" relevant="( /pregnancy/weeks_since_lmp  &lt;= 27) and ( /pregnancy/weeks_since_lmp  &gt; 12)" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_reminder_trim3" readonly="true()" relevant=" /pregnancy/weeks_since_lmp  &gt; 27" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_followup" readonly="true()" relevant=" /pregnancy/chw_sms  != ''" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_followup_note1" readonly="true()" relevant=" /pregnancy/chw_sms  != ''" type="string"/>
      <bind nodeset="/pregnancy/group_review/r_followup_note2" readonly="true()" relevant=" /pregnancy/chw_sms  != ''" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/pregnancy/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/pregnancy/inputs">
      <label ref="jr:itext('/pregnancy/inputs:label')"/>
      <group ref="/pregnancy/inputs/contact">
        <input appearance="db-object" ref="/pregnancy/inputs/contact/_id">
          <label ref="jr:itext('/pregnancy/inputs/contact/_id:label')"/>
          <hint ref="jr:itext('/pregnancy/inputs/contact/_id:hint')"/>
        </input>
        <input appearance="hidden" ref="/pregnancy/inputs/contact/patient_id"/>
        <input appearance="hidden" ref="/pregnancy/inputs/contact/name"/>
        <input appearance="hidden" ref="/pregnancy/inputs/contact/date_of_birth"/>
        <input appearance="hidden" ref="/pregnancy/inputs/contact/sex"/>
        <group ref="/pregnancy/inputs/contact/parent">
          <group ref="/pregnancy/inputs/contact/parent/contact">
            <input appearance="hidden" ref="/pregnancy/inputs/contact/parent/contact/phone"/>
            <input appearance="hidden" ref="/pregnancy/inputs/contact/parent/contact/name"/>
          </group>
        </group>
      </group>
    </group>
    <group appearance="field-list" ref="/pregnancy/group_lmp">
      <label ref="jr:itext('/pregnancy/group_lmp:label')"/>
      <select1 appearance="horizontal" ref="/pregnancy/group_lmp/g_lmp_method">
        <label ref="jr:itext('/pregnancy/group_lmp/g_lmp_method:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/group_lmp/g_lmp_method/calendar:label')"/>
          <value>calendar</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_lmp/g_lmp_method/approx:label')"/>
          <value>approx</value>
        </item>
      </select1>
      <input ref="/pregnancy/group_lmp/g_lmp_calendar">
        <label ref="jr:itext('/pregnancy/group_lmp/g_lmp_calendar:label')"/>
      </input>
      <select1 ref="/pregnancy/group_lmp/g_lmp_approx">
        <label ref="jr:itext('/pregnancy/group_lmp/g_lmp_approx:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/group_lmp/g_lmp_approx/61:label')"/>
          <value>61</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_lmp/g_lmp_approx/91:label')"/>
          <value>91</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_lmp/g_lmp_approx/122:label')"/>
          <value>122</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_lmp/g_lmp_approx/183:label')"/>
          <value>183</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_lmp/g_lmp_approx/244:label')"/>
          <value>244</value>
        </item>
      </select1>
      <input ref="/pregnancy/group_lmp/g_display_edd">
        <label ref="jr:itext('/pregnancy/group_lmp/g_display_edd:label')"/>
      </input>
    </group>
    <group appearance="field-list" ref="/pregnancy/group_risk_factors">
      <label ref="jr:itext('/pregnancy/group_risk_factors:label')"/>
      <select ref="/pregnancy/group_risk_factors/g_risk_factors">
        <label ref="jr:itext('/pregnancy/group_risk_factors/g_risk_factors:label')"/>
        <hint ref="jr:itext('/pregnancy/group_risk_factors/g_risk_factors:hint')"/>
        <item>
          <label ref="jr:itext('/pregnancy/group_risk_factors/g_risk_factors/r1:label')"/>
          <value>r1</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_risk_factors/g_risk_factors/r2:label')"/>
          <value>r2</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_risk_factors/g_risk_factors/r3:label')"/>
          <value>r3</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_risk_factors/g_risk_factors/r4:label')"/>
          <value>r4</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_risk_factors/g_risk_factors/r5:label')"/>
          <value>r5</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_risk_factors/g_risk_factors/r6:label')"/>
          <value>r6</value>
        </item>
      </select>
    </group>
    <group appearance="field-list" ref="/pregnancy/group_danger_signs">
      <label ref="jr:itext('/pregnancy/group_danger_signs:label')"/>
      <select ref="/pregnancy/group_danger_signs/g_danger_signs">
        <label ref="jr:itext('/pregnancy/group_danger_signs/g_danger_signs:label')"/>
        <hint ref="jr:itext('/pregnancy/group_danger_signs/g_danger_signs:hint')"/>
        <item>
          <label ref="jr:itext('/pregnancy/group_danger_signs/g_danger_signs/d1:label')"/>
          <value>d1</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_danger_signs/g_danger_signs/d2:label')"/>
          <value>d2</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_danger_signs/g_danger_signs/d3:label')"/>
          <value>d3</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_danger_signs/g_danger_signs/d4:label')"/>
          <value>d4</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_danger_signs/g_danger_signs/d5:label')"/>
          <value>d5</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_danger_signs/g_danger_signs/d6:label')"/>
          <value>d6</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_danger_signs/g_danger_signs/d7:label')"/>
          <value>d7</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_danger_signs/g_danger_signs/d8:label')"/>
          <value>d8</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_danger_signs/g_danger_signs/d9:label')"/>
          <value>d9</value>
        </item>
      </select>
      <input ref="/pregnancy/group_danger_signs/g_danger_signs_note">
        <label ref="jr:itext('/pregnancy/group_danger_signs/g_danger_signs_note:label')"/>
      </input>
    </group>
    <group appearance="field-list" ref="/pregnancy/group_note">
      <label ref="jr:itext('/pregnancy/group_note:label')"/>
      <select1 appearance="hidden" ref="/pregnancy/group_note/default_chw_sms">
        <label ref="jr:itext('/pregnancy/group_note/default_chw_sms:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/group_note/default_chw_sms/default:label')"/>
          <value>default</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_note/default_chw_sms/highrisk:label')"/>
          <value>highrisk</value>
        </item>
      </select1>
      <input ref="/pregnancy/group_note/default_chw_sms_note">
        <label ref="jr:itext('/pregnancy/group_note/default_chw_sms_note:label')"/>
      </input>
      <select1 appearance="hidden" ref="/pregnancy/group_note/is_sms_edited">
        <label ref="jr:itext('/pregnancy/group_note/is_sms_edited:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/group_note/is_sms_edited/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/group_note/is_sms_edited/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <input appearance="multiline" ref="/pregnancy/group_note/g_chw_sms">
        <label ref="jr:itext('/pregnancy/group_note/g_chw_sms:label')"/>
        <hint ref="jr:itext('/pregnancy/group_note/g_chw_sms:hint')"/>
      </input>
    </group>
    <group appearance="field-list summary" ref="/pregnancy/group_review">
      <input ref="/pregnancy/group_review/submit">
        <label ref="jr:itext('/pregnancy/group_review/submit:label')"/>
      </input>
      <input appearance="h1 yellow" ref="/pregnancy/group_review/r_summary">
        <label ref="jr:itext('/pregnancy/group_review/r_summary:label')"/>
      </input>
      <input appearance="h4 center" ref="/pregnancy/group_review/r_pregnancy_details">
        <label ref="jr:itext('/pregnancy/group_review/r_pregnancy_details:label')"/>
      </input>
      <input appearance="h2 yellow" ref="/pregnancy/group_review/r_risk_factors">
        <label ref="jr:itext('/pregnancy/group_review/r_risk_factors:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_risk_factor1">
        <label ref="jr:itext('/pregnancy/group_review/r_risk_factor1:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_risk_factor2">
        <label ref="jr:itext('/pregnancy/group_review/r_risk_factor2:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_risk_factor3">
        <label ref="jr:itext('/pregnancy/group_review/r_risk_factor3:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_risk_factor4">
        <label ref="jr:itext('/pregnancy/group_review/r_risk_factor4:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_risk_factor5">
        <label ref="jr:itext('/pregnancy/group_review/r_risk_factor5:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_risk_factor6">
        <label ref="jr:itext('/pregnancy/group_review/r_risk_factor6:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_risk_factor7">
        <label ref="jr:itext('/pregnancy/group_review/r_risk_factor7:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_risk_factor8">
        <label ref="jr:itext('/pregnancy/group_review/r_risk_factor8:label')"/>
      </input>
      <input appearance="h1 red" ref="/pregnancy/group_review/r_referral">
        <label ref="jr:itext('/pregnancy/group_review/r_referral:label')"/>
      </input>
      <input ref="/pregnancy/group_review/r_referral_note">
        <label ref="jr:itext('/pregnancy/group_review/r_referral_note:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_danger_sign1">
        <label ref="jr:itext('/pregnancy/group_review/r_danger_sign1:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_danger_sign2">
        <label ref="jr:itext('/pregnancy/group_review/r_danger_sign2:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_danger_sign3">
        <label ref="jr:itext('/pregnancy/group_review/r_danger_sign3:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_danger_sign4">
        <label ref="jr:itext('/pregnancy/group_review/r_danger_sign4:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_danger_sign5">
        <label ref="jr:itext('/pregnancy/group_review/r_danger_sign5:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_danger_sign6">
        <label ref="jr:itext('/pregnancy/group_review/r_danger_sign6:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_danger_sign7">
        <label ref="jr:itext('/pregnancy/group_review/r_danger_sign7:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_danger_sign8">
        <label ref="jr:itext('/pregnancy/group_review/r_danger_sign8:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_danger_sign9">
        <label ref="jr:itext('/pregnancy/group_review/r_danger_sign9:label')"/>
      </input>
      <input appearance="h1 blue" ref="/pregnancy/group_review/r_reminders">
        <label ref="jr:itext('/pregnancy/group_review/r_reminders:label')"/>
      </input>
      <input ref="/pregnancy/group_review/r_reminder_trim1">
        <label ref="jr:itext('/pregnancy/group_review/r_reminder_trim1:label')"/>
      </input>
      <input ref="/pregnancy/group_review/r_reminder_trim2">
        <label ref="jr:itext('/pregnancy/group_review/r_reminder_trim2:label')"/>
      </input>
      <input ref="/pregnancy/group_review/r_reminder_trim3">
        <label ref="jr:itext('/pregnancy/group_review/r_reminder_trim3:label')"/>
      </input>
      <input appearance="h1 green" ref="/pregnancy/group_review/r_followup">
        <label ref="jr:itext('/pregnancy/group_review/r_followup:label')"/>
      </input>
      <input ref="/pregnancy/group_review/r_followup_note1">
        <label ref="jr:itext('/pregnancy/group_review/r_followup_note1:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/group_review/r_followup_note2">
        <label ref="jr:itext('/pregnancy/group_review/r_followup_note2:label')"/>
      </input>
    </group>
  </h:body>
</h:html>
`,   
};
