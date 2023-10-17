/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="postnatal_visit">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Postnatal Visit</h3>
<select id="form-languages" data-default-lang=""><option value="en">en</option> <option value="es">es</option> <option value="fr">fr</option> <option value="hi">hi</option> <option value="id">id</option> <option value="ne">ne</option> <option value="sw">sw</option> </select>
  
  
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/postnatal_visit/inputs" data-relevant="./source = 'user'"><h4>
<span lang="en" class="question-label active" data-itext-id="/postnatal_visit/inputs:label">Patient</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/inputs:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/inputs:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/inputs:label">मरीज</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/inputs:label">Pasien</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/inputs:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/inputs:label">-</span>
</h4>
<section class="or-group-data " name="/postnatal_visit/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/inputs/contact/_id:label">What is the patient's name?</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/inputs/contact/_id:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/inputs/contact/_id:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/inputs/contact/_id:label">मरीज का नाम क्या है?</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/inputs/contact/_id:label">Apa nama pasien?</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/inputs/contact/_id:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/inputs/contact/_id:label">-</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/postnatal_visit/inputs/contact/_id:hint">Select a person from list</span><span lang="es" class="or-hint " data-itext-id="/postnatal_visit/inputs/contact/_id:hint">-</span><span lang="fr" class="or-hint " data-itext-id="/postnatal_visit/inputs/contact/_id:hint">-</span><span lang="hi" class="or-hint " data-itext-id="/postnatal_visit/inputs/contact/_id:hint">सूची में से एक व्यक्ति को चुनें</span><span lang="id" class="or-hint " data-itext-id="/postnatal_visit/inputs/contact/_id:hint">Pilih orang dari daftar</span><span lang="ne" class="or-hint " data-itext-id="/postnatal_visit/inputs/contact/_id:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/postnatal_visit/inputs/contact/_id:hint">-</span><input type="text" name="/postnatal_visit/inputs/contact/_id" data-required="true()" data-type-xml="person"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select or-appearance-hidden "><input type="text" name="/postnatal_visit/inputs/contact/patient_id" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/postnatal_visit/inputs/contact/name" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/postnatal_visit/inputs/contact/date_of_birth" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/postnatal_visit/inputs/contact/sex" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/postnatal_visit/inputs/contact/phone" data-type-xml="string"></label><section class="or-group-data " name="/postnatal_visit/inputs/contact/parent"><section class="or-group-data " name="/postnatal_visit/inputs/contact/parent/contact"><label class="question non-select or-appearance-hidden "><input type="text" name="/postnatal_visit/inputs/contact/parent/contact/phone" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/postnatal_visit/inputs/contact/parent/contact/name" data-type-xml="string"></label>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/postnatal_visit/group_chw_info" data-relevant=" /postnatal_visit/inputs/source  = 'task'"><h4>
<span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_chw_info:label">Missing Visit Report</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_chw_info:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_chw_info:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_chw_info:label">लापता जांच की रिपोर्टों</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_chw_info:label">Laporan Kunjungan Hilang</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_chw_info:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_chw_info:label">-</span>
</h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_chw_info/chw_information:label">The postnatal care visit for <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> has not been recorded.</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/chw_information:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/chw_information:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/chw_information:label"><span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> के लिए गर्भावस्था की बाद की जांच दर्ज नहीं की गयी है |</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/chw_information:label">Kunjungan perawatan setelah melahirkan untuk <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> belum terdata.</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/chw_information:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/chw_information:label">-</span><input type="text" name="/postnatal_visit/group_chw_info/chw_information" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_chw_info/call_button:label"><strong>Please follow up with <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> to see if <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> attended her PNC visit.</strong><br>Call: <span class="or-output" data-value=" /postnatal_visit/chw_phone "> </span></span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/call_button:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/call_button:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/call_button:label"><strong>कृपया <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> के साथ मिल कर देखे के क्या <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> अपने गर्भावस्था के बाद की जांच के लिए आये |</strong> कॉल: <span class="or-output" data-value=" /postnatal_visit/chw_phone "> </span></span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/call_button:label"><strong>Mohon dibicarakan dengan <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> untuk memastikan apakah <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> untuk kunjungan perawatan setelah melahirkan nya.</strong> Sebut: <span class="or-output" data-value=" /postnatal_visit/chw_phone "> </span></span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/call_button:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/call_button:label">-</span><input type="text" name="/postnatal_visit/group_chw_info/call_button" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_chw_info/attended_pnc:label">Did <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> attend her PNC visit?</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc:label">क्या <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> अपने गर्भावस्था के बाद की जांच के लिए आये ?</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc:label">Apakah <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> datang untuk perawatan setelah melahirkan nya?</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc:label">-</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/postnatal_visit/group_chw_info/attended_pnc" data-name="/postnatal_visit/group_chw_info/attended_pnc" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_chw_info/attended_pnc/yes:label">Yes</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc/yes:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc/yes:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc/yes:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc/yes:label">Iya</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc/yes:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc/yes:label">-</span></label><label class=""><input type="radio" name="/postnatal_visit/group_chw_info/attended_pnc" data-name="/postnatal_visit/group_chw_info/attended_pnc" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_chw_info/attended_pnc/no:label">No</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc/no:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc/no:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc/no:label">नहीं</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc/no:label">Tidak</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc/no:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_chw_info/attended_pnc/no:label">-</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
      </section>
    <section class="or-group-data or-branch pre-init " name="/postnatal_visit/group_who_assessed" data-relevant=" /postnatal_visit/visit_confirmed  = 'yes'"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed:label">Who are you assessing today?</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed:label">आज आप किसको जांचना चाहते है ?</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed:label">Siapa yang Anda menilai hari ini?</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed:label">-</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/postnatal_visit/group_who_assessed/g_who_assessed" data-name="/postnatal_visit/group_who_assessed/g_who_assessed" value="mom" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/mom:label">Mother</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/mom:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/mom:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/mom:label">माँ</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/mom:label">Ibu</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/mom:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/mom:label">-</span></label><label class=""><input type="radio" name="/postnatal_visit/group_who_assessed/g_who_assessed" data-name="/postnatal_visit/group_who_assessed/g_who_assessed" value="baby" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/baby:label">Baby</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/baby:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/baby:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/baby:label">बच्चा</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/baby:label">Bayi</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/baby:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/baby:label">-</span></label><label class=""><input type="radio" name="/postnatal_visit/group_who_assessed/g_who_assessed" data-name="/postnatal_visit/group_who_assessed/g_who_assessed" value="both" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/both:label">Both mother and baby</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/both:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/both:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/both:label">मां और बच्चा दोनों</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/both:label">Ibu dan bayi</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/both:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_who_assessed/g_who_assessed/both:label">-</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/postnatal_visit/group_danger_signs_mom" data-relevant=" /postnatal_visit/group_who_assessed/g_who_assessed  = 'mom' or  /postnatal_visit/group_who_assessed/g_who_assessed  = 'both'"><h4>
<span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom:label">Mother Danger Signs</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom:label">माँ की खतरे के संकेत</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom:label">Tanda-tanda bahaya ibu</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom:label">-</span>
</h4>
<fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label">Confirm with <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> if <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> has any of the following danger signs.</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label"><span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> के साथ पुष्टि करें के क्या <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> को इनमें से कोई खतरा है |</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label">Konfirmasikan dengan <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> jika <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> memiliki tanda-tanda bahaya berikut.</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label">-</span><span lang="en" class="or-hint active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint">Select all that apply</span><span lang="es" class="or-hint " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint">-</span><span lang="fr" class="or-hint " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint">-</span><span lang="hi" class="or-hint " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint">लागू होने वाले सभी का चयन करें</span><span lang="id" class="or-hint " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint">Pilih semua yang berlaku</span><span lang="ne" class="or-hint " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint">-</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" value="d1" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label">Elevated diastolic blood pressure</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label">उच्च डायस्टोलिक ब्लड प्रेशर</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label">Tekanan darah diastolik tinggi</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" value="d2" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label">Significant pallor</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label">ज़्यादा पीलापन</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label">Sangat pucat</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" value="d3" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label">Headaches or swelling of the face</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label">सिरदर्द या चेहरे की सूजन</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label">Sakit kepala atau pembengkakan wajah</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" value="d4" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label">Heavy vaginal bleeding</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label">योनि से खून का भारी बहाव</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label">Perdarahan berat dari vagina</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" value="d5" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label">Fever or foul-smelling lochia</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label">बुखार या खराब बू वाला जेर</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label">Demam atau berbau busuk lokia</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" value="d6" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label">Dribbling urine</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label">बूँद बूँद कर टपकने वाला पेशाब</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label">Urin di tetes</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" value="d7" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label">Pus or perineal pain</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label">मवाद योनि के आस पास दर्द</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label">Nanah atau nyeri di dekat vagina</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" value="d8" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label">Feeling unhappy or crying easily</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label">दुखी महसूस करना या आसानी से रो देना</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label">Merasa sedih atau menangis dengan mudah</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" value="d9" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label">Vaginal discharge 4 weeks after delivery</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label">डिलीवरी के 4 सप्ताह बाद भी योनि से बहाव</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label">Merembes dari vagina 4 minggu setelah melahirkan</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" value="d10" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label">Breast problem or pain</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label">स्तन में समस्या या दर्द</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label">Masalah payudara atau nyeri</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" value="d11" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label">Cough or breathing difficulty</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label">खांसी या साँस लेने में कठिनाई</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label">Batuk atau kesulitan bernafas</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" value="d12" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label">Taking anti-tuberculosis drugs</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label">TB के दवाइयां लेना</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label">Mengambil obat anti-TBC</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" value="d13" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label">Excessive fatigue</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label">बहुत ज़्यादा थकान</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label">Kelelahan yang berlebihan</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" value="d14" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label">Other danger signs</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label">अन्य खतरे के संकेत</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label">Tanda bahaya lainnya</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label">-</span></label>
</div>
</fieldset></fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label">Specify other:</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label">अन्य क स्पष्ट करें:</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label">Tentukan lainnya:</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label">-</span><span class="required">*</span><input type="text" name="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other" data-required="true()" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd14')" data-type-xml="string"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/postnatal_visit/group_danger_signs_baby" data-relevant=" /postnatal_visit/group_who_assessed/g_who_assessed  = 'baby' or  /postnatal_visit/group_who_assessed/g_who_assessed  = 'both'"><h4>
<span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_danger_signs_baby:label">Baby Danger Signs</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby:label">बच्चे की खतरे के संकेत</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby:label">Tanda-tanda bahaya bayi</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby:label">-</span>
</h4>
<fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label">Confirm with <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> if the baby has any of the following danger signs.</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label"><span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> के साथ पुष्टि करें के क्या बच्चे को इनमें से कोई खतरा है |</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label">Konfirmasikan dengan <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> jika bayi memiliki tanda-tanda bahaya berikut.</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label">-</span><span lang="en" class="or-hint active" data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint">Select all that apply</span><span lang="es" class="or-hint " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint">-</span><span lang="fr" class="or-hint " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint">-</span><span lang="hi" class="or-hint " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint">लागू होने वाले सभी का चयन करें</span><span lang="id" class="or-hint " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint">Pilih semua yang berlaku</span><span lang="ne" class="or-hint " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint">-</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby" value="bd1" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label">Fever</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label">बुखार</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label">Demam</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby" value="bd2" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label">Fast breathing</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label">तेजी से सांस लेना</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label">Bernapas cepat</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby" value="bd3" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label">Chest indrawing</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label">छाती अंदर लेना</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label">Tarikandinding dada kedalam</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby" value="bd4" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label">Convulsions</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label">ऐंठन</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label">Kejang</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby" value="bd5" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label">Diarrhea</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label">दस्त</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label">Diare</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby" value="bd6" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label">Infected umblical cord</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label">संक्रमित गर्भनाल</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label">Tali pusar terinfeksi</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby" value="bd7" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label">Unable to breast feed</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label">स्तनपान करने में असमर्थ</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label">Tidak dapat menyusui</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby" value="bd8" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label">Many skin pustules</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label">त्वचा पे बहुत फोड़े</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label">Banyak kulit bisul</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby" value="bd9" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label">Vomits everything</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label">सब कुछ उल्टी कर देता है</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label">Memuntahkan semuanya</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby" value="bd10" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label">Very sleepy</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label">बहुत निद्रालु</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label">Sangat mengantuk</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label">-</span></label><label class=""><input type="checkbox" name="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby" value="bd11" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label">Other danger signs</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label">अन्य खतरे के संकेत</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label">Tanda bahaya lainnya</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label">-</span></label>
</div>
</fieldset></fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label">Specify other:</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label">अन्य क स्पष्ट करें:</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label">Tentukan lainnya:</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label">-</span><span class="required">*</span><input type="text" name="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other" data-required="true()" data-relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd11')" data-type-xml="string"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section>
    <section class="or-group or-appearance-field-list " name="/postnatal_visit/group_note"><h4>
