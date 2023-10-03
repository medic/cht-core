/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="pregnancy_danger_sign_follow_up">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Pregnancy danger sign follow-up</h3>
<select id="form-languages" style="display:none;" data-default-lang=""><option value="en">en</option> </select>
  
  
    <section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pregnancy_danger_sign_follow_up/inputs" data-relevant="./source = 'user'"><section class="or-group-data " name="/pregnancy_danger_sign_follow_up/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/inputs/contact/_id:label">What is the patient's name?</span><input type="text" name="/pregnancy_danger_sign_follow_up/inputs/contact/_id" data-type-xml="person"></label><section class="or-group-data " name="/pregnancy_danger_sign_follow_up/inputs/contact/parent"><section class="or-group-data " name="/pregnancy_danger_sign_follow_up/inputs/contact/parent/parent"><section class="or-group-data " name="/pregnancy_danger_sign_follow_up/inputs/contact/parent/parent/contact">
      </section>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group or-appearance-field-list " name="/pregnancy_danger_sign_follow_up/danger_signs"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs:label">Danger Sign Follow-up</span></h4>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm:label">Did <span class="or-output" data-value=" /pregnancy_danger_sign_follow_up/patient_short_name "> </span> visit the health facility as recommended?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm" data-name="/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm" data-name="/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present:label">Is she still experiencing any danger signs?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present" data-name="/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present" data-name="/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/congratulate_no_ds_note:label">Great news! Please closely monitor her until her next scheduled ANC check-up at the health facility.</span><input type="text" name="/pregnancy_danger_sign_follow_up/danger_signs/congratulate_no_ds_note" data-relevant="../danger_sign_present = 'no'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/refer_patient_note_1:label">The mother should visit the health facility immediately if she is experiencing any of these danger signs.</span><input type="text" name="/pregnancy_danger_sign_follow_up/danger_signs/refer_patient_note_1" data-relevant="../danger_sign_present = 'yes'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/refer_patient_note_2:label">Please advise her to do so and accompany her if possible.</span><input type="text" name="/pregnancy_danger_sign_follow_up/danger_signs/refer_patient_note_2" data-relevant="../danger_sign_present = 'yes'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/danger_signs_question_note:label">Please indicate which danger signs <span class="or-output" data-value=" /pregnancy_danger_sign_follow_up/patient_short_name "> </span> is experiencing.</span><input type="text" name="/pregnancy_danger_sign_follow_up/danger_signs/danger_signs_question_note" data-relevant="../danger_sign_present = 'yes'" data-type-xml="string" readonly></label><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding:label">Vaginal bleeding</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding" data-name="/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding" data-name="/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/fits:label">Fits</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/fits" data-name="/pregnancy_danger_sign_follow_up/danger_signs/fits" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/fits/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/fits" data-name="/pregnancy_danger_sign_follow_up/danger_signs/fits" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/fits/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain:label">Severe abdominal pain</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain" data-name="/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain" data-name="/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/severe_headache:label">Severe headache</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/severe_headache" data-name="/pregnancy_danger_sign_follow_up/danger_signs/severe_headache" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/severe_headache/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/severe_headache" data-name="/pregnancy_danger_sign_follow_up/danger_signs/severe_headache" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/severe_headache/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/very_pale:label">Very pale</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/very_pale" data-name="/pregnancy_danger_sign_follow_up/danger_signs/very_pale" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/very_pale/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/very_pale" data-name="/pregnancy_danger_sign_follow_up/danger_signs/very_pale" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/very_pale/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/fever:label">Fever</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/fever" data-name="/pregnancy_danger_sign_follow_up/danger_signs/fever" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/fever/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/fever" data-name="/pregnancy_danger_sign_follow_up/danger_signs/fever" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/fever/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements:label">Reduced or no fetal movements</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements" data-name="/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements" data-name="/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/breaking_water:label">Breaking of water</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/breaking_water" data-name="/pregnancy_danger_sign_follow_up/danger_signs/breaking_water" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/breaking_water/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/breaking_water" data-name="/pregnancy_danger_sign_follow_up/danger_signs/breaking_water" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/breaking_water/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/easily_tired:label">Getting tired easily</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/easily_tired" data-name="/pregnancy_danger_sign_follow_up/danger_signs/easily_tired" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/easily_tired/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/easily_tired" data-name="/pregnancy_danger_sign_follow_up/danger_signs/easily_tired" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/easily_tired/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling:label">Swelling of face and hands</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling" data-name="/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling" data-name="/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/breathlessness:label">Breathlessness</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/breathlessness" data-name="/pregnancy_danger_sign_follow_up/danger_signs/breathlessness" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/breathlessness/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/breathlessness" data-name="/pregnancy_danger_sign_follow_up/danger_signs/breathlessness" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/breathlessness/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<section class="or-group-data or-appearance-hidden " name="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations"><fieldset class="question simple-select "><fieldset>
