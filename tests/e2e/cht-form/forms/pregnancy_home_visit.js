/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="pregnancy_home_visit">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Pregnancy home visit</h3>
<select id="form-languages" style="display:none;" data-default-lang=""><option value="en">en</option> </select>
  
  
    <section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pregnancy_home_visit/inputs" data-relevant="./source = 'user'"><section class="or-group-data " name="/pregnancy_home_visit/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/inputs/contact/_id:label">What is the patient's name?</span><input type="text" name="/pregnancy_home_visit/inputs/contact/_id" data-type-xml="person"></label><section class="or-group-data " name="/pregnancy_home_visit/inputs/contact/parent"><section class="or-group-data " name="/pregnancy_home_visit/inputs/contact/parent/parent"><section class="or-group-data " name="/pregnancy_home_visit/inputs/contact/parent/parent/contact">
      </section>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group-data " name="/pregnancy_home_visit/context_vars">
      </section>
    <section class="or-group or-appearance-field-list " name="/pregnancy_home_visit/pregnancy_summary"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_summary:label">Pregnancy Summary</span></h4>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_summary/current_weeks_pregnant:label">Current Weeks Pregnant: <strong><span class="or-output" data-value=" /pregnancy_home_visit/context_vars/weeks_since_lmp_rounded_ctx "> </span></strong></span><input type="text" name="/pregnancy_home_visit/pregnancy_summary/current_weeks_pregnant" data-relevant=" /pregnancy_home_visit/context_vars/weeks_since_lmp_rounded_ctx  != 'unknown'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_summary/current_weeks_pregnant_unknown:label">Current Weeks Pregnant: <strong>unknown</strong></span><input type="text" name="/pregnancy_home_visit/pregnancy_summary/current_weeks_pregnant_unknown" data-relevant=" /pregnancy_home_visit/context_vars/weeks_since_lmp_rounded_ctx  = 'unknown'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_summary/current_edd:label">Expected Date of Delivery(EDD): <strong><span class="or-output" data-value=" /pregnancy_home_visit/context_vars/edd_ctx "> </span></strong></span><input type="text" name="/pregnancy_home_visit/pregnancy_summary/current_edd" data-relevant=" /pregnancy_home_visit/context_vars/edd_ctx  != 'unknown'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_summary/current_edd_unknown:label">Expected Date of Delivery(EDD): <strong>unknown</strong></span><input type="text" name="/pregnancy_home_visit/pregnancy_summary/current_edd_unknown" data-relevant=" /pregnancy_home_visit/context_vars/edd_ctx  = 'unknown'" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_summary/visit_option:label">Do you want to start this pregnancy visit?</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy_home_visit/pregnancy_summary/visit_option:hint">Select one.</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/pregnancy_summary/visit_option" data-name="/pregnancy_home_visit/pregnancy_summary/visit_option" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/pregnancy_summary/visit_option/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/pregnancy_summary/visit_option" data-name="/pregnancy_home_visit/pregnancy_summary/visit_option" value="miscarriage" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/pregnancy_summary/visit_option/miscarriage:label">No, Miscarriage</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/pregnancy_summary/visit_option" data-name="/pregnancy_home_visit/pregnancy_summary/visit_option" value="abortion" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/pregnancy_summary/visit_option/abortion:label">No, Abortion</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/pregnancy_summary/visit_option" data-name="/pregnancy_home_visit/pregnancy_summary/visit_option" value="refused" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/pregnancy_summary/visit_option/refused:label">No, Refusing care</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/pregnancy_summary/visit_option" data-name="/pregnancy_home_visit/pregnancy_summary/visit_option" value="migrated" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/pregnancy_summary/visit_option/migrated:label">No, Migrated out of area</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_summary/g_age_correct:label">Is the gestational age above correct?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/pregnancy_summary/g_age_correct" data-name="/pregnancy_home_visit/pregnancy_summary/g_age_correct" value="yes" data-required="true()" data-relevant="selected(../visit_option, 'yes')" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/pregnancy_summary/g_age_correct/yes:label">Yes, it is correct.</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/pregnancy_summary/g_age_correct" data-name="/pregnancy_home_visit/pregnancy_summary/g_age_correct" value="no" data-required="true()" data-relevant="selected(../visit_option, 'yes')" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/pregnancy_summary/g_age_correct/no:label">No, I want to update.</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/pregnancy_home_visit/pregnancy_ended" data-relevant="not(selected(../pregnancy_summary/visit_option, 'yes'))"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_ended:label">Update Pregnancy</span></h4>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/miscarriage_note:label">You have reported the woman has had a miscarriage. If she has not been seen by a care provider, please refer to the health facility.</span><input type="text" name="/pregnancy_home_visit/pregnancy_ended/miscarriage_note" data-relevant="selected(../../pregnancy_summary/visit_option, 'miscarriage')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/miscarriage_date:label">Date of miscarriage</span><span class="required">*</span><input type="date" name="/pregnancy_home_visit/pregnancy_ended/miscarriage_date" data-required="true()" data-constraint=". &lt;= today() and ( /pregnancy_home_visit/lmp_date_8601  = '' or . &gt;=  /pregnancy_home_visit/lmp_date_8601 )" data-relevant="selected(../../pregnancy_summary/visit_option, 'miscarriage')" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/miscarriage_date:jr:constraintMsg">Date cannot be in the future. Date cannot be older than LMP.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/abortion_note:label">You have reported the woman has had an abortion. If she has not been seen by a care provider, please refer to the health facility.</span><input type="text" name="/pregnancy_home_visit/pregnancy_ended/abortion_note" data-relevant="selected(../../pregnancy_summary/visit_option, 'abortion')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/abortion_date:label">Date of abortion</span><span class="required">*</span><input type="date" name="/pregnancy_home_visit/pregnancy_ended/abortion_date" data-required="true()" data-constraint=". &lt;= today() and ( /pregnancy_home_visit/lmp_date_8601  = '' or . &gt;=  /pregnancy_home_visit/lmp_date_8601 )" data-relevant="selected(../../pregnancy_summary/visit_option, 'abortion')" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/abortion_date:jr:constraintMsg">Date cannot be in the future. Date cannot be older than LMP.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/refusing_note:label">You have reported the woman has refused care.</span><input type="text" name="/pregnancy_home_visit/pregnancy_ended/refusing_note" data-relevant="selected(../../pregnancy_summary/visit_option, 'refused')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/migrated_note:label">You have reported the woman has moved out of the area.</span><input type="text" name="/pregnancy_home_visit/pregnancy_ended/migrated_note" data-relevant="selected(../../pregnancy_summary/visit_option, 'migrated')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/end_pregnancy_note:label">Submitting this form will end the pregnancy. You will not receive any additional tasks.</span><input type="text" name="/pregnancy_home_visit/pregnancy_ended/end_pregnancy_note" data-relevant="selected(../../pregnancy_summary/visit_option, 'miscarriage') or selected(../../pregnancy_summary/visit_option, 'abortion')" data-type-xml="string" readonly></label><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/clear_option:label">What would you like to do?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/pregnancy_ended/clear_option" data-name="/pregnancy_home_visit/pregnancy_ended/clear_option" value="clear_this" data-required="true()" data-relevant="selected(../../pregnancy_summary/visit_option, 'refused') or selected(../../pregnancy_summary/visit_option, 'migrated')" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/clear_option/clear_this:label">Clear task for this visit only. Continue to receive tasks for this pregnancy.</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/pregnancy_ended/clear_option" data-name="/pregnancy_home_visit/pregnancy_ended/clear_option" value="clear_all" data-required="true()" data-relevant="selected(../../pregnancy_summary/visit_option, 'refused') or selected(../../pregnancy_summary/visit_option, 'migrated')" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/clear_option/clear_all:label">Do not receive any more tasks about this pregnancy.</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/cear_note:label">You can still submit pregnancy visits from the profile until the EDD is reached.</span><input type="text" name="/pregnancy_home_visit/pregnancy_ended/cear_note" data-relevant="selected(../../pregnancy_summary/visit_option, 'refused') or selected(../../pregnancy_summary/visit_option, 'migrated')" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/submit_note:label">Click Submit to confirm.</span><input type="text" name="/pregnancy_home_visit/pregnancy_ended/submit_note" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/pregnancy_ended/back_note:label">Click "&lt; Prev" to go back.</span><input type="text" name="/pregnancy_home_visit/pregnancy_ended/back_note" data-type-xml="string" readonly></label>
      </section>
    <section class="or-group or-branch pre-init " name="/pregnancy_home_visit/update_g_age" data-relevant="selected(../pregnancy_summary/visit_option, 'yes') and selected(../pregnancy_summary/g_age_correct, 'no')"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/update_g_age:label">Update Pregnancy</span></h4>
<section class="or-group-data or-appearance-field-list " name="/pregnancy_home_visit/update_g_age/update_method"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_method/g_age_update_method:label">How would you like to update gestational age?</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy_home_visit/update_g_age/update_method/g_age_update_method:hint">Select one.</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/update_g_age/update_method/g_age_update_method" data-name="/pregnancy_home_visit/update_g_age/update_method/g_age_update_method" value="method_weeks" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_method/g_age_update_method/method_weeks:label">Current weeks pregnant</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/update_g_age/update_method/g_age_update_method" data-name="/pregnancy_home_visit/update_g_age/update_method/g_age_update_method" value="method_edd" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_method/g_age_update_method/method_edd:label">Expected date of delivery</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_method/lmp_weeks_new:label">Please enter the new current weeks pregnant.</span><span class="required">*</span><input type="number" name="/pregnancy_home_visit/update_g_age/update_method/lmp_weeks_new" data-required="true()" data-constraint=". &gt;= 4 and . &lt;= 40" data-relevant="selected(../g_age_update_method, 'method_weeks')" data-type-xml="int"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy_home_visit/update_g_age/update_method/lmp_weeks_new:jr:constraintMsg">Must be between 4 and 40.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_method/u_edd_new:label">Please enter the new EDD.</span><span class="required">*</span><input type="date" name="/pregnancy_home_visit/update_g_age/update_method/u_edd_new" data-required="true()" data-constraint=". &gt;= today() and . &lt;= date-time(decimal-date-time(today()) + (9 * 30))" data-relevant="selected(../g_age_update_method, 'method_edd')" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy_home_visit/update_g_age/update_method/u_edd_new:jr:constraintMsg">Date cannot be in the past. Date cannot be more than 9 months in the future.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section><section class="or-group-data or-appearance-field-list " name="/pregnancy_home_visit/update_g_age/update_summary"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_summary/update_check_note:label"><strong>Please confirm the new information and then click Next.</strong></span><input type="text" name="/pregnancy_home_visit/update_g_age/update_summary/update_check_note" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_summary/previous_info:label"><strong>Previous</strong></span><input type="text" name="/pregnancy_home_visit/update_g_age/update_summary/previous_info" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_summary/previous_g_age:label"><span class="or-output" data-value=" /pregnancy_home_visit/context_vars/weeks_since_lmp_rounded_ctx "> </span> weeks pregnant</span><input type="text" name="/pregnancy_home_visit/update_g_age/update_summary/previous_g_age" data-relevant=" /pregnancy_home_visit/context_vars/weeks_since_lmp_rounded_ctx  != 'unknown'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_summary/previous_g_age_unknown:label">Unknown weeks pregnant</span><input type="text" name="/pregnancy_home_visit/update_g_age/update_summary/previous_g_age_unknown" data-relevant=" /pregnancy_home_visit/context_vars/weeks_since_lmp_rounded_ctx  = 'unknown'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_summary/previous_edd:label">EDD: <span class="or-output" data-value=" /pregnancy_home_visit/context_vars/edd_ctx "> </span></span><input type="text" name="/pregnancy_home_visit/update_g_age/update_summary/previous_edd" data-relevant=" /pregnancy_home_visit/context_vars/edd_ctx  != 'unknown'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_summary/previous_edd_unknown:label">EDD: unknown</span><input type="text" name="/pregnancy_home_visit/update_g_age/update_summary/previous_edd_unknown" data-relevant=" /pregnancy_home_visit/context_vars/edd_ctx  = 'unknown'" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_summary/new_info:label"><strong>New</strong></span><input type="text" name="/pregnancy_home_visit/update_g_age/update_summary/new_info" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_summary/new_g_age:label"><span class="or-output" data-value=" /pregnancy_home_visit/weeks_since_lmp_rounded "> </span> weeks pregnant</span><input type="text" name="/pregnancy_home_visit/update_g_age/update_summary/new_g_age" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_summary/new_edd:label">EDD: <span class="or-output" data-value=" /pregnancy_home_visit/update_g_age/edd_new "> </span></span><input type="text" name="/pregnancy_home_visit/update_g_age/update_summary/new_edd" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/update_g_age/update_summary/edd_check_note:label">If this seems incorrect, click "&lt; Prev" to update the pregnancy information.</span><input type="text" name="/pregnancy_home_visit/update_g_age/update_summary/edd_check_note" data-type-xml="string" readonly></label>
      </section>
      </section>
    <section class="or-group-data or-branch pre-init " name="/pregnancy_home_visit/anc_visits_hf" data-relevant="selected(../pregnancy_summary/visit_option, 'yes') and ../lmp_date_8601 != ''"><section class="or-group or-appearance-field-list " name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past:label">ANC Visits at Health Facility (Past)</span></h4>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended:label">Did the woman complete the health facility ANC visit scheduled for <span class="or-output" data-value=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/pregnancy_follow_up_date_recent "> </span>?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended" data-name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended" value="yes" data-required="true()" data-relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/pregnancy_follow_up_date_recent  != ''" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended" data-name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended" value="no" data-required="true()" data-relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/pregnancy_follow_up_date_recent  != ''" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits:label">Would you like to report any additional unreported health facility ANC visits?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits" data-name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits" data-name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count:label">How many?</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count:hint">Enter 0 if she has not been yet.</span><input type="number" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count" data-required="true()" data-constraint=".&gt;= 0 and . &lt;= 9" data-relevant="selected(../report_other_visits, 'yes')" data-type-xml="int"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count:jr:constraintMsg">Must be an integer between 0 and 9.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single:label">Please enter the date if you know it.</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single" data-name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single" value="no" data-required="true()" data-relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count  = 1" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single/no:label">I don't know</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single" data-name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single" value="yes" data-required="true()" data-relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count  = 1" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single/yes:label">Enter date</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_single:label">Date</span><span class="required">*</span><input type="date" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_single" data-required="true()" data-constraint=". &lt;= today() and . &gt;=  /pregnancy_home_visit/lmp_date_8601 " data-relevant="selected(../visited_date_ask_single, 'yes')" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_single:jr:constraintMsg">Enter the correct date. Date must be within this pregnancy and cannot be in the future!</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_multiple_note:label">Please enter the dates if you have them.</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_multiple_note" data-relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_multiple_note_section:label">Each "Visit" section below asks about one individual visit. Please complete all sections.</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_multiple_note_section" data-relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1" data-type-xml="string" readonly></label><section class="or-group or-branch pre-init " name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates" data-relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1"><h4></h4>
<section class="or-repeat " name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates"><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple:label">Visit</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple" data-name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple" value="no" data-required="true()" data-relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple/no:label">I don't know</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple" data-name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple" value="yes" data-required="true()" data-relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple/yes:label">Enter date</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date:label">Date</span><span class="required">*</span><input type="date" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date" data-required="true()" data-constraint=". &lt;= today() and . &gt;=  /pregnancy_home_visit/lmp_date_8601 " data-relevant="selected(../visited_date_ask_multiple, 'yes')" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date:jr:constraintMsg">Enter the correct date. Date must be within this pregnancy and cannot be in the future!</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section><div class="or-repeat-info" data-name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates" data-repeat-count=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_count "></div>
      </section>
      </section><section class="or-group or-appearance-field-list or-appearance-summary " name="/pregnancy_home_visit/anc_visits_hf/risk_factors"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors:label">Risk Factors</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_risk_factors_note:label">You previously reported the following risk factors:</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_risk_factors_note" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/no_previous_risks_note:label">None</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/no_previous_risks_note" data-relevant="../../../context_vars/risk_factors_ctx = ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/first_pregnancy_note:label">First pregnancy</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/first_pregnancy_note" data-relevant="contains(../../../context_vars/risk_factors_ctx, 'first_pregnancy')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_miscarriage_note:label">Previous miscarriages or stillbirths</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_miscarriage_note" data-relevant="contains(../../../context_vars/risk_factors_ctx, 'previous_miscarriage')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_difficulties_note:label">Previous difficulties in childbirth</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_difficulties_note" data-relevant="contains(../../../context_vars/risk_factors_ctx, 'previous_difficulties')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/more_than_4_children_note:label">Has delivered four or more children</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/more_than_4_children_note" data-relevant="contains(../../../context_vars/risk_factors_ctx, 'more_than_4_children')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/last_baby_born_less_than_1_year_ago_note:label">Last baby born less than one year ago</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/last_baby_born_less_than_1_year_ago_note" data-relevant="contains(../../../context_vars/risk_factors_ctx, 'last_baby_born_less_than_1_year_ago')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/heart_condition_note:label">Heart condition</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/heart_condition_note" data-relevant="contains(../../../context_vars/risk_factors_ctx, 'heart_condition')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/asthma_note:label">Asthma</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/asthma_note" data-relevant="contains(../../../context_vars/risk_factors_ctx, 'asthma')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/high_blood_pressure_note:label">High blood pressure</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/high_blood_pressure_note" data-relevant="contains(../../../context_vars/risk_factors_ctx, 'high_blood_pressure')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/diabetes_note:label">Diabetes</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/diabetes_note" data-relevant="contains(../../../context_vars/risk_factors_ctx, 'diabetes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/extra_risk_note:label"> <span class="or-output" data-value=" /pregnancy_home_visit/context_vars/risk_factor_extra_ctx "> </span></span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/extra_risk_note" data-relevant="../../../context_vars/risk_factor_extra_ctx != ''" data-type-xml="string" readonly></label><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks:label">Does <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> have additional risk factors that you have not previously reported?</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks:hint">Select all that apply.</span>
          </legend>
<div class="option-wrapper">
<label class="itemset-template" data-items-path="instance('risk_conditions')/root/item[not(contains( /pregnancy_home_visit/context_vars/risk_factors_ctx , name)) or name = 'none']"><input type="checkbox" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-relevant="not(contains(../../../context_vars/risk_factors_ctx, 'heart_condition') and contains(../../../context_vars/risk_factors_ctx, 'asthma') and contains(../../../context_vars/risk_factors_ctx, 'high_blood_pressure') and contains(../../../context_vars/risk_factors_ctx, 'diabetes'))" data-type-xml="select" value=""></label><span class="itemset-labels" data-value-ref="name" data-label-type="itext" data-label-ref="itextId"><span lang="en" class="option-label active" data-itext-id="static_instance-risk_conditions-0">Heart condition</span><span lang="en" class="option-label active" data-itext-id="static_instance-risk_conditions-1">Asthma</span><span lang="en" class="option-label active" data-itext-id="static_instance-risk_conditions-2">High blood pressure</span><span lang="en" class="option-label active" data-itext-id="static_instance-risk_conditions-3">Diabetes</span><span lang="en" class="option-label active" data-itext-id="static_instance-risk_conditions-4">None of the above</span>
      </span>