<span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_note:label">Note to the CHW</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_note:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_note:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_note:label">सामुदायिक स्वास्थ्य कर्मी के लिए नोट</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_note:label">Catatan ke kader</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_note:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_note:label">-</span>
</h4>
<fieldset class="question simple-select or-appearance-hidden "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_note/default_chw_sms:label">Default SMS to send to CHW</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms:label">-</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms:label">-</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms:label">-</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/postnatal_visit/group_note/default_chw_sms" data-name="/postnatal_visit/group_note/default_chw_sms" value="default" data-calculate="if( /postnatal_visit/visit_confirmed  = 'yes',  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'both',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_both_ds',  'both_visit_mom_ds'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_baby_ds',  'default'  )  ),  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'mom',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  'mom_visit_ds',  'mom_visit'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'baby_visit_ds',  'baby_visit'  )  )  ),  'did_not_attend' )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_note/default_chw_sms/default:label">Nice work, <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span>! Mother <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> (<span class="or-output" data-value=" /postnatal_visit/group_review/r_patient_id "> </span>) and baby attended PNC. Both were assessed and no danger signs were reported. Please continue monitoring them. Thank you!</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/default:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/default:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/default:label">-</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/default:label">-</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/default:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/default:label">-</span></label><label class=""><input type="radio" name="/postnatal_visit/group_note/default_chw_sms" data-name="/postnatal_visit/group_note/default_chw_sms" value="both_visit_mom_ds" data-calculate="if( /postnatal_visit/visit_confirmed  = 'yes',  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'both',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_both_ds',  'both_visit_mom_ds'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_baby_ds',  'default'  )  ),  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'mom',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  'mom_visit_ds',  'mom_visit'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'baby_visit_ds',  'baby_visit'  )  )  ),  'did_not_attend' )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label">Hi, <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span>, Mother <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> (<span class="or-output" data-value=" /postnatal_visit/group_review/r_patient_id "> </span>) and baby attended PNC. The nurse reported danger signs in the mother. Please follow up to see if they need additional support. Thank you!</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label">-</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label">-</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label">-</span></label><label class=""><input type="radio" name="/postnatal_visit/group_note/default_chw_sms" data-name="/postnatal_visit/group_note/default_chw_sms" value="both_visit_baby_ds" data-calculate="if( /postnatal_visit/visit_confirmed  = 'yes',  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'both',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_both_ds',  'both_visit_mom_ds'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_baby_ds',  'default'  )  ),  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'mom',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  'mom_visit_ds',  'mom_visit'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'baby_visit_ds',  'baby_visit'  )  )  ),  'did_not_attend' )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label">Hi, <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span>, Mother <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> (<span class="or-output" data-value=" /postnatal_visit/group_review/r_patient_id "> </span>) and baby attended PNC. The nurse reported danger signs in the baby. Please follow up to see if they need additional support. Thank you!</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label">-</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label">-</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label">-</span></label><label class=""><input type="radio" name="/postnatal_visit/group_note/default_chw_sms" data-name="/postnatal_visit/group_note/default_chw_sms" value="both_visit_both_ds" data-calculate="if( /postnatal_visit/visit_confirmed  = 'yes',  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'both',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_both_ds',  'both_visit_mom_ds'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_baby_ds',  'default'  )  ),  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'mom',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  'mom_visit_ds',  'mom_visit'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'baby_visit_ds',  'baby_visit'  )  )  ),  'did_not_attend' )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label">Hi, <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span>, Mother <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> (<span class="or-output" data-value=" /postnatal_visit/group_review/r_patient_id "> </span>) and baby attended PNC. The nurse reported danger signs in the mother and baby. Please follow up to see if they need additional support. Thank you!</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label">-</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label">-</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label">-</span></label><label class=""><input type="radio" name="/postnatal_visit/group_note/default_chw_sms" data-name="/postnatal_visit/group_note/default_chw_sms" value="mom_visit" data-calculate="if( /postnatal_visit/visit_confirmed  = 'yes',  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'both',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_both_ds',  'both_visit_mom_ds'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_baby_ds',  'default'  )  ),  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'mom',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  'mom_visit_ds',  'mom_visit'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'baby_visit_ds',  'baby_visit'  )  )  ),  'did_not_attend' )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_note/default_chw_sms/mom_visit:label">Nice work, <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span>. <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> (<span class="or-output" data-value=" /postnatal_visit/group_review/r_patient_id "> </span>) attended PNC. Only the mother was assessed. No danger signs were reported. Please continue monitoring them. Thank you!</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/mom_visit:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/mom_visit:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/mom_visit:label">-</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/mom_visit:label">-</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/mom_visit:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/mom_visit:label">-</span></label><label class=""><input type="radio" name="/postnatal_visit/group_note/default_chw_sms" data-name="/postnatal_visit/group_note/default_chw_sms" value="mom_visit_ds" data-calculate="if( /postnatal_visit/visit_confirmed  = 'yes',  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'both',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_both_ds',  'both_visit_mom_ds'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_baby_ds',  'default'  )  ),  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'mom',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  'mom_visit_ds',  'mom_visit'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'baby_visit_ds',  'baby_visit'  )  )  ),  'did_not_attend' )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label">Hi, <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span>. <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> (<span class="or-output" data-value=" /postnatal_visit/group_review/r_patient_id "> </span>) attended PNC. Only the mother was assessed. The nurse reported danger signs in the mother. Please follow up to see if they need additional support. Thank you!</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label">-</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label">-</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label">-</span></label><label class=""><input type="radio" name="/postnatal_visit/group_note/default_chw_sms" data-name="/postnatal_visit/group_note/default_chw_sms" value="baby_visit" data-calculate="if( /postnatal_visit/visit_confirmed  = 'yes',  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'both',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_both_ds',  'both_visit_mom_ds'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_baby_ds',  'default'  )  ),  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'mom',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  'mom_visit_ds',  'mom_visit'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'baby_visit_ds',  'baby_visit'  )  )  ),  'did_not_attend' )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_note/default_chw_sms/baby_visit:label">Nice work, <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span>! The baby of <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> (<span class="or-output" data-value=" /postnatal_visit/group_review/r_patient_id "> </span>) attended PNC. Only the baby was assessed. No danger signs were reported. Please continue monitoring them. Thank you!</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/baby_visit:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/baby_visit:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/baby_visit:label">-</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/baby_visit:label">-</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/baby_visit:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/baby_visit:label">-</span></label><label class=""><input type="radio" name="/postnatal_visit/group_note/default_chw_sms" data-name="/postnatal_visit/group_note/default_chw_sms" value="baby_visit_ds" data-calculate="if( /postnatal_visit/visit_confirmed  = 'yes',  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'both',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_both_ds',  'both_visit_mom_ds'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_baby_ds',  'default'  )  ),  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'mom',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  'mom_visit_ds',  'mom_visit'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'baby_visit_ds',  'baby_visit'  )  )  ),  'did_not_attend' )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label">Hi, <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span>. The baby of <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> (<span class="or-output" data-value=" /postnatal_visit/group_review/r_patient_id "> </span>) attended PNC. Only the baby was assessed. The nurse reported danger signs in the baby. Please follow up to see if they need additional support. Thank you!</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label">-</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label">-</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label">-</span></label><label class=""><input type="radio" name="/postnatal_visit/group_note/default_chw_sms" data-name="/postnatal_visit/group_note/default_chw_sms" value="did_not_attend" data-calculate="if( /postnatal_visit/visit_confirmed  = 'yes',  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'both',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_both_ds',  'both_visit_mom_ds'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'both_visit_baby_ds',  'default'  )  ),  if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'mom',  if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',  'mom_visit_ds',  'mom_visit'  ),  if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',  'baby_visit_ds',  'baby_visit'  )  )  ),  'did_not_attend' )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_note/default_chw_sms/did_not_attend:label">Hi <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span>, <span class="or-output" data-value=" /postnatal_visit/patient_name "> </span> (<span class="or-output" data-value=" /postnatal_visit/group_review/r_patient_id "> </span>) did not attend PNC. Please continue to monitor them for danger signs. We will send you a message when they are due for their next visit. Thank you!</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/did_not_attend:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/did_not_attend:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/did_not_attend:label">-</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/did_not_attend:label">-</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/did_not_attend:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms/did_not_attend:label">-</span></label>
</div>
</fieldset></fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_note/default_chw_sms_note:label"><strong>The following message will be sent to <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> (<span class="or-output" data-value=" /postnatal_visit/chw_phone "> </span>):</strong><br> <span class="or-output" data-value=" /postnatal_visit/group_note/default_chw_sms_text "> </span></span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms_note:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms_note:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms_note:label"><strong>यह संदेश <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> (<span class="or-output" data-value=" /postnatal_visit/chw_phone "> </span>) को भेजा जाएगा:</strong><br> <span class="or-output" data-value=" /postnatal_visit/group_note/default_chw_sms_text "> </span></span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms_note:label"><strong>Pesan ini akan dikirim ke <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> (<span class="or-output" data-value=" /postnatal_visit/chw_phone "> </span>):</strong><br> <span class="or-output" data-value=" /postnatal_visit/group_note/default_chw_sms_text "> </span></span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms_note:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_note/default_chw_sms_note:label">-</span><input type="text" name="/postnatal_visit/group_note/default_chw_sms_note" data-type-xml="string" readonly></label><fieldset class="question simple-select or-appearance-hidden ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_note/is_sms_edited:label">Would you like to add a personal note to the message?</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited:label">क्या आप संदेश में कुछ और कहना चाहते हैं?</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited:label">Apakah Anda ingin menambahkan pesan?</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited:label">-</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/postnatal_visit/group_note/is_sms_edited" data-name="/postnatal_visit/group_note/is_sms_edited" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_note/is_sms_edited/yes:label">Yes</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited/yes:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited/yes:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited/yes:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited/yes:label">Iya</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited/yes:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited/yes:label">-</span></label><label class=""><input type="radio" name="/postnatal_visit/group_note/is_sms_edited" data-name="/postnatal_visit/group_note/is_sms_edited" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/postnatal_visit/group_note/is_sms_edited/no:label">No</span><span lang="es" class="option-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited/no:label">-</span><span lang="fr" class="option-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited/no:label">-</span><span lang="hi" class="option-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited/no:label">नहीं</span><span lang="id" class="option-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited/no:label">Tidak</span><span lang="ne" class="option-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited/no:label">-</span><span lang="sw" class="option-label " data-itext-id="/postnatal_visit/group_note/is_sms_edited/no:label">-</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select or-appearance-multiline "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_note/g_chw_sms:label">You can add a personal note to the SMS here:</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_note/g_chw_sms:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_note/g_chw_sms:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_note/g_chw_sms:label">आप यहां संदेश में कुछ और जोड़ सकते हैं:</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_note/g_chw_sms:label">Anda dapat menambahkan sesuatu yang lain ke pesan di sini:</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_note/g_chw_sms:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_note/g_chw_sms:label">-</span><span lang="en" class="or-hint active" data-itext-id="/postnatal_visit/group_note/g_chw_sms:hint">Messages are limited in length to avoid high SMS costs.</span><span lang="es" class="or-hint " data-itext-id="/postnatal_visit/group_note/g_chw_sms:hint">-</span><span lang="fr" class="or-hint " data-itext-id="/postnatal_visit/group_note/g_chw_sms:hint">-</span><span lang="hi" class="or-hint " data-itext-id="/postnatal_visit/group_note/g_chw_sms:hint"><span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> (<span class="or-output" data-value=" /postnatal_visit/chw_phone "> </span>) को संदेश भेजा जायेगा | संदेश की लंबाई सीमित है ताकी SMS का मूल्य उच्च ना हो|</span><span lang="id" class="or-hint " data-itext-id="/postnatal_visit/group_note/g_chw_sms:hint">Pesan akan dikirim ke <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> (<span class="or-output" data-value=" /postnatal_visit/chw_phone "> </span>). Pesan dibatasi panjang untuk menghindari biaya SMS yang tinggi.</span><span lang="ne" class="or-hint " data-itext-id="/postnatal_visit/group_note/g_chw_sms:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/postnatal_visit/group_note/g_chw_sms:hint">-</span><textarea name="/postnatal_visit/group_note/g_chw_sms" data-constraint="string-length(.) &lt;= 715" data-type-xml="string"></textarea><span lang="en" class="or-constraint-msg active" data-itext-id="/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg">Your message cannot be longer than 5 SMS messages. Please shorten your message to reduce SMS costs.</span><span lang="es" class="or-constraint-msg " data-itext-id="/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg">आपका सन्देश 5 SMS से ऊपर नहीं हो सकता है | कृपया SMS का मूल्य को कम करने के लिए अपना सन्देश छोटा करें |</span><span lang="id" class="or-constraint-msg " data-itext-id="/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg">Pesan anda tidak boleh lebih dari 5 pesan SMS. Persingkat pesan Anda untuk mengurangi biaya SMS.</span><span lang="ne" class="or-constraint-msg " data-itext-id="/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg">-</span></label>
      </section>
    <section class="or-group-data or-appearance-field-list or-appearance-summary " name="/postnatal_visit/group_review"><label class="question non-select or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/submit:label"><strong>Be sure you Submit to complete this action.</strong></span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/submit:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/submit:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/submit:label"><strong>सुनिश्चित करें के यह कार्रवाई पूरा करने के लिए आप सबमिट दबाये |</strong></span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/submit:label"><strong>Pastikan anda sudah mengirim untuk menyelesaikan tindakan ini.</strong></span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/submit:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/submit:label">-</span><input type="text" name="/postnatal_visit/group_review/submit" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-yellow "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_summary:label">Patient Information<i class="fa fa-user"></i></span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_summary:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_summary:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_summary:label">मरीज़ की जानकारी <i class="fa fa-user"></i></span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_summary:label">Informasi pasien <i class="fa fa-user"></i></span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_summary:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_summary:label">-</span><input type="text" name="/postnatal_visit/group_review/r_summary" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h4 or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_postnatal_details:label"><strong><span class="or-output" data-value=" /postnatal_visit/patient_name "> </span></strong><br>ID: <span class="or-output" data-value=" /postnatal_visit/group_review/r_patient_id "> </span></span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_postnatal_details:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_postnatal_details:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_postnatal_details:label"><strong><span class="or-output" data-value=" /postnatal_visit/patient_name "> </span></strong> आईडी : <span class="or-output" data-value=" /postnatal_visit/group_review/r_patient_id "> </span></span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_postnatal_details:label">"<strong><span class="or-output" data-value=" /postnatal_visit/patient_name "> </span></strong><br>ID: <span class="or-output" data-value=" /postnatal_visit/group_review/r_patient_id "> </span>"</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_postnatal_details:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_postnatal_details:label">-</span><input type="text" name="/postnatal_visit/group_review/r_postnatal_details" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h1 or-appearance-blue "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_visit:label">Visit Information<i class="fa fa-plus-square"></i></span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit:label">जांच की जानकारी <i class="fa fa-plus-square"></i></span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit:label">Mengunjungi informasi<i class="fa fa-plus-square"></i></span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit:label">-</span><input type="text" name="/postnatal_visit/group_review/r_visit" data-relevant=" /postnatal_visit/visit_confirmed  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h4 or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_visit_yes:label">Postnatal care visit completed</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit_yes:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit_yes:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit_yes:label">गर्भावस्था की बाद की जांच पूरी की गयी है</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit_yes:label">Kunjungan perawatan setelah melahirkan lengkap</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit_yes:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit_yes:label">-</span><input type="text" name="/postnatal_visit/group_review/r_visit_yes" data-relevant="selected( /postnatal_visit/visit_confirmed , 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h4 or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_visit_no:label">Postnatal care visit not completed</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit_no:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit_no:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit_no:label">गर्भावस्था की बाद की जांच पूरी नहीं की गयी है</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit_no:label">Kunjungan perawatan setelah melahirkan tidak lengkap</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit_no:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_visit_no:label">-</span><input type="text" name="/postnatal_visit/group_review/r_visit_no" data-relevant="selected( /postnatal_visit/visit_confirmed ,'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h1 or-appearance-red "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_danger_signs:label">Danger Signs<i class="fa fa-warning"></i></span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_danger_signs:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_danger_signs:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_danger_signs:label">खतरे के संकेत<i class="fa fa-warning"></i></span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_danger_signs:label">Tanda-tanda bahaya<i class="fa fa-warning"></i></span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_danger_signs:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_danger_signs:label">-</span><input type="text" name="/postnatal_visit/group_review/r_danger_signs" data-relevant=" /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '' or  /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_signs:label"><strong>Mother Danger Signs</strong></span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_signs:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_signs:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_signs:label"><strong>माँ की खतरे के संकेत</strong></span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_signs:label"><strong>Tanda-tanda bahaya ibu</strong></span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_signs:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_signs:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_signs" data-relevant=" /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign1:label">Elevated diastolic blood pressure</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign1:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign1:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign1:label">उच्च डायस्टोलिक ब्लड प्रेशर</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign1:label">Tekanan darah diastolik tinggi</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign1:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign1:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_sign1" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd1')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign2:label">Significant pallor</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign2:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign2:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign2:label">ज़्यादा पीलापन</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign2:label">Sangat pucat</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign2:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign2:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_sign2" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd2')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign3:label">Headaches or swelling of the face</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign3:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign3:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign3:label">सिरदर्द या चेहरे की सूजन</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign3:label">Sakit kepala atau pembengkakan wajah</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign3:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign3:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_sign3" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd3')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign4:label">Heavy vaginal bleeding</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign4:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign4:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign4:label">योनि से खून का भारी बहाव</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign4:label">Perdarahan berat dari vagina</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign4:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign4:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_sign4" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd4')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign5:label">Fever or foul-smelling lochia</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign5:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign5:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign5:label">बुखार या खराब बू वाला जेर</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign5:label">Demam atau berbau busuk lokia</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign5:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign5:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_sign5" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd5')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign6:label">Dribbling urine</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign6:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign6:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign6:label">बूँद बूँद कर टपकने वाला पेशाब</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign6:label">Urin di tetes</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign6:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign6:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_sign6" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd6')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign7:label">Pus or perineal pain</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign7:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign7:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign7:label">मवाद योनि के आस पास दर्द</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign7:label">Nanah atau nyeri di dekat vagina</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign7:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign7:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_sign7" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd7')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign8:label">Feeling unhappy or crying easily</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign8:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign8:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign8:label">दुखी महसूस करना या आसानी से रो देना</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign8:label">Merasa sedih atau menangis dengan mudah</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign8:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign8:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_sign8" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd8')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign9:label">Vaginal discharge 4 weeks after delivery</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign9:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign9:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign9:label">डिलीवरी के 4 सप्ताह बाद भी योनि से बहाव</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign9:label">Merembes dari vagina 4 minggu setelah melahirkan</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign9:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign9:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_sign9" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd9')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign10:label">Breast problem or pain</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign10:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign10:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign10:label">स्तन में समस्या या दर्द</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign10:label">Masalah payudara atau nyeri</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign10:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign10:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_sign10" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd10')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign11:label">Cough or breathing difficulty</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign11:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign11:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign11:label">खांसी या साँस लेने में कठिनाई</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign11:label">Batuk atau kesulitan bernafas</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign11:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign11:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_sign11" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd11')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign12:label">Taking anti-tuberculosis drugs</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign12:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign12:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign12:label">TB के दवाइयां लेना</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign12:label">Mengambil obat anti-TBC</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign12:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign12:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_sign12" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd12')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign13:label">Excessive fatigue</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign13:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign13:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign13:label">बहुत ज़्यादा थकान</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign13:label">Kelelahan yang berlebihan</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign13:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign13:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_sign13" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd13')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign14:label">Other danger signs</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign14:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign14:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign14:label">अन्य खतरे के संकेत</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign14:label">Tanda bahaya lainnya</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign14:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_mom_danger_sign14:label">-</span><input type="text" name="/postnatal_visit/group_review/r_mom_danger_sign14" data-relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd14')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_baby_danger_signs:label"><strong>Baby Danger Signs</strong></span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_signs:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_signs:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_signs:label"><strong>बच्चे की खतरे के संकेत</strong></span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_signs:label"><strong>Tanda-tanda bahaya bayi</strong></span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_signs:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_signs:label">-</span><input type="text" name="/postnatal_visit/group_review/r_baby_danger_signs" data-relevant=" /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign1:label">Fever</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign1:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign1:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign1:label">बुखार</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign1:label">Demam</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign1:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign1:label">-</span><input type="text" name="/postnatal_visit/group_review/r_baby_danger_sign1" data-relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd1')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign2:label">Fast breathing</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign2:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign2:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign2:label">तेजी से सांस लेना</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign2:label">Bernapas cepat</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign2:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign2:label">-</span><input type="text" name="/postnatal_visit/group_review/r_baby_danger_sign2" data-relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd2')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign3:label">Chest indrawing</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign3:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign3:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign3:label">छाती अंदर लेना</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign3:label">Tarikandinding dada kedalam</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign3:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign3:label">-</span><input type="text" name="/postnatal_visit/group_review/r_baby_danger_sign3" data-relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd3')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign4:label">Convulsions</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign4:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign4:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign4:label">ऐंठन</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign4:label">Kejang</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign4:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign4:label">-</span><input type="text" name="/postnatal_visit/group_review/r_baby_danger_sign4" data-relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd4')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign5:label">Diarrhea</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign5:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign5:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign5:label">दस्त</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign5:label">Diare</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign5:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign5:label">-</span><input type="text" name="/postnatal_visit/group_review/r_baby_danger_sign5" data-relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd5')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign6:label">Infected umblical cord</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign6:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign6:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign6:label">संक्रमित गर्भनाल</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign6:label">Tali pusar terinfeksi</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign6:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign6:label">-</span><input type="text" name="/postnatal_visit/group_review/r_baby_danger_sign6" data-relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd6')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign7:label">Unable to breast feed</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign7:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign7:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign7:label">स्तनपान करने में असमर्थ</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign7:label">Tidak dapat menyusui</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign7:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign7:label">-</span><input type="text" name="/postnatal_visit/group_review/r_baby_danger_sign7" data-relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd7')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign8:label">Many skin pustules</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign8:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign8:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign8:label">त्वचा पे बहुत फोड़े</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign8:label">Banyak kulit bisul</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign8:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign8:label">-</span><input type="text" name="/postnatal_visit/group_review/r_baby_danger_sign8" data-relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd8')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign9:label">Vomits everything</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign9:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign9:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign9:label">सब कुछ उल्टी कर देता है</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign9:label">Memuntahkan semuanya</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign9:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign9:label">-</span><input type="text" name="/postnatal_visit/group_review/r_baby_danger_sign9" data-relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd9')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign10:label">Very sleepy</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign10:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign10:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign10:label">बहुत निद्रालु</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign10:label">Sangat mengantuk</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign10:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign10:label">-</span><input type="text" name="/postnatal_visit/group_review/r_baby_danger_sign10" data-relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd10')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign11:label">Other danger signs</span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign11:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign11:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign11:label">अन्य खतरे के संकेत</span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign11:label">Tanda bahaya lainnya</span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign11:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_baby_danger_sign11:label">-</span><input type="text" name="/postnatal_visit/group_review/r_baby_danger_sign11" data-relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd11')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h1 or-appearance-green "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_followup:label">Follow Up Message <i class="fa fa-envelope"></i></span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup:label">सुनिश्चित करने के लिए सन्देश <i class="fa fa-envelope"></i></span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup:label">Follow Up Pesan <i class="fa fa-envelope"></i></span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup:label">-</span><input type="text" name="/postnatal_visit/group_review/r_followup" data-relevant=" /postnatal_visit/chw_sms  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_followup_note1:label"><strong>The following will be sent as a SMS to <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> <span class="or-output" data-value=" /postnatal_visit/chw_phone "> </span></strong></span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup_note1:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup_note1:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup_note1:label"><strong> ये SMS के रूप में <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> <span class="or-output" data-value=" /postnatal_visit/chw_phone "> </span> को भेजा जायेगा </strong></span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup_note1:label"><strong>Berikut ini akan dikirim sebagai SMS ke <span class="or-output" data-value=" /postnatal_visit/chw_name "> </span> <span class="or-output" data-value=" /postnatal_visit/chw_phone "> </span></strong></span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup_note1:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup_note1:label">-</span><input type="text" name="/postnatal_visit/group_review/r_followup_note1" data-relevant=" /postnatal_visit/chw_sms  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/postnatal_visit/group_review/r_followup_note2:label"> <span class="or-output" data-value=" /postnatal_visit/chw_sms "> </span></span><span lang="es" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup_note2:label">-</span><span lang="fr" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup_note2:label">-</span><span lang="hi" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup_note2:label"> <span class="or-output" data-value=" /postnatal_visit/chw_sms "> </span></span><span lang="id" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup_note2:label"> <span class="or-output" data-value=" /postnatal_visit/chw_sms "> </span></span><span lang="ne" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup_note2:label">-</span><span lang="sw" class="question-label " data-itext-id="/postnatal_visit/group_review/r_followup_note2:label">-</span><input type="text" name="/postnatal_visit/group_review/r_followup_note2" data-relevant=" /postnatal_visit/chw_sms  != ''" data-type-xml="string" readonly></label>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/postnatal_visit/patient_age_in_years" data-calculate="if (  /postnatal_visit/inputs/contact/date_of_birth ='', '', floor( difference-in-months(  /postnatal_visit/inputs/contact/date_of_birth , today() ) div 12 ) )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/postnatal_visit/patient_phone" data-calculate="../inputs/contact/phone" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/postnatal_visit/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/postnatal_visit/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/postnatal_visit/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/postnatal_visit/chw_name" data-calculate="../inputs/contact/parent/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/postnatal_visit/chw_phone" data-calculate="../inputs/contact/parent/contact/phone" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/postnatal_visit/danger_signs_mom" data-calculate=" /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/postnatal_visit/danger_signs_baby" data-calculate=" /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/postnatal_visit/chw_sms" data-calculate="if( /postnatal_visit/group_note/g_chw_sms  != '', concat( /postnatal_visit/group_note/default_chw_sms_text ,concat(' ', /postnatal_visit/group_note/g_chw_sms )),  /postnatal_visit/group_note/default_chw_sms_text )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/postnatal_visit/visit_confirmed" data-calculate="coalesce( /postnatal_visit/group_chw_info/attended_pnc , 'yes')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/postnatal_visit/group_note/default_chw_sms_text" data-calculate="jr:choice-name( /postnatal_visit/group_note/default_chw_sms ,' /postnatal_visit/group_note/default_chw_sms ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/postnatal_visit/group_review/r_patient_id" data-calculate="../../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/postnatal_visit/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <postnatal_visit xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="postnatal_visit" prefix="J1!postnatal_visit!" version="2022-03-03 15-46">
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
              <phone/>
              <parent>
                <contact>
                  <phone/>
                  <name/>
                </contact>
              </parent>
            </contact>
          </inputs>
          <patient_age_in_years tag="hidden"/>
          <patient_phone/>
          <patient_uuid tag="hidden"/>
          <patient_id/>
          <patient_name/>
          <chw_name/>
          <chw_phone/>
          <danger_signs_mom/>
          <danger_signs_baby/>
          <chw_sms/>
          <visit_confirmed/>
          <group_chw_info tag="hidden">
            <chw_information/>
            <call_button/>
            <attended_pnc/>
          </group_chw_info>
          <group_who_assessed tag="hidden">
            <g_who_assessed/>
          </group_who_assessed>
          <group_danger_signs_mom tag="hidden">
            <g_danger_signs_mom/>
            <danger_signs_mom_other/>
          </group_danger_signs_mom>
          <group_danger_signs_baby tag="hidden">
            <g_danger_signs_baby/>
            <danger_signs_baby_other/>
          </group_danger_signs_baby>
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
            <r_postnatal_details/>
            <r_visit/>
            <r_visit_yes/>
            <r_visit_no/>
            <r_danger_signs/>
            <r_mom_danger_signs/>
            <r_mom_danger_sign1/>
            <r_mom_danger_sign2/>
            <r_mom_danger_sign3/>
            <r_mom_danger_sign4/>
            <r_mom_danger_sign5/>
            <r_mom_danger_sign6/>
            <r_mom_danger_sign7/>
            <r_mom_danger_sign8/>
            <r_mom_danger_sign9/>
            <r_mom_danger_sign10/>
            <r_mom_danger_sign11/>
            <r_mom_danger_sign12/>
            <r_mom_danger_sign13/>
            <r_mom_danger_sign14/>
            <r_baby_danger_signs/>
            <r_baby_danger_sign1/>
            <r_baby_danger_sign2/>
            <r_baby_danger_sign3/>
            <r_baby_danger_sign4/>
            <r_baby_danger_sign5/>
            <r_baby_danger_sign6/>
            <r_baby_danger_sign7/>
            <r_baby_danger_sign8/>
            <r_baby_danger_sign9/>
            <r_baby_danger_sign10/>
            <r_baby_danger_sign11/>
            <r_followup/>
            <r_followup_note1/>
            <r_followup_note2/>
          </group_review>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </postnatal_visit>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Postnatal Visit</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/postnatal_visit/chw_name:label">
            <value>CHW Name</value>
          </text>
          <text id="/postnatal_visit/chw_phone:label">
            <value>CHW Phone</value>
          </text>
          <text id="/postnatal_visit/chw_sms:label">
            <value>CHW's Note</value>
          </text>
          <text id="/postnatal_visit/danger_signs_baby:label">
            <value>Baby Danger Signs</value>
          </text>
          <text id="/postnatal_visit/danger_signs_mom:label">
            <value>Mother Danger Signs</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc/no:label">
            <value>No</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc/yes:label">
            <value>Yes</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc:label">
            <value>Did <output value=" /postnatal_visit/patient_name "/> attend her PNC visit?</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/call_button:label">
            <value>**Please follow up with <output value=" /postnatal_visit/chw_name "/> to see if <output value=" /postnatal_visit/patient_name "/> attended her PNC visit.**