<legend>
          </legend>
<div class="option-wrapper"><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_label_translator" data-name="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_label_translator" value="woman" data-calculate='"woman"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_label_translator/woman:label">the woman</span></label></div>
</fieldset></fieldset>
<fieldset class="question simple-select "><fieldset>
<legend>
          </legend>
<div class="option-wrapper"><label class=""><input type="radio" name="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_start_label_translator" data-name="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_start_label_translator" value="woman-start" data-calculate='"woman-start"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_start_label_translator/woman-start:label">The woman</span></label></div>
</fieldset></fieldset>
      </section>
      </section>
    <section class="or-group-data or-appearance-hidden " name="/pregnancy_danger_sign_follow_up/data"><section class="or-group-data " name="/pregnancy_danger_sign_follow_up/data/meta">
      </section>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/patient_age_in_years" data-calculate="floor( difference-in-months( ../inputs/contact/date_of_birth, today() ) div 12 )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/patient_short_name" data-calculate="coalesce(../inputs/contact/short_name, ../danger_signs/custom_translations/custom_woman_label)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/patient_short_name_start" data-calculate="coalesce(../inputs/contact/short_name, ../danger_signs/custom_translations/custom_woman_start_label)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/t_danger_signs_referral_follow_up_date" data-calculate="date-time(decimal-date-time(today()) + 3)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/t_danger_signs_referral_follow_up" data-calculate="../danger_signs/r_danger_sign_present" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/pregnancy_uuid_ctx" data-calculate="if(instance('contact-summary')/context/pregnancy_uuid != '', instance('contact-summary')/context/pregnancy_uuid, .)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/danger_signs/r_danger_sign_present" data-calculate="if((selected(../vaginal_bleeding, 'yes') or selected(../fits, 'yes') or selected(../severe_abdominal_pain, 'yes') or selected(../severe_headache, 'yes') or selected(../very_pale, 'yes') or selected(../fever, 'yes') or selected(../reduced_or_no_fetal_movements, 'yes') or selected(../breaking_water, 'yes') or selected(../easily_tired, 'yes') or selected(../face_hand_swelling, 'yes') or selected(../breathlessness, 'yes')),  'yes', 'no')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_label" data-calculate="jr:choice-name( /pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_label_translator ,' /pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_label_translator ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_start_label" data-calculate="jr:choice-name( /pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_start_label_translator ,' /pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_start_label_translator ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/__visited_hf" data-calculate=" /pregnancy_danger_sign_follow_up/danger_signs/visit_confirm " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/__still_experiencing_danger_sign" data-calculate=" /pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/__vaginal_bleeding" data-calculate=" /pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/__fits" data-calculate=" /pregnancy_danger_sign_follow_up/danger_signs/fits " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/__severe_abdominal_pain" data-calculate=" /pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/__severe_headache" data-calculate=" /pregnancy_danger_sign_follow_up/danger_signs/severe_headache " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/__very_pale" data-calculate=" /pregnancy_danger_sign_follow_up/danger_signs/very_pale " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/__fever" data-calculate=" /pregnancy_danger_sign_follow_up/danger_signs/fever " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/__reduced_or_no_fetal_movements" data-calculate=" /pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/__breaking_water" data-calculate=" /pregnancy_danger_sign_follow_up/danger_signs/breaking_water " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/__easily_tired" data-calculate=" /pregnancy_danger_sign_follow_up/danger_signs/easily_tired " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/__face_hand_swelling" data-calculate=" /pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/__breathlessness" data-calculate=" /pregnancy_danger_sign_follow_up/danger_signs/breathlessness " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/__has_danger_sign" data-calculate=" /pregnancy_danger_sign_follow_up/danger_signs/r_danger_sign_present " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/meta/__patient_uuid" data-calculate="../../../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/meta/__patient_id" data-calculate="../../../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/meta/__household_uuid" data-calculate="../../../inputs/contact/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/meta/__source" data-calculate="../../../inputs/source" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/meta/__source_id" data-calculate="../../../inputs/source_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/data/meta/__pregnancy_uuid" data-calculate=" /pregnancy_danger_sign_follow_up/pregnancy_uuid_ctx " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_danger_sign_follow_up/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <pregnancy_danger_sign_follow_up xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" id="pregnancy_danger_sign_follow_up" prefix="J1!pregnancy_danger_sign_follow_up!" delimiter="#" version="2022-09-26 11:22:25">
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
              <short_name/>
              <patient_id/>
              <date_of_birth>0</date_of_birth>
              <sex/>
              <parent>
                <_id/>
                <parent>
                  <contact>
                    <chw_name/>
                    <phone/>
                  </contact>
                </parent>
              </parent>
            </contact>
          </inputs>
          <patient_age_in_years tag="hidden"/>
          <patient_uuid tag="hidden"/>
          <patient_id tag="hidden"/>
          <patient_name tag="hidden"/>
          <patient_short_name tag="hidden"/>
          <patient_short_name_start tag="hidden"/>
          <t_danger_signs_referral_follow_up_date tag="hidden"/>
          <t_danger_signs_referral_follow_up tag="hidden"/>
          <pregnancy_uuid_ctx/>
          <danger_signs>
            <visit_confirm/>
            <danger_sign_present/>
            <congratulate_no_ds_note tag="hidden"/>
            <refer_patient_note_1 tag="hidden"/>
            <refer_patient_note_2 tag="hidden"/>
            <danger_signs_question_note tag="hidden"/>
            <vaginal_bleeding/>
            <fits/>
            <severe_abdominal_pain/>
            <severe_headache/>
            <very_pale/>
            <fever/>
            <reduced_or_no_fetal_movements/>
            <breaking_water/>
            <easily_tired/>
            <face_hand_swelling/>
            <breathlessness/>
            <r_danger_sign_present tag="hidden"/>
            <custom_translations tag="hidden">
              <custom_woman_label_translator/>
              <custom_woman_label/>
              <custom_woman_start_label_translator/>
              <custom_woman_start_label/>
            </custom_translations>
          </danger_signs>
          <data tag="hidden">
            <__visited_hf/>
            <__still_experiencing_danger_sign/>
            <__vaginal_bleeding/>
            <__fits/>
            <__severe_abdominal_pain/>
            <__severe_headache/>
            <__very_pale/>
            <__fever/>
            <__reduced_or_no_fetal_movements/>
            <__breaking_water/>
            <__easily_tired/>
            <__face_hand_swelling/>
            <__breathlessness/>
            <__has_danger_sign/>
            <meta tag="hidden">
              <__patient_uuid/>
              <__patient_id/>
              <__household_uuid/>
              <__source/>
              <__source_id/>
              <__pregnancy_uuid/>
            </meta>
          </data>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </pregnancy_danger_sign_follow_up>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
  <h:head>
    <h:title>Pregnancy danger sign follow-up</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/breaking_water/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/breaking_water/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/breaking_water:label">
            <value>Breaking of water</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/breathlessness/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/breathlessness/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/breathlessness:label">
            <value>Breathlessness</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/congratulate_no_ds_note:label">
            <value>Great news! Please closely monitor her until her next scheduled ANC check-up at the health facility.</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_label_translator/woman:label">
            <value>the woman</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_start_label_translator/woman-start:label">
            <value>The woman</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present:label">
            <value>Is she still experiencing any danger signs?</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/danger_signs_question_note:label">
            <value>Please indicate which danger signs <output value=" /pregnancy_danger_sign_follow_up/patient_short_name "/> is experiencing.</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/easily_tired/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/easily_tired/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/easily_tired:label">
            <value>Getting tired easily</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling:label">
            <value>Swelling of face and hands</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/fever/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/fever/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/fever:label">
            <value>Fever</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/fits/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/fits/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/fits:label">
            <value>Fits</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements:label">
            <value>Reduced or no fetal movements</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/refer_patient_note_1:label">
            <value>The mother should visit the health facility immediately if she is experiencing any of these danger signs.</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/refer_patient_note_2:label">
            <value>Please advise her to do so and accompany her if possible.</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain:label">
            <value>Severe abdominal pain</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/severe_headache/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/severe_headache/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/severe_headache:label">
            <value>Severe headache</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding:label">
            <value>Vaginal bleeding</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/very_pale/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/very_pale/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/very_pale:label">
            <value>Very pale</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm:label">
            <value>Did <output value=" /pregnancy_danger_sign_follow_up/patient_short_name "/> visit the health facility as recommended?</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/danger_signs:label">
            <value>Danger Sign Follow-up</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/inputs/contact/date_of_birth:label">
            <value>Date of Birth</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/inputs/contact/name:label">
            <value>Name</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/inputs/contact/parent/_id:label">
            <value>Parent ID</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/inputs/contact/parent/parent/contact/chw_name:label">
            <value>CHW name</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/inputs/contact/parent/parent/contact/phone:label">
            <value>CHW phone</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/inputs/contact/patient_id:label">
            <value>Patient ID</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/inputs/contact/sex:label">
            <value>Sex</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/inputs/contact/short_name:label">
            <value>Short Name</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/inputs/source:label">
            <value>Source</value>
          </text>
          <text id="/pregnancy_danger_sign_follow_up/inputs/source_id:label">
            <value>Source ID</value>
          </text>
        </translation>
      </itext>
      <instance>
        <pregnancy_danger_sign_follow_up id="pregnancy_danger_sign_follow_up" prefix="J1!pregnancy_danger_sign_follow_up!" delimiter="#" version="2022-09-26 11:22:25">
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
              <short_name/>
              <patient_id/>
              <date_of_birth>0</date_of_birth>
              <sex/>
              <parent>
                <_id/>
                <parent>
                  <contact>
                    <chw_name/>
                    <phone/>
                  </contact>
                </parent>
              </parent>
            </contact>
          </inputs>
          <patient_age_in_years tag="hidden"/>
          <patient_uuid tag="hidden"/>
          <patient_id tag="hidden"/>
          <patient_name tag="hidden"/>
          <patient_short_name tag="hidden"/>
          <patient_short_name_start tag="hidden"/>
          <t_danger_signs_referral_follow_up_date tag="hidden"/>
          <t_danger_signs_referral_follow_up tag="hidden"/>
          <pregnancy_uuid_ctx/>
          <danger_signs>
            <visit_confirm/>
            <danger_sign_present/>
            <congratulate_no_ds_note tag="hidden"/>
            <refer_patient_note_1 tag="hidden"/>
            <refer_patient_note_2 tag="hidden"/>
            <danger_signs_question_note tag="hidden"/>
            <vaginal_bleeding/>
            <fits/>
            <severe_abdominal_pain/>
            <severe_headache/>
            <very_pale/>
            <fever/>
            <reduced_or_no_fetal_movements/>
            <breaking_water/>
            <easily_tired/>
            <face_hand_swelling/>
            <breathlessness/>
            <r_danger_sign_present tag="hidden"/>
            <custom_translations tag="hidden">
              <custom_woman_label_translator/>
              <custom_woman_label/>
              <custom_woman_start_label_translator/>
              <custom_woman_start_label/>
            </custom_translations>
          </danger_signs>
          <data tag="hidden">
            <__visited_hf/>
            <__still_experiencing_danger_sign/>
            <__vaginal_bleeding/>
            <__fits/>
            <__severe_abdominal_pain/>
            <__severe_headache/>
            <__very_pale/>
            <__fever/>
            <__reduced_or_no_fetal_movements/>
            <__breaking_water/>
            <__easily_tired/>
            <__face_hand_swelling/>
            <__breathlessness/>
            <__has_danger_sign/>
            <meta tag="hidden">
              <__patient_uuid/>
              <__patient_id/>
              <__household_uuid/>
              <__source/>
              <__source_id/>
              <__pregnancy_uuid/>
            </meta>
          </data>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </pregnancy_danger_sign_follow_up>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/inputs/source" type="string"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/inputs/source_id" type="string"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/inputs/contact/_id" type="db:person"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/inputs/contact/name" type="string"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/inputs/contact/short_name" type="string"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/inputs/contact/sex" type="string"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/inputs/contact/parent/_id" type="string"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/inputs/contact/parent/parent/contact/chw_name" type="string"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/inputs/contact/parent/parent/contact/phone" type="string"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/patient_age_in_years" type="string" calculate="floor( difference-in-months( ../inputs/contact/date_of_birth, today() ) div 12 )"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/patient_uuid" type="string" calculate="../inputs/contact/_id"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/patient_id" type="string" calculate="../inputs/contact/patient_id"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/patient_name" type="string" calculate="../inputs/contact/name"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/patient_short_name" type="string" calculate="coalesce(../inputs/contact/short_name, ../danger_signs/custom_translations/custom_woman_label)"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/patient_short_name_start" type="string" calculate="coalesce(../inputs/contact/short_name, ../danger_signs/custom_translations/custom_woman_start_label)"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/t_danger_signs_referral_follow_up_date" type="string" calculate="date-time(decimal-date-time(today()) + 3)"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/t_danger_signs_referral_follow_up" type="string" calculate="../danger_signs/r_danger_sign_present"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/pregnancy_uuid_ctx" type="string" calculate="if(instance('contact-summary')/context/pregnancy_uuid != '', instance('contact-summary')/context/pregnancy_uuid, .)"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/congratulate_no_ds_note" readonly="true()" type="string" relevant="../danger_sign_present = 'no'"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/refer_patient_note_1" readonly="true()" type="string" relevant="../danger_sign_present = 'yes'"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/refer_patient_note_2" readonly="true()" type="string" relevant="../danger_sign_present = 'yes'"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/danger_signs_question_note" readonly="true()" type="string" relevant="../danger_sign_present = 'yes'"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding" type="select1" relevant="../danger_sign_present = 'yes'" required="true()"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/fits" type="select1" relevant="../danger_sign_present = 'yes'" required="true()"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain" type="select1" relevant="../danger_sign_present = 'yes'" required="true()"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/severe_headache" type="select1" relevant="../danger_sign_present = 'yes'" required="true()"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/very_pale" type="select1" relevant="../danger_sign_present = 'yes'" required="true()"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/fever" type="select1" relevant="../danger_sign_present = 'yes'" required="true()"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements" type="select1" relevant="../danger_sign_present = 'yes'" required="true()"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/breaking_water" type="select1" relevant="../danger_sign_present = 'yes'" required="true()"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/easily_tired" type="select1" relevant="../danger_sign_present = 'yes'" required="true()"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling" type="select1" relevant="../danger_sign_present = 'yes'" required="true()"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/breathlessness" type="select1" relevant="../danger_sign_present = 'yes'" required="true()"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/r_danger_sign_present" type="string" calculate="if((selected(../vaginal_bleeding, 'yes')