</div>
</fieldset>
<span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks:jr:constraintMsg">If "None of the above" selected, cannot select any other option.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check:label">Are there additional factors that could make this pregnancy high-risk?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check" data-name="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check" data-name="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk:label">If yes, please describe.</span><span class="required">*</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk" data-required="true()" data-constraint="string-length(.) &lt;= 100" data-relevant="selected(../additional_risk_check, 'yes')" data-type-xml="string"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk:jr:constraintMsg">max characters = 100</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section><section class="or-group " name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next:label">ANC Visits at Health Facility (Upcoming)</span></h4>
<section class="or-group-data or-appearance-field-list " name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known:label">If <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> has a specific upcoming ANC appointment date, enter it here. You will receive a task three days before to remind her to attend.</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known" data-name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known/no:label">I don't know</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known" data-name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known/yes:label">Enter date</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span class="required">*</span><input type="date" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date" data-required="true()" data-constraint="(. &gt;= today()) and (decimal-date-time(.) &lt;= decimal-date-time(today() + 30))" data-relevant="selected(../appointment_date_known, 'yes')" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date:jr:constraintMsg">Date cannot be in the past. Date cannot be more than one month from today.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section><section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note" data-relevant="selected(../anc_next_visit_date/appointment_date_known, 'no')"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/who_recommends_note:label">The WHO recommends ANC visits at 12, 20, 26, 30, 34, 36, 38, 40 weeks.</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/who_recommends_note" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/prenancy_age_note:label"><span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name_start "> </span> is <strong><span class="or-output" data-value=" /pregnancy_home_visit/weeks_since_lmp_rounded "> </span> weeks</strong> pregnant.</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/prenancy_age_note" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/refer_note:label">Please refer <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> to the health facility at the appropriate time.</span><input type="text" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/refer_note" data-type-xml="string" readonly></label>
      </section>
      </section>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/pregnancy_home_visit/danger_signs" data-relevant="selected(../pregnancy_summary/visit_option, 'yes')"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs:label">Danger Sign Check</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/danger_signs_note:label">Ask <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> to monitor these danger signs throughout the pregnancy.</span><input type="text" name="/pregnancy_home_visit/danger_signs/danger_signs_note" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/danger_signs_question_note:label">Does <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> currently have any of these danger signs?</span><input type="text" name="/pregnancy_home_visit/danger_signs/danger_signs_question_note" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/vaginal_bleeding:label">Vaginal bleeding</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/vaginal_bleeding" data-name="/pregnancy_home_visit/danger_signs/vaginal_bleeding" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/vaginal_bleeding/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/vaginal_bleeding" data-name="/pregnancy_home_visit/danger_signs/vaginal_bleeding" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/vaginal_bleeding/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/fits:label">Fits</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/fits" data-name="/pregnancy_home_visit/danger_signs/fits" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/fits/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/fits" data-name="/pregnancy_home_visit/danger_signs/fits" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/fits/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/severe_abdominal_pain:label">Severe abdominal pain</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/severe_abdominal_pain" data-name="/pregnancy_home_visit/danger_signs/severe_abdominal_pain" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/severe_abdominal_pain/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/severe_abdominal_pain" data-name="/pregnancy_home_visit/danger_signs/severe_abdominal_pain" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/severe_abdominal_pain/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/severe_headache:label">Severe headache</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/severe_headache" data-name="/pregnancy_home_visit/danger_signs/severe_headache" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/severe_headache/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/severe_headache" data-name="/pregnancy_home_visit/danger_signs/severe_headache" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/severe_headache/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/very_pale:label">Very pale</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/very_pale" data-name="/pregnancy_home_visit/danger_signs/very_pale" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/very_pale/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/very_pale" data-name="/pregnancy_home_visit/danger_signs/very_pale" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/very_pale/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/fever:label">Fever</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/fever" data-name="/pregnancy_home_visit/danger_signs/fever" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/fever/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/fever" data-name="/pregnancy_home_visit/danger_signs/fever" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/fever/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements:label">Reduced or no fetal movements</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements" data-name="/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements" data-name="/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/breaking_water:label">Breaking of water</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/breaking_water" data-name="/pregnancy_home_visit/danger_signs/breaking_water" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/breaking_water/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/breaking_water" data-name="/pregnancy_home_visit/danger_signs/breaking_water" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/breaking_water/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/easily_tired:label">Getting tired easily</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/easily_tired" data-name="/pregnancy_home_visit/danger_signs/easily_tired" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/easily_tired/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/easily_tired" data-name="/pregnancy_home_visit/danger_signs/easily_tired" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/easily_tired/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/face_hand_swelling:label">Swelling of face and hands</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/face_hand_swelling" data-name="/pregnancy_home_visit/danger_signs/face_hand_swelling" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/face_hand_swelling/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/face_hand_swelling" data-name="/pregnancy_home_visit/danger_signs/face_hand_swelling" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/face_hand_swelling/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/breathlessness:label">Breathlessness</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/breathlessness" data-name="/pregnancy_home_visit/danger_signs/breathlessness" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/breathlessness/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/danger_signs/breathlessness" data-name="/pregnancy_home_visit/danger_signs/breathlessness" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/danger_signs/breathlessness/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/congratulate_no_ds_note:label">Great news! Please closely monitor her until her next scheduled pregnancy visit.</span><input type="text" name="/pregnancy_home_visit/danger_signs/congratulate_no_ds_note" data-relevant="../r_danger_sign_present = 'no'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/refer_patient_note_1:label"><span style="color:red">Please refer to the health facility immediately. Accompany her if possible.</span></span><input type="text" name="/pregnancy_home_visit/danger_signs/refer_patient_note_1" data-relevant="../r_danger_sign_present = 'yes'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/danger_signs/refer_patient_note_2:label"><span style="color:red">Please complete the follow-up task within 3 days.</span></span><input type="text" name="/pregnancy_home_visit/danger_signs/refer_patient_note_2" data-relevant="../r_danger_sign_present = 'yes'" data-type-xml="string" readonly></label>
      </section>
    <section class="or-group or-branch pre-init " name="/pregnancy_home_visit/safe_pregnancy_practices" data-relevant="selected(../pregnancy_summary/visit_option, 'yes')"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices:label">Safe Pregnancy Practices</span></h4>