Call: <output value=" /postnatal_visit/chw_phone "/></value></text>
          <text id="/postnatal_visit/group_chw_info/chw_information:label">
            <value>The postnatal care visit for <output value=" /postnatal_visit/patient_name "/> has not been recorded.</value>
          </text>
          <text id="/postnatal_visit/group_chw_info:label">
            <value>Missing Visit Report</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label">
            <value>Specify other:</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label">
            <value>Very sleepy</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label">
            <value>Other danger signs</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label">
            <value>Fever</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label">
            <value>Fast breathing</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label">
            <value>Chest indrawing</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label">
            <value>Convulsions</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label">
            <value>Diarrhea</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label">
            <value>Infected umblical cord</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label">
            <value>Unable to breast feed</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label">
            <value>Many skin pustules</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label">
            <value>Vomits everything</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint">
            <value>Select all that apply</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label">
            <value>Confirm with <output value=" /postnatal_visit/chw_name "/> if the baby has any of the following danger signs.</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby:label">
            <value>Baby Danger Signs</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label">
            <value>Specify other:</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label">
            <value>Breast problem or pain</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label">
            <value>Cough or breathing difficulty</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label">
            <value>Taking anti-tuberculosis drugs</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label">
            <value>Excessive fatigue</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label">
            <value>Other danger signs</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label">
            <value>Elevated diastolic blood pressure</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label">
            <value>Significant pallor</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label">
            <value>Headaches or swelling of the face</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label">
            <value>Heavy vaginal bleeding</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label">
            <value>Fever or foul-smelling lochia</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label">
            <value>Dribbling urine</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label">
            <value>Pus or perineal pain</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label">
            <value>Feeling unhappy or crying easily</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label">
            <value>Vaginal discharge 4 weeks after delivery</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint">
            <value>Select all that apply</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label">
            <value>Confirm with <output value=" /postnatal_visit/chw_name "/> if <output value=" /postnatal_visit/patient_name "/> has any of the following danger signs.</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom:label">
            <value>Mother Danger Signs</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/baby_visit:label">
            <value>Nice work, <output value=" /postnatal_visit/chw_name "/>! The baby of <output value=" /postnatal_visit/patient_name "/> (<output value=" /postnatal_visit/group_review/r_patient_id "/>) attended PNC. Only the baby was assessed. No danger signs were reported. Please continue monitoring them. Thank you!</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label">
            <value>Hi, <output value=" /postnatal_visit/chw_name "/>. The baby of <output value=" /postnatal_visit/patient_name "/> (<output value=" /postnatal_visit/group_review/r_patient_id "/>) attended PNC. Only the baby was assessed. The nurse reported danger signs in the baby. Please follow up to see if they need additional support. Thank you!</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label">
            <value>Hi, <output value=" /postnatal_visit/chw_name "/>, Mother <output value=" /postnatal_visit/patient_name "/> (<output value=" /postnatal_visit/group_review/r_patient_id "/>) and baby attended PNC. The nurse reported danger signs in the baby. Please follow up to see if they need additional support. Thank you!</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label">
            <value>Hi, <output value=" /postnatal_visit/chw_name "/>, Mother <output value=" /postnatal_visit/patient_name "/> (<output value=" /postnatal_visit/group_review/r_patient_id "/>) and baby attended PNC. The nurse reported danger signs in the mother and baby. Please follow up to see if they need additional support. Thank you!</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label">
            <value>Hi, <output value=" /postnatal_visit/chw_name "/>, Mother <output value=" /postnatal_visit/patient_name "/> (<output value=" /postnatal_visit/group_review/r_patient_id "/>) and baby attended PNC. The nurse reported danger signs in the mother. Please follow up to see if they need additional support. Thank you!</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/default:label">
            <value>Nice work, <output value=" /postnatal_visit/chw_name "/>! Mother <output value=" /postnatal_visit/patient_name "/> (<output value=" /postnatal_visit/group_review/r_patient_id "/>) and baby attended PNC. Both were assessed and no danger signs were reported. Please continue monitoring them. Thank you!</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/did_not_attend:label">
            <value>Hi <output value=" /postnatal_visit/chw_name "/>, <output value=" /postnatal_visit/patient_name "/> (<output value=" /postnatal_visit/group_review/r_patient_id "/>) did not attend PNC. Please continue to monitor them for danger signs. We will send you a message when they are due for their next visit. Thank you!</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/mom_visit:label">
            <value>Nice work, <output value=" /postnatal_visit/chw_name "/>. <output value=" /postnatal_visit/patient_name "/> (<output value=" /postnatal_visit/group_review/r_patient_id "/>) attended PNC. Only the mother was assessed. No danger signs were reported. Please continue monitoring them. Thank you!</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label">
            <value>Hi, <output value=" /postnatal_visit/chw_name "/>. <output value=" /postnatal_visit/patient_name "/> (<output value=" /postnatal_visit/group_review/r_patient_id "/>) attended PNC. Only the mother was assessed. The nurse reported danger signs in the mother. Please follow up to see if they need additional support. Thank you!</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms:label">
            <value>Default SMS to send to CHW</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms_note:label">
            <value>**The following message will be sent to <output value=" /postnatal_visit/chw_name "/> (<output value=" /postnatal_visit/chw_phone "/>):**
 <output value=" /postnatal_visit/group_note/default_chw_sms_text "/></value></text>
          <text id="/postnatal_visit/group_note/g_chw_sms:hint">
            <value>Messages are limited in length to avoid high SMS costs.</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg">
            <value>Your message cannot be longer than 5 SMS messages. Please shorten your message to reduce SMS costs.</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:label">
            <value>You can add a personal note to the SMS here:</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited/no:label">
            <value>No</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited/yes:label">
            <value>Yes</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited:label">
            <value>Would you like to add a personal note to the message?</value>
          </text>
          <text id="/postnatal_visit/group_note:label">
            <value>Note to the CHW</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign10:label">
            <value>Very sleepy</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign11:label">
            <value>Other danger signs</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign1:label">
            <value>Fever</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign2:label">
            <value>Fast breathing</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign3:label">
            <value>Chest indrawing</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign4:label">
            <value>Convulsions</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign5:label">
            <value>Diarrhea</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign6:label">
            <value>Infected umblical cord</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign7:label">
            <value>Unable to breast feed</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign8:label">
            <value>Many skin pustules</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign9:label">
            <value>Vomits everything</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_signs:label">
            <value>**Baby Danger Signs**</value>
          </text>
          <text id="/postnatal_visit/group_review/r_danger_signs:label">
            <value>Danger Signs&lt;i class="fa fa-warning"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup:label">
            <value>Follow Up Message &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup_note1:label">
            <value>**The following will be sent as a SMS to <output value=" /postnatal_visit/chw_name "/> <output value=" /postnatal_visit/chw_phone "/>**</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup_note2:label">
            <value><output value=" /postnatal_visit/chw_sms "/></value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign10:label">
            <value>Breast problem or pain</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign11:label">
            <value>Cough or breathing difficulty</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign12:label">
            <value>Taking anti-tuberculosis drugs</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign13:label">
            <value>Excessive fatigue</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign14:label">
            <value>Other danger signs</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign1:label">
            <value>Elevated diastolic blood pressure</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign2:label">
            <value>Significant pallor</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign3:label">
            <value>Headaches or swelling of the face</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign4:label">
            <value>Heavy vaginal bleeding</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign5:label">
            <value>Fever or foul-smelling lochia</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign6:label">
            <value>Dribbling urine</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign7:label">
            <value>Pus or perineal pain</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign8:label">
            <value>Feeling unhappy or crying easily</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign9:label">
            <value>Vaginal discharge 4 weeks after delivery</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_signs:label">
            <value>**Mother Danger Signs**</value>
          </text>
          <text id="/postnatal_visit/group_review/r_postnatal_details:label">
            <value>**<output value=" /postnatal_visit/patient_name "/>**