or selected(../fits, 'yes')
or selected(../severe_abdominal_pain, 'yes')
or selected(../severe_headache, 'yes')
or selected(../very_pale, 'yes')
or selected(../fever, 'yes')
or selected(../reduced_or_no_fetal_movements, 'yes')
or selected(../breaking_water, 'yes')
or selected(../easily_tired, 'yes')
or selected(../face_hand_swelling, 'yes')
or selected(../breathlessness, 'yes')), 
'yes', 'no')"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_label_translator" type="select1" calculate="&quot;woman&quot;"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_label" type="string" calculate="jr:choice-name( /pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_label_translator ,' /pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_label_translator ')"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_start_label_translator" type="select1" calculate="&quot;woman-start&quot;"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_start_label" type="string" calculate="jr:choice-name( /pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_start_label_translator ,' /pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_start_label_translator ')"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/__visited_hf" type="string" calculate=" /pregnancy_danger_sign_follow_up/danger_signs/visit_confirm "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/__still_experiencing_danger_sign" type="string" calculate=" /pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/__vaginal_bleeding" type="string" calculate=" /pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/__fits" type="string" calculate=" /pregnancy_danger_sign_follow_up/danger_signs/fits "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/__severe_abdominal_pain" type="string" calculate=" /pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/__severe_headache" type="string" calculate=" /pregnancy_danger_sign_follow_up/danger_signs/severe_headache "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/__very_pale" type="string" calculate=" /pregnancy_danger_sign_follow_up/danger_signs/very_pale "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/__fever" type="string" calculate=" /pregnancy_danger_sign_follow_up/danger_signs/fever "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/__reduced_or_no_fetal_movements" type="string" calculate=" /pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/__breaking_water" type="string" calculate=" /pregnancy_danger_sign_follow_up/danger_signs/breaking_water "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/__easily_tired" type="string" calculate=" /pregnancy_danger_sign_follow_up/danger_signs/easily_tired "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/__face_hand_swelling" type="string" calculate=" /pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/__breathlessness" type="string" calculate=" /pregnancy_danger_sign_follow_up/danger_signs/breathlessness "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/__has_danger_sign" type="string" calculate=" /pregnancy_danger_sign_follow_up/danger_signs/r_danger_sign_present "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/meta/__patient_uuid" type="string" calculate="../../../inputs/contact/_id"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/meta/__patient_id" type="string" calculate="../../../inputs/contact/patient_id"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/meta/__household_uuid" type="string" calculate="../../../inputs/contact/parent/_id"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/meta/__source" type="string" calculate="../../../inputs/source"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/meta/__source_id" type="string" calculate="../../../inputs/source_id"/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/data/meta/__pregnancy_uuid" type="string" calculate=" /pregnancy_danger_sign_follow_up/pregnancy_uuid_ctx "/>
      <bind nodeset="/pregnancy_danger_sign_follow_up/meta/instanceID" type="string" readonly="true()" calculate="concat('uuid:', uuid())"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/pregnancy_danger_sign_follow_up/inputs">
      <group ref="/pregnancy_danger_sign_follow_up/inputs/contact">
        <input appearance="db-object" ref="/pregnancy_danger_sign_follow_up/inputs/contact/_id">
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/inputs/contact/_id:label')"/>
        </input>
        <group ref="/pregnancy_danger_sign_follow_up/inputs/contact/parent">
          <group ref="/pregnancy_danger_sign_follow_up/inputs/contact/parent/parent">
            <group ref="/pregnancy_danger_sign_follow_up/inputs/contact/parent/parent/contact"/>
          </group>
        </group>
      </group>
    </group>
    <group appearance="field-list" ref="/pregnancy_danger_sign_follow_up/danger_signs">
      <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs:label')"/>
      <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <input ref="/pregnancy_danger_sign_follow_up/danger_signs/congratulate_no_ds_note">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/congratulate_no_ds_note:label')"/>
      </input>
      <input ref="/pregnancy_danger_sign_follow_up/danger_signs/refer_patient_note_1">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/refer_patient_note_1:label')"/>
      </input>
      <input ref="/pregnancy_danger_sign_follow_up/danger_signs/refer_patient_note_2">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/refer_patient_note_2:label')"/>
      </input>
      <input ref="/pregnancy_danger_sign_follow_up/danger_signs/danger_signs_question_note">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/danger_signs_question_note:label')"/>
      </input>
      <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/vaginal_bleeding/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/fits">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/fits:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/fits/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/fits/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/severe_abdominal_pain/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/severe_headache">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/severe_headache:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/severe_headache/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/severe_headache/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/very_pale">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/very_pale:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/very_pale/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/very_pale/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/fever">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/fever:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/fever/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/fever/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/reduced_or_no_fetal_movements/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/breaking_water">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/breaking_water:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/breaking_water/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/breaking_water/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/easily_tired">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/easily_tired:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/easily_tired/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/easily_tired/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/face_hand_swelling/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/breathlessness">
        <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/breathlessness:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/breathlessness/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/breathlessness/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <group appearance="hidden" ref="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations">
        <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_label_translator">
          <item>
            <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_label_translator/woman:label')"/>
            <value>woman</value>
          </item>
        </select1>
        <select1 ref="/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_start_label_translator">
          <item>
            <label ref="jr:itext('/pregnancy_danger_sign_follow_up/danger_signs/custom_translations/custom_woman_start_label_translator/woman-start:label')"/>
            <value>woman-start</value>
          </item>
        </select1>
      </group>
    </group>
    <group appearance="hidden" ref="/pregnancy_danger_sign_follow_up/data">
      <group ref="/pregnancy_danger_sign_follow_up/data/meta"/>
    </group>
  </h:body>
</h:html>
`,   
};