<section class="or-group-data or-appearance-field-list " name="/pregnancy_home_visit/safe_pregnancy_practices/malaria"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use:label">Does <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> use a long-lasting insecticidal net (LLIN)?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use" data-name="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use" data-name="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_advice_note:label">Sleeping under a LLIN <strong>EVERY night</strong> prevents malaria.</span><input type="text" name="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_advice_note" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/malaria/malaria_prophylaxis_note:label">Get malaria prophylaxis in second trimester if living in malaria endemic area.</span><input type="text" name="/pregnancy_home_visit/safe_pregnancy_practices/malaria/malaria_prophylaxis_note" data-type-xml="string" readonly></label>
      </section><section class="or-group-data or-appearance-field-list " name="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily:label">Is <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> taking iron folate daily?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily" data-name="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily" data-name="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_note:label">Iron folate aids in the development of child's brain and spinal cord. It also prevents premature birth, sepsis, anemia and low birth weight.</span><input type="text" name="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_note" data-type-xml="string" readonly></label>
      </section><section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pregnancy_home_visit/safe_pregnancy_practices/deworming" data-relevant=" /pregnancy_home_visit/weeks_since_lmp  &gt; 12 and ../../context_vars/deworming_med_received_ctx != 'yes'"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med:label">Has <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> received deworming medication?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med" data-name="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med" data-name="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med_note:label">Worms can affect the nutritional status of <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> and baby.</span><input type="text" name="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med_note" data-type-xml="string" readonly></label>
      </section><section class="or-group-data or-branch pre-init " name="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips" data-relevant="../../lmp_date_8601 != ''"><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/eat_more_note:label">Eat more often than usual and a balanced diet to give you strength and help the baby grow.</span><input type="text" name="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/eat_more_note" data-relevant=" /pregnancy_home_visit/weeks_since_lmp  &lt;= 24" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/talk_softly_note:label">Talk softly to the unborn baby. The baby can hear you and will be able to recognize voices.</span><input type="text" name="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/talk_softly_note" data-relevant=" /pregnancy_home_visit/weeks_since_lmp  &gt;= 25 and  /pregnancy_home_visit/weeks_since_lmp  &lt;= 30" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/respond_move_note:label">Respond to the baby's movements-kicks by gentle touching or massaging your tummy.</span><input type="text" name="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/respond_move_note" data-relevant=" /pregnancy_home_visit/weeks_since_lmp  &gt;= 25 and  /pregnancy_home_visit/weeks_since_lmp  &lt;= 30" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/deliver_hf_note:label">It's safest to deliver in a health facility. Discuss a birth plan with <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span>.</span><input type="text" name="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/deliver_hf_note" data-relevant=" /pregnancy_home_visit/weeks_since_lmp  &gt;= 31" data-type-xml="string" readonly></label>
      </section><section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status" data-relevant="../../context_vars/hiv_tested_ctx != 'yes'"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested:label">Has <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> been tested for HIV in the past 3 months?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested" data-name="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested" data-name="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_importance_note:label">Frequent testing ensures that <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> receives medicine to prevent transmission of HIV to the baby.</span><input type="text" name="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_importance_note" data-type-xml="string" readonly></label>
      </section><section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pregnancy_home_visit/safe_pregnancy_practices/tetanus" data-relevant="../../context_vars/tt_received_ctx != 'yes' and (selected(../../anc_visits_hf/anc_visits_hf_past/last_visit_attended, 'yes') or selected(../../anc_visits_hf/anc_visits_hf_past/report_other_visits, 'yes'))"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received:label">Has <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> received any Tetanus Toxoid (TT) immunizations during this pregnancy?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received" data-name="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received" data-name="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_note_1:label">Immunizing with at least two doses of tetanus toxoid before or during pregnancy protects the newborn for the first few weeks of life and protects the mother.</span><input type="text" name="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_note_1" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_note_2:label">Women can receive up to two TT vaccines per pregnancy. After five TT vaccines, they are vaccinated for life.</span><input type="text" name="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_note_2" data-type-xml="string" readonly></label>
      </section>
      </section>
    <section class="or-group-data or-branch pre-init or-appearance-field-list or-appearance-summary " name="/pregnancy_home_visit/summary" data-relevant="selected(../pregnancy_summary/visit_option, 'yes')"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_submit_note:label"><h4 style="text-align:center;">Click the Submit button at the bottom of the form.</h4></span><input type="text" name="/pregnancy_home_visit/summary/r_submit_note" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-yellow "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_summary_details:label">Patient<i class="fa fa-user"></i></span><input type="text" name="/pregnancy_home_visit/summary/r_summary_details" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_patient_details:label"><h2 style="text-align:center;margin-bottom:0px;"><span class="or-output" data-value=" /pregnancy_home_visit/patient_name "> </span></h2> <p style="text-align:center;"><span class="or-output" data-value=" /pregnancy_home_visit/patient_age_in_years "> </span> years old</p></span><input type="text" name="/pregnancy_home_visit/summary/r_patient_details" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-blue "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_summary:label">Summary<I class="fa fa-user"></i></span><input type="text" name="/pregnancy_home_visit/summary/r_summary" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_pregnancy_details:label"><p><span class="or-output" data-value=" /pregnancy_home_visit/weeks_since_lmp_rounded "> </span> weeks pregnant.</p> <p> EDD: <span class="or-output" data-value=" /pregnancy_home_visit/summary/edd_summary "> </span></p></span><input type="text" name="/pregnancy_home_visit/summary/r_pregnancy_details" data-relevant="../../lmp_date_8601 != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_pregnancy_details_unknown:label">Unknown weeks pregnant.</span><input type="text" name="/pregnancy_home_visit/summary/r_pregnancy_details_unknown" data-relevant="../../lmp_date_8601 = ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h3 or-appearance-blue or-appearance-center or-appearance-underline "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_risk_factors:label">New Risk Factors</span><input type="text" name="/pregnancy_home_visit/summary/r_risk_factors" data-relevant="../../anc_visits_hf/risk_factors/r_risk_factor_present = 'yes'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_risk_heart_condition:label">Heart condition</span><input type="text" name="/pregnancy_home_visit/summary/r_risk_heart_condition" data-relevant="selected(../../anc_visits_hf/risk_factors/new_risks, 'heart_condition')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_risk_asthma:label">Asthma</span><input type="text" name="/pregnancy_home_visit/summary/r_risk_asthma" data-relevant="selected(../../anc_visits_hf/risk_factors/new_risks, 'asthma')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_risk_high_blood_pressure:label">High blood pressure</span><input type="text" name="/pregnancy_home_visit/summary/r_risk_high_blood_pressure" data-relevant="selected(../../anc_visits_hf/risk_factors/new_risks, 'high_blood_pressure')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_risk_diabetes:label">Diabetes</span><input type="text" name="/pregnancy_home_visit/summary/r_risk_diabetes" data-relevant="selected(../../anc_visits_hf/risk_factors/new_risks, 'diabetes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_risk_additional:label"> <span class="or-output" data-value=" /pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk "> </span></span><input type="text" name="/pregnancy_home_visit/summary/r_risk_additional" data-relevant="selected(../../anc_visits_hf/risk_factors/additional_risk_check, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h3 or-appearance-blue or-appearance-center or-appearance-underline "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_danger_signs:label">New Danger Signs</span><input type="text" name="/pregnancy_home_visit/summary/r_danger_signs" data-relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_danger_sign_vaginal_bleeding:label">Vaginal bleeding</span><input type="text" name="/pregnancy_home_visit/summary/r_danger_sign_vaginal_bleeding" data-relevant="selected(../../danger_signs/vaginal_bleeding, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_danger_sign_fits:label">Fits</span><input type="text" name="/pregnancy_home_visit/summary/r_danger_sign_fits" data-relevant="selected(../../danger_signs/fits, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_danger_sign_severe_abdominal_pain:label">Severe abdominal pain</span><input type="text" name="/pregnancy_home_visit/summary/r_danger_sign_severe_abdominal_pain" data-relevant="selected(../../danger_signs/severe_abdominal_pain, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_danger_sign_severe_headache:label">Severe headache</span><input type="text" name="/pregnancy_home_visit/summary/r_danger_sign_severe_headache" data-relevant="selected(../../danger_signs/severe_headache, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_danger_sign_very_pale:label">Very pale</span><input type="text" name="/pregnancy_home_visit/summary/r_danger_sign_very_pale" data-relevant="selected(../../danger_signs/very_pale, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_danger_sign_fever:label">Fever</span><input type="text" name="/pregnancy_home_visit/summary/r_danger_sign_fever" data-relevant="selected(../../danger_signs/fever, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_danger_sign_reduced_or_no_fetal_movements:label">Reduced or no fetal movements</span><input type="text" name="/pregnancy_home_visit/summary/r_danger_sign_reduced_or_no_fetal_movements" data-relevant="selected(../../danger_signs/reduced_or_no_fetal_movements, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_danger_sign_breaking_water:label">Breaking of water</span><input type="text" name="/pregnancy_home_visit/summary/r_danger_sign_breaking_water" data-relevant="selected(../../danger_signs/breaking_water, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_danger_sign_easily_tired:label">Getting tired easily</span><input type="text" name="/pregnancy_home_visit/summary/r_danger_sign_easily_tired" data-relevant="selected(../../danger_signs/easily_tired, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_danger_sign_face_hand_swelling:label">Swelling of face and hands</span><input type="text" name="/pregnancy_home_visit/summary/r_danger_sign_face_hand_swelling" data-relevant="selected(../../danger_signs/face_hand_swelling, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_danger_sign_breathlessness:label">Breathlessness</span><input type="text" name="/pregnancy_home_visit/summary/r_danger_sign_breathlessness" data-relevant="selected(../../danger_signs/breathlessness, 'yes')" data-type-xml="string" readonly></label><label class="question non-select "><input type="text" name="/pregnancy_home_visit/summary/r_space_1" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-lime "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_referrals:label">Referrals<I class="fa fa-hospital-o"></i></span><input type="text" name="/pregnancy_home_visit/summary/r_referrals" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_refer_clinic_immediately:label">Refer to clinic immediately for:</span><input type="text" name="/pregnancy_home_visit/summary/r_refer_clinic_immediately" data-relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_refer_danger_sign:label">Danger Sign</span><input type="text" name="/pregnancy_home_visit/summary/r_refer_danger_sign" data-relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_routine_anc:label">Please attend ANC on: <span class="or-output" data-value=" /pregnancy_home_visit/summary/next_appointment_date "> </span></span><input type="text" name="/pregnancy_home_visit/summary/r_routine_anc" data-relevant="selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_request_services:label">Request the following services:</span><input type="text" name="/pregnancy_home_visit/summary/r_request_services" data-relevant="selected(../../safe_pregnancy_practices/tetanus/tt_imm_received, 'no') or selected(../../safe_pregnancy_practices/hiv_status/hiv_tested, 'no') or selected(../../safe_pregnancy_practices/deworming/deworming_med, 'no') or selected(../../safe_pregnancy_practices/iron_folate/iron_folate_daily, 'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_request_service_tt:label">TT</span><input type="text" name="/pregnancy_home_visit/summary/r_request_service_tt" data-relevant="selected(../../safe_pregnancy_practices/tetanus/tt_imm_received, 'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_request_service_hiv_test:label">HIV test</span><input type="text" name="/pregnancy_home_visit/summary/r_request_service_hiv_test" data-relevant="selected(../../safe_pregnancy_practices/hiv_status/hiv_tested, 'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_request_service_deworming:label">Deworming</span><input type="text" name="/pregnancy_home_visit/summary/r_request_service_deworming" data-relevant="selected(../../safe_pregnancy_practices/deworming/deworming_med, 'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_request_service_iron:label">Iron folate</span><input type="text" name="/pregnancy_home_visit/summary/r_request_service_iron" data-relevant="selected(../../safe_pregnancy_practices/iron_folate/iron_folate_daily, 'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_who_recommends:label">The WHO recommends routine ANC visits at 12, 20, 26, 30, 34, 36, 38, 40 weeks.</span><input type="text" name="/pregnancy_home_visit/summary/r_who_recommends" data-relevant="../../lmp_date_8601 = '' or selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_refer_hf_appropriate_time:label">Please refer <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> to the health facility at the appropriate time.</span><input type="text" name="/pregnancy_home_visit/summary/r_refer_hf_appropriate_time" data-relevant="selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_refer_hf_immediately:label">Please refer <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> to the health facility immediately to receive the EDD and appropriate care.</span><input type="text" name="/pregnancy_home_visit/summary/r_refer_hf_immediately" data-relevant="../../lmp_date_8601 = ''" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-green "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_follow_up_tasks:label">Follow-up Tasks<I class="fa fa-flag"></i></span><input type="text" name="/pregnancy_home_visit/summary/r_follow_up_tasks" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_following_tasks:label">The following tasks will appear:</span><input type="text" name="/pregnancy_home_visit/summary/r_following_tasks" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_fup_danger_sign:label">Please conduct a danger sign follow-up in 3 days.</span><input type="text" name="/pregnancy_home_visit/summary/r_fup_danger_sign" data-relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_fup_hf_visit:label">Make sure <span class="or-output" data-value=" /pregnancy_home_visit/patient_short_name "> </span> attends her clinic visit on <span class="or-output" data-value=" /pregnancy_home_visit/summary/next_appointment_date "> </span>. Please remind her three days before.</span><input type="text" name="/pregnancy_home_visit/summary/r_fup_hf_visit" data-relevant="selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_fup_pregnancy_visit:label">Please conduct the next pregnancy home visit in <span class="or-output" data-value=" /pregnancy_home_visit/summary/next_visit_weeks "> </span> week(s).</span><input type="text" name="/pregnancy_home_visit/summary/r_fup_pregnancy_visit" data-relevant="../../lmp_date_8601 != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_home_visit/summary/r_fup_pregnancy_visit_2_weeks:label">Please conduct the next pregnancy home visit in 2 weeks.</span><input type="text" name="/pregnancy_home_visit/summary/r_fup_pregnancy_visit_2_weeks" data-relevant="../../lmp_date_8601 = ''" data-type-xml="string" readonly></label><section class="or-group-data or-appearance-hidden " name="/pregnancy_home_visit/summary/custom_translations"><fieldset class="question simple-select "><fieldset>
<legend>
          </legend>
<div class="option-wrapper"><label class=""><input type="radio" name="/pregnancy_home_visit/summary/custom_translations/custom_woman_label_translator" data-name="/pregnancy_home_visit/summary/custom_translations/custom_woman_label_translator" value="woman" data-calculate='"woman"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/summary/custom_translations/custom_woman_label_translator/woman:label">the woman</span></label></div>
</fieldset></fieldset>
<fieldset class="question simple-select "><fieldset>
<legend>
          </legend>
<div class="option-wrapper"><label class=""><input type="radio" name="/pregnancy_home_visit/summary/custom_translations/custom_woman_start_label_translator" data-name="/pregnancy_home_visit/summary/custom_translations/custom_woman_start_label_translator" value="woman-start" data-calculate='"woman-start"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_home_visit/summary/custom_translations/custom_woman_start_label_translator/woman-start:label">The woman</span></label></div>
</fieldset></fieldset>
      </section>
      </section>
    <section class="or-group-data or-appearance-hidden " name="/pregnancy_home_visit/data"><section class="or-group-data " name="/pregnancy_home_visit/data/meta">
      </section>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/patient_age_in_years" data-calculate="floor( difference-in-months( ../inputs/contact/date_of_birth, today() ) div 12 )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/patient_short_name" data-calculate="coalesce(../inputs/contact/short_name, ../summary/custom_translations/custom_woman_label)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/patient_short_name_start" data-calculate="coalesce(../inputs/contact/short_name, ../summary/custom_translations/custom_woman_start_label)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/lmp_date_8601" data-calculate="if(selected(../pregnancy_summary/g_age_correct, 'no'), ../update_g_age/lmp_date_8601_new, ../context_vars/lmp_date_8601_ctx)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/edd_8601" data-calculate="if(selected(../pregnancy_summary/g_age_correct, 'no'), ../update_g_age/edd_8601_new, format-date-time(date-time(decimal-date-time(../context_vars/lmp_date_8601_ctx + 280)), &quot;%Y-%m-%d&quot;))" data-type-xml="string"></label><label class="or-branch pre-init calculation non-select "><input type="hidden" name="/pregnancy_home_visit/days_since_lmp" data-relevant="../lmp_date_8601 != ''" data-calculate="floor(decimal-date-time(today()) - decimal-date-time(../lmp_date_8601))" data-type-xml="string"></label><label class="or-branch pre-init calculation non-select "><input type="hidden" name="/pregnancy_home_visit/weeks_since_lmp" data-relevant="../lmp_date_8601 != ''" data-calculate="round(../days_since_lmp div 7, 2)" data-type-xml="string"></label><label class="or-branch pre-init calculation non-select "><input type="hidden" name="/pregnancy_home_visit/weeks_since_lmp_rounded" data-relevant="../lmp_date_8601 != ''" data-calculate="floor(../days_since_lmp div 7)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/lmp_method_approx" data-calculate="if(selected(../update_g_age/update_method/g_age_update_method, 'method_weeks'), 'yes', 'no')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/lmp_updated" data-calculate="if(selected(../pregnancy_summary/g_age_correct, 'no') and (decimal-date-time(../lmp_date_8601) - decimal-date-time(../context_vars/lmp_date_8601_ctx) != 0), 'yes', 'no')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/t_pregnancy_follow_up_date" data-calculate="../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/t_pregnancy_follow_up" data-calculate="../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/t_danger_signs_referral_follow_up_date" data-calculate="date-time(decimal-date-time(today()) + 3)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/t_danger_signs_referral_follow_up" data-calculate="../danger_signs/r_danger_sign_present" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/hiv_status_known" data-calculate="if(../context_vars/hiv_tested_ctx = 'yes', 'yes', ../safe_pregnancy_practices/hiv_status/hiv_tested)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/tt_received" data-calculate="if(../context_vars/tt_received_ctx = 'yes', 'yes', ../safe_pregnancy_practices/tetanus/tt_imm_received)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/deworming_med_received" data-calculate="if(../context_vars/deworming_med_received_ctx = 'yes', 'yes', ../safe_pregnancy_practices/deworming/deworming_med)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/context_vars/lmp_date_8601_ctx" data-calculate="if(instance('contact-summary')/context/lmp_date_8601 != '', instance('contact-summary')/context/lmp_date_8601, .)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/context_vars/lmp_method_approx_ctx" data-calculate="if(instance('contact-summary')/context/lmp_method_approx != '', instance('contact-summary')/context/lmp_method_approx, .)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/context_vars/pregnancy_follow_up_date_recent_ctx" data-calculate="if(instance('contact-summary')/context/pregnancy_follow_up_date_recent != 0, instance('contact-summary')/context/pregnancy_follow_up_date_recent, .)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/context_vars/risk_factors_ctx" data-calculate="if(instance('contact-summary')/context/risk_factor_codes != '', instance('contact-summary')/context/risk_factor_codes, .)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/context_vars/risk_factor_extra_ctx" data-calculate="if(instance('contact-summary')/context/risk_factor_extra != '', instance('contact-summary')/context/risk_factor_extra, .)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/context_vars/hiv_tested_ctx" data-calculate="if(instance('contact-summary')/context/hiv_tested_past != '', instance('contact-summary')/context/hiv_tested_past, .)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/context_vars/tt_received_ctx" data-calculate="if(instance('contact-summary')/context/tt_received_past != '', instance('contact-summary')/context/tt_received_past , .)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/context_vars/deworming_med_received_ctx" data-calculate="if(instance('contact-summary')/context/deworming_med_received_past != '', instance('contact-summary')/context/deworming_med_received_past , .)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/context_vars/edd_ctx" data-calculate="if(../lmp_date_8601_ctx = '', 'unknown', format-date-time(date-time(decimal-date-time(../lmp_date_8601_ctx) + 280), &quot;%e %b, %Y&quot;))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/context_vars/weeks_since_lmp_rounded_ctx" data-calculate="if(../lmp_date_8601_ctx = '', 'unknown', floor((decimal-date-time(today()) - decimal-date-time(../lmp_date_8601_ctx)) div 7))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/context_vars/pregnancy_uuid_ctx" data-calculate="if(instance('contact-summary')/context/pregnancy_uuid != '', instance('contact-summary')/context/pregnancy_uuid, .)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/update_g_age/lmp_date_8601_new" data-calculate="format-date-time( if(selected(../update_method/g_age_update_method, 'method_weeks'), date-time(decimal-date-time(today()) - (../update_method/lmp_weeks_new * 7)),  if(selected(../update_method/g_age_update_method, 'method_edd'), date-time(decimal-date-time(../update_method/u_edd_new) - 280), 0) ), &quot;%Y-%m-%d&quot;)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/update_g_age/lmp_date_new" data-calculate='format-date-time(../lmp_date_8601_new, "%e %b, %Y")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/update_g_age/edd_8601_new" data-calculate='format-date-time(date-time(decimal-date-time(../lmp_date_8601_new)+280),"%Y-%m-%d")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/update_g_age/edd_new" data-calculate='format-date-time(../edd_8601_new, "%e %b, %Y")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/pregnancy_follow_up_date_recent" data-calculate='format-date-time(../../../context_vars/pregnancy_follow_up_date_recent_ctx, "%e %b, %Y")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_count" data-calculate=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/anc_visits_hf/risk_factors/r_risk_factor_present" data-calculate="if(selected(../new_risks, 'heart_condition') or selected(../new_risks, 'asthma') or selected(../new_risks, 'high_blood_pressure') or selected(../new_risks, 'diabetes') or selected(../additional_risk_check, 'yes') , 'yes', 'no')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/danger_signs/r_danger_sign_present" data-calculate="if(selected(../vaginal_bleeding, 'yes') or selected(../fits, 'yes') or selected(../severe_abdominal_pain, 'yes') or selected(../severe_headache, 'yes') or selected(../very_pale, 'yes') or selected(../fever, 'yes') or selected(../reduced_or_no_fetal_movements, 'yes') or selected(../breaking_water, 'yes') or selected(../easily_tired, 'yes') or selected(../face_hand_swelling, 'yes') or selected(../breathlessness, 'yes'),  'yes', if(selected(../vaginal_bleeding, 'no') and selected(../fits, 'no') and selected(../severe_abdominal_pain, 'no') and selected(../severe_headache, 'no') and selected(../very_pale, 'no') and selected(../fever, 'no') and selected(../reduced_or_no_fetal_movements, 'no') and selected(../breaking_water, 'no') and selected(../easily_tired, 'no') and selected(../face_hand_swelling, 'no') and selected(../breathlessness, 'no'), 'no', ''))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/safe_pregnancy_practices/safe_pregnancy_practices" data-calculate="if((selected(../tetanus/tt_imm_received, 'no') or selected(../hiv_status/hiv_tested, 'no') or selected(../deworming/deworming_med, 'no') or selected(../iron_folate/iron_folate_daily, 'no')), 'yes', 'no')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/summary/next_visit_weeks" data-calculate="round((if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 12*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 12*7, if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 20*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 20*7, if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 26*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 26*7, if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 30*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 30*7, if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 34*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 34*7, if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 36*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 36*7, if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 38*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 38*7, if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 40*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 40*7, 0 )))))))) - decimal-date-time(today())) div 7, 0)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/summary/edd_summary" data-calculate='format-date-time( /pregnancy_home_visit/edd_8601 , "%e %b, %Y")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/summary/next_appointment_date" data-calculate='format-date-time( /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date , "%e %b, %Y")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/summary/custom_translations/custom_woman_label" data-calculate="jr:choice-name( /pregnancy_home_visit/summary/custom_translations/custom_woman_label_translator ,' /pregnancy_home_visit/summary/custom_translations/custom_woman_label_translator ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/summary/custom_translations/custom_woman_start_label" data-calculate="jr:choice-name( /pregnancy_home_visit/summary/custom_translations/custom_woman_start_label_translator ,' /pregnancy_home_visit/summary/custom_translations/custom_woman_start_label_translator ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__activity_to_report" data-calculate="if ( /pregnancy_home_visit/pregnancy_summary/visit_option  = 'yes', 'home_visit',  /pregnancy_home_visit/pregnancy_summary/visit_option )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__gestational_age_correct" data-calculate=" /pregnancy_home_visit/pregnancy_summary/g_age_correct " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__miscarriage_date" data-calculate=" /pregnancy_home_visit/pregnancy_ended/miscarriage_date " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__abortion_date" data-calculate=" /pregnancy_home_visit/pregnancy_ended/abortion_date " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__visit_task_clear_option" data-calculate=" /pregnancy_home_visit/pregnancy_ended/clear_option " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__gestational_age_update_method" data-calculate=" /pregnancy_home_visit/update_g_age/update_method/g_age_update_method " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__gestational_age_update_weeks" data-calculate=" /pregnancy_home_visit/update_g_age/update_method/lmp_weeks_new " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__gestational_age_update_edd" data-calculate=" /pregnancy_home_visit/update_g_age/update_method/u_edd_new " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__lmp_updated" data-calculate=" /pregnancy_home_visit/lmp_updated " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__lmp_date_new" data-calculate=" /pregnancy_home_visit/update_g_age/lmp_date_8601_new " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__edd_new" data-calculate=" /pregnancy_home_visit/update_g_age/edd_8601_new " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__last_visit_attended" data-calculate=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__report_additional_anc_hf_visits" data-calculate=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__num_additional_anc_hf_visits" data-calculate=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__additional_anc_hf_visit_dates" data-calculate="coalesce( /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_single , join(',',  /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date ), NULL)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__has_risk_factors_not_previously_reported" data-calculate="if (selected( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks , 'none'), 'no', if( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks  = '', '', 'yes'))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__heart_condition" data-calculate="if(selected( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks , 'heart_condition'),'yes',if( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks  = '', '','no'))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__asthma" data-calculate="if(selected( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks , 'asthma'),'yes',if( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks  = '', '','no'))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__high_blood_pressure" data-calculate="if(selected( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks , 'high_blood_pressure'),'yes',if( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks  = '', '','no'))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__diabetes" data-calculate="if(selected( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks , 'diabetes'),'yes',if( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks  = '', '','no'))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__additional_high_risk_condition_to_report" data-calculate=" /pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__additional_high_risk_condition" data-calculate=" /pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__next_anc_hf_visit_date_known" data-calculate=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__next_anc_hf_visit_date" data-calculate=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__vaginal_bleeding" data-calculate=" /pregnancy_home_visit/danger_signs/vaginal_bleeding " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__fits" data-calculate=" /pregnancy_home_visit/danger_signs/fits " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__severe_abdominal_pain" data-calculate=" /pregnancy_home_visit/danger_signs/severe_abdominal_pain " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__severe_headache" data-calculate=" /pregnancy_home_visit/danger_signs/severe_headache " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__very_pale" data-calculate=" /pregnancy_home_visit/danger_signs/very_pale " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__fever" data-calculate=" /pregnancy_home_visit/danger_signs/fever " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__reduced_or_no_fetal_movements" data-calculate=" /pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__breaking_water" data-calculate=" /pregnancy_home_visit/danger_signs/breaking_water " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__easily_tired" data-calculate=" /pregnancy_home_visit/danger_signs/easily_tired " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__face_hand_swelling" data-calculate=" /pregnancy_home_visit/danger_signs/face_hand_swelling " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__breathlessness" data-calculate=" /pregnancy_home_visit/danger_signs/breathlessness " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__has_danger_sign" data-calculate=" /pregnancy_home_visit/danger_signs/r_danger_sign_present " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__uses_llin" data-calculate=" /pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__takes_iron_folate_daily" data-calculate=" /pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__received_deworming_meds" data-calculate=" /pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__tested_for_hiv_in_past_3_months" data-calculate=" /pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/__received_tetanus_toxoid_this_pregnancy" data-calculate=" /pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/meta/__patient_uuid" data-calculate="../../../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/meta/__patient_id" data-calculate="../../../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/meta/__household_uuid" data-calculate="../../../inputs/contact/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/meta/__source" data-calculate="../../../inputs/source" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/meta/__source_id" data-calculate="../../../inputs/source_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/data/meta/__pregnancy_uuid" data-calculate=" /pregnancy_home_visit/context_vars/pregnancy_uuid_ctx " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_home_visit/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <pregnancy_home_visit xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" id="pregnancy_home_visit" prefix="J1!pregnancy_home_visit!" delimiter="#" version="2022-09-26 11:35:11">
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
          <lmp_date_8601 tag="hidden"/>
          <edd_8601 tag="hidden"/>
          <days_since_lmp tag="hidden"/>
          <weeks_since_lmp tag="hidden"/>
          <weeks_since_lmp_rounded tag="hidden"/>
          <lmp_method_approx tag="hidden"/>
          <lmp_updated tag="hidden"/>
          <t_pregnancy_follow_up_date tag="hidden"/>
          <t_pregnancy_follow_up tag="hidden"/>
          <t_danger_signs_referral_follow_up_date tag="hidden"/>
          <t_danger_signs_referral_follow_up tag="hidden"/>
          <hiv_status_known tag="hidden"/>
          <tt_received tag="hidden"/>
          <deworming_med_received tag="hidden"/>
          <context_vars tag="hidden">
            <lmp_date_8601_ctx/>
            <lmp_method_approx_ctx/>
            <pregnancy_follow_up_date_recent_ctx/>
            <risk_factors_ctx/>
            <risk_factor_extra_ctx/>
            <hiv_tested_ctx/>
            <tt_received_ctx/>
            <deworming_med_received_ctx/>
            <edd_ctx/>
            <weeks_since_lmp_rounded_ctx/>
            <pregnancy_uuid_ctx/>
          </context_vars>
          <pregnancy_summary>
            <current_weeks_pregnant tag="hidden"/>
            <current_weeks_pregnant_unknown tag="hidden"/>
            <current_edd tag="hidden"/>
            <current_edd_unknown tag="hidden"/>
            <visit_option/>
            <g_age_correct/>
          </pregnancy_summary>
          <pregnancy_ended>
            <miscarriage_note tag="hidden"/>
            <miscarriage_date/>
            <abortion_note tag="hidden"/>
            <abortion_date tag="hidden"/>
            <refusing_note tag="hidden"/>
            <migrated_note tag="hidden"/>
            <end_pregnancy_note tag="hidden"/>
            <clear_option/>
            <cear_note tag="hidden"/>
            <submit_note tag="hidden"/>
            <back_note tag="hidden"/>
          </pregnancy_ended>
          <update_g_age>
            <update_method>
              <g_age_update_method/>
              <lmp_weeks_new/>
              <u_edd_new/>
            </update_method>
            <update_summary tag="hidden">
              <update_check_note/>
              <previous_info/>
              <previous_g_age/>
              <previous_g_age_unknown/>
              <previous_edd/>
              <previous_edd_unknown/>
              <new_info/>
              <new_g_age/>
              <new_edd/>
              <edd_check_note/>
            </update_summary>
            <lmp_date_8601_new tag="hidden"/>
            <lmp_date_new tag="hidden"/>
            <edd_8601_new tag="hidden"/>
            <edd_new tag="hidden"/>
          </update_g_age>
          <anc_visits_hf>
            <anc_visits_hf_past>
              <pregnancy_follow_up_date_recent/>
              <last_visit_attended/>
              <report_other_visits/>
              <visited_hf_count/>
              <visited_date_ask_single/>
              <visited_date_single/>
              <visited_dates_multiple_note tag="hidden"/>
              <visited_dates_multiple_note_section tag="hidden"/>
              <visited_dates_count/>
              <visited_dates jr:template="">
                <visited_date_ask_multiple/>
                <visited_date/>
              </visited_dates>
            </anc_visits_hf_past>
            <risk_factors>
              <previous_risk_factors_note tag="hidden"/>
              <no_previous_risks_note tag="hidden"/>
              <first_pregnancy_note tag="hidden"/>
              <previous_miscarriage_note tag="hidden"/>
              <previous_difficulties_note tag="hidden"/>
              <more_than_4_children_note tag="hidden"/>
              <last_baby_born_less_than_1_year_ago_note tag="hidden"/>
              <heart_condition_note tag="hidden"/>
              <asthma_note tag="hidden"/>
              <high_blood_pressure_note tag="hidden"/>
              <diabetes_note tag="hidden"/>
              <extra_risk_note tag="hidden"/>
              <new_risks/>
              <additional_risk_check/>
              <additional_risk/>
              <r_risk_factor_present/>
            </risk_factors>
            <anc_visits_hf_next>
              <anc_next_visit_date>
                <appointment_date_known/>
                <appointment_date/>
              </anc_next_visit_date>
              <anc_visit_advice_note tag="hidden">
                <who_recommends_note/>
                <prenancy_age_note/>
                <refer_note/>
              </anc_visit_advice_note>
            </anc_visits_hf_next>
          </anc_visits_hf>
          <danger_signs>
            <danger_signs_note tag="hidden"/>
            <danger_signs_question_note/>
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
            <congratulate_no_ds_note tag="hidden"/>
            <refer_patient_note_1 tag="hidden"/>
            <refer_patient_note_2 tag="hidden"/>
          </danger_signs>
          <safe_pregnancy_practices>
            <malaria>
              <llin_use/>
              <llin_advice_note tag="hidden"/>
              <malaria_prophylaxis_note tag="hidden"/>
            </malaria>
            <iron_folate>
              <iron_folate_daily/>
              <iron_folate_note tag="hidden"/>
            </iron_folate>
            <deworming>
              <deworming_med/>
              <deworming_med_note tag="hidden"/>
            </deworming>
            <safe_practices_tips tag="hidden">
              <eat_more_note/>
              <talk_softly_note/>
              <respond_move_note/>
              <deliver_hf_note/>
            </safe_practices_tips>
            <hiv_status>
              <hiv_tested/>
              <hiv_importance_note tag="hidden"/>
            </hiv_status>
            <tetanus>
              <tt_imm_received/>
              <tt_note_1 tag="hidden"/>
              <tt_note_2 tag="hidden"/>
            </tetanus>
            <safe_pregnancy_practices/>
          </safe_pregnancy_practices>
          <summary tag="hidden">
            <r_submit_note/>
            <r_summary_details/>
            <r_patient_details/>
            <r_summary/>
            <r_pregnancy_details/>
            <r_pregnancy_details_unknown/>
            <r_risk_factors/>
            <r_risk_heart_condition/>
            <r_risk_asthma/>
            <r_risk_high_blood_pressure/>
            <r_risk_diabetes/>
            <r_risk_additional/>
            <r_danger_signs/>
            <r_danger_sign_vaginal_bleeding/>
            <r_danger_sign_fits/>
            <r_danger_sign_severe_abdominal_pain/>
            <r_danger_sign_severe_headache/>
            <r_danger_sign_very_pale/>
            <r_danger_sign_fever/>
            <r_danger_sign_reduced_or_no_fetal_movements/>
            <r_danger_sign_breaking_water/>
            <r_danger_sign_easily_tired/>
            <r_danger_sign_face_hand_swelling/>
            <r_danger_sign_breathlessness/>
            <r_space_1/>
            <r_referrals/>
            <r_refer_clinic_immediately/>
            <r_refer_danger_sign/>
            <r_routine_anc/>
            <r_request_services/>
            <r_request_service_tt/>
            <r_request_service_hiv_test/>
            <r_request_service_deworming/>
            <r_request_service_iron/>
            <r_who_recommends/>
            <r_refer_hf_appropriate_time/>
            <r_refer_hf_immediately/>
            <r_follow_up_tasks/>
            <r_following_tasks/>
            <r_fup_danger_sign/>
            <r_fup_hf_visit/>
            <r_fup_pregnancy_visit/>
            <r_fup_pregnancy_visit_2_weeks/>
            <next_visit_weeks/>
            <edd_summary/>
            <next_appointment_date/>
            <custom_translations tag="hidden">
              <custom_woman_label_translator/>
              <custom_woman_label/>
              <custom_woman_start_label_translator/>
              <custom_woman_start_label/>
            </custom_translations>
          </summary>
          <data tag="hidden">
            <__activity_to_report/>
            <__gestational_age_correct/>
            <__miscarriage_date/>
            <__abortion_date/>
            <__visit_task_clear_option/>
            <__gestational_age_update_method/>
            <__gestational_age_update_weeks/>
            <__gestational_age_update_edd/>
            <__lmp_updated/>
            <__lmp_date_new/>
            <__edd_new/>
            <__last_visit_attended/>
            <__report_additional_anc_hf_visits/>
            <__num_additional_anc_hf_visits/>
            <__additional_anc_hf_visit_dates/>
            <__has_risk_factors_not_previously_reported/>
            <__heart_condition/>
            <__asthma/>
            <__high_blood_pressure/>
            <__diabetes/>
            <__additional_high_risk_condition_to_report/>
            <__additional_high_risk_condition/>
            <__next_anc_hf_visit_date_known/>
            <__next_anc_hf_visit_date/>
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
            <__uses_llin/>
            <__takes_iron_folate_daily/>
            <__received_deworming_meds/>
            <__tested_for_hiv_in_past_3_months/>
            <__received_tetanus_toxoid_this_pregnancy/>
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
        </pregnancy_home_visit>
      </instance>
    <instance id="contact-summary"/>
    <instance id="yes_no">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-yes_no-0</itextId>
            <name>yes</name>
          </item>
          <item>
            <itextId>static_instance-yes_no-1</itextId>
            <name>no</name>
          </item>
        </root>
      </instance>
    <instance id="visit_options">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-visit_options-0</itextId>
            <name>yes</name>
          </item>
          <item>
            <itextId>static_instance-visit_options-1</itextId>
            <name>miscarriage</name>
          </item>
          <item>
            <itextId>static_instance-visit_options-2</itextId>
            <name>abortion</name>
          </item>
          <item>
            <itextId>static_instance-visit_options-3</itextId>
            <name>refused</name>
          </item>
          <item>
            <itextId>static_instance-visit_options-4</itextId>
            <name>migrated</name>
          </item>
        </root>
      </instance>
    <instance id="age_correct_yes_no">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-age_correct_yes_no-0</itextId>
            <name>yes</name>
          </item>
          <item>
            <itextId>static_instance-age_correct_yes_no-1</itextId>
            <name>no</name>
          </item>
        </root>
      </instance>
    <instance id="clear_options">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-clear_options-0</itextId>
            <name>clear_this</name>
          </item>
          <item>
            <itextId>static_instance-clear_options-1</itextId>
            <name>clear_all</name>
          </item>
        </root>
      </instance>
    <instance id="g_age_update_methods">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-g_age_update_methods-0</itextId>
            <name>method_weeks</name>
          </item>
          <item>
            <itextId>static_instance-g_age_update_methods-1</itextId>
            <name>method_edd</name>
          </item>
        </root>
      </instance>
    <instance id="lmp_approximations">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-lmp_approximations-0</itextId>
            <name>approx_weeks</name>
          </item>
          <item>
            <itextId>static_instance-lmp_approximations-1</itextId>
            <name>approx_months</name>
          </item>
        </root>
      </instance>
    <instance id="no_info_pregnancy_reasons">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-no_info_pregnancy_reasons-0</itextId>
            <name>visibly_pregnant</name>
          </item>
          <item>
            <itextId>static_instance-no_info_pregnancy_reasons-1</itextId>
            <name>test_positive</name>
          </item>
          <item>
            <itextId>static_instance-no_info_pregnancy_reasons-2</itextId>
            <name>missed_periods</name>
          </item>
        </root>
      </instance>
    <instance id="knows_date">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-knows_date-0</itextId>
            <name>no</name>
          </item>
          <item>
            <itextId>static_instance-knows_date-1</itextId>
            <name>yes</name>
          </item>
        </root>
      </instance>
    <instance id="risk_conditions">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-risk_conditions-0</itextId>
            <name>heart_condition</name>
          </item>
          <item>
            <itextId>static_instance-risk_conditions-1</itextId>
            <name>asthma</name>
          </item>
          <item>
            <itextId>static_instance-risk_conditions-2</itextId>
            <name>high_blood_pressure</name>
          </item>
          <item>
            <itextId>static_instance-risk_conditions-3</itextId>
            <name>diabetes</name>
          </item>
          <item>
            <itextId>static_instance-risk_conditions-4</itextId>
            <name>none</name>
          </item>
        </root>
      </instance>
    <instance id="translate_woman_label">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-translate_woman_label-0</itextId>
            <name>woman</name>
          </item>
        </root>
      </instance>
    <instance id="translate_woman_start_label">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-translate_woman_start_label-0</itextId>
            <name>woman-start</name>
          </item>
        </root>
      </instance>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
  <h:head>
    <h:title>Pregnancy home visit</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date:jr:constraintMsg">
            <value>Date cannot be in the past. Date cannot be more than one month from today.</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known/no:label">
            <value>I don't know</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known/yes:label">
            <value>Enter date</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known:label">
            <value>If <output value=" /pregnancy_home_visit/patient_short_name "/> has a specific upcoming ANC appointment date, enter it here. You will receive a task three days before to remind her to attend.</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/prenancy_age_note:label">
            <value><output value=" /pregnancy_home_visit/patient_short_name_start "/> is **<output value=" /pregnancy_home_visit/weeks_since_lmp_rounded "/> weeks** pregnant.</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/refer_note:label">
            <value>Please refer <output value=" /pregnancy_home_visit/patient_short_name "/> to the health facility at the appropriate time.</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/who_recommends_note:label">
            <value>The WHO recommends ANC visits at 12, 20, 26, 30, 34, 36, 38, 40 weeks.</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next:label">
            <value>ANC Visits at Health Facility (Upcoming)</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended:label">
            <value>Did the woman complete the health facility ANC visit scheduled for <output value=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/pregnancy_follow_up_date_recent "/>?</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits:label">
            <value>Would you like to report any additional unreported health facility ANC visits?</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single/no:label">
            <value>I don't know</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single/yes:label">
            <value>Enter date</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single:label">
            <value>Please enter the date if you know it.</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_single:jr:constraintMsg">
            <value>Enter the correct date. Date must be within this pregnancy and cannot be in the future!</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_single:label">
            <value>Date</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date:jr:constraintMsg">
            <value>Enter the correct date. Date must be within this pregnancy and cannot be in the future!</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date:label">
            <value>Date</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple/no:label">
            <value>I don't know</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple/yes:label">
            <value>Enter date</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple:label">
            <value>Visit</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_multiple_note:label">
            <value>Please enter the dates if you have them.</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_multiple_note_section:label">
            <value>Each "Visit" section below asks about one individual visit. Please complete all sections.</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count:hint">
            <value>Enter 0 if she has not been yet.</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count:jr:constraintMsg">
            <value>Must be an integer between 0 and 9.</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count:label">
            <value>How many?</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past:label">
            <value>ANC Visits at Health Facility (Past)</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk:jr:constraintMsg">
            <value>max characters = 100</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk:label">
            <value>If yes, please describe.</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check:label">
            <value>Are there additional factors that could make this pregnancy high-risk?</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/asthma_note:label">
            <value>Asthma</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/diabetes_note:label">
            <value>Diabetes</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/extra_risk_note:label">
            <value><output value=" /pregnancy_home_visit/context_vars/risk_factor_extra_ctx "/></value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/first_pregnancy_note:label">
            <value>First pregnancy</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/heart_condition_note:label">
            <value>Heart condition</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/high_blood_pressure_note:label">
            <value>High blood pressure</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/last_baby_born_less_than_1_year_ago_note:label">
            <value>Last baby born less than one year ago</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/more_than_4_children_note:label">
            <value>Has delivered four or more children</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks:hint">
            <value>Select all that apply.</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks:jr:constraintMsg">
            <value>If "None of the above" selected, cannot select any other option.</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks:label">
            <value>Does <output value=" /pregnancy_home_visit/patient_short_name "/> have additional risk factors that you have not previously reported?</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/no_previous_risks_note:label">
            <value>None</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_difficulties_note:label">
            <value>Previous difficulties in childbirth</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_miscarriage_note:label">
            <value>Previous miscarriages or stillbirths</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_risk_factors_note:label">
            <value>You previously reported the following risk factors:</value>
          </text>
          <text id="/pregnancy_home_visit/anc_visits_hf/risk_factors:label">
            <value>Risk Factors</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/breaking_water/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/breaking_water/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/breaking_water:label">
            <value>Breaking of water</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/breathlessness/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/breathlessness/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/breathlessness:label">
            <value>Breathlessness</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/congratulate_no_ds_note:label">
            <value>Great news! Please closely monitor her until her next scheduled pregnancy visit.</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/danger_signs_note:label">
            <value>Ask <output value=" /pregnancy_home_visit/patient_short_name "/> to monitor these danger signs throughout the pregnancy.</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/danger_signs_question_note:label">
            <value>Does <output value=" /pregnancy_home_visit/patient_short_name "/> currently have any of these danger signs?</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/easily_tired/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/easily_tired/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/easily_tired:label">
            <value>Getting tired easily</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/face_hand_swelling/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/face_hand_swelling/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/face_hand_swelling:label">
            <value>Swelling of face and hands</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/fever/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/fever/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/fever:label">
            <value>Fever</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/fits/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/fits/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/fits:label">
            <value>Fits</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements:label">
            <value>Reduced or no fetal movements</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/refer_patient_note_1:label">
            <value>&lt;span style="color:red"&gt;Please refer to the health facility immediately. Accompany her if possible.&lt;/span&gt;</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/refer_patient_note_2:label">
            <value>&lt;span style="color:red"&gt;Please complete the follow-up task within 3 days.&lt;/span&gt;</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/severe_abdominal_pain/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/severe_abdominal_pain/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/severe_abdominal_pain:label">
            <value>Severe abdominal pain</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/severe_headache/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/severe_headache/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/severe_headache:label">
            <value>Severe headache</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/vaginal_bleeding/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/vaginal_bleeding/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/vaginal_bleeding:label">
            <value>Vaginal bleeding</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/very_pale/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/very_pale/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs/very_pale:label">
            <value>Very pale</value>
          </text>
          <text id="/pregnancy_home_visit/danger_signs:label">
            <value>Danger Sign Check</value>
          </text>
          <text id="/pregnancy_home_visit/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/pregnancy_home_visit/inputs/contact/date_of_birth:label">
            <value>Date of Birth</value>
          </text>
          <text id="/pregnancy_home_visit/inputs/contact/name:label">
            <value>Name</value>
          </text>
          <text id="/pregnancy_home_visit/inputs/contact/parent/_id:label">
            <value>Parent ID</value>
          </text>
          <text id="/pregnancy_home_visit/inputs/contact/parent/parent/contact/chw_name:label">
            <value>CHW name</value>
          </text>
          <text id="/pregnancy_home_visit/inputs/contact/parent/parent/contact/phone:label">
            <value>CHW phone</value>
          </text>
          <text id="/pregnancy_home_visit/inputs/contact/patient_id:label">
            <value>Patient ID</value>
          </text>
          <text id="/pregnancy_home_visit/inputs/contact/sex:label">
            <value>Sex</value>
          </text>
          <text id="/pregnancy_home_visit/inputs/contact/short_name:label">
            <value>Short Name</value>
          </text>
          <text id="/pregnancy_home_visit/inputs/source:label">
            <value>Source</value>
          </text>
          <text id="/pregnancy_home_visit/inputs/source_id:label">
            <value>Source ID</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/abortion_date:jr:constraintMsg">
            <value>Date cannot be in the future. Date cannot be older than LMP.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/abortion_date:label">
            <value>Date of abortion</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/abortion_note:label">
            <value>You have reported the woman has had an abortion. If she has not been seen by a care provider, please refer to the health facility.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/back_note:label">
            <value>Click "&lt; Prev" to go back.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/cear_note:label">
            <value>You can still submit pregnancy visits from the profile until the EDD is reached.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/clear_option/clear_all:label">
            <value>Do not receive any more tasks about this pregnancy.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/clear_option/clear_this:label">
            <value>Clear task for this visit only. Continue to receive tasks for this pregnancy.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/clear_option:label">
            <value>What would you like to do?</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/end_pregnancy_note:label">
            <value>Submitting this form will end the pregnancy. You will not receive any additional tasks.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/migrated_note:label">
            <value>You have reported the woman has moved out of the area.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/miscarriage_date:jr:constraintMsg">
            <value>Date cannot be in the future. Date cannot be older than LMP.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/miscarriage_date:label">
            <value>Date of miscarriage</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/miscarriage_note:label">
            <value>You have reported the woman has had a miscarriage. If she has not been seen by a care provider, please refer to the health facility.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/refusing_note:label">
            <value>You have reported the woman has refused care.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended/submit_note:label">
            <value>Click Submit to confirm.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_ended:label">
            <value>Update Pregnancy</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary/current_edd:label">
            <value>Expected Date of Delivery(EDD): **<output value=" /pregnancy_home_visit/context_vars/edd_ctx "/>**</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary/current_edd_unknown:label">
            <value>Expected Date of Delivery(EDD): **unknown**</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary/current_weeks_pregnant:label">
            <value>Current Weeks Pregnant: **<output value=" /pregnancy_home_visit/context_vars/weeks_since_lmp_rounded_ctx "/>**</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary/current_weeks_pregnant_unknown:label">
            <value>Current Weeks Pregnant: **unknown**</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary/g_age_correct/no:label">
            <value>No, I want to update.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary/g_age_correct/yes:label">
            <value>Yes, it is correct.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary/g_age_correct:label">
            <value>Is the gestational age above correct?</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary/visit_option/abortion:label">
            <value>No, Abortion</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary/visit_option/migrated:label">
            <value>No, Migrated out of area</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary/visit_option/miscarriage:label">
            <value>No, Miscarriage</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary/visit_option/refused:label">
            <value>No, Refusing care</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary/visit_option/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary/visit_option:hint">
            <value>Select one.</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary/visit_option:label">
            <value>Do you want to start this pregnancy visit?</value>
          </text>
          <text id="/pregnancy_home_visit/pregnancy_summary:label">
            <value>Pregnancy Summary</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med:label">
            <value>Has <output value=" /pregnancy_home_visit/patient_short_name "/> received deworming medication?</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med_note:label">
            <value>Worms can affect the nutritional status of <output value=" /pregnancy_home_visit/patient_short_name "/> and baby.</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_importance_note:label">
            <value>Frequent testing ensures that <output value=" /pregnancy_home_visit/patient_short_name "/> receives medicine to prevent transmission of HIV to the baby.</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested:label">
            <value>Has <output value=" /pregnancy_home_visit/patient_short_name "/> been tested for HIV in the past 3 months?</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily:label">
            <value>Is <output value=" /pregnancy_home_visit/patient_short_name "/> taking iron folate daily?</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_note:label">
            <value>Iron folate aids in the development of child's brain and spinal cord. It also prevents premature birth, sepsis, anemia and low birth weight.</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_advice_note:label">
            <value>Sleeping under a LLIN **EVERY night** prevents malaria.</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use:label">
            <value>Does <output value=" /pregnancy_home_visit/patient_short_name "/> use a long-lasting insecticidal net (LLIN)?</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/malaria/malaria_prophylaxis_note:label">
            <value>Get malaria prophylaxis in second trimester if living in malaria endemic area.</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/deliver_hf_note:label">
            <value>It's safest to deliver in a health facility. Discuss a birth plan with <output value=" /pregnancy_home_visit/patient_short_name "/>.</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/eat_more_note:label">
            <value>Eat more often than usual and a balanced diet to give you strength and help the baby grow.</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/respond_move_note:label">
            <value>Respond to the baby's movements-kicks by gentle touching or massaging your tummy.</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/talk_softly_note:label">
            <value>Talk softly to the unborn baby. The baby can hear you and will be able to recognize voices.</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received:label">
            <value>Has <output value=" /pregnancy_home_visit/patient_short_name "/> received any Tetanus Toxoid (TT) immunizations during this pregnancy?</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_note_1:label">
            <value>Immunizing with at least two doses of tetanus toxoid before or during pregnancy protects the newborn for the first few weeks of life and protects the mother.</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_note_2:label">
            <value>Women can receive up to two TT vaccines per pregnancy. After five TT vaccines, they are vaccinated for life.</value>
          </text>
          <text id="/pregnancy_home_visit/safe_pregnancy_practices:label">
            <value>Safe Pregnancy Practices</value>
          </text>
          <text id="/pregnancy_home_visit/summary/custom_translations/custom_woman_label_translator/woman:label">
            <value>the woman</value>
          </text>
          <text id="/pregnancy_home_visit/summary/custom_translations/custom_woman_start_label_translator/woman-start:label">
            <value>The woman</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_danger_sign_breaking_water:label">
            <value>Breaking of water</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_danger_sign_breathlessness:label">
            <value>Breathlessness</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_danger_sign_easily_tired:label">
            <value>Getting tired easily</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_danger_sign_face_hand_swelling:label">
            <value>Swelling of face and hands</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_danger_sign_fever:label">
            <value>Fever</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_danger_sign_fits:label">
            <value>Fits</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_danger_sign_reduced_or_no_fetal_movements:label">
            <value>Reduced or no fetal movements</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_danger_sign_severe_abdominal_pain:label">
            <value>Severe abdominal pain</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_danger_sign_severe_headache:label">
            <value>Severe headache</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_danger_sign_vaginal_bleeding:label">
            <value>Vaginal bleeding</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_danger_sign_very_pale:label">
            <value>Very pale</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_danger_signs:label">
            <value>New Danger Signs</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_follow_up_tasks:label">
            <value>Follow-up Tasks&lt;I class="fa fa-flag"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_following_tasks:label">
            <value>The following tasks will appear:</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_fup_danger_sign:label">
            <value>Please conduct a danger sign follow-up in 3 days.</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_fup_hf_visit:label">
            <value>Make sure <output value=" /pregnancy_home_visit/patient_short_name "/> attends her clinic visit on <output value=" /pregnancy_home_visit/summary/next_appointment_date "/>. Please remind her three days before.</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_fup_pregnancy_visit:label">
            <value>Please conduct the next pregnancy home visit in <output value=" /pregnancy_home_visit/summary/next_visit_weeks "/> week(s).</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_fup_pregnancy_visit_2_weeks:label">
            <value>Please conduct the next pregnancy home visit in 2 weeks.</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_patient_details:label">
            <value>&lt;h2 style=&quot;text-align:center;margin-bottom:0px;&quot;&gt;<output value=" /pregnancy_home_visit/patient_name "/>&lt;/h2&gt; &lt;p style=&quot;text-align:center;&quot;&gt;<output value=" /pregnancy_home_visit/patient_age_in_years "/> years old&lt;/p&gt;</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_pregnancy_details:label">
            <value>&lt;p&gt;<output value=" /pregnancy_home_visit/weeks_since_lmp_rounded "/> weeks pregnant.&lt;/p&gt; &lt;p&gt; EDD: <output value=" /pregnancy_home_visit/summary/edd_summary "/>&lt;/p&gt;</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_pregnancy_details_unknown:label">
            <value>Unknown weeks pregnant.</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_refer_clinic_immediately:label">
            <value>Refer to clinic immediately for:</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_refer_danger_sign:label">
            <value>Danger Sign</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_refer_hf_appropriate_time:label">
            <value>Please refer <output value=" /pregnancy_home_visit/patient_short_name "/> to the health facility at the appropriate time.</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_refer_hf_immediately:label">
            <value>Please refer <output value=" /pregnancy_home_visit/patient_short_name "/> to the health facility immediately to receive the EDD and appropriate care.</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_referrals:label">
            <value>Referrals&lt;I class="fa fa-hospital-o"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_request_service_deworming:label">
            <value>Deworming</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_request_service_hiv_test:label">
            <value>HIV test</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_request_service_iron:label">
            <value>Iron folate</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_request_service_tt:label">
            <value>TT</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_request_services:label">
            <value>Request the following services:</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_risk_additional:label">
            <value><output value=" /pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk "/></value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_risk_asthma:label">
            <value>Asthma</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_risk_diabetes:label">
            <value>Diabetes</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_risk_factors:label">
            <value>New Risk Factors</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_risk_heart_condition:label">
            <value>Heart condition</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_risk_high_blood_pressure:label">
            <value>High blood pressure</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_routine_anc:label">
            <value>Please attend ANC on: <output value=" /pregnancy_home_visit/summary/next_appointment_date "/></value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_submit_note:label">
            <value>&lt;h4 style="text-align:center;"&gt;Click the Submit button at the bottom of the form.&lt;/h4&gt;</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_summary:label">
            <value>Summary&lt;I class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_summary_details:label">
            <value>Patient&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_home_visit/summary/r_who_recommends:label">
            <value>The WHO recommends routine ANC visits at 12, 20, 26, 30, 34, 36, 38, 40 weeks.</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_method/g_age_update_method/method_edd:label">
            <value>Expected date of delivery</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_method/g_age_update_method/method_weeks:label">
            <value>Current weeks pregnant</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_method/g_age_update_method:hint">
            <value>Select one.</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_method/g_age_update_method:label">
            <value>How would you like to update gestational age?</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_method/lmp_weeks_new:jr:constraintMsg">
            <value>Must be between 4 and 40.</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_method/lmp_weeks_new:label">
            <value>Please enter the new current weeks pregnant.</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_method/u_edd_new:jr:constraintMsg">
            <value>Date cannot be in the past. Date cannot be more than 9 months in the future.</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_method/u_edd_new:label">
            <value>Please enter the new EDD.</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_summary/edd_check_note:label">
            <value>If this seems incorrect, click "&lt; Prev" to update the pregnancy information.</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_summary/new_edd:label">
            <value>EDD: <output value=" /pregnancy_home_visit/update_g_age/edd_new "/></value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_summary/new_g_age:label">
            <value><output value=" /pregnancy_home_visit/weeks_since_lmp_rounded "/> weeks pregnant</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_summary/new_info:label">
            <value>**New**</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_summary/previous_edd:label">
            <value>EDD: <output value=" /pregnancy_home_visit/context_vars/edd_ctx "/></value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_summary/previous_edd_unknown:label">
            <value>EDD: unknown</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_summary/previous_g_age:label">
            <value><output value=" /pregnancy_home_visit/context_vars/weeks_since_lmp_rounded_ctx "/> weeks pregnant</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_summary/previous_g_age_unknown:label">
            <value>Unknown weeks pregnant</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_summary/previous_info:label">
            <value>**Previous**</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age/update_summary/update_check_note:label">
            <value>**Please confirm the new information and then click Next.**</value>
          </text>
          <text id="/pregnancy_home_visit/update_g_age:label">
            <value>Update Pregnancy</value>
          </text>
          <text id="static_instance-age_correct_yes_no-0">
            <value>Yes, it is correct.</value>
          </text>
          <text id="static_instance-age_correct_yes_no-1">
            <value>No, I want to update.</value>
          </text>
          <text id="static_instance-clear_options-0">
            <value>Clear task for this visit only. Continue to receive tasks for this pregnancy.</value>
          </text>
          <text id="static_instance-clear_options-1">
            <value>Do not receive any more tasks about this pregnancy.</value>
          </text>
          <text id="static_instance-g_age_update_methods-0">
            <value>Current weeks pregnant</value>
          </text>
          <text id="static_instance-g_age_update_methods-1">
            <value>Expected date of delivery</value>
          </text>
          <text id="static_instance-knows_date-0">
            <value>I don't know</value>
          </text>
          <text id="static_instance-knows_date-1">
            <value>Enter date</value>
          </text>
          <text id="static_instance-lmp_approximations-0">
            <value>Weeks</value>
          </text>
          <text id="static_instance-lmp_approximations-1">
            <value>Months</value>
          </text>
          <text id="static_instance-no_info_pregnancy_reasons-0">
            <value>The woman is visibly pregnant but does not know of how long.</value>
          </text>
          <text id="static_instance-no_info_pregnancy_reasons-1">
            <value>You performed a pregnancy test and it is positive but the woman does not know the age of the pregnancy or LMP.</value>
          </text>
          <text id="static_instance-no_info_pregnancy_reasons-2">
            <value>The woman is not on any family planning methods and has missed her periods.</value>
          </text>
          <text id="static_instance-risk_conditions-0">
            <value>Heart condition</value>
          </text>
          <text id="static_instance-risk_conditions-1">
            <value>Asthma</value>
          </text>
          <text id="static_instance-risk_conditions-2">
            <value>High blood pressure</value>
          </text>
          <text id="static_instance-risk_conditions-3">
            <value>Diabetes</value>
          </text>
          <text id="static_instance-risk_conditions-4">
            <value>None of the above</value>
          </text>
          <text id="static_instance-translate_woman_label-0">
            <value>the woman</value>
          </text>
          <text id="static_instance-translate_woman_start_label-0">
            <value>The woman</value>
          </text>
          <text id="static_instance-visit_options-0">
            <value>Yes</value>
          </text>
          <text id="static_instance-visit_options-1">
            <value>No, Miscarriage</value>
          </text>
          <text id="static_instance-visit_options-2">
            <value>No, Abortion</value>
          </text>
          <text id="static_instance-visit_options-3">
            <value>No, Refusing care</value>
          </text>
          <text id="static_instance-visit_options-4">
            <value>No, Migrated out of area</value>
          </text>
          <text id="static_instance-yes_no-0">
            <value>Yes</value>
          </text>
          <text id="static_instance-yes_no-1">
            <value>No</value>
          </text>
        </translation>
      </itext>
      <instance>
        <pregnancy_home_visit id="pregnancy_home_visit" prefix="J1!pregnancy_home_visit!" delimiter="#" version="2022-09-26 11:35:11">
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
          <lmp_date_8601 tag="hidden"/>
          <edd_8601 tag="hidden"/>
          <days_since_lmp tag="hidden"/>
          <weeks_since_lmp tag="hidden"/>
          <weeks_since_lmp_rounded tag="hidden"/>
          <lmp_method_approx tag="hidden"/>
          <lmp_updated tag="hidden"/>
          <t_pregnancy_follow_up_date tag="hidden"/>
          <t_pregnancy_follow_up tag="hidden"/>
          <t_danger_signs_referral_follow_up_date tag="hidden"/>
          <t_danger_signs_referral_follow_up tag="hidden"/>
          <hiv_status_known tag="hidden"/>
          <tt_received tag="hidden"/>
          <deworming_med_received tag="hidden"/>
          <context_vars tag="hidden">
            <lmp_date_8601_ctx/>
            <lmp_method_approx_ctx/>
            <pregnancy_follow_up_date_recent_ctx/>
            <risk_factors_ctx/>
            <risk_factor_extra_ctx/>
            <hiv_tested_ctx/>
            <tt_received_ctx/>
            <deworming_med_received_ctx/>
            <edd_ctx/>
            <weeks_since_lmp_rounded_ctx/>
            <pregnancy_uuid_ctx/>
          </context_vars>
          <pregnancy_summary>
            <current_weeks_pregnant tag="hidden"/>
            <current_weeks_pregnant_unknown tag="hidden"/>
            <current_edd tag="hidden"/>
            <current_edd_unknown tag="hidden"/>
            <visit_option/>
            <g_age_correct/>
          </pregnancy_summary>
          <pregnancy_ended>
            <miscarriage_note tag="hidden"/>
            <miscarriage_date/>
            <abortion_note tag="hidden"/>
            <abortion_date tag="hidden"/>
            <refusing_note tag="hidden"/>
            <migrated_note tag="hidden"/>
            <end_pregnancy_note tag="hidden"/>
            <clear_option/>
            <cear_note tag="hidden"/>
            <submit_note tag="hidden"/>
            <back_note tag="hidden"/>
          </pregnancy_ended>
          <update_g_age>
            <update_method>
              <g_age_update_method/>
              <lmp_weeks_new/>
              <u_edd_new/>
            </update_method>
            <update_summary tag="hidden">
              <update_check_note/>
              <previous_info/>
              <previous_g_age/>
              <previous_g_age_unknown/>
              <previous_edd/>
              <previous_edd_unknown/>
              <new_info/>
              <new_g_age/>
              <new_edd/>
              <edd_check_note/>
            </update_summary>
            <lmp_date_8601_new tag="hidden"/>
            <lmp_date_new tag="hidden"/>
            <edd_8601_new tag="hidden"/>
            <edd_new tag="hidden"/>
          </update_g_age>
          <anc_visits_hf>
            <anc_visits_hf_past>
              <pregnancy_follow_up_date_recent/>
              <last_visit_attended/>
              <report_other_visits/>
              <visited_hf_count/>
              <visited_date_ask_single/>
              <visited_date_single/>
              <visited_dates_multiple_note tag="hidden"/>
              <visited_dates_multiple_note_section tag="hidden"/>
              <visited_dates_count/>
              <visited_dates jr:template="">
                <visited_date_ask_multiple/>
                <visited_date/>
              </visited_dates>
            </anc_visits_hf_past>
            <risk_factors>
              <previous_risk_factors_note tag="hidden"/>
              <no_previous_risks_note tag="hidden"/>
              <first_pregnancy_note tag="hidden"/>
              <previous_miscarriage_note tag="hidden"/>
              <previous_difficulties_note tag="hidden"/>
              <more_than_4_children_note tag="hidden"/>
              <last_baby_born_less_than_1_year_ago_note tag="hidden"/>
              <heart_condition_note tag="hidden"/>
              <asthma_note tag="hidden"/>
              <high_blood_pressure_note tag="hidden"/>
              <diabetes_note tag="hidden"/>
              <extra_risk_note tag="hidden"/>
              <new_risks/>
              <additional_risk_check/>
              <additional_risk/>
              <r_risk_factor_present/>
            </risk_factors>
            <anc_visits_hf_next>
              <anc_next_visit_date>
                <appointment_date_known/>
                <appointment_date/>
              </anc_next_visit_date>
              <anc_visit_advice_note tag="hidden">
                <who_recommends_note/>
                <prenancy_age_note/>
                <refer_note/>
              </anc_visit_advice_note>
            </anc_visits_hf_next>
          </anc_visits_hf>
          <danger_signs>
            <danger_signs_note tag="hidden"/>
            <danger_signs_question_note/>
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
            <congratulate_no_ds_note tag="hidden"/>
            <refer_patient_note_1 tag="hidden"/>
            <refer_patient_note_2 tag="hidden"/>
          </danger_signs>
          <safe_pregnancy_practices>
            <malaria>
              <llin_use/>
              <llin_advice_note tag="hidden"/>
              <malaria_prophylaxis_note tag="hidden"/>
            </malaria>
            <iron_folate>
              <iron_folate_daily/>
              <iron_folate_note tag="hidden"/>
            </iron_folate>
            <deworming>
              <deworming_med/>
              <deworming_med_note tag="hidden"/>
            </deworming>
            <safe_practices_tips tag="hidden">
              <eat_more_note/>
              <talk_softly_note/>
              <respond_move_note/>
              <deliver_hf_note/>
            </safe_practices_tips>
            <hiv_status>
              <hiv_tested/>
              <hiv_importance_note tag="hidden"/>
            </hiv_status>
            <tetanus>
              <tt_imm_received/>
              <tt_note_1 tag="hidden"/>
              <tt_note_2 tag="hidden"/>
            </tetanus>
            <safe_pregnancy_practices/>
          </safe_pregnancy_practices>
          <summary tag="hidden">
            <r_submit_note/>
            <r_summary_details/>
            <r_patient_details/>
            <r_summary/>
            <r_pregnancy_details/>
            <r_pregnancy_details_unknown/>
            <r_risk_factors/>
            <r_risk_heart_condition/>
            <r_risk_asthma/>
            <r_risk_high_blood_pressure/>
            <r_risk_diabetes/>
            <r_risk_additional/>
            <r_danger_signs/>
            <r_danger_sign_vaginal_bleeding/>
            <r_danger_sign_fits/>
            <r_danger_sign_severe_abdominal_pain/>
            <r_danger_sign_severe_headache/>
            <r_danger_sign_very_pale/>
            <r_danger_sign_fever/>
            <r_danger_sign_reduced_or_no_fetal_movements/>
            <r_danger_sign_breaking_water/>
            <r_danger_sign_easily_tired/>
            <r_danger_sign_face_hand_swelling/>
            <r_danger_sign_breathlessness/>
            <r_space_1/>
            <r_referrals/>
            <r_refer_clinic_immediately/>
            <r_refer_danger_sign/>
            <r_routine_anc/>
            <r_request_services/>
            <r_request_service_tt/>
            <r_request_service_hiv_test/>
            <r_request_service_deworming/>
            <r_request_service_iron/>
            <r_who_recommends/>
            <r_refer_hf_appropriate_time/>
            <r_refer_hf_immediately/>
            <r_follow_up_tasks/>
            <r_following_tasks/>
            <r_fup_danger_sign/>
            <r_fup_hf_visit/>
            <r_fup_pregnancy_visit/>
            <r_fup_pregnancy_visit_2_weeks/>
            <next_visit_weeks/>
            <edd_summary/>
            <next_appointment_date/>
            <custom_translations tag="hidden">
              <custom_woman_label_translator/>
              <custom_woman_label/>
              <custom_woman_start_label_translator/>
              <custom_woman_start_label/>
            </custom_translations>
          </summary>
          <data tag="hidden">
            <__activity_to_report/>
            <__gestational_age_correct/>
            <__miscarriage_date/>
            <__abortion_date/>
            <__visit_task_clear_option/>
            <__gestational_age_update_method/>
            <__gestational_age_update_weeks/>
            <__gestational_age_update_edd/>
            <__lmp_updated/>
            <__lmp_date_new/>
            <__edd_new/>
            <__last_visit_attended/>
            <__report_additional_anc_hf_visits/>
            <__num_additional_anc_hf_visits/>
            <__additional_anc_hf_visit_dates/>
            <__has_risk_factors_not_previously_reported/>
            <__heart_condition/>
            <__asthma/>
            <__high_blood_pressure/>
            <__diabetes/>
            <__additional_high_risk_condition_to_report/>
            <__additional_high_risk_condition/>
            <__next_anc_hf_visit_date_known/>
            <__next_anc_hf_visit_date/>
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
            <__uses_llin/>
            <__takes_iron_folate_daily/>
            <__received_deworming_meds/>
            <__tested_for_hiv_in_past_3_months/>
            <__received_tetanus_toxoid_this_pregnancy/>
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
        </pregnancy_home_visit>
      </instance>
      <instance id="contact-summary"/>
      <instance id="yes_no">
        <root>
          <item>
            <itextId>static_instance-yes_no-0</itextId>
            <name>yes</name>
          </item>
          <item>
            <itextId>static_instance-yes_no-1</itextId>
            <name>no</name>
          </item>
        </root>
      </instance>
      <instance id="visit_options">
        <root>
          <item>
            <itextId>static_instance-visit_options-0</itextId>
            <name>yes</name>
          </item>
          <item>
            <itextId>static_instance-visit_options-1</itextId>
            <name>miscarriage</name>
          </item>
          <item>
            <itextId>static_instance-visit_options-2</itextId>
            <name>abortion</name>
          </item>
          <item>
            <itextId>static_instance-visit_options-3</itextId>
            <name>refused</name>
          </item>
          <item>
            <itextId>static_instance-visit_options-4</itextId>
            <name>migrated</name>
          </item>
        </root>
      </instance>
      <instance id="age_correct_yes_no">
        <root>
          <item>
            <itextId>static_instance-age_correct_yes_no-0</itextId>
            <name>yes</name>
          </item>
          <item>
            <itextId>static_instance-age_correct_yes_no-1</itextId>
            <name>no</name>
          </item>
        </root>
      </instance>
      <instance id="clear_options">
        <root>
          <item>
            <itextId>static_instance-clear_options-0</itextId>
            <name>clear_this</name>
          </item>
          <item>
            <itextId>static_instance-clear_options-1</itextId>
            <name>clear_all</name>
          </item>
        </root>
      </instance>
      <instance id="g_age_update_methods">
        <root>
          <item>
            <itextId>static_instance-g_age_update_methods-0</itextId>
            <name>method_weeks</name>
          </item>
          <item>
            <itextId>static_instance-g_age_update_methods-1</itextId>
            <name>method_edd</name>
          </item>
        </root>
      </instance>
      <instance id="lmp_approximations">
        <root>
          <item>
            <itextId>static_instance-lmp_approximations-0</itextId>
            <name>approx_weeks</name>
          </item>
          <item>
            <itextId>static_instance-lmp_approximations-1</itextId>
            <name>approx_months</name>
          </item>
        </root>
      </instance>
      <instance id="no_info_pregnancy_reasons">
        <root>
          <item>
            <itextId>static_instance-no_info_pregnancy_reasons-0</itextId>
            <name>visibly_pregnant</name>
          </item>
          <item>
            <itextId>static_instance-no_info_pregnancy_reasons-1</itextId>
            <name>test_positive</name>
          </item>
          <item>
            <itextId>static_instance-no_info_pregnancy_reasons-2</itextId>
            <name>missed_periods</name>
          </item>
        </root>
      </instance>
      <instance id="knows_date">
        <root>
          <item>
            <itextId>static_instance-knows_date-0</itextId>
            <name>no</name>
          </item>
          <item>
            <itextId>static_instance-knows_date-1</itextId>
            <name>yes</name>
          </item>
        </root>
      </instance>
      <instance id="risk_conditions">
        <root>
          <item>
            <itextId>static_instance-risk_conditions-0</itextId>
            <name>heart_condition</name>
          </item>
          <item>
            <itextId>static_instance-risk_conditions-1</itextId>
            <name>asthma</name>
          </item>
          <item>
            <itextId>static_instance-risk_conditions-2</itextId>
            <name>high_blood_pressure</name>
          </item>
          <item>
            <itextId>static_instance-risk_conditions-3</itextId>
            <name>diabetes</name>
          </item>
          <item>
            <itextId>static_instance-risk_conditions-4</itextId>
            <name>none</name>
          </item>
        </root>
      </instance>
      <instance id="translate_woman_label">
        <root>
          <item>
            <itextId>static_instance-translate_woman_label-0</itextId>
            <name>woman</name>
          </item>
        </root>
      </instance>
      <instance id="translate_woman_start_label">
        <root>
          <item>
            <itextId>static_instance-translate_woman_start_label-0</itextId>
            <name>woman-start</name>
          </item>
        </root>
      </instance>
      <bind nodeset="/pregnancy_home_visit/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/pregnancy_home_visit/inputs/source" type="string"/>
      <bind nodeset="/pregnancy_home_visit/inputs/source_id" type="string"/>
      <bind nodeset="/pregnancy_home_visit/inputs/contact/_id" type="db:person"/>
      <bind nodeset="/pregnancy_home_visit/inputs/contact/name" type="string"/>
      <bind nodeset="/pregnancy_home_visit/inputs/contact/short_name" type="string"/>
      <bind nodeset="/pregnancy_home_visit/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/pregnancy_home_visit/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/pregnancy_home_visit/inputs/contact/sex" type="string"/>
      <bind nodeset="/pregnancy_home_visit/inputs/contact/parent/_id" type="string"/>
      <bind nodeset="/pregnancy_home_visit/inputs/contact/parent/parent/contact/chw_name" type="string"/>
      <bind nodeset="/pregnancy_home_visit/inputs/contact/parent/parent/contact/phone" type="string"/>
      <bind nodeset="/pregnancy_home_visit/patient_age_in_years" type="string" calculate="floor( difference-in-months( ../inputs/contact/date_of_birth, today() ) div 12 )"/>
      <bind nodeset="/pregnancy_home_visit/patient_uuid" type="string" calculate="../inputs/contact/_id"/>
      <bind nodeset="/pregnancy_home_visit/patient_id" type="string" calculate="../inputs/contact/patient_id"/>
      <bind nodeset="/pregnancy_home_visit/patient_name" type="string" calculate="../inputs/contact/name"/>
      <bind nodeset="/pregnancy_home_visit/patient_short_name" type="string" calculate="coalesce(../inputs/contact/short_name, ../summary/custom_translations/custom_woman_label)"/>
      <bind nodeset="/pregnancy_home_visit/patient_short_name_start" type="string" calculate="coalesce(../inputs/contact/short_name, ../summary/custom_translations/custom_woman_start_label)"/>
      <bind nodeset="/pregnancy_home_visit/lmp_date_8601" type="string" calculate="if(selected(../pregnancy_summary/g_age_correct, 'no'), ../update_g_age/lmp_date_8601_new, ../context_vars/lmp_date_8601_ctx)"/>
      <bind nodeset="/pregnancy_home_visit/edd_8601" type="string" calculate="if(selected(../pregnancy_summary/g_age_correct, 'no'), ../update_g_age/edd_8601_new, format-date-time(date-time(decimal-date-time(../context_vars/lmp_date_8601_ctx + 280)), &quot;%Y-%m-%d&quot;))"/>
      <bind nodeset="/pregnancy_home_visit/days_since_lmp" type="string" calculate="floor(decimal-date-time(today()) - decimal-date-time(../lmp_date_8601))" relevant="../lmp_date_8601 != ''"/>
      <bind nodeset="/pregnancy_home_visit/weeks_since_lmp" type="string" calculate="round(../days_since_lmp div 7, 2)" relevant="../lmp_date_8601 != ''"/>
      <bind nodeset="/pregnancy_home_visit/weeks_since_lmp_rounded" type="string" calculate="floor(../days_since_lmp div 7)" relevant="../lmp_date_8601 != ''"/>
      <bind nodeset="/pregnancy_home_visit/lmp_method_approx" type="string" calculate="if(selected(../update_g_age/update_method/g_age_update_method, 'method_weeks'), 'yes', 'no')"/>
      <bind nodeset="/pregnancy_home_visit/lmp_updated" type="string" calculate="if(selected(../pregnancy_summary/g_age_correct, 'no') and (decimal-date-time(../lmp_date_8601) - decimal-date-time(../context_vars/lmp_date_8601_ctx) != 0), 'yes', 'no')"/>
      <bind nodeset="/pregnancy_home_visit/t_pregnancy_follow_up_date" type="string" calculate="../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date"/>
      <bind nodeset="/pregnancy_home_visit/t_pregnancy_follow_up" type="string" calculate="../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known"/>
      <bind nodeset="/pregnancy_home_visit/t_danger_signs_referral_follow_up_date" type="string" calculate="date-time(decimal-date-time(today()) + 3)"/>
      <bind nodeset="/pregnancy_home_visit/t_danger_signs_referral_follow_up" type="string" calculate="../danger_signs/r_danger_sign_present"/>
      <bind nodeset="/pregnancy_home_visit/hiv_status_known" type="string" calculate="if(../context_vars/hiv_tested_ctx = 'yes', 'yes', ../safe_pregnancy_practices/hiv_status/hiv_tested)"/>
      <bind nodeset="/pregnancy_home_visit/tt_received" type="string" calculate="if(../context_vars/tt_received_ctx = 'yes', 'yes', ../safe_pregnancy_practices/tetanus/tt_imm_received)"/>
      <bind nodeset="/pregnancy_home_visit/deworming_med_received" type="string" calculate="if(../context_vars/deworming_med_received_ctx = 'yes', 'yes', ../safe_pregnancy_practices/deworming/deworming_med)"/>
      <bind nodeset="/pregnancy_home_visit/context_vars/lmp_date_8601_ctx" type="string" calculate="if(instance('contact-summary')/context/lmp_date_8601 != '', instance('contact-summary')/context/lmp_date_8601, .)"/>
      <bind nodeset="/pregnancy_home_visit/context_vars/lmp_method_approx_ctx" type="string" calculate="if(instance('contact-summary')/context/lmp_method_approx != '', instance('contact-summary')/context/lmp_method_approx, .)"/>
      <bind nodeset="/pregnancy_home_visit/context_vars/pregnancy_follow_up_date_recent_ctx" type="string" calculate="if(instance('contact-summary')/context/pregnancy_follow_up_date_recent != 0, instance('contact-summary')/context/pregnancy_follow_up_date_recent, .)"/>
      <bind nodeset="/pregnancy_home_visit/context_vars/risk_factors_ctx" type="string" calculate="if(instance('contact-summary')/context/risk_factor_codes != '', instance('contact-summary')/context/risk_factor_codes, .)"/>
      <bind nodeset="/pregnancy_home_visit/context_vars/risk_factor_extra_ctx" type="string" calculate="if(instance('contact-summary')/context/risk_factor_extra != '', instance('contact-summary')/context/risk_factor_extra, .)"/>
      <bind nodeset="/pregnancy_home_visit/context_vars/hiv_tested_ctx" type="string" calculate="if(instance('contact-summary')/context/hiv_tested_past != '', instance('contact-summary')/context/hiv_tested_past, .)"/>
      <bind nodeset="/pregnancy_home_visit/context_vars/tt_received_ctx" type="string" calculate="if(instance('contact-summary')/context/tt_received_past != '', instance('contact-summary')/context/tt_received_past , .)"/>
      <bind nodeset="/pregnancy_home_visit/context_vars/deworming_med_received_ctx" type="string" calculate="if(instance('contact-summary')/context/deworming_med_received_past != '', instance('contact-summary')/context/deworming_med_received_past , .)"/>
      <bind nodeset="/pregnancy_home_visit/context_vars/edd_ctx" type="string" calculate="if(../lmp_date_8601_ctx = '', 'unknown', format-date-time(date-time(decimal-date-time(../lmp_date_8601_ctx) + 280), &quot;%e %b, %Y&quot;))"/>
      <bind nodeset="/pregnancy_home_visit/context_vars/weeks_since_lmp_rounded_ctx" type="string" calculate="if(../lmp_date_8601_ctx = '', 'unknown',
floor((decimal-date-time(today()) - decimal-date-time(../lmp_date_8601_ctx)) div 7))"/>
      <bind nodeset="/pregnancy_home_visit/context_vars/pregnancy_uuid_ctx" type="string" calculate="if(instance('contact-summary')/context/pregnancy_uuid != '', instance('contact-summary')/context/pregnancy_uuid, .)"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_summary/current_weeks_pregnant" readonly="true()" type="string" relevant=" /pregnancy_home_visit/context_vars/weeks_since_lmp_rounded_ctx  != 'unknown'"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_summary/current_weeks_pregnant_unknown" readonly="true()" type="string" relevant=" /pregnancy_home_visit/context_vars/weeks_since_lmp_rounded_ctx  = 'unknown'"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_summary/current_edd" readonly="true()" type="string" relevant=" /pregnancy_home_visit/context_vars/edd_ctx  != 'unknown'"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_summary/current_edd_unknown" readonly="true()" type="string" relevant=" /pregnancy_home_visit/context_vars/edd_ctx  = 'unknown'"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_summary/visit_option" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_summary/g_age_correct" type="select1" required="true()" relevant="selected(../visit_option, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_ended" relevant="not(selected(../pregnancy_summary/visit_option, 'yes'))"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_ended/miscarriage_note" readonly="true()" type="string" relevant="selected(../../pregnancy_summary/visit_option, 'miscarriage')"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_ended/miscarriage_date" type="date" relevant="selected(../../pregnancy_summary/visit_option, 'miscarriage')" constraint=". &lt;= today() and ( /pregnancy_home_visit/lmp_date_8601  = '' or . &gt;=  /pregnancy_home_visit/lmp_date_8601 )" required="true()" jr:constraintMsg="jr:itext('/pregnancy_home_visit/pregnancy_ended/miscarriage_date:jr:constraintMsg')"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_ended/abortion_note" readonly="true()" type="string" relevant="selected(../../pregnancy_summary/visit_option, 'abortion')"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_ended/abortion_date" type="date" relevant="selected(../../pregnancy_summary/visit_option, 'abortion')" constraint=". &lt;= today() and ( /pregnancy_home_visit/lmp_date_8601  = '' or . &gt;=  /pregnancy_home_visit/lmp_date_8601 )" required="true()" jr:constraintMsg="jr:itext('/pregnancy_home_visit/pregnancy_ended/abortion_date:jr:constraintMsg')"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_ended/refusing_note" readonly="true()" type="string" relevant="selected(../../pregnancy_summary/visit_option, 'refused')"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_ended/migrated_note" readonly="true()" type="string" relevant="selected(../../pregnancy_summary/visit_option, 'migrated')"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_ended/end_pregnancy_note" readonly="true()" type="string" relevant="selected(../../pregnancy_summary/visit_option, 'miscarriage') or
selected(../../pregnancy_summary/visit_option, 'abortion')"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_ended/clear_option" type="select1" required="true()" relevant="selected(../../pregnancy_summary/visit_option, 'refused') or
selected(../../pregnancy_summary/visit_option, 'migrated')"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_ended/cear_note" readonly="true()" type="string" relevant="selected(../../pregnancy_summary/visit_option, 'refused') or
selected(../../pregnancy_summary/visit_option, 'migrated')"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_ended/submit_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/pregnancy_ended/back_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age" relevant="selected(../pregnancy_summary/visit_option, 'yes') and
selected(../pregnancy_summary/g_age_correct, 'no')"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/update_method/g_age_update_method" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/update_method/lmp_weeks_new" type="int" required="true()" constraint=". &gt;= 4 and . &lt;= 40" relevant="selected(../g_age_update_method, 'method_weeks')" jr:constraintMsg="jr:itext('/pregnancy_home_visit/update_g_age/update_method/lmp_weeks_new:jr:constraintMsg')"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/update_method/u_edd_new" type="date" relevant="selected(../g_age_update_method, 'method_edd')" constraint=". &gt;= today() and
. &lt;= date-time(decimal-date-time(today()) + (9 * 30))" required="true()" jr:constraintMsg="jr:itext('/pregnancy_home_visit/update_g_age/update_method/u_edd_new:jr:constraintMsg')"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/update_summary/update_check_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/update_summary/previous_info" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/update_summary/previous_g_age" readonly="true()" type="string" relevant=" /pregnancy_home_visit/context_vars/weeks_since_lmp_rounded_ctx  != 'unknown'"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/update_summary/previous_g_age_unknown" readonly="true()" type="string" relevant=" /pregnancy_home_visit/context_vars/weeks_since_lmp_rounded_ctx  = 'unknown'"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/update_summary/previous_edd" readonly="true()" type="string" relevant=" /pregnancy_home_visit/context_vars/edd_ctx  != 'unknown'"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/update_summary/previous_edd_unknown" readonly="true()" type="string" relevant=" /pregnancy_home_visit/context_vars/edd_ctx  = 'unknown'"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/update_summary/new_info" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/update_summary/new_g_age" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/update_summary/new_edd" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/update_summary/edd_check_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/lmp_date_8601_new" type="string" calculate="format-date-time(
if(selected(../update_method/g_age_update_method, 'method_weeks'), date-time(decimal-date-time(today()) - (../update_method/lmp_weeks_new * 7)), 
if(selected(../update_method/g_age_update_method, 'method_edd'), date-time(decimal-date-time(../update_method/u_edd_new) - 280), 0)
), &quot;%Y-%m-%d&quot;)"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/lmp_date_new" type="string" calculate="format-date-time(../lmp_date_8601_new, &quot;%e %b, %Y&quot;)"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/edd_8601_new" type="string" calculate="format-date-time(date-time(decimal-date-time(../lmp_date_8601_new)+280),&quot;%Y-%m-%d&quot;)"/>
      <bind nodeset="/pregnancy_home_visit/update_g_age/edd_new" type="string" calculate="format-date-time(../edd_8601_new, &quot;%e %b, %Y&quot;)"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf" relevant="selected(../pregnancy_summary/visit_option, 'yes') and
../lmp_date_8601 != ''"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/pregnancy_follow_up_date_recent" type="string" calculate="format-date-time(../../../context_vars/pregnancy_follow_up_date_recent_ctx, &quot;%e %b, %Y&quot;)"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended" type="select1" required="true()" relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/pregnancy_follow_up_date_recent  != ''"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count" type="int" required="true()" constraint=".&gt;= 0 and . &lt;= 9" jr:constraintMsg="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count:jr:constraintMsg')" relevant="selected(../report_other_visits, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single" type="select1" required="true()" relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count  = 1"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_single" type="date" relevant="selected(../visited_date_ask_single, 'yes')" constraint=". &lt;= today() and . &gt;=  /pregnancy_home_visit/lmp_date_8601 " required="true()" jr:constraintMsg="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_single:jr:constraintMsg')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_multiple_note" readonly="true()" type="string" relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_multiple_note_section" readonly="true()" type="string" relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_count" type="string" readonly="true()" calculate=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count "/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates" relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple" type="select1" required="true()" relevant=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date" type="date" relevant="selected(../visited_date_ask_multiple, 'yes')" constraint=". &lt;= today() and . &gt;=  /pregnancy_home_visit/lmp_date_8601 " required="true()" jr:constraintMsg="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date:jr:constraintMsg')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_risk_factors_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/no_previous_risks_note" readonly="true()" type="string" relevant="../../../context_vars/risk_factors_ctx = ''"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/first_pregnancy_note" readonly="true()" type="string" relevant="contains(../../../context_vars/risk_factors_ctx, 'first_pregnancy')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_miscarriage_note" readonly="true()" type="string" relevant="contains(../../../context_vars/risk_factors_ctx, 'previous_miscarriage')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_difficulties_note" readonly="true()" type="string" relevant="contains(../../../context_vars/risk_factors_ctx, 'previous_difficulties')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/more_than_4_children_note" readonly="true()" type="string" relevant="contains(../../../context_vars/risk_factors_ctx, 'more_than_4_children')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/last_baby_born_less_than_1_year_ago_note" readonly="true()" type="string" relevant="contains(../../../context_vars/risk_factors_ctx, 'last_baby_born_less_than_1_year_ago')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/heart_condition_note" readonly="true()" type="string" relevant="contains(../../../context_vars/risk_factors_ctx, 'heart_condition')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/asthma_note" readonly="true()" type="string" relevant="contains(../../../context_vars/risk_factors_ctx, 'asthma')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/high_blood_pressure_note" readonly="true()" type="string" relevant="contains(../../../context_vars/risk_factors_ctx, 'high_blood_pressure')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/diabetes_note" readonly="true()" type="string" relevant="contains(../../../context_vars/risk_factors_ctx, 'diabetes')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/extra_risk_note" readonly="true()" type="string" relevant="../../../context_vars/risk_factor_extra_ctx != ''"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks" type="select" required="true()" constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" jr:constraintMsg="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks:jr:constraintMsg')" relevant="not(contains(../../../context_vars/risk_factors_ctx, 'heart_condition') and
contains(../../../context_vars/risk_factors_ctx, 'asthma') and
contains(../../../context_vars/risk_factors_ctx, 'high_blood_pressure') and
contains(../../../context_vars/risk_factors_ctx, 'diabetes'))"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk" type="string" required="true()" constraint="string-length(.) &lt;= 100" jr:constraintMsg="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk:jr:constraintMsg')" relevant="selected(../additional_risk_check, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/risk_factors/r_risk_factor_present" type="string" calculate="if(selected(../new_risks, 'heart_condition') or
selected(../new_risks, 'asthma') or
selected(../new_risks, 'high_blood_pressure') or
selected(../new_risks, 'diabetes') or
selected(../additional_risk_check, 'yes')
, 'yes', 'no')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date" type="date" relevant="selected(../appointment_date_known, 'yes')" constraint="(. &gt;= today()) and
(decimal-date-time(.) &lt;= decimal-date-time(today() + 30))" required="true()" jr:constraintMsg="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date:jr:constraintMsg')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note" relevant="selected(../anc_next_visit_date/appointment_date_known, 'no')"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/who_recommends_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/prenancy_age_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/refer_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs" relevant="selected(../pregnancy_summary/visit_option, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/danger_signs_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/danger_signs_question_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/vaginal_bleeding" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/fits" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/severe_abdominal_pain" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/severe_headache" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/very_pale" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/fever" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/breaking_water" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/easily_tired" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/face_hand_swelling" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/breathlessness" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/r_danger_sign_present" type="string" calculate="if(selected(../vaginal_bleeding, 'yes')
or selected(../fits, 'yes')
or selected(../severe_abdominal_pain, 'yes')
or selected(../severe_headache, 'yes')
or selected(../very_pale, 'yes')
or selected(../fever, 'yes')
or selected(../reduced_or_no_fetal_movements, 'yes')
or selected(../breaking_water, 'yes')
or selected(../easily_tired, 'yes')
or selected(../face_hand_swelling, 'yes')
or selected(../breathlessness, 'yes'), 
'yes',
if(selected(../vaginal_bleeding, 'no')
and selected(../fits, 'no')
and selected(../severe_abdominal_pain, 'no')
and selected(../severe_headache, 'no')
and selected(../very_pale, 'no')
and selected(../fever, 'no')
and selected(../reduced_or_no_fetal_movements, 'no')
and selected(../breaking_water, 'no')
and selected(../easily_tired, 'no')
and selected(../face_hand_swelling, 'no')
and selected(../breathlessness, 'no'), 'no', ''))"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/congratulate_no_ds_note" readonly="true()" type="string" relevant="../r_danger_sign_present = 'no'"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/refer_patient_note_1" readonly="true()" type="string" relevant="../r_danger_sign_present = 'yes'"/>
      <bind nodeset="/pregnancy_home_visit/danger_signs/refer_patient_note_2" readonly="true()" type="string" relevant="../r_danger_sign_present = 'yes'"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices" relevant="selected(../pregnancy_summary/visit_option, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_advice_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/malaria/malaria_prophylaxis_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/deworming" relevant=" /pregnancy_home_visit/weeks_since_lmp  &gt; 12 and ../../context_vars/deworming_med_received_ctx != 'yes'"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips" relevant="../../lmp_date_8601 != ''"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/eat_more_note" readonly="true()" type="string" relevant=" /pregnancy_home_visit/weeks_since_lmp  &lt;= 24"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/talk_softly_note" readonly="true()" type="string" relevant=" /pregnancy_home_visit/weeks_since_lmp  &gt;= 25 and  /pregnancy_home_visit/weeks_since_lmp  &lt;= 30"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/respond_move_note" readonly="true()" type="string" relevant=" /pregnancy_home_visit/weeks_since_lmp  &gt;= 25 and  /pregnancy_home_visit/weeks_since_lmp  &lt;= 30"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/deliver_hf_note" readonly="true()" type="string" relevant=" /pregnancy_home_visit/weeks_since_lmp  &gt;= 31"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status" relevant="../../context_vars/hiv_tested_ctx != 'yes'"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_importance_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/tetanus" relevant="../../context_vars/tt_received_ctx != 'yes' and
(selected(../../anc_visits_hf/anc_visits_hf_past/last_visit_attended, 'yes') or
selected(../../anc_visits_hf/anc_visits_hf_past/report_other_visits, 'yes'))"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received" type="select1" required="true()"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_note_1" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_note_2" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/safe_pregnancy_practices/safe_pregnancy_practices" type="string" calculate="if((selected(../tetanus/tt_imm_received, 'no') or
selected(../hiv_status/hiv_tested, 'no') or
selected(../deworming/deworming_med, 'no') or
selected(../iron_folate/iron_folate_daily, 'no')), 'yes', 'no')"/>
      <bind nodeset="/pregnancy_home_visit/summary" relevant="selected(../pregnancy_summary/visit_option, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_submit_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_summary_details" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_patient_details" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_summary" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_pregnancy_details" readonly="true()" type="string" relevant="../../lmp_date_8601 != ''"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_pregnancy_details_unknown" readonly="true()" type="string" relevant="../../lmp_date_8601 = ''"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_risk_factors" readonly="true()" type="string" relevant="../../anc_visits_hf/risk_factors/r_risk_factor_present = 'yes'"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_risk_heart_condition" readonly="true()" type="string" relevant="selected(../../anc_visits_hf/risk_factors/new_risks, 'heart_condition')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_risk_asthma" readonly="true()" type="string" relevant="selected(../../anc_visits_hf/risk_factors/new_risks, 'asthma')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_risk_high_blood_pressure" readonly="true()" type="string" relevant="selected(../../anc_visits_hf/risk_factors/new_risks, 'high_blood_pressure')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_risk_diabetes" readonly="true()" type="string" relevant="selected(../../anc_visits_hf/risk_factors/new_risks, 'diabetes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_risk_additional" readonly="true()" type="string" relevant="selected(../../anc_visits_hf/risk_factors/additional_risk_check, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_danger_signs" readonly="true()" type="string" relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_danger_sign_vaginal_bleeding" readonly="true()" type="string" relevant="selected(../../danger_signs/vaginal_bleeding, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_danger_sign_fits" readonly="true()" type="string" relevant="selected(../../danger_signs/fits, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_danger_sign_severe_abdominal_pain" readonly="true()" type="string" relevant="selected(../../danger_signs/severe_abdominal_pain, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_danger_sign_severe_headache" readonly="true()" type="string" relevant="selected(../../danger_signs/severe_headache, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_danger_sign_very_pale" readonly="true()" type="string" relevant="selected(../../danger_signs/very_pale, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_danger_sign_fever" readonly="true()" type="string" relevant="selected(../../danger_signs/fever, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_danger_sign_reduced_or_no_fetal_movements" readonly="true()" type="string" relevant="selected(../../danger_signs/reduced_or_no_fetal_movements, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_danger_sign_breaking_water" readonly="true()" type="string" relevant="selected(../../danger_signs/breaking_water, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_danger_sign_easily_tired" readonly="true()" type="string" relevant="selected(../../danger_signs/easily_tired, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_danger_sign_face_hand_swelling" readonly="true()" type="string" relevant="selected(../../danger_signs/face_hand_swelling, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_danger_sign_breathlessness" readonly="true()" type="string" relevant="selected(../../danger_signs/breathlessness, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_space_1" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_referrals" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_refer_clinic_immediately" readonly="true()" type="string" relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_refer_danger_sign" readonly="true()" type="string" relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_routine_anc" readonly="true()" type="string" relevant="selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_request_services" readonly="true()" type="string" relevant="selected(../../safe_pregnancy_practices/tetanus/tt_imm_received, 'no') or
selected(../../safe_pregnancy_practices/hiv_status/hiv_tested, 'no') or
selected(../../safe_pregnancy_practices/deworming/deworming_med, 'no') or
selected(../../safe_pregnancy_practices/iron_folate/iron_folate_daily, 'no')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_request_service_tt" readonly="true()" type="string" relevant="selected(../../safe_pregnancy_practices/tetanus/tt_imm_received, 'no')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_request_service_hiv_test" readonly="true()" type="string" relevant="selected(../../safe_pregnancy_practices/hiv_status/hiv_tested, 'no')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_request_service_deworming" readonly="true()" type="string" relevant="selected(../../safe_pregnancy_practices/deworming/deworming_med, 'no')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_request_service_iron" readonly="true()" type="string" relevant="selected(../../safe_pregnancy_practices/iron_folate/iron_folate_daily, 'no')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_who_recommends" readonly="true()" type="string" relevant="../../lmp_date_8601 = '' or selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'no')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_refer_hf_appropriate_time" readonly="true()" type="string" relevant="selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'no')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_refer_hf_immediately" readonly="true()" type="string" relevant="../../lmp_date_8601 = ''"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_follow_up_tasks" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_following_tasks" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_fup_danger_sign" readonly="true()" type="string" relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_fup_hf_visit" readonly="true()" type="string" relevant="selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'yes')"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_fup_pregnancy_visit" readonly="true()" type="string" relevant="../../lmp_date_8601 != ''"/>
      <bind nodeset="/pregnancy_home_visit/summary/r_fup_pregnancy_visit_2_weeks" readonly="true()" type="string" relevant="../../lmp_date_8601 = ''"/>
      <bind nodeset="/pregnancy_home_visit/summary/next_visit_weeks" type="string" calculate="round((if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 12*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 12*7,
if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 20*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 20*7,
if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 26*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 26*7,
if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 30*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 30*7,
if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 34*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 34*7,
if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 36*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 36*7,
if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 38*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 38*7,
if((decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 40*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy_home_visit/lmp_date_8601 ) + 40*7, 0
)))))))) - decimal-date-time(today())) div 7, 0)"/>
      <bind nodeset="/pregnancy_home_visit/summary/edd_summary" type="string" calculate="format-date-time( /pregnancy_home_visit/edd_8601 , &quot;%e %b, %Y&quot;)"/>
      <bind nodeset="/pregnancy_home_visit/summary/next_appointment_date" type="string" calculate="format-date-time( /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date , &quot;%e %b, %Y&quot;)"/>
      <bind nodeset="/pregnancy_home_visit/summary/custom_translations/custom_woman_label_translator" type="select1" calculate="&quot;woman&quot;"/>
      <bind nodeset="/pregnancy_home_visit/summary/custom_translations/custom_woman_label" type="string" calculate="jr:choice-name( /pregnancy_home_visit/summary/custom_translations/custom_woman_label_translator ,' /pregnancy_home_visit/summary/custom_translations/custom_woman_label_translator ')"/>
      <bind nodeset="/pregnancy_home_visit/summary/custom_translations/custom_woman_start_label_translator" type="select1" calculate="&quot;woman-start&quot;"/>
      <bind nodeset="/pregnancy_home_visit/summary/custom_translations/custom_woman_start_label" type="string" calculate="jr:choice-name( /pregnancy_home_visit/summary/custom_translations/custom_woman_start_label_translator ,' /pregnancy_home_visit/summary/custom_translations/custom_woman_start_label_translator ')"/>
      <bind nodeset="/pregnancy_home_visit/data/__activity_to_report" type="string" calculate="if ( /pregnancy_home_visit/pregnancy_summary/visit_option  = 'yes', 'home_visit',  /pregnancy_home_visit/pregnancy_summary/visit_option )"/>
      <bind nodeset="/pregnancy_home_visit/data/__gestational_age_correct" type="string" calculate=" /pregnancy_home_visit/pregnancy_summary/g_age_correct "/>
      <bind nodeset="/pregnancy_home_visit/data/__miscarriage_date" type="string" calculate=" /pregnancy_home_visit/pregnancy_ended/miscarriage_date "/>
      <bind nodeset="/pregnancy_home_visit/data/__abortion_date" type="string" calculate=" /pregnancy_home_visit/pregnancy_ended/abortion_date "/>
      <bind nodeset="/pregnancy_home_visit/data/__visit_task_clear_option" type="string" calculate=" /pregnancy_home_visit/pregnancy_ended/clear_option "/>
      <bind nodeset="/pregnancy_home_visit/data/__gestational_age_update_method" type="string" calculate=" /pregnancy_home_visit/update_g_age/update_method/g_age_update_method "/>
      <bind nodeset="/pregnancy_home_visit/data/__gestational_age_update_weeks" type="string" calculate=" /pregnancy_home_visit/update_g_age/update_method/lmp_weeks_new "/>
      <bind nodeset="/pregnancy_home_visit/data/__gestational_age_update_edd" type="string" calculate=" /pregnancy_home_visit/update_g_age/update_method/u_edd_new "/>
      <bind nodeset="/pregnancy_home_visit/data/__lmp_updated" type="string" calculate=" /pregnancy_home_visit/lmp_updated "/>
      <bind nodeset="/pregnancy_home_visit/data/__lmp_date_new" type="string" calculate=" /pregnancy_home_visit/update_g_age/lmp_date_8601_new "/>
      <bind nodeset="/pregnancy_home_visit/data/__edd_new" type="string" calculate=" /pregnancy_home_visit/update_g_age/edd_8601_new "/>
      <bind nodeset="/pregnancy_home_visit/data/__last_visit_attended" type="string" calculate=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended "/>
      <bind nodeset="/pregnancy_home_visit/data/__report_additional_anc_hf_visits" type="string" calculate=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits "/>
      <bind nodeset="/pregnancy_home_visit/data/__num_additional_anc_hf_visits" type="string" calculate=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count "/>
      <bind nodeset="/pregnancy_home_visit/data/__additional_anc_hf_visit_dates" type="string" calculate="coalesce( /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_single , join(',',  /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date ), NULL)"/>
      <bind nodeset="/pregnancy_home_visit/data/__has_risk_factors_not_previously_reported" type="string" calculate="if (selected( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks , 'none'), 'no', if( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks  = '', '', 'yes'))"/>
      <bind nodeset="/pregnancy_home_visit/data/__heart_condition" type="string" calculate="if(selected( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks , 'heart_condition'),'yes',if( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks  = '', '','no'))"/>
      <bind nodeset="/pregnancy_home_visit/data/__asthma" type="string" calculate="if(selected( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks , 'asthma'),'yes',if( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks  = '', '','no'))"/>
      <bind nodeset="/pregnancy_home_visit/data/__high_blood_pressure" type="string" calculate="if(selected( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks , 'high_blood_pressure'),'yes',if( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks  = '', '','no'))"/>
      <bind nodeset="/pregnancy_home_visit/data/__diabetes" type="string" calculate="if(selected( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks , 'diabetes'),'yes',if( /pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks  = '', '','no'))"/>
      <bind nodeset="/pregnancy_home_visit/data/__additional_high_risk_condition_to_report" type="string" calculate=" /pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check "/>
      <bind nodeset="/pregnancy_home_visit/data/__additional_high_risk_condition" type="string" calculate=" /pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk "/>
      <bind nodeset="/pregnancy_home_visit/data/__next_anc_hf_visit_date_known" type="string" calculate=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known "/>
      <bind nodeset="/pregnancy_home_visit/data/__next_anc_hf_visit_date" type="string" calculate=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date "/>
      <bind nodeset="/pregnancy_home_visit/data/__vaginal_bleeding" type="string" calculate=" /pregnancy_home_visit/danger_signs/vaginal_bleeding "/>
      <bind nodeset="/pregnancy_home_visit/data/__fits" type="string" calculate=" /pregnancy_home_visit/danger_signs/fits "/>
      <bind nodeset="/pregnancy_home_visit/data/__severe_abdominal_pain" type="string" calculate=" /pregnancy_home_visit/danger_signs/severe_abdominal_pain "/>
      <bind nodeset="/pregnancy_home_visit/data/__severe_headache" type="string" calculate=" /pregnancy_home_visit/danger_signs/severe_headache "/>
      <bind nodeset="/pregnancy_home_visit/data/__very_pale" type="string" calculate=" /pregnancy_home_visit/danger_signs/very_pale "/>
      <bind nodeset="/pregnancy_home_visit/data/__fever" type="string" calculate=" /pregnancy_home_visit/danger_signs/fever "/>
      <bind nodeset="/pregnancy_home_visit/data/__reduced_or_no_fetal_movements" type="string" calculate=" /pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements "/>
      <bind nodeset="/pregnancy_home_visit/data/__breaking_water" type="string" calculate=" /pregnancy_home_visit/danger_signs/breaking_water "/>
      <bind nodeset="/pregnancy_home_visit/data/__easily_tired" type="string" calculate=" /pregnancy_home_visit/danger_signs/easily_tired "/>
      <bind nodeset="/pregnancy_home_visit/data/__face_hand_swelling" type="string" calculate=" /pregnancy_home_visit/danger_signs/face_hand_swelling "/>
      <bind nodeset="/pregnancy_home_visit/data/__breathlessness" type="string" calculate=" /pregnancy_home_visit/danger_signs/breathlessness "/>
      <bind nodeset="/pregnancy_home_visit/data/__has_danger_sign" type="string" calculate=" /pregnancy_home_visit/danger_signs/r_danger_sign_present "/>
      <bind nodeset="/pregnancy_home_visit/data/__uses_llin" type="string" calculate=" /pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use "/>
      <bind nodeset="/pregnancy_home_visit/data/__takes_iron_folate_daily" type="string" calculate=" /pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily "/>
      <bind nodeset="/pregnancy_home_visit/data/__received_deworming_meds" type="string" calculate=" /pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med "/>
      <bind nodeset="/pregnancy_home_visit/data/__tested_for_hiv_in_past_3_months" type="string" calculate=" /pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested "/>
      <bind nodeset="/pregnancy_home_visit/data/__received_tetanus_toxoid_this_pregnancy" type="string" calculate=" /pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received "/>
      <bind nodeset="/pregnancy_home_visit/data/meta/__patient_uuid" type="string" calculate="../../../inputs/contact/_id"/>
      <bind nodeset="/pregnancy_home_visit/data/meta/__patient_id" type="string" calculate="../../../inputs/contact/patient_id"/>
      <bind nodeset="/pregnancy_home_visit/data/meta/__household_uuid" type="string" calculate="../../../inputs/contact/parent/_id"/>
      <bind nodeset="/pregnancy_home_visit/data/meta/__source" type="string" calculate="../../../inputs/source"/>
      <bind nodeset="/pregnancy_home_visit/data/meta/__source_id" type="string" calculate="../../../inputs/source_id"/>
      <bind nodeset="/pregnancy_home_visit/data/meta/__pregnancy_uuid" type="string" calculate=" /pregnancy_home_visit/context_vars/pregnancy_uuid_ctx "/>
      <bind nodeset="/pregnancy_home_visit/meta/instanceID" type="string" readonly="true()" calculate="concat('uuid:', uuid())"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/pregnancy_home_visit/inputs">
      <group ref="/pregnancy_home_visit/inputs/contact">
        <input appearance="db-object" ref="/pregnancy_home_visit/inputs/contact/_id">
          <label ref="jr:itext('/pregnancy_home_visit/inputs/contact/_id:label')"/>
        </input>
        <group ref="/pregnancy_home_visit/inputs/contact/parent">
          <group ref="/pregnancy_home_visit/inputs/contact/parent/parent">
            <group ref="/pregnancy_home_visit/inputs/contact/parent/parent/contact"/>
          </group>
        </group>
      </group>
    </group>
    <group ref="/pregnancy_home_visit/context_vars"/>
    <group appearance="field-list" ref="/pregnancy_home_visit/pregnancy_summary">
      <label ref="jr:itext('/pregnancy_home_visit/pregnancy_summary:label')"/>
      <input ref="/pregnancy_home_visit/pregnancy_summary/current_weeks_pregnant">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_summary/current_weeks_pregnant:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/pregnancy_summary/current_weeks_pregnant_unknown">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_summary/current_weeks_pregnant_unknown:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/pregnancy_summary/current_edd">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_summary/current_edd:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/pregnancy_summary/current_edd_unknown">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_summary/current_edd_unknown:label')"/>
      </input>
      <select1 ref="/pregnancy_home_visit/pregnancy_summary/visit_option">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_summary/visit_option:label')"/>
        <hint ref="jr:itext('/pregnancy_home_visit/pregnancy_summary/visit_option:hint')"/>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/pregnancy_summary/visit_option/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/pregnancy_summary/visit_option/miscarriage:label')"/>
          <value>miscarriage</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/pregnancy_summary/visit_option/abortion:label')"/>
          <value>abortion</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/pregnancy_summary/visit_option/refused:label')"/>
          <value>refused</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/pregnancy_summary/visit_option/migrated:label')"/>
          <value>migrated</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_home_visit/pregnancy_summary/g_age_correct">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_summary/g_age_correct:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/pregnancy_summary/g_age_correct/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/pregnancy_summary/g_age_correct/no:label')"/>
          <value>no</value>
        </item>
      </select1>
    </group>
    <group appearance="field-list" ref="/pregnancy_home_visit/pregnancy_ended">
      <label ref="jr:itext('/pregnancy_home_visit/pregnancy_ended:label')"/>
      <input ref="/pregnancy_home_visit/pregnancy_ended/miscarriage_note">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_ended/miscarriage_note:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/pregnancy_ended/miscarriage_date">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_ended/miscarriage_date:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/pregnancy_ended/abortion_note">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_ended/abortion_note:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/pregnancy_ended/abortion_date">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_ended/abortion_date:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/pregnancy_ended/refusing_note">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_ended/refusing_note:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/pregnancy_ended/migrated_note">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_ended/migrated_note:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/pregnancy_ended/end_pregnancy_note">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_ended/end_pregnancy_note:label')"/>
      </input>
      <select1 ref="/pregnancy_home_visit/pregnancy_ended/clear_option">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_ended/clear_option:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/pregnancy_ended/clear_option/clear_this:label')"/>
          <value>clear_this</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/pregnancy_ended/clear_option/clear_all:label')"/>
          <value>clear_all</value>
        </item>
      </select1>
      <input ref="/pregnancy_home_visit/pregnancy_ended/cear_note">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_ended/cear_note:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/pregnancy_ended/submit_note">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_ended/submit_note:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/pregnancy_ended/back_note">
        <label ref="jr:itext('/pregnancy_home_visit/pregnancy_ended/back_note:label')"/>
      </input>
    </group>
    <group ref="/pregnancy_home_visit/update_g_age">
      <label ref="jr:itext('/pregnancy_home_visit/update_g_age:label')"/>
      <group appearance="field-list" ref="/pregnancy_home_visit/update_g_age/update_method">
        <select1 ref="/pregnancy_home_visit/update_g_age/update_method/g_age_update_method">
          <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_method/g_age_update_method:label')"/>
          <hint ref="jr:itext('/pregnancy_home_visit/update_g_age/update_method/g_age_update_method:hint')"/>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_method/g_age_update_method/method_weeks:label')"/>
            <value>method_weeks</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_method/g_age_update_method/method_edd:label')"/>
            <value>method_edd</value>
          </item>
        </select1>
        <input ref="/pregnancy_home_visit/update_g_age/update_method/lmp_weeks_new">
          <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_method/lmp_weeks_new:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/update_g_age/update_method/u_edd_new">
          <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_method/u_edd_new:label')"/>
        </input>
      </group>
      <group appearance="field-list" ref="/pregnancy_home_visit/update_g_age/update_summary">
        <input ref="/pregnancy_home_visit/update_g_age/update_summary/update_check_note">
          <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_summary/update_check_note:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/update_g_age/update_summary/previous_info">
          <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_summary/previous_info:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/update_g_age/update_summary/previous_g_age">
          <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_summary/previous_g_age:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/update_g_age/update_summary/previous_g_age_unknown">
          <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_summary/previous_g_age_unknown:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/update_g_age/update_summary/previous_edd">
          <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_summary/previous_edd:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/update_g_age/update_summary/previous_edd_unknown">
          <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_summary/previous_edd_unknown:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/update_g_age/update_summary/new_info">
          <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_summary/new_info:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/update_g_age/update_summary/new_g_age">
          <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_summary/new_g_age:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/update_g_age/update_summary/new_edd">
          <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_summary/new_edd:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/update_g_age/update_summary/edd_check_note">
          <label ref="jr:itext('/pregnancy_home_visit/update_g_age/update_summary/edd_check_note:label')"/>
        </input>
      </group>
    </group>
    <group ref="/pregnancy_home_visit/anc_visits_hf">
      <group appearance="field-list" ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past">
        <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past:label')"/>
        <select1 ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/last_visit_attended/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <select1 ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/report_other_visits/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <input ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count:label')"/>
          <hint ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_hf_count:hint')"/>
        </input>
        <select1 ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single/no:label')"/>
            <value>no</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_ask_single/yes:label')"/>
            <value>yes</value>
          </item>
        </select1>
        <input ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_single">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_date_single:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_multiple_note">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_multiple_note:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_multiple_note_section">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_multiple_note_section:label')"/>
        </input>
        <group ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates:label')"/>
          <repeat nodeset="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates" jr:count=" /pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates_count ">
            <select1 ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple">
              <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple:label')"/>
              <item>
                <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple/no:label')"/>
                <value>no</value>
              </item>
              <item>
                <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date_ask_multiple/yes:label')"/>
                <value>yes</value>
              </item>
            </select1>
            <input ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date">
              <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_past/visited_dates/visited_date:label')"/>
            </input>
          </repeat>
        </group>
      </group>
      <group appearance="field-list summary" ref="/pregnancy_home_visit/anc_visits_hf/risk_factors">
        <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors:label')"/>
        <input ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_risk_factors_note">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_risk_factors_note:label')"/>
        </input>
        <input appearance="li" ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/no_previous_risks_note">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/no_previous_risks_note:label')"/>
        </input>
        <input appearance="li" ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/first_pregnancy_note">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/first_pregnancy_note:label')"/>
        </input>
        <input appearance="li" ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_miscarriage_note">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_miscarriage_note:label')"/>
        </input>
        <input appearance="li" ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_difficulties_note">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/previous_difficulties_note:label')"/>
        </input>
        <input appearance="li" ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/more_than_4_children_note">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/more_than_4_children_note:label')"/>
        </input>
        <input appearance="li" ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/last_baby_born_less_than_1_year_ago_note">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/last_baby_born_less_than_1_year_ago_note:label')"/>
        </input>
        <input appearance="li" ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/heart_condition_note">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/heart_condition_note:label')"/>
        </input>
        <input appearance="li" ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/asthma_note">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/asthma_note:label')"/>
        </input>
        <input appearance="li" ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/high_blood_pressure_note">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/high_blood_pressure_note:label')"/>
        </input>
        <input appearance="li" ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/diabetes_note">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/diabetes_note:label')"/>
        </input>
        <input appearance="li" ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/extra_risk_note">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/extra_risk_note:label')"/>
        </input>
        <select ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks:label')"/>
          <hint ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/new_risks:hint')"/>
          <itemset nodeset="instance('risk_conditions')/root/item[not(contains( /pregnancy_home_visit/context_vars/risk_factors_ctx , name)) or name = 'none']">
            <value ref="name"/>
            <label ref="jr:itext(itextId)"/>
          </itemset>
        </select>
        <select1 ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk_check/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <input ref="/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk">
          <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/risk_factors/additional_risk:label')"/>
        </input>
      </group>
      <group ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next">
        <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next:label')"/>
        <group appearance="field-list" ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date">
          <select1 ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known">
            <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known:label')"/>
            <item>
              <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known/no:label')"/>
              <value>no</value>
            </item>
            <item>
              <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known/yes:label')"/>
              <value>yes</value>
            </item>
          </select1>
          <input ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date"/>
        </group>
        <group appearance="field-list" ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note">
          <input ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/who_recommends_note">
            <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/who_recommends_note:label')"/>
          </input>
          <input ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/prenancy_age_note">
            <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/prenancy_age_note:label')"/>
          </input>
          <input ref="/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/refer_note">
            <label ref="jr:itext('/pregnancy_home_visit/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/refer_note:label')"/>
          </input>
        </group>
      </group>
    </group>
    <group appearance="field-list" ref="/pregnancy_home_visit/danger_signs">
      <label ref="jr:itext('/pregnancy_home_visit/danger_signs:label')"/>
      <input ref="/pregnancy_home_visit/danger_signs/danger_signs_note">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/danger_signs_note:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/danger_signs/danger_signs_question_note">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/danger_signs_question_note:label')"/>
      </input>
      <select1 ref="/pregnancy_home_visit/danger_signs/vaginal_bleeding">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/vaginal_bleeding:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/vaginal_bleeding/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/vaginal_bleeding/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_home_visit/danger_signs/fits">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/fits:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/fits/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/fits/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_home_visit/danger_signs/severe_abdominal_pain">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/severe_abdominal_pain:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/severe_abdominal_pain/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/severe_abdominal_pain/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_home_visit/danger_signs/severe_headache">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/severe_headache:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/severe_headache/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/severe_headache/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_home_visit/danger_signs/very_pale">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/very_pale:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/very_pale/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/very_pale/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_home_visit/danger_signs/fever">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/fever:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/fever/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/fever/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_home_visit/danger_signs/breaking_water">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/breaking_water:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/breaking_water/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/breaking_water/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_home_visit/danger_signs/easily_tired">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/easily_tired:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/easily_tired/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/easily_tired/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_home_visit/danger_signs/face_hand_swelling">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/face_hand_swelling:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/face_hand_swelling/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/face_hand_swelling/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy_home_visit/danger_signs/breathlessness">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/breathlessness:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/breathlessness/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_home_visit/danger_signs/breathlessness/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <input ref="/pregnancy_home_visit/danger_signs/congratulate_no_ds_note">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/congratulate_no_ds_note:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/danger_signs/refer_patient_note_1">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/refer_patient_note_1:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/danger_signs/refer_patient_note_2">
        <label ref="jr:itext('/pregnancy_home_visit/danger_signs/refer_patient_note_2:label')"/>
      </input>
    </group>
    <group ref="/pregnancy_home_visit/safe_pregnancy_practices">
      <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices:label')"/>
      <group appearance="field-list" ref="/pregnancy_home_visit/safe_pregnancy_practices/malaria">
        <select1 ref="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <input ref="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_advice_note">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_advice_note:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/safe_pregnancy_practices/malaria/malaria_prophylaxis_note">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/malaria/malaria_prophylaxis_note:label')"/>
        </input>
      </group>
      <group appearance="field-list" ref="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate">
        <select1 ref="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <input ref="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_note">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_note:label')"/>
        </input>
      </group>
      <group appearance="field-list" ref="/pregnancy_home_visit/safe_pregnancy_practices/deworming">
        <select1 ref="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <input ref="/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med_note">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/deworming/deworming_med_note:label')"/>
        </input>
      </group>
      <group ref="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips">
        <input ref="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/eat_more_note">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/eat_more_note:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/talk_softly_note">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/talk_softly_note:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/respond_move_note">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/respond_move_note:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/deliver_hf_note">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/safe_practices_tips/deliver_hf_note:label')"/>
        </input>
      </group>
      <group appearance="field-list" ref="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status">
        <select1 ref="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <input ref="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_importance_note">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_importance_note:label')"/>
        </input>
      </group>
      <group appearance="field-list" ref="/pregnancy_home_visit/safe_pregnancy_practices/tetanus">
        <select1 ref="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_imm_received/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <input ref="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_note_1">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_note_1:label')"/>
        </input>
        <input ref="/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_note_2">
          <label ref="jr:itext('/pregnancy_home_visit/safe_pregnancy_practices/tetanus/tt_note_2:label')"/>
        </input>
      </group>
    </group>
    <group appearance="field-list summary" ref="/pregnancy_home_visit/summary">
      <input ref="/pregnancy_home_visit/summary/r_submit_note">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_submit_note:label')"/>
      </input>
      <input appearance="h1 yellow" ref="/pregnancy_home_visit/summary/r_summary_details">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_summary_details:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/summary/r_patient_details">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_patient_details:label')"/>
      </input>
      <input appearance="h1 blue" ref="/pregnancy_home_visit/summary/r_summary">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_summary:label')"/>
      </input>
      <input appearance="center" ref="/pregnancy_home_visit/summary/r_pregnancy_details">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_pregnancy_details:label')"/>
      </input>
      <input appearance="center" ref="/pregnancy_home_visit/summary/r_pregnancy_details_unknown">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_pregnancy_details_unknown:label')"/>
      </input>
      <input appearance="h3 blue center underline" ref="/pregnancy_home_visit/summary/r_risk_factors">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_risk_factors:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_risk_heart_condition">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_risk_heart_condition:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_risk_asthma">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_risk_asthma:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_risk_high_blood_pressure">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_risk_high_blood_pressure:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_risk_diabetes">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_risk_diabetes:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_risk_additional">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_risk_additional:label')"/>
      </input>
      <input appearance="h3 blue center underline" ref="/pregnancy_home_visit/summary/r_danger_signs">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_danger_signs:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_danger_sign_vaginal_bleeding">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_danger_sign_vaginal_bleeding:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_danger_sign_fits">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_danger_sign_fits:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_danger_sign_severe_abdominal_pain">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_danger_sign_severe_abdominal_pain:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_danger_sign_severe_headache">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_danger_sign_severe_headache:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_danger_sign_very_pale">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_danger_sign_very_pale:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_danger_sign_fever">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_danger_sign_fever:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_danger_sign_reduced_or_no_fetal_movements">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_danger_sign_reduced_or_no_fetal_movements:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_danger_sign_breaking_water">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_danger_sign_breaking_water:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_danger_sign_easily_tired">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_danger_sign_easily_tired:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_danger_sign_face_hand_swelling">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_danger_sign_face_hand_swelling:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_danger_sign_breathlessness">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_danger_sign_breathlessness:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/summary/r_space_1"/>
      <input appearance="h1 lime" ref="/pregnancy_home_visit/summary/r_referrals">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_referrals:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/summary/r_refer_clinic_immediately">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_refer_clinic_immediately:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_refer_danger_sign">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_refer_danger_sign:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/summary/r_routine_anc">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_routine_anc:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/summary/r_request_services">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_request_services:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_request_service_tt">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_request_service_tt:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_request_service_hiv_test">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_request_service_hiv_test:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_request_service_deworming">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_request_service_deworming:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_home_visit/summary/r_request_service_iron">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_request_service_iron:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/summary/r_who_recommends">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_who_recommends:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/summary/r_refer_hf_appropriate_time">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_refer_hf_appropriate_time:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/summary/r_refer_hf_immediately">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_refer_hf_immediately:label')"/>
      </input>
      <input appearance="h1 green" ref="/pregnancy_home_visit/summary/r_follow_up_tasks">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_follow_up_tasks:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/summary/r_following_tasks">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_following_tasks:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/summary/r_fup_danger_sign">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_fup_danger_sign:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/summary/r_fup_hf_visit">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_fup_hf_visit:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/summary/r_fup_pregnancy_visit">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_fup_pregnancy_visit:label')"/>
      </input>
      <input ref="/pregnancy_home_visit/summary/r_fup_pregnancy_visit_2_weeks">
        <label ref="jr:itext('/pregnancy_home_visit/summary/r_fup_pregnancy_visit_2_weeks:label')"/>
      </input>
      <group appearance="hidden" ref="/pregnancy_home_visit/summary/custom_translations">
        <select1 ref="/pregnancy_home_visit/summary/custom_translations/custom_woman_label_translator">
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/summary/custom_translations/custom_woman_label_translator/woman:label')"/>
            <value>woman</value>
          </item>
        </select1>
        <select1 ref="/pregnancy_home_visit/summary/custom_translations/custom_woman_start_label_translator">
          <item>
            <label ref="jr:itext('/pregnancy_home_visit/summary/custom_translations/custom_woman_start_label_translator/woman-start:label')"/>
            <value>woman-start</value>
          </item>
        </select1>
      </group>
    </group>
    <group appearance="hidden" ref="/pregnancy_home_visit/data">
      <group ref="/pregnancy_home_visit/data/meta"/>
    </group>
  </h:body>
</h:html>
`,   
};