ID: <output value=" /postnatal_visit/group_review/r_patient_id "/></value></text>
          <text id="/postnatal_visit/group_review/r_summary:label">
            <value>Patient Information&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit:label">
            <value>Visit Information&lt;i class="fa fa-plus-square"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit_no:label">
            <value>Postnatal care visit not completed</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit_yes:label">
            <value>Postnatal care visit completed</value>
          </text>
          <text id="/postnatal_visit/group_review/submit:label">
            <value>**Be sure you Submit to complete this action.**</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/baby:label">
            <value>Baby</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/both:label">
            <value>Both mother and baby</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/mom:label">
            <value>Mother</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed:label">
            <value>Who are you assessing today?</value>
          </text>
          <text id="/postnatal_visit/inputs/contact/_id:hint">
            <value>Select a person from list</value>
          </text>
          <text id="/postnatal_visit/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/postnatal_visit/inputs:label">
            <value>Patient</value>
          </text>
          <text id="/postnatal_visit/patient_age_in_years:label">
            <value>Years</value>
          </text>
          <text id="/postnatal_visit/patient_id:label">
            <value>Patient ID</value>
          </text>
          <text id="/postnatal_visit/patient_name:label">
            <value>Patient Name</value>
          </text>
          <text id="/postnatal_visit/patient_phone:label">
            <value>Patient Phone</value>
          </text>
          <text id="/postnatal_visit/patient_uuid:label">
            <value>Patient UUID</value>
          </text>
        </translation>
        <translation lang="es">
          <text id="/postnatal_visit/chw_name:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/chw_phone:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/chw_sms:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/danger_signs_baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/danger_signs_mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc/no:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc/yes:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/call_button:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/chw_information:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/baby_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/default:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/did_not_attend:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/mom_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms_note:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited/no:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited/yes:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup_note1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup_note2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign12:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign13:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign14:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_postnatal_details:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_summary:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit_no:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit_yes:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/submit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/both:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/inputs/contact/_id:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/inputs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_age_in_years:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_id:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_name:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_phone:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_uuid:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="fr">
          <text id="/postnatal_visit/chw_name:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/chw_phone:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/chw_sms:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/danger_signs_baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/danger_signs_mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc/no:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc/yes:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/call_button:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/chw_information:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/baby_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/default:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/did_not_attend:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/mom_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms_note:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited/no:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited/yes:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup_note1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup_note2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign12:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign13:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign14:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_postnatal_details:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_summary:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit_no:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit_yes:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/submit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/both:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/inputs/contact/_id:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/inputs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_age_in_years:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_id:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_name:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_phone:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_uuid:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="hi">
          <text id="/postnatal_visit/chw_name:label">
            <value>सामुदायिक स्वास्थ्य कर्मी का नाम</value>
          </text>
          <text id="/postnatal_visit/chw_phone:label">
            <value>सामुदायिक स्वास्थ्य कर्मी का फोन नंबर</value>
          </text>
          <text id="/postnatal_visit/chw_sms:label">
            <value>सामुदायिक स्वास्थ्य कर्मी का नोट</value>
          </text>
          <text id="/postnatal_visit/danger_signs_baby:label">
            <value>बच्चे की खतरे के संकेत</value>
          </text>
          <text id="/postnatal_visit/danger_signs_mom:label">
            <value>माँ की खतरे के संकेत</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc/no:label">
            <value>नहीं</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc/yes:label">
            <value>हाँ</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc:label">
            <value>क्या <output value=" /postnatal_visit/patient_name "/> अपने गर्भावस्था के बाद की जांच के लिए आये ?</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/call_button:label">
            <value>**कृपया <output value=" /postnatal_visit/chw_name "/> के साथ मिल कर देखे के क्या <output value=" /postnatal_visit/patient_name "/> अपने गर्भावस्था के बाद की जांच के लिए आये |** कॉल: <output value=" /postnatal_visit/chw_phone "/></value></text>
          <text id="/postnatal_visit/group_chw_info/chw_information:label">
            <value><output value=" /postnatal_visit/patient_name "/> के लिए गर्भावस्था की बाद की जांच दर्ज नहीं की गयी है |</value>
          </text>
          <text id="/postnatal_visit/group_chw_info:label">
            <value>लापता जांच की रिपोर्टों</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label">
            <value>अन्य क स्पष्ट करें:</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label">
            <value>बहुत निद्रालु</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label">
            <value>अन्य खतरे के संकेत</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label">
            <value>बुखार</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label">
            <value>तेजी से सांस लेना</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label">
            <value>छाती अंदर लेना</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label">
            <value>ऐंठन</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label">
            <value>दस्त</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label">
            <value>संक्रमित गर्भनाल</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label">
            <value>स्तनपान करने में असमर्थ</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label">
            <value>त्वचा पे बहुत फोड़े</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label">
            <value>सब कुछ उल्टी कर देता है</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint">
            <value>लागू होने वाले सभी का चयन करें</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label">
            <value><output value=" /postnatal_visit/chw_name "/> के साथ पुष्टि करें के क्या बच्चे को इनमें से कोई खतरा है |</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby:label">
            <value>बच्चे की खतरे के संकेत</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label">
            <value>अन्य क स्पष्ट करें:</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label">
            <value>स्तन में समस्या या दर्द</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label">
            <value>खांसी या साँस लेने में कठिनाई</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label">
            <value>TB के दवाइयां लेना</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label">
            <value>बहुत ज़्यादा थकान</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label">
            <value>अन्य खतरे के संकेत</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label">
            <value>उच्च डायस्टोलिक ब्लड प्रेशर</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label">
            <value>ज़्यादा पीलापन</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label">
            <value>सिरदर्द या चेहरे की सूजन</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label">
            <value>योनि से खून का भारी बहाव</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label">
            <value>बुखार या खराब बू वाला जेर</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label">
            <value>बूँद बूँद कर टपकने वाला पेशाब</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label">
            <value>मवाद योनि के आस पास दर्द</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label">
            <value>दुखी महसूस करना या आसानी से रो देना</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label">
            <value>डिलीवरी के 4 सप्ताह बाद भी योनि से बहाव</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint">
            <value>लागू होने वाले सभी का चयन करें</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label">
            <value><output value=" /postnatal_visit/chw_name "/> के साथ पुष्टि करें के क्या <output value=" /postnatal_visit/patient_name "/> को इनमें से कोई खतरा है |</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom:label">
            <value>माँ की खतरे के संकेत</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/baby_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/default:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/did_not_attend:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/mom_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms_note:label">
            <value>**यह संदेश <output value=" /postnatal_visit/chw_name "/> (<output value=" /postnatal_visit/chw_phone "/>) को भेजा जाएगा:**
 <output value=" /postnatal_visit/group_note/default_chw_sms_text "/></value></text>
          <text id="/postnatal_visit/group_note/g_chw_sms:hint">
            <value><output value=" /postnatal_visit/chw_name "/> (<output value=" /postnatal_visit/chw_phone "/>) को संदेश भेजा जायेगा | संदेश की लंबाई सीमित है ताकी SMS का मूल्य उच्च ना हो|</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg">
            <value>आपका सन्देश 5 SMS से ऊपर नहीं हो सकता है | कृपया SMS का मूल्य को कम करने के लिए अपना सन्देश छोटा करें |</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:label">
            <value>आप यहां संदेश में कुछ और जोड़ सकते हैं:</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited/no:label">
            <value>नहीं</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited/yes:label">
            <value>हाँ</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited:label">
            <value>क्या आप संदेश में कुछ और कहना चाहते हैं?</value>
          </text>
          <text id="/postnatal_visit/group_note:label">
            <value>सामुदायिक स्वास्थ्य कर्मी के लिए नोट</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign10:label">
            <value>बहुत निद्रालु</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign11:label">
            <value>अन्य खतरे के संकेत</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign1:label">
            <value>बुखार</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign2:label">
            <value>तेजी से सांस लेना</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign3:label">
            <value>छाती अंदर लेना</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign4:label">
            <value>ऐंठन</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign5:label">
            <value>दस्त</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign6:label">
            <value>संक्रमित गर्भनाल</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign7:label">
            <value>स्तनपान करने में असमर्थ</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign8:label">
            <value>त्वचा पे बहुत फोड़े</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign9:label">
            <value>सब कुछ उल्टी कर देता है</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_signs:label">
            <value>**बच्चे की खतरे के संकेत**</value>
          </text>
          <text id="/postnatal_visit/group_review/r_danger_signs:label">
            <value>खतरे के संकेत&lt;i class="fa fa-warning"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup:label">
            <value>सुनिश्चित करने के लिए सन्देश &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup_note1:label">
            <value>** ये SMS के रूप में <output value=" /postnatal_visit/chw_name "/> <output value=" /postnatal_visit/chw_phone "/> को भेजा जायेगा **</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup_note2:label">
            <value><output value=" /postnatal_visit/chw_sms "/></value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign10:label">
            <value>स्तन में समस्या या दर्द</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign11:label">
            <value>खांसी या साँस लेने में कठिनाई</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign12:label">
            <value>TB के दवाइयां लेना</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign13:label">
            <value>बहुत ज़्यादा थकान</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign14:label">
            <value>अन्य खतरे के संकेत</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign1:label">
            <value>उच्च डायस्टोलिक ब्लड प्रेशर</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign2:label">
            <value>ज़्यादा पीलापन</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign3:label">
            <value>सिरदर्द या चेहरे की सूजन</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign4:label">
            <value>योनि से खून का भारी बहाव</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign5:label">
            <value>बुखार या खराब बू वाला जेर</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign6:label">
            <value>बूँद बूँद कर टपकने वाला पेशाब</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign7:label">
            <value>मवाद योनि के आस पास दर्द</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign8:label">
            <value>दुखी महसूस करना या आसानी से रो देना</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign9:label">
            <value>डिलीवरी के 4 सप्ताह बाद भी योनि से बहाव</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_signs:label">
            <value>**माँ की खतरे के संकेत**</value>
          </text>
          <text id="/postnatal_visit/group_review/r_postnatal_details:label">
            <value>**<output value=" /postnatal_visit/patient_name "/>** आईडी : <output value=" /postnatal_visit/group_review/r_patient_id "/></value></text>
          <text id="/postnatal_visit/group_review/r_summary:label">
            <value>मरीज़ की जानकारी &lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit:label">
            <value>जांच की जानकारी &lt;i class="fa fa-plus-square"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit_no:label">
            <value>गर्भावस्था की बाद की जांच पूरी नहीं की गयी है</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit_yes:label">
            <value>गर्भावस्था की बाद की जांच पूरी की गयी है</value>
          </text>
          <text id="/postnatal_visit/group_review/submit:label">
            <value>**सुनिश्चित करें के यह कार्रवाई पूरा करने के लिए आप सबमिट दबाये |**</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/baby:label">
            <value>बच्चा</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/both:label">
            <value>मां और बच्चा दोनों</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/mom:label">
            <value>माँ</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed:label">
            <value>आज आप किसको जांचना चाहते है ?</value>
          </text>
          <text id="/postnatal_visit/inputs/contact/_id:hint">
            <value>सूची में से एक व्यक्ति को चुनें</value>
          </text>
          <text id="/postnatal_visit/inputs/contact/_id:label">
            <value>मरीज का नाम क्या है?</value>
          </text>
          <text id="/postnatal_visit/inputs:label">
            <value>मरीज</value>
          </text>
          <text id="/postnatal_visit/patient_age_in_years:label">
            <value>साल</value>
          </text>
          <text id="/postnatal_visit/patient_id:label">
            <value>मरीज का ID</value>
          </text>
          <text id="/postnatal_visit/patient_name:label">
            <value>मरीज का नाम</value>
          </text>
          <text id="/postnatal_visit/patient_phone:label">
            <value>मरीज का फोन नंबर</value>
          </text>
          <text id="/postnatal_visit/patient_uuid:label">
            <value>मरीज UUID</value>
          </text>
        </translation>
        <translation lang="id">
          <text id="/postnatal_visit/chw_name:label">
            <value>Nama Kader</value>
          </text>
          <text id="/postnatal_visit/chw_phone:label">
            <value>Nomor Telepon Kader</value>
          </text>
          <text id="/postnatal_visit/chw_sms:label">
            <value>Catatan Kader</value>
          </text>
          <text id="/postnatal_visit/danger_signs_baby:label">
            <value>Tanda-tanda bahaya bayi</value>
          </text>
          <text id="/postnatal_visit/danger_signs_mom:label">
            <value>Tanda-tanda bahaya ibu</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc/no:label">
            <value>Tidak</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc/yes:label">
            <value>Iya</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc:label">
            <value>Apakah <output value=" /postnatal_visit/patient_name "/> datang untuk perawatan setelah melahirkan nya?</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/call_button:label">
            <value>**Mohon dibicarakan dengan <output value=" /postnatal_visit/chw_name "/> untuk memastikan apakah <output value=" /postnatal_visit/patient_name "/> untuk kunjungan perawatan setelah melahirkan nya.** Sebut: <output value=" /postnatal_visit/chw_phone "/></value></text>
          <text id="/postnatal_visit/group_chw_info/chw_information:label">
            <value>Kunjungan perawatan setelah melahirkan untuk <output value=" /postnatal_visit/patient_name "/> belum terdata.</value>
          </text>
          <text id="/postnatal_visit/group_chw_info:label">
            <value>Laporan Kunjungan Hilang</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label">
            <value>Tentukan lainnya:</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label">
            <value>Sangat mengantuk</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label">
            <value>Tanda bahaya lainnya</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label">
            <value>Demam</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label">
            <value>Bernapas cepat</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label">
            <value>Tarikandinding dada kedalam</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label">
            <value>Kejang</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label">
            <value>Diare</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label">
            <value>Tali pusar terinfeksi</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label">
            <value>Tidak dapat menyusui</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label">
            <value>Banyak kulit bisul</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label">
            <value>Memuntahkan semuanya</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint">
            <value>Pilih semua yang berlaku</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label">
            <value>Konfirmasikan dengan <output value=" /postnatal_visit/chw_name "/> jika bayi memiliki tanda-tanda bahaya berikut.</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby:label">
            <value>Tanda-tanda bahaya bayi</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label">
            <value>Tentukan lainnya:</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label">
            <value>Masalah payudara atau nyeri</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label">
            <value>Batuk atau kesulitan bernafas</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label">
            <value>Mengambil obat anti-TBC</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label">
            <value>Kelelahan yang berlebihan</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label">
            <value>Tanda bahaya lainnya</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label">
            <value>Tekanan darah diastolik tinggi</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label">
            <value>Sangat pucat</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label">
            <value>Sakit kepala atau pembengkakan wajah</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label">
            <value>Perdarahan berat dari vagina</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label">
            <value>Demam atau berbau busuk lokia</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label">
            <value>Urin di tetes</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label">
            <value>Nanah atau nyeri di dekat vagina</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label">
            <value>Merasa sedih atau menangis dengan mudah</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label">
            <value>Merembes dari vagina 4 minggu setelah melahirkan</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint">
            <value>Pilih semua yang berlaku</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label">
            <value>Konfirmasikan dengan <output value=" /postnatal_visit/chw_name "/> jika <output value=" /postnatal_visit/patient_name "/> memiliki tanda-tanda bahaya berikut.</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom:label">
            <value>Tanda-tanda bahaya ibu</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/baby_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/default:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/did_not_attend:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/mom_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms_note:label">
            <value>**Pesan ini akan dikirim ke <output value=" /postnatal_visit/chw_name "/> (<output value=" /postnatal_visit/chw_phone "/>):**
 <output value=" /postnatal_visit/group_note/default_chw_sms_text "/></value></text>
          <text id="/postnatal_visit/group_note/g_chw_sms:hint">
            <value>Pesan akan dikirim ke <output value=" /postnatal_visit/chw_name "/> (<output value=" /postnatal_visit/chw_phone "/>). Pesan dibatasi panjang untuk menghindari biaya SMS yang tinggi.</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg">
            <value>Pesan anda tidak boleh lebih dari 5 pesan SMS. Persingkat pesan Anda untuk mengurangi biaya SMS.</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:label">
            <value>Anda dapat menambahkan sesuatu yang lain ke pesan di sini:</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited/no:label">
            <value>Tidak</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited/yes:label">
            <value>Iya</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited:label">
            <value>Apakah Anda ingin menambahkan pesan?</value>
          </text>
          <text id="/postnatal_visit/group_note:label">
            <value>Catatan ke kader</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign10:label">
            <value>Sangat mengantuk</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign11:label">
            <value>Tanda bahaya lainnya</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign1:label">
            <value>Demam</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign2:label">
            <value>Bernapas cepat</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign3:label">
            <value>Tarikandinding dada kedalam</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign4:label">
            <value>Kejang</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign5:label">
            <value>Diare</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign6:label">
            <value>Tali pusar terinfeksi</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign7:label">
            <value>Tidak dapat menyusui</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign8:label">
            <value>Banyak kulit bisul</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign9:label">
            <value>Memuntahkan semuanya</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_signs:label">
            <value>**Tanda-tanda bahaya bayi**</value>
          </text>
          <text id="/postnatal_visit/group_review/r_danger_signs:label">
            <value>Tanda-tanda bahaya&lt;i class="fa fa-warning"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup:label">
            <value>Follow Up Pesan &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup_note1:label">
            <value>**Berikut ini akan dikirim sebagai SMS ke <output value=" /postnatal_visit/chw_name "/> <output value=" /postnatal_visit/chw_phone "/>**</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup_note2:label">
            <value><output value=" /postnatal_visit/chw_sms "/></value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign10:label">
            <value>Masalah payudara atau nyeri</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign11:label">
            <value>Batuk atau kesulitan bernafas</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign12:label">
            <value>Mengambil obat anti-TBC</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign13:label">
            <value>Kelelahan yang berlebihan</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign14:label">
            <value>Tanda bahaya lainnya</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign1:label">
            <value>Tekanan darah diastolik tinggi</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign2:label">
            <value>Sangat pucat</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign3:label">
            <value>Sakit kepala atau pembengkakan wajah</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign4:label">
            <value>Perdarahan berat dari vagina</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign5:label">
            <value>Demam atau berbau busuk lokia</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign6:label">
            <value>Urin di tetes</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign7:label">
            <value>Nanah atau nyeri di dekat vagina</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign8:label">
            <value>Merasa sedih atau menangis dengan mudah</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign9:label">
            <value>Merembes dari vagina 4 minggu setelah melahirkan</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_signs:label">
            <value>**Tanda-tanda bahaya ibu**</value>
          </text>
          <text id="/postnatal_visit/group_review/r_postnatal_details:label">
            <value>&quot;**<output value=" /postnatal_visit/patient_name "/>**
ID: <output value=" /postnatal_visit/group_review/r_patient_id "/>&quot;</value>
          </text>
          <text id="/postnatal_visit/group_review/r_summary:label">
            <value>Informasi pasien &lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit:label">
            <value>Mengunjungi informasi&lt;i class="fa fa-plus-square"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit_no:label">
            <value>Kunjungan perawatan setelah melahirkan tidak lengkap</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit_yes:label">
            <value>Kunjungan perawatan setelah melahirkan lengkap</value>
          </text>
          <text id="/postnatal_visit/group_review/submit:label">
            <value>**Pastikan anda sudah mengirim untuk menyelesaikan tindakan ini.**</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/baby:label">
            <value>Bayi</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/both:label">
            <value>Ibu dan bayi</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/mom:label">
            <value>Ibu</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed:label">
            <value>Siapa yang Anda menilai hari ini?</value>
          </text>
          <text id="/postnatal_visit/inputs/contact/_id:hint">
            <value>Pilih orang dari daftar</value>
          </text>
          <text id="/postnatal_visit/inputs/contact/_id:label">
            <value>Apa nama pasien?</value>
          </text>
          <text id="/postnatal_visit/inputs:label">
            <value>Pasien</value>
          </text>
          <text id="/postnatal_visit/patient_age_in_years:label">
            <value>Umur</value>
          </text>
          <text id="/postnatal_visit/patient_id:label">
            <value>Pasien ID</value>
          </text>
          <text id="/postnatal_visit/patient_name:label">
            <value>Nama Pasien</value>
          </text>
          <text id="/postnatal_visit/patient_phone:label">
            <value>Nomor Telepon Pasien</value>
          </text>
          <text id="/postnatal_visit/patient_uuid:label">
            <value>Pasien UUID</value>
          </text>
        </translation>
        <translation lang="ne">
          <text id="/postnatal_visit/chw_name:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/chw_phone:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/chw_sms:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/danger_signs_baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/danger_signs_mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc/no:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc/yes:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/call_button:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/chw_information:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/baby_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/default:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/did_not_attend:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/mom_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms_note:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited/no:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited/yes:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup_note1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup_note2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign12:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign13:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign14:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_postnatal_details:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_summary:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit_no:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit_yes:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/submit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/both:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/inputs/contact/_id:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/inputs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_age_in_years:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_id:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_name:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_phone:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_uuid:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="sw">
          <text id="/postnatal_visit/chw_name:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/chw_phone:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/chw_sms:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/danger_signs_baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/danger_signs_mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc/no:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc/yes:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/attended_pnc:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/call_button:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info/chw_information:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_chw_info:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_danger_signs_mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/baby_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/default:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/did_not_attend:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/mom_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/default_chw_sms_note:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/g_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited/no:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited/yes:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note/is_sms_edited:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_note:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_sign9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_baby_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup_note1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_followup_note2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign10:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign11:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign12:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign13:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign14:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign1:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign2:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign3:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign4:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign5:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign6:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign7:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign8:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_sign9:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_mom_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_postnatal_details:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_summary:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit_no:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/r_visit_yes:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_review/submit:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/baby:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/both:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed/mom:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/group_who_assessed/g_who_assessed:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/inputs/contact/_id:hint">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/inputs:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_age_in_years:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_id:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_name:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_phone:label">
            <value>-</value>
          </text>
          <text id="/postnatal_visit/patient_uuid:label">
            <value>-</value>
          </text>
        </translation>
      </itext>
      <instance>
        <postnatal_visit delimiter="#" id="postnatal_visit" prefix="J1!postnatal_visit!" version="2022-03-03 15-46">
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
              <phone/>
              <parent>
                <contact>
                  <phone/>
                  <name/>
                </contact>
              </parent>
            </contact>
          </inputs>
          <patient_age_in_years tag="hidden"/>
          <patient_phone/>
          <patient_uuid tag="hidden"/>
          <patient_id/>
          <patient_name/>
          <chw_name/>
          <chw_phone/>
          <danger_signs_mom/>
          <danger_signs_baby/>
          <chw_sms/>
          <visit_confirmed/>
          <group_chw_info tag="hidden">
            <chw_information/>
            <call_button/>
            <attended_pnc/>
          </group_chw_info>
          <group_who_assessed tag="hidden">
            <g_who_assessed/>
          </group_who_assessed>
          <group_danger_signs_mom tag="hidden">
            <g_danger_signs_mom/>
            <danger_signs_mom_other/>
          </group_danger_signs_mom>
          <group_danger_signs_baby tag="hidden">
            <g_danger_signs_baby/>
            <danger_signs_baby_other/>
          </group_danger_signs_baby>
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
            <r_postnatal_details/>
            <r_visit/>
            <r_visit_yes/>
            <r_visit_no/>
            <r_danger_signs/>
            <r_mom_danger_signs/>
            <r_mom_danger_sign1/>
            <r_mom_danger_sign2/>
            <r_mom_danger_sign3/>
            <r_mom_danger_sign4/>
            <r_mom_danger_sign5/>
            <r_mom_danger_sign6/>
            <r_mom_danger_sign7/>
            <r_mom_danger_sign8/>
            <r_mom_danger_sign9/>
            <r_mom_danger_sign10/>
            <r_mom_danger_sign11/>
            <r_mom_danger_sign12/>
            <r_mom_danger_sign13/>
            <r_mom_danger_sign14/>
            <r_baby_danger_signs/>
            <r_baby_danger_sign1/>
            <r_baby_danger_sign2/>
            <r_baby_danger_sign3/>
            <r_baby_danger_sign4/>
            <r_baby_danger_sign5/>
            <r_baby_danger_sign6/>
            <r_baby_danger_sign7/>
            <r_baby_danger_sign8/>
            <r_baby_danger_sign9/>
            <r_baby_danger_sign10/>
            <r_baby_danger_sign11/>
            <r_followup/>
            <r_followup_note1/>
            <r_followup_note2/>
          </group_review>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </postnatal_visit>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/postnatal_visit/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/postnatal_visit/inputs/source" type="string"/>
      <bind nodeset="/postnatal_visit/inputs/source_id" type="string"/>
      <bind nodeset="/postnatal_visit/inputs/contact/_id" required="true()" type="db:person"/>
      <bind nodeset="/postnatal_visit/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/postnatal_visit/inputs/contact/name" type="string"/>
      <bind nodeset="/postnatal_visit/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/postnatal_visit/inputs/contact/sex" type="string"/>
      <bind nodeset="/postnatal_visit/inputs/contact/phone" type="string"/>
      <bind nodeset="/postnatal_visit/inputs/contact/parent/contact/phone" type="string"/>
      <bind nodeset="/postnatal_visit/inputs/contact/parent/contact/name" type="string"/>
      <bind calculate="if (  /postnatal_visit/inputs/contact/date_of_birth ='', '', floor( difference-in-months(  /postnatal_visit/inputs/contact/date_of_birth , today() ) div 12 ) )" nodeset="/postnatal_visit/patient_age_in_years" type="string"/>
      <bind calculate="../inputs/contact/phone" nodeset="/postnatal_visit/patient_phone" type="string"/>
      <bind calculate="../inputs/contact/_id" nodeset="/postnatal_visit/patient_uuid" type="string"/>
      <bind calculate="../inputs/contact/patient_id" nodeset="/postnatal_visit/patient_id" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/postnatal_visit/patient_name" type="string"/>
      <bind calculate="../inputs/contact/parent/contact/name" nodeset="/postnatal_visit/chw_name" type="string"/>
      <bind calculate="../inputs/contact/parent/contact/phone" nodeset="/postnatal_visit/chw_phone" type="string"/>
      <bind calculate=" /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom " nodeset="/postnatal_visit/danger_signs_mom" type="string"/>
      <bind calculate=" /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby " nodeset="/postnatal_visit/danger_signs_baby" type="string"/>
      <bind calculate="if( /postnatal_visit/group_note/g_chw_sms  != '', concat( /postnatal_visit/group_note/default_chw_sms_text ,concat('
', /postnatal_visit/group_note/g_chw_sms )),  /postnatal_visit/group_note/default_chw_sms_text )" nodeset="/postnatal_visit/chw_sms" type="string"/>
      <bind calculate="coalesce( /postnatal_visit/group_chw_info/attended_pnc , 'yes')" nodeset="/postnatal_visit/visit_confirmed" type="string"/>
      <bind nodeset="/postnatal_visit/group_chw_info" relevant=" /postnatal_visit/inputs/source  = 'task'"/>
      <bind nodeset="/postnatal_visit/group_chw_info/chw_information" readonly="true()" type="string"/>
      <bind nodeset="/postnatal_visit/group_chw_info/call_button" readonly="true()" type="string"/>
      <bind nodeset="/postnatal_visit/group_chw_info/attended_pnc" required="true()" type="select1"/>
      <bind nodeset="/postnatal_visit/group_who_assessed" relevant=" /postnatal_visit/visit_confirmed  = 'yes'"/>
      <bind nodeset="/postnatal_visit/group_who_assessed/g_who_assessed" required="true()" type="select1"/>
      <bind nodeset="/postnatal_visit/group_danger_signs_mom" relevant=" /postnatal_visit/group_who_assessed/g_who_assessed  = 'mom' or  /postnatal_visit/group_who_assessed/g_who_assessed  = 'both'"/>
      <bind nodeset="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom" type="select"/>
      <bind nodeset="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd14')" required="true()" type="string"/>
      <bind nodeset="/postnatal_visit/group_danger_signs_baby" relevant=" /postnatal_visit/group_who_assessed/g_who_assessed  = 'baby' or  /postnatal_visit/group_who_assessed/g_who_assessed  = 'both'"/>
      <bind nodeset="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby" type="select"/>
      <bind nodeset="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other" relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd11')" required="true()" type="string"/>
      <bind calculate="if( /postnatal_visit/visit_confirmed  = 'yes',
 if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'both',
 if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',
 if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',
 'both_visit_both_ds',
 'both_visit_mom_ds'
 ),
 if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',
 'both_visit_baby_ds',
 'default'
 )
 ),
 if( /postnatal_visit/group_who_assessed/g_who_assessed  = 'mom',
 if( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '',
 'mom_visit_ds',
 'mom_visit'
 ),
 if( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != '',
 'baby_visit_ds',
 'baby_visit'
 )
 )
 ),
 'did_not_attend'
)" nodeset="/postnatal_visit/group_note/default_chw_sms" type="select1"/>
      <bind calculate="jr:choice-name( /postnatal_visit/group_note/default_chw_sms ,' /postnatal_visit/group_note/default_chw_sms ')" nodeset="/postnatal_visit/group_note/default_chw_sms_text" type="string"/>
      <bind nodeset="/postnatal_visit/group_note/default_chw_sms_note" readonly="true()" type="string"/>
      <bind nodeset="/postnatal_visit/group_note/is_sms_edited" required="true()" type="select1"/>
      <bind constraint="string-length(.) &lt;= 715" jr:constraintMsg="jr:itext('/postnatal_visit/group_note/g_chw_sms:jr:constraintMsg')" nodeset="/postnatal_visit/group_note/g_chw_sms" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/submit" readonly="true()" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_summary" readonly="true()" type="string"/>
      <bind calculate="../../inputs/contact/patient_id" nodeset="/postnatal_visit/group_review/r_patient_id" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_postnatal_details" readonly="true()" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_visit" readonly="true()" relevant=" /postnatal_visit/visit_confirmed  != ''" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_visit_yes" readonly="true()" relevant="selected( /postnatal_visit/visit_confirmed , 'yes')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_visit_no" readonly="true()" relevant="selected( /postnatal_visit/visit_confirmed ,'no')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_danger_signs" readonly="true()" relevant=" /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != '' or  /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != ''" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_signs" readonly="true()" relevant=" /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom  != ''" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_sign1" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd1')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_sign2" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd2')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_sign3" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd3')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_sign4" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd4')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_sign5" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd5')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_sign6" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd6')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_sign7" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd7')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_sign8" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd8')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_sign9" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd9')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_sign10" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd10')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_sign11" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd11')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_sign12" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd12')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_sign13" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd13')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_mom_danger_sign14" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_mom/g_danger_signs_mom , 'd14')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_baby_danger_signs" readonly="true()" relevant=" /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby  != ''" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_baby_danger_sign1" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd1')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_baby_danger_sign2" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd2')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_baby_danger_sign3" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd3')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_baby_danger_sign4" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd4')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_baby_danger_sign5" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd5')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_baby_danger_sign6" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd6')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_baby_danger_sign7" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd7')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_baby_danger_sign8" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd8')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_baby_danger_sign9" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd9')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_baby_danger_sign10" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd10')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_baby_danger_sign11" readonly="true()" relevant="selected( /postnatal_visit/group_danger_signs_baby/g_danger_signs_baby , 'bd11')" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_followup" readonly="true()" relevant=" /postnatal_visit/chw_sms  != ''" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_followup_note1" readonly="true()" relevant=" /postnatal_visit/chw_sms  != ''" type="string"/>
      <bind nodeset="/postnatal_visit/group_review/r_followup_note2" readonly="true()" relevant=" /postnatal_visit/chw_sms  != ''" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/postnatal_visit/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/postnatal_visit/inputs">
      <label ref="jr:itext('/postnatal_visit/inputs:label')"/>
      <group ref="/postnatal_visit/inputs/contact">
        <input appearance="db-object" ref="/postnatal_visit/inputs/contact/_id">
          <label ref="jr:itext('/postnatal_visit/inputs/contact/_id:label')"/>
          <hint ref="jr:itext('/postnatal_visit/inputs/contact/_id:hint')"/>
        </input>
        <input appearance="hidden" ref="/postnatal_visit/inputs/contact/patient_id"/>
        <input appearance="hidden" ref="/postnatal_visit/inputs/contact/name"/>
        <input appearance="hidden" ref="/postnatal_visit/inputs/contact/date_of_birth"/>
        <input appearance="hidden" ref="/postnatal_visit/inputs/contact/sex"/>
        <input appearance="hidden" ref="/postnatal_visit/inputs/contact/phone"/>
        <group ref="/postnatal_visit/inputs/contact/parent">
          <group ref="/postnatal_visit/inputs/contact/parent/contact">
            <input appearance="hidden" ref="/postnatal_visit/inputs/contact/parent/contact/phone"/>
            <input appearance="hidden" ref="/postnatal_visit/inputs/contact/parent/contact/name"/>
          </group>
        </group>
      </group>
    </group>
    <group appearance="field-list" ref="/postnatal_visit/group_chw_info">
      <label ref="jr:itext('/postnatal_visit/group_chw_info:label')"/>
      <input ref="/postnatal_visit/group_chw_info/chw_information">
        <label ref="jr:itext('/postnatal_visit/group_chw_info/chw_information:label')"/>
      </input>
      <input ref="/postnatal_visit/group_chw_info/call_button">
        <label ref="jr:itext('/postnatal_visit/group_chw_info/call_button:label')"/>
      </input>
      <select1 ref="/postnatal_visit/group_chw_info/attended_pnc">
        <label ref="jr:itext('/postnatal_visit/group_chw_info/attended_pnc:label')"/>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_chw_info/attended_pnc/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_chw_info/attended_pnc/no:label')"/>
          <value>no</value>
        </item>
      </select1>
    </group>
    <group ref="/postnatal_visit/group_who_assessed">
      <select1 ref="/postnatal_visit/group_who_assessed/g_who_assessed">
        <label ref="jr:itext('/postnatal_visit/group_who_assessed/g_who_assessed:label')"/>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_who_assessed/g_who_assessed/mom:label')"/>
          <value>mom</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_who_assessed/g_who_assessed/baby:label')"/>
          <value>baby</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_who_assessed/g_who_assessed/both:label')"/>
          <value>both</value>
        </item>
      </select1>
    </group>
    <group appearance="field-list" ref="/postnatal_visit/group_danger_signs_mom">
      <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom:label')"/>
      <select ref="/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom">
        <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:label')"/>
        <hint ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom:hint')"/>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d1:label')"/>
          <value>d1</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d2:label')"/>
          <value>d2</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d3:label')"/>
          <value>d3</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d4:label')"/>
          <value>d4</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d5:label')"/>
          <value>d5</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d6:label')"/>
          <value>d6</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d7:label')"/>
          <value>d7</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d8:label')"/>
          <value>d8</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d9:label')"/>
          <value>d9</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d10:label')"/>
          <value>d10</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d11:label')"/>
          <value>d11</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d12:label')"/>
          <value>d12</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d13:label')"/>
          <value>d13</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/g_danger_signs_mom/d14:label')"/>
          <value>d14</value>
        </item>
      </select>
      <input ref="/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other">
        <label ref="jr:itext('/postnatal_visit/group_danger_signs_mom/danger_signs_mom_other:label')"/>
      </input>
    </group>
    <group appearance="field-list" ref="/postnatal_visit/group_danger_signs_baby">
      <label ref="jr:itext('/postnatal_visit/group_danger_signs_baby:label')"/>
      <select ref="/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby">
        <label ref="jr:itext('/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:label')"/>
        <hint ref="jr:itext('/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby:hint')"/>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd1:label')"/>
          <value>bd1</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd2:label')"/>
          <value>bd2</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd3:label')"/>
          <value>bd3</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd4:label')"/>
          <value>bd4</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd5:label')"/>
          <value>bd5</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd6:label')"/>
          <value>bd6</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd7:label')"/>
          <value>bd7</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd8:label')"/>
          <value>bd8</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd9:label')"/>
          <value>bd9</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd10:label')"/>
          <value>bd10</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_danger_signs_baby/g_danger_signs_baby/bd11:label')"/>
          <value>bd11</value>
        </item>
      </select>
      <input ref="/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other">
        <label ref="jr:itext('/postnatal_visit/group_danger_signs_baby/danger_signs_baby_other:label')"/>
      </input>
    </group>
    <group appearance="field-list" ref="/postnatal_visit/group_note">
      <label ref="jr:itext('/postnatal_visit/group_note:label')"/>
      <select1 appearance="hidden" ref="/postnatal_visit/group_note/default_chw_sms">
        <label ref="jr:itext('/postnatal_visit/group_note/default_chw_sms:label')"/>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_note/default_chw_sms/default:label')"/>
          <value>default</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_note/default_chw_sms/both_visit_mom_ds:label')"/>
          <value>both_visit_mom_ds</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_note/default_chw_sms/both_visit_baby_ds:label')"/>
          <value>both_visit_baby_ds</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_note/default_chw_sms/both_visit_both_ds:label')"/>
          <value>both_visit_both_ds</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_note/default_chw_sms/mom_visit:label')"/>
          <value>mom_visit</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_note/default_chw_sms/mom_visit_ds:label')"/>
          <value>mom_visit_ds</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_note/default_chw_sms/baby_visit:label')"/>
          <value>baby_visit</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_note/default_chw_sms/baby_visit_ds:label')"/>
          <value>baby_visit_ds</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_note/default_chw_sms/did_not_attend:label')"/>
          <value>did_not_attend</value>
        </item>
      </select1>
      <input ref="/postnatal_visit/group_note/default_chw_sms_note">
        <label ref="jr:itext('/postnatal_visit/group_note/default_chw_sms_note:label')"/>
      </input>
      <select1 appearance="hidden" ref="/postnatal_visit/group_note/is_sms_edited">
        <label ref="jr:itext('/postnatal_visit/group_note/is_sms_edited:label')"/>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_note/is_sms_edited/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/postnatal_visit/group_note/is_sms_edited/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <input appearance="multiline" ref="/postnatal_visit/group_note/g_chw_sms">
        <label ref="jr:itext('/postnatal_visit/group_note/g_chw_sms:label')"/>
        <hint ref="jr:itext('/postnatal_visit/group_note/g_chw_sms:hint')"/>
      </input>
    </group>
    <group appearance="field-list summary" ref="/postnatal_visit/group_review">
      <input appearance="center" ref="/postnatal_visit/group_review/submit">
        <label ref="jr:itext('/postnatal_visit/group_review/submit:label')"/>
      </input>
      <input appearance="h1 yellow" ref="/postnatal_visit/group_review/r_summary">
        <label ref="jr:itext('/postnatal_visit/group_review/r_summary:label')"/>
      </input>
      <input appearance="h4 center" ref="/postnatal_visit/group_review/r_postnatal_details">
        <label ref="jr:itext('/postnatal_visit/group_review/r_postnatal_details:label')"/>
      </input>
      <input appearance="h1 blue" ref="/postnatal_visit/group_review/r_visit">
        <label ref="jr:itext('/postnatal_visit/group_review/r_visit:label')"/>
      </input>
      <input appearance="h4 center" ref="/postnatal_visit/group_review/r_visit_yes">
        <label ref="jr:itext('/postnatal_visit/group_review/r_visit_yes:label')"/>
      </input>
      <input appearance="h4 center" ref="/postnatal_visit/group_review/r_visit_no">
        <label ref="jr:itext('/postnatal_visit/group_review/r_visit_no:label')"/>
      </input>
      <input appearance="h1 red" ref="/postnatal_visit/group_review/r_danger_signs">
        <label ref="jr:itext('/postnatal_visit/group_review/r_danger_signs:label')"/>
      </input>
      <input ref="/postnatal_visit/group_review/r_mom_danger_signs">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_signs:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_mom_danger_sign1">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_sign1:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_mom_danger_sign2">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_sign2:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_mom_danger_sign3">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_sign3:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_mom_danger_sign4">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_sign4:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_mom_danger_sign5">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_sign5:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_mom_danger_sign6">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_sign6:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_mom_danger_sign7">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_sign7:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_mom_danger_sign8">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_sign8:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_mom_danger_sign9">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_sign9:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_mom_danger_sign10">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_sign10:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_mom_danger_sign11">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_sign11:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_mom_danger_sign12">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_sign12:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_mom_danger_sign13">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_sign13:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_mom_danger_sign14">
        <label ref="jr:itext('/postnatal_visit/group_review/r_mom_danger_sign14:label')"/>
      </input>
      <input ref="/postnatal_visit/group_review/r_baby_danger_signs">
        <label ref="jr:itext('/postnatal_visit/group_review/r_baby_danger_signs:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_baby_danger_sign1">
        <label ref="jr:itext('/postnatal_visit/group_review/r_baby_danger_sign1:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_baby_danger_sign2">
        <label ref="jr:itext('/postnatal_visit/group_review/r_baby_danger_sign2:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_baby_danger_sign3">
        <label ref="jr:itext('/postnatal_visit/group_review/r_baby_danger_sign3:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_baby_danger_sign4">
        <label ref="jr:itext('/postnatal_visit/group_review/r_baby_danger_sign4:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_baby_danger_sign5">
        <label ref="jr:itext('/postnatal_visit/group_review/r_baby_danger_sign5:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_baby_danger_sign6">
        <label ref="jr:itext('/postnatal_visit/group_review/r_baby_danger_sign6:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_baby_danger_sign7">
        <label ref="jr:itext('/postnatal_visit/group_review/r_baby_danger_sign7:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_baby_danger_sign8">
        <label ref="jr:itext('/postnatal_visit/group_review/r_baby_danger_sign8:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_baby_danger_sign9">
        <label ref="jr:itext('/postnatal_visit/group_review/r_baby_danger_sign9:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_baby_danger_sign10">
        <label ref="jr:itext('/postnatal_visit/group_review/r_baby_danger_sign10:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_baby_danger_sign11">
        <label ref="jr:itext('/postnatal_visit/group_review/r_baby_danger_sign11:label')"/>
      </input>
      <input appearance="h1 green" ref="/postnatal_visit/group_review/r_followup">
        <label ref="jr:itext('/postnatal_visit/group_review/r_followup:label')"/>
      </input>
      <input ref="/postnatal_visit/group_review/r_followup_note1">
        <label ref="jr:itext('/postnatal_visit/group_review/r_followup_note1:label')"/>
      </input>
      <input appearance="li" ref="/postnatal_visit/group_review/r_followup_note2">
        <label ref="jr:itext('/postnatal_visit/group_review/r_followup_note2:label')"/>
      </input>
    </group>
  </h:body>
</h:html>
`,   
};
