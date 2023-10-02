/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="pregnancy">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Pregnancy registration</h3>
<select id="form-languages" style="display:none;" data-default-lang=""><option value="en">en</option> </select>
  
  
    <section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pregnancy/inputs" data-relevant="./source = 'user'"><section class="or-group " name="/pregnancy/inputs/user"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy/inputs/user:label">User</span></h4>
<label class="question non-select or-appearance-select-contact or-appearance-type-person "><span lang="en" class="question-label active" data-itext-id="/pregnancy/inputs/user/contact_id:label">Contact ID</span><input type="text" name="/pregnancy/inputs/user/contact_id" data-type-xml="string"></label><section class="or-group-data " name="/pregnancy/inputs/user/parent">
      </section>
      </section><section class="or-group-data " name="/pregnancy/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/pregnancy/inputs/contact/_id:label">What is the patient's name?</span><input type="text" name="/pregnancy/inputs/contact/_id" data-type-xml="person"></label><section class="or-group-data " name="/pregnancy/inputs/contact/parent"><section class="or-group-data " name="/pregnancy/inputs/contact/parent/parent"><section class="or-group-data " name="/pregnancy/inputs/contact/parent/parent/contact">
      </section>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group " name="/pregnancy/gestational_age"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age:label">Gestational Age</span></h4>
<section class="or-group-data or-appearance-field-list " name="/pregnancy/gestational_age/register_method"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/register_method/register_note:label">Registering a pregnancy will help you to provide timely guidance and support to the pregnant woman.</span><input type="text" name="/pregnancy/gestational_age/register_method/register_note" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/register_method/lmp_method:label">How would you like to report the pregnancy?</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy/gestational_age/register_method/lmp_method:hint">Select one.</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/gestational_age/register_method/lmp_method" data-name="/pregnancy/gestational_age/register_method/lmp_method" value="method_lmp" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/gestational_age/register_method/lmp_method/method_lmp:label">Last menstrual period (LMP)</span></label><label class=""><input type="radio" name="/pregnancy/gestational_age/register_method/lmp_method" data-name="/pregnancy/gestational_age/register_method/lmp_method" value="method_approx" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/gestational_age/register_method/lmp_method/method_approx:label">Current weeks or months pregnant</span></label><label class=""><input type="radio" name="/pregnancy/gestational_age/register_method/lmp_method" data-name="/pregnancy/gestational_age/register_method/lmp_method" value="method_edd" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/gestational_age/register_method/lmp_method/method_edd:label">Expected date of delivery (EDD)</span></label><label class=""><input type="radio" name="/pregnancy/gestational_age/register_method/lmp_method" data-name="/pregnancy/gestational_age/register_method/lmp_method" value="method_none" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/gestational_age/register_method/lmp_method/method_none:label">No information is known</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
      </section><section class="or-group-data or-branch pre-init " name="/pregnancy/gestational_age/method_lmp" data-relevant="selected(../register_method/lmp_method, 'method_lmp')"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_lmp/u_lmp_date:label">Please enter the start date of the LMP.</span><span class="required">*</span><input type="date" name="/pregnancy/gestational_age/method_lmp/u_lmp_date" data-required="true()" data-constraint=". &lt;= date-time(decimal-date-time(today()) - (1 * 30)) and . &gt;= date-time(decimal-date-time(today()) - (9 * 30))" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/gestational_age/method_lmp/u_lmp_date:jr:constraintMsg">Start date cannot be less than 1 month ago. Start date cannot be more than 9 months in the future.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section><section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pregnancy/gestational_age/method_approx" data-relevant="selected(../register_method/lmp_method, 'method_approx')"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_approx/lmp_approx:label">Would you like to report the pregnancy in weeks or months?</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy/gestational_age/method_approx/lmp_approx:hint">Select one.</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/gestational_age/method_approx/lmp_approx" data-name="/pregnancy/gestational_age/method_approx/lmp_approx" value="approx_weeks" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/gestational_age/method_approx/lmp_approx/approx_weeks:label">Weeks</span></label><label class=""><input type="radio" name="/pregnancy/gestational_age/method_approx/lmp_approx" data-name="/pregnancy/gestational_age/method_approx/lmp_approx" value="approx_months" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/gestational_age/method_approx/lmp_approx/approx_months:label">Months</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_approx/lmp_approx_weeks:label">Weeks</span><span class="required">*</span><input type="number" name="/pregnancy/gestational_age/method_approx/lmp_approx_weeks" data-required="true()" data-constraint=". &gt;= 4 and . &lt;= 40" data-relevant="selected(../lmp_approx, 'approx_weeks')" data-type-xml="int"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/gestational_age/method_approx/lmp_approx_weeks:jr:constraintMsg">Must be between 4 and 40.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_approx/lmp_approx_months:label">Months</span><span class="required">*</span><input type="number" name="/pregnancy/gestational_age/method_approx/lmp_approx_months" data-required="true()" data-constraint=". &gt;= 1 and . &lt;= 9" data-relevant="selected(../lmp_approx, 'approx_months')" data-type-xml="int"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/gestational_age/method_approx/lmp_approx_months:jr:constraintMsg">Must be between 1 and 9.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section><section class="or-group-data or-branch pre-init " name="/pregnancy/gestational_age/method_edd" data-relevant="selected(../register_method/lmp_method, 'method_edd')"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_edd/u_edd:label">Please enter the expected date of delivery.</span><span class="required">*</span><input type="date" name="/pregnancy/gestational_age/method_edd/u_edd" data-required="true()" data-constraint=". &gt;= today() and . &lt;= date-time(decimal-date-time(today()) + (9 * 30))" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/gestational_age/method_edd/u_edd:jr:constraintMsg">Date cannot be in the past. Date cannot be more than 9 months in the future.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section><section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pregnancy/gestational_age/method_lmp_summary" data-relevant="not(selected(../register_method/lmp_method, 'method_none'))"><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_lmp_summary/lmp_check_note:label">You entered an LMP of: <strong><span class="or-output" data-value=" /pregnancy/gestational_age/g_lmp_date "> </span></strong></span></span><input type="text" name="/pregnancy/gestational_age/method_lmp_summary/lmp_check_note" data-relevant="selected(../../register_method/lmp_method, 'method_lmp')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_lmp_summary/lmp_approx_weeks_check_note:label">You entered <strong><span class="or-output" data-value=" /pregnancy/gestational_age/method_approx/lmp_approx_weeks "> </span> weeks</strong> pregnant.</span><input type="text" name="/pregnancy/gestational_age/method_lmp_summary/lmp_approx_weeks_check_note" data-relevant="selected(../../method_approx/lmp_approx, 'approx_weeks')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_lmp_summary/lmp_approx_months_check_note:label">You entered <strong><span class="or-output" data-value=" /pregnancy/gestational_age/method_approx/lmp_approx_months "> </span> months</strong> pregnant.</span><input type="text" name="/pregnancy/gestational_age/method_lmp_summary/lmp_approx_months_check_note" data-relevant="selected(../../method_approx/lmp_approx, 'approx_months')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_lmp_summary/u_edd_note:label">You entered the EDD: <strong><span class="or-output" data-value=" /pregnancy/gestational_age/g_edd "> </span></strong></span><input type="text" name="/pregnancy/gestational_age/method_lmp_summary/u_edd_note" data-relevant="selected(../../register_method/lmp_method, 'method_edd')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_lmp_summary/edd_note:label">The estimated date of delivery is: <strong><span class="or-output" data-value=" /pregnancy/gestational_age/g_edd "> </span></strong></span></span><input type="text" name="/pregnancy/gestational_age/method_lmp_summary/edd_note" data-relevant="selected(../../register_method/lmp_method, 'method_lmp') or selected(../../method_approx/lmp_approx, 'approx_weeks') or selected(../../method_approx/lmp_approx, 'approx_months')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_lmp_summary/lmp_note:label"><span class="or-output" data-value=" /pregnancy/patient_short_name_start "> </span> is currently <span style="font-family:monospace"><span class="or-output" data-value=" /pregnancy/weeks_since_lmp_rounded "> </span> weeks</span> pregnant.</span><input type="text" name="/pregnancy/gestational_age/method_lmp_summary/lmp_note" data-relevant="selected(../../register_method/lmp_method, 'method_edd')" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_lmp_summary/edd_check_note:label">If this seems incorrect, click "&lt; Prev" and update the pregnancy information.</span><input type="text" name="/pregnancy/gestational_age/method_lmp_summary/edd_check_note" data-type-xml="string" readonly></label>
      </section><section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pregnancy/gestational_age/method_none" data-relevant="selected(../register_method/lmp_method, 'method_none')"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_none/no_info_notice:label">You selected "No information is known."</span><input type="text" name="/pregnancy/gestational_age/method_none/no_info_notice" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason:label">Why do you want to register <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span>?</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason:hint">Select one.</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason" data-name="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason" value="visibly_pregnant" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason/visibly_pregnant:label">The woman is visibly pregnant but does not know for how long.</span></label><label class=""><input type="radio" name="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason" data-name="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason" value="test_positive" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason/test_positive:label">You performed a pregnancy test and it is positive but the woman does not know the age of the pregnancy or LMP.</span></label><label class=""><input type="radio" name="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason" data-name="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason" value="missed_periods" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason/missed_periods:label">The woman is not on any family planning methods and has missed her periods.</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/gestational_age/method_none/pregnancy_confirm_note:label">Refer <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> to the health facility to confirm. You will receive tasks every two weeks to check in on the pregnancy. Schedule will follow WHO recommendations once LMP or EDD is entered.</span><input type="text" name="/pregnancy/gestational_age/method_none/pregnancy_confirm_note" data-type-xml="string" readonly></label>
      </section>
      </section>
    <section class="or-group-data or-branch pre-init " name="/pregnancy/anc_visits_hf" data-relevant="not(selected(../gestational_age/register_method/lmp_method, 'method_none'))"><section class="or-group " name="/pregnancy/anc_visits_hf/anc_visits_hf_past"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past:label">ANC Visits at Health Facility (Past)</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count:label">How many times has <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> been to the health facility for ANC?</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count:hint">Enter 0 if she has not been yet.</span><input type="number" name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count" data-required="true()" data-constraint=".&gt;= 0 and . &lt;= 9" data-type-xml="int"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count:jr:constraintMsg">Must be an integer between 0 and 9.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><section class="or-group-data or-appearance-field-list " name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group"><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_count_confim_note_single:label">You entered that <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> has attended 1 ANC visit at the health facility.</span><input type="text" name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_count_confim_note_single" data-relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  = 1" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_count_confim_note_multiple:label">You entered that <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> has attended <span class="or-output" data-value=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count "> </span> ANC visits at the health facility.</span><input type="text" name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_count_confim_note_multiple" data-relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1" data-type-xml="string" readonly></label><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single:label">Please enter the date if you know it.</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single" data-name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single" value="no" data-required="true()" data-relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  = 1" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single/no:label">I don't know</span></label><label class=""><input type="radio" name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single" data-name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single" value="yes" data-required="true()" data-relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  = 1" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single/yes:label">Enter date</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_single:label">Date</span><span class="required">*</span><input type="date" name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_single" data-required="true()" data-constraint=". &lt;= today() and . &gt;=  /pregnancy/gestational_age/g_lmp_date_8601 " data-relevant="selected(../visited_date_ask_single, 'yes')" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_single:jr:constraintMsg">Enter the correct date. Date must be within this pregnancy and cannot be in the future.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_multiple_note:label">Please enter the dates if you have them.</span><input type="text" name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_multiple_note" data-relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_multiple_note_section:label">Each "Visit" section below asks about one individual visit. Please complete all sections.</span><input type="text" name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_multiple_note_section" data-relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1" data-type-xml="string" readonly></label><section class="or-group or-branch pre-init " name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates" data-relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1"><h4></h4>
<section class="or-repeat " name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates"><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple:label">Visit</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple" data-name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple" value="no" data-required="true()" data-relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple/no:label">I don't know</span></label><label class=""><input type="radio" name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple" data-name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple" value="yes" data-required="true()" data-relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple/yes:label">Enter date</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date:label">Date</span><span class="required">*</span><input type="date" name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date" data-required="true()" data-constraint=". &lt;= today() and . &gt;=  /pregnancy/gestational_age/g_lmp_date_8601 " data-relevant="selected(../visited_date_ask_multiple, 'yes')" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date:jr:constraintMsg">Enter the correct date. Date must be within this pregnancy and cannot be in the future.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section><div class="or-repeat-info" data-name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates" data-repeat-count=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_count "></div>
      </section>
      </section>
      </section><section class="or-group " name="/pregnancy/anc_visits_hf/anc_visits_hf_next"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_next:label">ANC Visits at Health Facility (Scheduled)</span></h4>
<section class="or-group-data or-appearance-field-list " name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known:label">If <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> has a specific upcoming ANC appointment date, enter it here. You will receive a task three days before to remind her to attend.</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known" data-name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known/no:label">I don't know</span></label><label class=""><input type="radio" name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known" data-name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known/yes:label">Enter date</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span class="required">*</span><input type="date" name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date" data-required="true()" data-constraint="(. &gt;= today()) and (decimal-date-time(.) &lt;= decimal-date-time(today()) + 30)" data-relevant="selected(../appointment_date_known, 'yes')" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date:jr:constraintMsg">Date cannot be in the past. Date cannot be more than one month from today.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section><section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note" data-relevant="selected(../anc_next_visit_date/appointment_date_known, 'no')"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/who_recommends_note:label">The WHO recommends ANC visits at 12, 20, 26, 30, 34, 36, 38, 40 weeks.</span><input type="text" name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/who_recommends_note" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/prenancy_age_note:label"><span class="or-output" data-value=" /pregnancy/patient_short_name_start "> </span> is <strong><span class="or-output" data-value=" /pregnancy/weeks_since_lmp_rounded "> </span> weeks</strong> pregnant.</span><input type="text" name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/prenancy_age_note" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/refer_note:label">Please refer <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> to the health facility at the appropriate time.</span><input type="text" name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/refer_note" data-type-xml="string" readonly></label>
      </section>
      </section>
      </section>
    <section class="or-group " name="/pregnancy/risk_factors"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy/risk_factors:label">Risk Factors</span></h4>
<section class="or-group-data or-appearance-field-list " name="/pregnancy/risk_factors/risk_factors_history"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_history/first_pregnancy:label">Is this <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span>'s first pregnancy?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/risk_factors/risk_factors_history/first_pregnancy" data-name="/pregnancy/risk_factors/risk_factors_history/first_pregnancy" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_history/first_pregnancy/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/risk_factors/risk_factors_history/first_pregnancy" data-name="/pregnancy/risk_factors/risk_factors_history/first_pregnancy" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_history/first_pregnancy/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage:label">Has <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> had any miscarriages or stillbirths?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage" data-name="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage" data-name="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
      </section><section class="or-group-data or-appearance-field-list " name="/pregnancy/risk_factors/risk_factors_present"><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/primary_condition:label">Does <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> have any of these risk factors?</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/primary_condition:hint">Select all that apply.</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/pregnancy/risk_factors/risk_factors_present/primary_condition" value="heart_condition" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-relevant="selected(../../risk_factors_history/first_pregnancy, 'yes')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/primary_condition/heart_condition:label">Heart condition</span></label><label class=""><input type="checkbox" name="/pregnancy/risk_factors/risk_factors_present/primary_condition" value="asthma" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-relevant="selected(../../risk_factors_history/first_pregnancy, 'yes')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/primary_condition/asthma:label">Asthma</span></label><label class=""><input type="checkbox" name="/pregnancy/risk_factors/risk_factors_present/primary_condition" value="high_blood_pressure" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-relevant="selected(../../risk_factors_history/first_pregnancy, 'yes')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/primary_condition/high_blood_pressure:label">High blood pressure</span></label><label class=""><input type="checkbox" name="/pregnancy/risk_factors/risk_factors_present/primary_condition" value="diabetes" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-relevant="selected(../../risk_factors_history/first_pregnancy, 'yes')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/primary_condition/diabetes:label">Diabetes</span></label><label class=""><input type="checkbox" name="/pregnancy/risk_factors/risk_factors_present/primary_condition" value="none" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-relevant="selected(../../risk_factors_history/first_pregnancy, 'yes')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/primary_condition/none:label">None of the above</span></label>
</div>
</fieldset>
<span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/primary_condition:jr:constraintMsg">If "None of the above" selected, cannot select any other option.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/secondary_condition:label">Does <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> have any of these risk factors?</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/secondary_condition:hint">Select all that apply.</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/pregnancy/risk_factors/risk_factors_present/secondary_condition" value="previous_difficulties" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-relevant="selected(../../risk_factors_history/first_pregnancy, 'no')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/previous_difficulties:label">Previous difficulties in childbirth</span></label><label class=""><input type="checkbox" name="/pregnancy/risk_factors/risk_factors_present/secondary_condition" value="more_than_4_children" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-relevant="selected(../../risk_factors_history/first_pregnancy, 'no')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/more_than_4_children:label">Has delivered four or more children</span></label><label class=""><input type="checkbox" name="/pregnancy/risk_factors/risk_factors_present/secondary_condition" value="last_baby_born_less_than_1_year_ago" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-relevant="selected(../../risk_factors_history/first_pregnancy, 'no')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/last_baby_born_less_than_1_year_ago:label">Last baby born less than one year ago</span></label><label class=""><input type="checkbox" name="/pregnancy/risk_factors/risk_factors_present/secondary_condition" value="heart_condition" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-relevant="selected(../../risk_factors_history/first_pregnancy, 'no')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/heart_condition:label">Heart condition</span></label><label class=""><input type="checkbox" name="/pregnancy/risk_factors/risk_factors_present/secondary_condition" value="asthma" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-relevant="selected(../../risk_factors_history/first_pregnancy, 'no')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/asthma:label">Asthma</span></label><label class=""><input type="checkbox" name="/pregnancy/risk_factors/risk_factors_present/secondary_condition" value="high_blood_pressure" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-relevant="selected(../../risk_factors_history/first_pregnancy, 'no')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/high_blood_pressure:label">High blood pressure</span></label><label class=""><input type="checkbox" name="/pregnancy/risk_factors/risk_factors_present/secondary_condition" value="diabetes" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-relevant="selected(../../risk_factors_history/first_pregnancy, 'no')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/diabetes:label">Diabetes</span></label><label class=""><input type="checkbox" name="/pregnancy/risk_factors/risk_factors_present/secondary_condition" value="none" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-relevant="selected(../../risk_factors_history/first_pregnancy, 'no')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/none:label">None of the above</span></label>
</div>
</fieldset>
<span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/secondary_condition:jr:constraintMsg">If "None of the above" selected, cannot select any other option.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/additional_risk_check:label">Are there additional factors that could make this pregnancy high-risk?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/risk_factors/risk_factors_present/additional_risk_check" data-name="/pregnancy/risk_factors/risk_factors_present/additional_risk_check" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/additional_risk_check/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/risk_factors/risk_factors_present/additional_risk_check" data-name="/pregnancy/risk_factors/risk_factors_present/additional_risk_check" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/additional_risk_check/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/additional_risk:label">If yes, please describe.</span><span class="required">*</span><input type="text" name="/pregnancy/risk_factors/risk_factors_present/additional_risk" data-required="true()" data-constraint="string-length(.) &lt;= 100" data-relevant="selected(../additional_risk_check, 'yes')" data-type-xml="string"><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy/risk_factors/risk_factors_present/additional_risk:jr:constraintMsg">max characters = 100</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section>
      </section>
    <section class="or-group or-appearance-field-list " name="/pregnancy/danger_signs"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs:label">Danger Sign Check</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/danger_signs_note:label">Ask <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> to monitor these danger signs throughout the pregnancy.</span><input type="text" name="/pregnancy/danger_signs/danger_signs_note" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/danger_signs_question_note:label">Does <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> currently have any of these danger signs?</span><input type="text" name="/pregnancy/danger_signs/danger_signs_question_note" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/vaginal_bleeding:label">Vaginal bleeding</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/danger_signs/vaginal_bleeding" data-name="/pregnancy/danger_signs/vaginal_bleeding" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/vaginal_bleeding/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/danger_signs/vaginal_bleeding" data-name="/pregnancy/danger_signs/vaginal_bleeding" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/vaginal_bleeding/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/fits:label">Fits</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/danger_signs/fits" data-name="/pregnancy/danger_signs/fits" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/fits/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/danger_signs/fits" data-name="/pregnancy/danger_signs/fits" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/fits/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/severe_abdominal_pain:label">Severe abdominal pain</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/danger_signs/severe_abdominal_pain" data-name="/pregnancy/danger_signs/severe_abdominal_pain" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/severe_abdominal_pain/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/danger_signs/severe_abdominal_pain" data-name="/pregnancy/danger_signs/severe_abdominal_pain" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/severe_abdominal_pain/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/severe_headache:label">Severe headache</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/danger_signs/severe_headache" data-name="/pregnancy/danger_signs/severe_headache" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/severe_headache/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/danger_signs/severe_headache" data-name="/pregnancy/danger_signs/severe_headache" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/severe_headache/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/very_pale:label">Very pale</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/danger_signs/very_pale" data-name="/pregnancy/danger_signs/very_pale" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/very_pale/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/danger_signs/very_pale" data-name="/pregnancy/danger_signs/very_pale" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/very_pale/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/fever:label">Fever</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/danger_signs/fever" data-name="/pregnancy/danger_signs/fever" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/fever/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/danger_signs/fever" data-name="/pregnancy/danger_signs/fever" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/fever/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/reduced_or_no_fetal_movements:label">Reduced or no fetal movements</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/danger_signs/reduced_or_no_fetal_movements" data-name="/pregnancy/danger_signs/reduced_or_no_fetal_movements" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/reduced_or_no_fetal_movements/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/danger_signs/reduced_or_no_fetal_movements" data-name="/pregnancy/danger_signs/reduced_or_no_fetal_movements" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/reduced_or_no_fetal_movements/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/breaking_water:label">Breaking of water</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/danger_signs/breaking_water" data-name="/pregnancy/danger_signs/breaking_water" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/breaking_water/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/danger_signs/breaking_water" data-name="/pregnancy/danger_signs/breaking_water" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/breaking_water/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/easily_tired:label">Getting tired easily</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/danger_signs/easily_tired" data-name="/pregnancy/danger_signs/easily_tired" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/easily_tired/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/danger_signs/easily_tired" data-name="/pregnancy/danger_signs/easily_tired" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/easily_tired/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/face_hand_swelling:label">Swelling of face and hands</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/danger_signs/face_hand_swelling" data-name="/pregnancy/danger_signs/face_hand_swelling" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/face_hand_swelling/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/danger_signs/face_hand_swelling" data-name="/pregnancy/danger_signs/face_hand_swelling" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/face_hand_swelling/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/breathlessness:label">Breathlessness</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/danger_signs/breathlessness" data-name="/pregnancy/danger_signs/breathlessness" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/breathlessness/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/danger_signs/breathlessness" data-name="/pregnancy/danger_signs/breathlessness" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/danger_signs/breathlessness/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/congratulate_no_ds_note:label">Great news! Please closely monitor her until her next scheduled pregnancy visit.</span><input type="text" name="/pregnancy/danger_signs/congratulate_no_ds_note" data-relevant="../r_danger_sign_present = 'no'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/refer_patient_note_1:label"><span style="color:red">Please refer to the health facility immediately. Accompany her if possible.</span></span><input type="text" name="/pregnancy/danger_signs/refer_patient_note_1" data-relevant="../r_danger_sign_present = 'yes'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/danger_signs/refer_patient_note_2:label"><span style="color:red">Please complete the follow-up task within 3 days.</span></span><input type="text" name="/pregnancy/danger_signs/refer_patient_note_2" data-relevant="../r_danger_sign_present = 'yes'" data-type-xml="string" readonly></label>
      </section>
    <section class="or-group " name="/pregnancy/safe_pregnancy_practices"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices:label">Safe Pregnancy Practices</span></h4>
<section class="or-group-data or-appearance-field-list " name="/pregnancy/safe_pregnancy_practices/malaria"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/malaria/uses_llin:label">Does <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> use a long-lasting insecticidal net (LLIN)?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/safe_pregnancy_practices/malaria/uses_llin" data-name="/pregnancy/safe_pregnancy_practices/malaria/uses_llin" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/malaria/uses_llin/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/safe_pregnancy_practices/malaria/uses_llin" data-name="/pregnancy/safe_pregnancy_practices/malaria/uses_llin" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/malaria/uses_llin/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/malaria/llin_advice_note:label">Sleeping under a LLIN <strong>EVERY night</strong> prevents malaria.</span><input type="text" name="/pregnancy/safe_pregnancy_practices/malaria/llin_advice_note" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/malaria/malaria_prophylaxis_note:label">Get malaria prophylaxis in second trimester if living in malaria endemic area.</span><input type="text" name="/pregnancy/safe_pregnancy_practices/malaria/malaria_prophylaxis_note" data-type-xml="string" readonly></label>
      </section><section class="or-group-data or-appearance-field-list " name="/pregnancy/safe_pregnancy_practices/iron_folate"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily:label">Is <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> taking iron folate daily?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily" data-name="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily" data-name="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_note:label">Iron folate aids in the development of child's brain and spinal cord. It also prevents premature birth, sepsis, anemia and low birth weight.</span><input type="text" name="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_note" data-type-xml="string" readonly></label>
      </section><section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pregnancy/safe_pregnancy_practices/deworming" data-relevant=" /pregnancy/weeks_since_lmp  &gt; 12"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/deworming/deworming_med:label">Has <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> received deworming medication?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/safe_pregnancy_practices/deworming/deworming_med" data-name="/pregnancy/safe_pregnancy_practices/deworming/deworming_med" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/deworming/deworming_med/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/safe_pregnancy_practices/deworming/deworming_med" data-name="/pregnancy/safe_pregnancy_practices/deworming/deworming_med" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/deworming/deworming_med/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/deworming/deworming_med_note:label">Worms can affect the nutritional status of <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> and baby.</span><input type="text" name="/pregnancy/safe_pregnancy_practices/deworming/deworming_med_note" data-type-xml="string" readonly></label>
      </section><section class="or-group-data or-branch pre-init " name="/pregnancy/safe_pregnancy_practices/safe_practices_tips" data-relevant="not(selected(../../gestational_age/register_method/lmp_method, 'method_none'))"><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/safe_practices_tips/eat_more_note:label">Eat more often than usual and a balanced diet to give you strength and help the baby grow.</span><input type="text" name="/pregnancy/safe_pregnancy_practices/safe_practices_tips/eat_more_note" data-relevant=" /pregnancy/weeks_since_lmp  &lt;= 24" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/safe_practices_tips/talk_softly_note:label">Talk softly to the unborn baby. The baby can hear you and will be able to recognize voices.</span><input type="text" name="/pregnancy/safe_pregnancy_practices/safe_practices_tips/talk_softly_note" data-relevant=" /pregnancy/weeks_since_lmp  &gt;= 25 and  /pregnancy/weeks_since_lmp  &lt;= 30" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/safe_practices_tips/respond_move_note:label">Respond to the baby's movements-kicks by gentle touching or massaging your tummy.</span><input type="text" name="/pregnancy/safe_pregnancy_practices/safe_practices_tips/respond_move_note" data-relevant=" /pregnancy/weeks_since_lmp  &gt;= 25 and  /pregnancy/weeks_since_lmp  &lt;= 30" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/safe_practices_tips/deliver_hf_note:label">It's safest to deliver in a health facility. Discuss a birth plan with <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span>.</span><input type="text" name="/pregnancy/safe_pregnancy_practices/safe_practices_tips/deliver_hf_note" data-relevant=" /pregnancy/weeks_since_lmp  &gt;= 31" data-type-xml="string" readonly></label>
      </section><section class="or-group-data or-appearance-field-list " name="/pregnancy/safe_pregnancy_practices/hiv_status"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested:label">Has <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> been tested for HIV in the past 3 months?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested" data-name="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested" data-name="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_importance_note:label">Frequent testing ensures that <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> receives medicine to prevent transmission of HIV to the baby.</span><input type="text" name="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_importance_note" data-type-xml="string" readonly></label>
      </section><section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pregnancy/safe_pregnancy_practices/tetanus" data-relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 0"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received:label">Has <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> received any Tetanus Toxoid (TT) immunizations during this pregnancy?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received" data-name="/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received/yes:label">Yes</span></label><label class=""><input type="radio" name="/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received" data-name="/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/tetanus/tt_note_1:label">Immunizing with at least two doses of tetanus toxoid before or during pregnancy protects the newborn for the first few weeks of life and protects the mother.</span><input type="text" name="/pregnancy/safe_pregnancy_practices/tetanus/tt_note_1" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/safe_pregnancy_practices/tetanus/tt_note_2:label">Women can receive up to two TT vaccines per pregnancy. After five TT vaccines, they are vaccinated for life.</span><input type="text" name="/pregnancy/safe_pregnancy_practices/tetanus/tt_note_2" data-type-xml="string" readonly></label>
      </section>
      </section>
    <section class="or-group-data or-appearance-field-list or-appearance-summary " name="/pregnancy/summary"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_submit_note:label"><h4 style="text-align:center;">Click the Submit button at the bottom of the form.</h4></span><input type="text" name="/pregnancy/summary/r_submit_note" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-yellow "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_summary_details:label">Patient<i class="fa fa-user"></i></span><input type="text" name="/pregnancy/summary/r_summary_details" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_patient_details:label"><h2 style="text-align:center;margin-bottom:0px;"><span class="or-output" data-value=" /pregnancy/patient_name "> </span></h2> <p style="text-align:center;"><span class="or-output" data-value=" /pregnancy/patient_age_in_years "> </span> years old</p></span><input type="text" name="/pregnancy/summary/r_patient_details" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-blue "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_summary:label">Summary<I class="fa fa-user"></i></span><input type="text" name="/pregnancy/summary/r_summary" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_pregnancy_details:label"><p><span class="or-output" data-value=" /pregnancy/weeks_since_lmp_rounded "> </span> weeks pregnant.</p> <p> EDD: <span class="or-output" data-value=" /pregnancy/summary/edd_summary "> </span></p></span><input type="text" name="/pregnancy/summary/r_pregnancy_details" data-relevant="not(selected(../../gestational_age/register_method/lmp_method, 'method_none'))" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_pregnancy_details_unknown:label">Unknown weeks pregnant.</span><input type="text" name="/pregnancy/summary/r_pregnancy_details_unknown" data-relevant="selected(../../gestational_age/register_method/lmp_method, 'method_none')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h3 or-appearance-blue or-appearance-center or-appearance-underline "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_risk_factors:label">Risk Factors</span><input type="text" name="/pregnancy/summary/r_risk_factors" data-relevant="../../risk_factors/r_risk_factor_present = 'yes'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_risk_first_pregnancy:label">First pregnancy</span><input type="text" name="/pregnancy/summary/r_risk_first_pregnancy" data-relevant="selected(../../risk_factors/risk_factors_history/first_pregnancy, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_risk_previous_miscarriage:label">Previous miscarriages or stillbirths</span><input type="text" name="/pregnancy/summary/r_risk_previous_miscarriage" data-relevant="selected(../../risk_factors/risk_factors_history/previous_miscarriage, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_risk_previous_difficulties:label">Previous difficulties in childbirth</span><input type="text" name="/pregnancy/summary/r_risk_previous_difficulties" data-relevant="selected(../../risk_factors/risk_factors_present/secondary_condition, 'previous_difficulties')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_risk_more_than_4_children:label">Has delivered four or more children</span><input type="text" name="/pregnancy/summary/r_risk_more_than_4_children" data-relevant="selected(../../risk_factors/risk_factors_present/secondary_condition, 'more_than_4_children')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_risk_last_baby_born_less_than_1_year_ago:label">Last baby born less than one year ago</span><input type="text" name="/pregnancy/summary/r_risk_last_baby_born_less_than_1_year_ago" data-relevant="selected(../../risk_factors/risk_factors_present/secondary_condition, 'last_baby_born_less_than_1_year_ago')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_risk_heart_condition:label">Heart condition</span><input type="text" name="/pregnancy/summary/r_risk_heart_condition" data-relevant="selected(../../risk_factors/risk_factors_present/primary_condition, 'heart_condition') or selected(../../risk_factors/risk_factors_present/secondary_condition, 'heart_condition')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_risk_asthma:label">Asthma</span><input type="text" name="/pregnancy/summary/r_risk_asthma" data-relevant="selected(../../risk_factors/risk_factors_present/primary_condition, 'asthma') or selected(../../risk_factors/risk_factors_present/secondary_condition, 'asthma')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_risk_high_blood_pressure:label">High blood pressure</span><input type="text" name="/pregnancy/summary/r_risk_high_blood_pressure" data-relevant="selected(../../risk_factors/risk_factors_present/primary_condition, 'high_blood_pressure') or selected(../../risk_factors/risk_factors_present/secondary_condition, 'high_blood_pressure')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_risk_diabetes:label">Diabetes</span><input type="text" name="/pregnancy/summary/r_risk_diabetes" data-relevant="selected(../../risk_factors/risk_factors_present/primary_condition, 'diabetes') or selected(../../risk_factors/risk_factors_present/secondary_condition, 'diabetes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_risk_additional:label"> <span class="or-output" data-value=" /pregnancy/risk_factors/risk_factors_present/additional_risk "> </span></span><input type="text" name="/pregnancy/summary/r_risk_additional" data-relevant="selected(../../risk_factors/risk_factors_present/additional_risk_check, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h3 or-appearance-blue or-appearance-center or-appearance-underline "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_danger_signs:label">Danger Signs</span><input type="text" name="/pregnancy/summary/r_danger_signs" data-relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_danger_sign_vaginal_bleeding:label">Vaginal bleeding</span><input type="text" name="/pregnancy/summary/r_danger_sign_vaginal_bleeding" data-relevant="selected(../../danger_signs/vaginal_bleeding, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_danger_sign_fits:label">Fits</span><input type="text" name="/pregnancy/summary/r_danger_sign_fits" data-relevant="selected(../../danger_signs/fits, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_danger_sign_severe_abdominal_pain:label">Severe abdominal pain</span><input type="text" name="/pregnancy/summary/r_danger_sign_severe_abdominal_pain" data-relevant="selected(../../danger_signs/severe_abdominal_pain, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_danger_sign_severe_headache:label">Severe headache</span><input type="text" name="/pregnancy/summary/r_danger_sign_severe_headache" data-relevant="selected(../../danger_signs/severe_headache, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_danger_sign_very_pale:label">Very pale</span><input type="text" name="/pregnancy/summary/r_danger_sign_very_pale" data-relevant="selected(../../danger_signs/very_pale, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_danger_sign_fever:label">Fever</span><input type="text" name="/pregnancy/summary/r_danger_sign_fever" data-relevant="selected(../../danger_signs/fever, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_danger_sign_reduced_or_no_fetal_movements:label">Reduced or no fetal movements</span><input type="text" name="/pregnancy/summary/r_danger_sign_reduced_or_no_fetal_movements" data-relevant="selected(../../danger_signs/reduced_or_no_fetal_movements, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_danger_sign_breaking_water:label">Breaking of water</span><input type="text" name="/pregnancy/summary/r_danger_sign_breaking_water" data-relevant="selected(../../danger_signs/breaking_water, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_danger_sign_easily_tired:label">Getting tired easily</span><input type="text" name="/pregnancy/summary/r_danger_sign_easily_tired" data-relevant="selected(../../danger_signs/easily_tired, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_danger_sign_face_hand_swelling:label">Swelling of face and hands</span><input type="text" name="/pregnancy/summary/r_danger_sign_face_hand_swelling" data-relevant="selected(../../danger_signs/face_hand_swelling, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_danger_sign_breathlessness:label">Breathlessness</span><input type="text" name="/pregnancy/summary/r_danger_sign_breathlessness" data-relevant="selected(../../danger_signs/breathlessness, 'yes')" data-type-xml="string" readonly></label><label class="question non-select "><input type="text" name="/pregnancy/summary/r_space_1" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-lime "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_referrals:label">Referrals<I class="fa fa-hospital-o"></i></span><input type="text" name="/pregnancy/summary/r_referrals" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_refer_clinic_immediately:label">Refer to clinic immediately for:</span><input type="text" name="/pregnancy/summary/r_refer_clinic_immediately" data-relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_refer_danger_sign:label">Danger Sign</span><input type="text" name="/pregnancy/summary/r_refer_danger_sign" data-relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_routine_anc:label">Please attend ANC on: <span class="or-output" data-value=" /pregnancy/summary/next_appointment_date "> </span></span><input type="text" name="/pregnancy/summary/r_routine_anc" data-relevant="selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_request_services:label">Request the following services:</span><input type="text" name="/pregnancy/summary/r_request_services" data-relevant="selected(../../safe_pregnancy_practices/request_services, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_request_service_tt:label">TT</span><input type="text" name="/pregnancy/summary/r_request_service_tt" data-relevant="selected(../../safe_pregnancy_practices/tetanus/tt_imm_received, 'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_request_service_hiv_test:label">HIV test</span><input type="text" name="/pregnancy/summary/r_request_service_hiv_test" data-relevant="selected(../../safe_pregnancy_practices/hiv_status/hiv_tested, 'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_request_service_deworming:label">Deworming</span><input type="text" name="/pregnancy/summary/r_request_service_deworming" data-relevant="selected(../../safe_pregnancy_practices/deworming/deworming_med, 'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_request_service_iron:label">Iron folate</span><input type="text" name="/pregnancy/summary/r_request_service_iron" data-relevant="selected(../../safe_pregnancy_practices/iron_folate/iron_folate_daily, 'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_who_recommends:label">The WHO recommends routine ANC visits at 12, 20, 26, 30, 34, 36, 38, 40 weeks.</span><input type="text" name="/pregnancy/summary/r_who_recommends" data-relevant="selected(../../gestational_age/register_method/lmp_method, 'method_none') or selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_refer_hf_appropriate_time:label">Please refer <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> to the health facility at the appropriate time.</span><input type="text" name="/pregnancy/summary/r_refer_hf_appropriate_time" data-relevant="selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_refer_hf_immediately:label">Please refer <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> to the health facility immediately to receive the EDD and appropriate care.</span><input type="text" name="/pregnancy/summary/r_refer_hf_immediately" data-relevant="selected(../../gestational_age/register_method/lmp_method, 'method_none')" data-type-xml="string" readonly></label><label class="question non-select "><input type="text" name="/pregnancy/summary/r_space_2" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-green "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/check-:label">Follow-up Tasks<I class="fa fa-flag"></i></span><input type="text" name="/pregnancy/summary/check-" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_following_tasks:label">The following tasks will appear:</span><input type="text" name="/pregnancy/summary/r_following_tasks" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_fup_danger_sign:label">Please conduct a danger sign follow-up in 3 days.</span><input type="text" name="/pregnancy/summary/r_fup_danger_sign" data-relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_fup_hf_visit:label">Make sure <span class="or-output" data-value=" /pregnancy/patient_short_name "> </span> attends her clinic visit on <span class="or-output" data-value=" /pregnancy/summary/next_appointment_date "> </span>. Please remind her three days before.</span><input type="text" name="/pregnancy/summary/r_fup_hf_visit" data-relevant="selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_fup_pregnancy_visit:label">Please conduct the next pregnancy home visit in <span class="or-output" data-value=" /pregnancy/summary/next_visit_weeks "> </span> week(s).</span><input type="text" name="/pregnancy/summary/r_fup_pregnancy_visit" data-relevant="not(selected(../../gestational_age/register_method/lmp_method, 'method_none')) and ../next_visit_weeks &lt; 40 and ../next_visit_weeks &gt; 0" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy/summary/r_fup_pregnancy_visit_2_weeks:label">Please conduct the next pregnancy home visit in 2 weeks.</span><input type="text" name="/pregnancy/summary/r_fup_pregnancy_visit_2_weeks" data-relevant="selected(../../gestational_age/register_method/lmp_method, 'method_none')" data-type-xml="string" readonly></label><section class="or-group-data or-appearance-hidden " name="/pregnancy/summary/custom_translations"><fieldset class="question simple-select "><fieldset>
<legend>
          </legend>
<div class="option-wrapper"><label class=""><input type="radio" name="/pregnancy/summary/custom_translations/custom_woman_label_translator" data-name="/pregnancy/summary/custom_translations/custom_woman_label_translator" value="woman" data-calculate='"woman"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/summary/custom_translations/custom_woman_label_translator/woman:label">the woman</span></label></div>
</fieldset></fieldset>
<fieldset class="question simple-select "><fieldset>
<legend>
          </legend>
<div class="option-wrapper"><label class=""><input type="radio" name="/pregnancy/summary/custom_translations/custom_woman_start_label_translator" data-name="/pregnancy/summary/custom_translations/custom_woman_start_label_translator" value="woman-start" data-calculate='"woman-start"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy/summary/custom_translations/custom_woman_start_label_translator/woman-start:label">The woman</span></label></div>
</fieldset></fieldset>
      </section>
      </section>
    <section class="or-group-data or-appearance-hidden " name="/pregnancy/data"><section class="or-group-data " name="/pregnancy/data/meta">
      </section>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/pregnancy/patient_age_in_years" data-calculate="floor( difference-in-months( ../inputs/contact/date_of_birth, today() ) div 12 )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/patient_short_name" data-calculate="coalesce(../inputs/contact/short_name, ../summary/custom_translations/custom_woman_label)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/patient_short_name_start" data-calculate="coalesce(../inputs/contact/short_name, ../summary/custom_translations/custom_woman_start_label)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/lmp_date_8601" data-calculate="../gestational_age/g_lmp_date_8601" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/edd_8601" data-calculate="../gestational_age/g_edd_8601" data-type-xml="string"></label><label class="or-branch pre-init calculation non-select "><input type="hidden" name="/pregnancy/days_since_lmp" data-relevant="../lmp_date_8601 != ''" data-calculate="floor(decimal-date-time(today())) - decimal-date-time(../lmp_date_8601)" data-type-xml="string"></label><label class="or-branch pre-init calculation non-select "><input type="hidden" name="/pregnancy/weeks_since_lmp" data-relevant="../lmp_date_8601 != ''" data-calculate="round(../days_since_lmp div 7, 2)" data-type-xml="string"></label><label class="or-branch pre-init calculation non-select "><input type="hidden" name="/pregnancy/weeks_since_lmp_rounded" data-relevant="../lmp_date_8601 != ''" data-calculate="floor(../days_since_lmp div 7)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/lmp_method_approx" data-calculate="if(selected(../gestational_age/register_method/lmp_method, 'method_approx'), 'yes', 'no')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/hiv_status_known" data-calculate="../safe_pregnancy_practices/hiv_status/hiv_tested" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/deworming_med_received" data-calculate="../safe_pregnancy_practices/deworming/deworming_med" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/tt_received" data-calculate="../safe_pregnancy_practices/tetanus/tt_imm_received" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/t_pregnancy_follow_up_date" data-calculate="../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/t_pregnancy_follow_up" data-calculate="../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/t_danger_signs_referral_follow_up_date" data-calculate="date-time(decimal-date-time(today()) + 3)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/t_danger_signs_referral_follow_up" data-calculate="../danger_signs/r_danger_sign_present" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/gestational_age/g_lmp_date_8601" data-calculate="format-date-time( if(selected(../register_method/lmp_method, 'method_lmp'), ../method_lmp/u_lmp_date, if(selected(../method_approx/lmp_approx, 'approx_weeks'), date-time(decimal-date-time(today()) - (../method_approx/lmp_approx_weeks * 7)),  if(selected(../method_approx/lmp_approx, 'approx_months'), date-time(decimal-date-time(today()) - round(../method_approx/lmp_approx_months * 30.5)), if(selected(../register_method/lmp_method, 'method_edd'), date-time(decimal-date-time(../method_edd/u_edd) - 280), '') ))), &quot;%Y-%m-%d&quot;)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/gestational_age/g_lmp_date" data-calculate='format-date-time(../g_lmp_date_8601, "%e %b, %Y")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/gestational_age/g_edd_8601" data-calculate='format-date-time(date-time(decimal-date-time(../g_lmp_date_8601)+280),"%Y-%m-%d")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/gestational_age/g_edd" data-calculate='format-date-time(../g_edd_8601,"%e %b, %Y")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_count" data-calculate=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/risk_factors/r_risk_factor_present" data-calculate="if(selected(../risk_factors_history/first_pregnancy, 'yes') or selected(../risk_factors_history/previous_miscarriage, 'yes') or  not(selected(../risk_factors_present/primary_condition, 'none')) and ../risk_factors_present/primary_condition != '' or not(selected(../risk_factors_present/secondary_condition, 'none')) and ../risk_factors_present/secondary_condition != '' or selected(../risk_factors_present/additional_risk_check, 'yes') , 'yes', 'no')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/danger_signs/r_danger_sign_present" data-calculate="if(selected(../vaginal_bleeding, 'yes') or selected(../fits, 'yes') or selected(../severe_abdominal_pain, 'yes') or selected(../severe_headache, 'yes') or selected(../very_pale, 'yes') or selected(../fever, 'yes') or selected(../reduced_or_no_fetal_movements, 'yes') or selected(../breaking_water, 'yes') or selected(../easily_tired, 'yes') or selected(../face_hand_swelling, 'yes') or selected(../breathlessness, 'yes'),  'yes', if(selected(../vaginal_bleeding, 'no') and selected(../fits, 'no') and selected(../severe_abdominal_pain, 'no') and selected(../severe_headache, 'no') and selected(../very_pale, 'no') and selected(../fever, 'no') and selected(../reduced_or_no_fetal_movements, 'no') and selected(../breaking_water, 'no') and selected(../easily_tired, 'no') and selected(../face_hand_swelling, 'no') and selected(../breathlessness, 'no'), 'no', ''))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/safe_pregnancy_practices/request_services" data-calculate="if((selected(../tetanus/tt_imm_received, 'no') or selected(../hiv_status/hiv_tested, 'no') or selected(../deworming/deworming_med, 'no') or selected(../iron_folate/iron_folate_daily, 'no')), 'yes', 'no')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/summary/next_visit_weeks" data-calculate="round((if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 12*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 12*7, if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 20*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 20*7, if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 26*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 26*7, if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 30*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 30*7, if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 34*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 34*7, if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 36*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 36*7, if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 38*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 38*7, if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 40*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 40*7, 0 )))))))) - decimal-date-time(today())) div 7, 0)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/summary/edd_summary" data-calculate='format-date-time( /pregnancy/edd_8601 , "%e %b, %Y")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/summary/next_appointment_date" data-calculate='format-date-time( /pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date , "%e %b, %Y")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/summary/custom_translations/custom_woman_label" data-calculate="jr:choice-name( /pregnancy/summary/custom_translations/custom_woman_label_translator ,' /pregnancy/summary/custom_translations/custom_woman_label_translator ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/summary/custom_translations/custom_woman_start_label" data-calculate="jr:choice-name( /pregnancy/summary/custom_translations/custom_woman_start_label_translator ,' /pregnancy/summary/custom_translations/custom_woman_start_label_translator ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__lmp_method" data-calculate=" /pregnancy/gestational_age/register_method/lmp_method " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__no_lmp_registration_reason" data-calculate=" /pregnancy/gestational_age/method_none/no_info_pregnancy_reason " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__lmp_date" data-calculate=" /pregnancy/lmp_date_8601 " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__lmp_approx_weeks" data-calculate=" /pregnancy/gestational_age/method_approx/lmp_approx_weeks " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__lmp_approx_months" data-calculate=" /pregnancy/gestational_age/method_approx/lmp_approx_months " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__edd" data-calculate=" /pregnancy/edd_8601 " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__num_previous_anc_hf_visits" data-calculate=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__previous_anc_hf_visit_dates" data-calculate="coalesce( /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_single , join(',',  /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date ))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__next_anc_hf_visit_date_known" data-calculate=" /pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__next_anc_hf_visit_date" data-calculate=" /pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__has_risk_factors" data-calculate=" /pregnancy/risk_factors/r_risk_factor_present " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__first_pregnancy" data-calculate=" /pregnancy/risk_factors/risk_factors_history/first_pregnancy " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__previous_miscarriage" data-calculate=" /pregnancy/risk_factors/risk_factors_history/previous_miscarriage " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__previous_difficulties" data-calculate="if(selected( /pregnancy/risk_factors/risk_factors_present/secondary_condition , 'previous_difficulties'), &quot;yes&quot;, &quot;no&quot;)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__more_than_4_children" data-calculate="if(selected( /pregnancy/risk_factors/risk_factors_present/secondary_condition , 'more_than_4_children'), &quot;yes&quot;, &quot;no&quot;)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__last_baby_born_less_than_1_year_ago" data-calculate="if(selected( /pregnancy/risk_factors/risk_factors_present/secondary_condition , 'last_baby_born_less_than_1_year_ago'), &quot;yes&quot;, &quot;no&quot;)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__heart_condition" data-calculate="if(selected( /pregnancy/risk_factors/risk_factors_present/primary_condition , 'heart_condition'), &quot;yes&quot;, if(selected( /pregnancy/risk_factors/risk_factors_present/secondary_condition , 'heart_condition'), &quot;yes&quot;, &quot;no&quot;))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__asthma" data-calculate="if(selected( /pregnancy/risk_factors/risk_factors_present/primary_condition , 'asthma'), &quot;yes&quot;, if(selected( /pregnancy/risk_factors/risk_factors_present/secondary_condition , 'asthma'), &quot;yes&quot;, &quot;no&quot;))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__high_blood_pressure" data-calculate="if(selected( /pregnancy/risk_factors/risk_factors_present/primary_condition , 'high_blood_pressure'), &quot;yes&quot;, if(selected( /pregnancy/risk_factors/risk_factors_present/secondary_condition , 'high_blood_pressure'), &quot;yes&quot;, &quot;no&quot;))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__diabetes" data-calculate="if(selected( /pregnancy/risk_factors/risk_factors_present/primary_condition , 'diabetes'), &quot;yes&quot;, if(selected( /pregnancy/risk_factors/risk_factors_present/secondary_condition , 'diabetes'), &quot;yes&quot;, &quot;no&quot;))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__additional_high_risk_condition_to_report" data-calculate=" /pregnancy/risk_factors/risk_factors_present/additional_risk_check " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__additional_high_risk_condition" data-calculate=" /pregnancy/risk_factors/risk_factors_present/additional_risk " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__has_danger_sign" data-calculate=" /pregnancy/danger_signs/r_danger_sign_present " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__vaginal_bleeding" data-calculate=" /pregnancy/danger_signs/vaginal_bleeding " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__fits" data-calculate=" /pregnancy/danger_signs/fits " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__severe_abdominal_pain" data-calculate=" /pregnancy/danger_signs/severe_abdominal_pain " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__severe_headache" data-calculate=" /pregnancy/danger_signs/severe_headache " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__very_pale" data-calculate=" /pregnancy/danger_signs/very_pale " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__fever" data-calculate=" /pregnancy/danger_signs/fever " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__reduced_or_no_fetal_movements" data-calculate=" /pregnancy/danger_signs/reduced_or_no_fetal_movements " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__breaking_water" data-calculate=" /pregnancy/danger_signs/breaking_water " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__easily_tired" data-calculate=" /pregnancy/danger_signs/easily_tired " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__face_hand_swelling" data-calculate=" /pregnancy/danger_signs/face_hand_swelling " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__breathlessness" data-calculate=" /pregnancy/danger_signs/breathlessness " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__uses_llin" data-calculate=" /pregnancy/safe_pregnancy_practices/malaria/uses_llin " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__takes_iron_folate_daily" data-calculate=" /pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__received_deworming_meds" data-calculate=" /pregnancy/safe_pregnancy_practices/deworming/deworming_med " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__tested_for_hiv_in_past_3_months" data-calculate=" /pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/__received_tetanus_toxoid_this_pregnancy" data-calculate=" /pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/meta/__patient_uuid" data-calculate="../../../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/meta/__patient_id" data-calculate="../../../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/meta/__household_uuid" data-calculate="../../../inputs/contact/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/meta/__source" data-calculate="../../../inputs/source" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/data/meta/__source_id" data-calculate="../../../inputs/source_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <pregnancy xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" id="pregnancy" prefix="J1!pregnancy!" delimiter="#" version="2022-09-26 11:42:48">
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
            <user>
              <contact_id/>
              <parent>
                <_id/>
              </parent>
            </user>
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
          <hiv_status_known tag="hidden"/>
          <deworming_med_received tag="hidden"/>
          <tt_received tag="hidden"/>
          <t_pregnancy_follow_up_date tag="hidden"/>
          <t_pregnancy_follow_up tag="hidden"/>
          <t_danger_signs_referral_follow_up_date tag="hidden"/>
          <t_danger_signs_referral_follow_up tag="hidden"/>
          <gestational_age>
            <register_method>
              <register_note tag="hidden"/>
              <lmp_method/>
            </register_method>
            <method_lmp>
              <u_lmp_date/>
            </method_lmp>
            <method_approx>
              <lmp_approx tag="hidden"/>
              <lmp_approx_weeks/>
              <lmp_approx_months/>
            </method_approx>
            <method_edd>
              <u_edd/>
            </method_edd>
            <method_lmp_summary tag="hidden">
              <lmp_check_note/>
              <lmp_approx_weeks_check_note/>
              <lmp_approx_months_check_note/>
              <u_edd_note/>
              <edd_note/>
              <lmp_note/>
              <edd_check_note/>
            </method_lmp_summary>
            <g_lmp_date_8601 tag="hidden"/>
            <g_lmp_date tag="hidden"/>
            <g_edd_8601 tag="hidden"/>
            <g_edd tag="hidden"/>
            <method_none>
              <no_info_notice tag="hidden"/>
              <no_info_pregnancy_reason/>
              <pregnancy_confirm_note tag="hidden"/>
            </method_none>
          </gestational_age>
          <anc_visits_hf>
            <anc_visits_hf_past>
              <visited_hf_count/>
              <visited_dates_group>
                <visited_count_confim_note_single tag="hidden"/>
                <visited_count_confim_note_multiple tag="hidden"/>
                <visited_date_ask_single/>
                <visited_date_single/>
                <visited_dates_multiple_note tag="hidden"/>
                <visited_dates_multiple_note_section tag="hidden"/>
                <visited_dates_count/>
                <visited_dates jr:template="">
                  <visited_date_ask_multiple/>
                  <visited_date/>
                </visited_dates>
              </visited_dates_group>
            </anc_visits_hf_past>
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
          <risk_factors>
            <risk_factors_history>
              <first_pregnancy/>
              <previous_miscarriage/>
            </risk_factors_history>
            <risk_factors_present>
              <primary_condition/>
              <secondary_condition/>
              <additional_risk_check/>
              <additional_risk/>
            </risk_factors_present>
            <r_risk_factor_present tag="hidden"/>
          </risk_factors>
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
              <uses_llin/>
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
            <request_services tag="hidden"/>
          </safe_pregnancy_practices>
          <summary tag="hidden">
            <r_submit_note/>
            <r_summary_details/>
            <r_patient_details/>
            <r_summary/>
            <r_pregnancy_details/>
            <r_pregnancy_details_unknown/>
            <r_risk_factors/>
            <r_risk_first_pregnancy/>
            <r_risk_previous_miscarriage/>
            <r_risk_previous_difficulties/>
            <r_risk_more_than_4_children/>
            <r_risk_last_baby_born_less_than_1_year_ago/>
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
            <r_space_2/>
            <check-/>
            <r_following_tasks/>
            <r_fup_danger_sign/>
            <r_fup_hf_visit/>
            <r_fup_pregnancy_visit/>
            <r_fup_pregnancy_visit_2_weeks/>
            <next_visit_weeks/>
            <edd_summary/>
            <next_appointment_date/>
            <custom_translations>
              <custom_woman_label_translator/>
              <custom_woman_label/>
              <custom_woman_start_label_translator/>
              <custom_woman_start_label/>
            </custom_translations>
          </summary>
          <data tag="hidden">
            <__lmp_method/>
            <__no_lmp_registration_reason/>
            <__lmp_date/>
            <__lmp_approx_weeks/>
            <__lmp_approx_months/>
            <__edd/>
            <__num_previous_anc_hf_visits/>
            <__previous_anc_hf_visit_dates/>
            <__next_anc_hf_visit_date_known/>
            <__next_anc_hf_visit_date/>
            <__has_risk_factors/>
            <__first_pregnancy/>
            <__previous_miscarriage/>
            <__previous_difficulties/>
            <__more_than_4_children/>
            <__last_baby_born_less_than_1_year_ago/>
            <__heart_condition/>
            <__asthma/>
            <__high_blood_pressure/>
            <__diabetes/>
            <__additional_high_risk_condition_to_report/>
            <__additional_high_risk_condition/>
            <__has_danger_sign/>
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
            </meta>
          </data>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </pregnancy>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
  <h:head>
    <h:title>Pregnancy registration</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date:jr:constraintMsg">
            <value>Date cannot be in the past. Date cannot be more than one month from today.</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known/no:label">
            <value>I don't know</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known/yes:label">
            <value>Enter date</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known:label">
            <value>If <output value=" /pregnancy/patient_short_name "/> has a specific upcoming ANC appointment date, enter it here. You will receive a task three days before to remind her to attend.</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/prenancy_age_note:label">
            <value><output value=" /pregnancy/patient_short_name_start "/> is **<output value=" /pregnancy/weeks_since_lmp_rounded "/> weeks** pregnant.</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/refer_note:label">
            <value>Please refer <output value=" /pregnancy/patient_short_name "/> to the health facility at the appropriate time.</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/who_recommends_note:label">
            <value>The WHO recommends ANC visits at 12, 20, 26, 30, 34, 36, 38, 40 weeks.</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_next:label">
            <value>ANC Visits at Health Facility (Scheduled)</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_count_confim_note_multiple:label">
            <value>You entered that <output value=" /pregnancy/patient_short_name "/> has attended <output value=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count "/> ANC visits at the health facility.</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_count_confim_note_single:label">
            <value>You entered that <output value=" /pregnancy/patient_short_name "/> has attended 1 ANC visit at the health facility.</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single/no:label">
            <value>I don't know</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single/yes:label">
            <value>Enter date</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single:label">
            <value>Please enter the date if you know it.</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_single:jr:constraintMsg">
            <value>Enter the correct date. Date must be within this pregnancy and cannot be in the future.</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_single:label">
            <value>Date</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date:jr:constraintMsg">
            <value>Enter the correct date. Date must be within this pregnancy and cannot be in the future.</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date:label">
            <value>Date</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple/no:label">
            <value>I don't know</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple/yes:label">
            <value>Enter date</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple:label">
            <value>Visit</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_multiple_note:label">
            <value>Please enter the dates if you have them.</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_multiple_note_section:label">
            <value>Each "Visit" section below asks about one individual visit. Please complete all sections.</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count:hint">
            <value>Enter 0 if she has not been yet.</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count:jr:constraintMsg">
            <value>Must be an integer between 0 and 9.</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count:label">
            <value>How many times has <output value=" /pregnancy/patient_short_name "/> been to the health facility for ANC?</value>
          </text>
          <text id="/pregnancy/anc_visits_hf/anc_visits_hf_past:label">
            <value>ANC Visits at Health Facility (Past)</value>
          </text>
          <text id="/pregnancy/danger_signs/breaking_water/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/danger_signs/breaking_water/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/danger_signs/breaking_water:label">
            <value>Breaking of water</value>
          </text>
          <text id="/pregnancy/danger_signs/breathlessness/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/danger_signs/breathlessness/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/danger_signs/breathlessness:label">
            <value>Breathlessness</value>
          </text>
          <text id="/pregnancy/danger_signs/congratulate_no_ds_note:label">
            <value>Great news! Please closely monitor her until her next scheduled pregnancy visit.</value>
          </text>
          <text id="/pregnancy/danger_signs/danger_signs_note:label">
            <value>Ask <output value=" /pregnancy/patient_short_name "/> to monitor these danger signs throughout the pregnancy.</value>
          </text>
          <text id="/pregnancy/danger_signs/danger_signs_question_note:label">
            <value>Does <output value=" /pregnancy/patient_short_name "/> currently have any of these danger signs?</value>
          </text>
          <text id="/pregnancy/danger_signs/easily_tired/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/danger_signs/easily_tired/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/danger_signs/easily_tired:label">
            <value>Getting tired easily</value>
          </text>
          <text id="/pregnancy/danger_signs/face_hand_swelling/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/danger_signs/face_hand_swelling/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/danger_signs/face_hand_swelling:label">
            <value>Swelling of face and hands</value>
          </text>
          <text id="/pregnancy/danger_signs/fever/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/danger_signs/fever/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/danger_signs/fever:label">
            <value>Fever</value>
          </text>
          <text id="/pregnancy/danger_signs/fits/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/danger_signs/fits/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/danger_signs/fits:label">
            <value>Fits</value>
          </text>
          <text id="/pregnancy/danger_signs/reduced_or_no_fetal_movements/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/danger_signs/reduced_or_no_fetal_movements/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/danger_signs/reduced_or_no_fetal_movements:label">
            <value>Reduced or no fetal movements</value>
          </text>
          <text id="/pregnancy/danger_signs/refer_patient_note_1:label">
            <value>&lt;span style="color:red"&gt;Please refer to the health facility immediately. Accompany her if possible.&lt;/span&gt;</value>
          </text>
          <text id="/pregnancy/danger_signs/refer_patient_note_2:label">
            <value>&lt;span style="color:red"&gt;Please complete the follow-up task within 3 days.&lt;/span&gt;</value>
          </text>
          <text id="/pregnancy/danger_signs/severe_abdominal_pain/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/danger_signs/severe_abdominal_pain/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/danger_signs/severe_abdominal_pain:label">
            <value>Severe abdominal pain</value>
          </text>
          <text id="/pregnancy/danger_signs/severe_headache/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/danger_signs/severe_headache/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/danger_signs/severe_headache:label">
            <value>Severe headache</value>
          </text>
          <text id="/pregnancy/danger_signs/vaginal_bleeding/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/danger_signs/vaginal_bleeding/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/danger_signs/vaginal_bleeding:label">
            <value>Vaginal bleeding</value>
          </text>
          <text id="/pregnancy/danger_signs/very_pale/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/danger_signs/very_pale/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/danger_signs/very_pale:label">
            <value>Very pale</value>
          </text>
          <text id="/pregnancy/danger_signs:label">
            <value>Danger Sign Check</value>
          </text>
          <text id="/pregnancy/gestational_age/method_approx/lmp_approx/approx_months:label">
            <value>Months</value>
          </text>
          <text id="/pregnancy/gestational_age/method_approx/lmp_approx/approx_weeks:label">
            <value>Weeks</value>
          </text>
          <text id="/pregnancy/gestational_age/method_approx/lmp_approx:hint">
            <value>Select one.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_approx/lmp_approx:label">
            <value>Would you like to report the pregnancy in weeks or months?</value>
          </text>
          <text id="/pregnancy/gestational_age/method_approx/lmp_approx_months:jr:constraintMsg">
            <value>Must be between 1 and 9.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_approx/lmp_approx_months:label">
            <value>Months</value>
          </text>
          <text id="/pregnancy/gestational_age/method_approx/lmp_approx_weeks:jr:constraintMsg">
            <value>Must be between 4 and 40.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_approx/lmp_approx_weeks:label">
            <value>Weeks</value>
          </text>
          <text id="/pregnancy/gestational_age/method_edd/u_edd:jr:constraintMsg">
            <value>Date cannot be in the past. Date cannot be more than 9 months in the future.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_edd/u_edd:label">
            <value>Please enter the expected date of delivery.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_lmp/u_lmp_date:jr:constraintMsg">
            <value>Start date cannot be less than 1 month ago. Start date cannot be more than 9 months in the future.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_lmp/u_lmp_date:label">
            <value>Please enter the start date of the LMP.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_lmp_summary/edd_check_note:label">
            <value>If this seems incorrect, click "&lt; Prev" and update the pregnancy information.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_lmp_summary/edd_note:label">
            <value>The estimated date of delivery is: **<output value=" /pregnancy/gestational_age/g_edd "/>**&lt;/span&gt;</value>
          </text>
          <text id="/pregnancy/gestational_age/method_lmp_summary/lmp_approx_months_check_note:label">
            <value>You entered **<output value=" /pregnancy/gestational_age/method_approx/lmp_approx_months "/> months** pregnant.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_lmp_summary/lmp_approx_weeks_check_note:label">
            <value>You entered **<output value=" /pregnancy/gestational_age/method_approx/lmp_approx_weeks "/> weeks** pregnant.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_lmp_summary/lmp_check_note:label">
            <value>You entered an LMP of: **<output value=" /pregnancy/gestational_age/g_lmp_date "/>**&lt;/span&gt;</value>
          </text>
          <text id="/pregnancy/gestational_age/method_lmp_summary/lmp_note:label">
            <value><output value=" /pregnancy/patient_short_name_start "/> is currently &lt;span style=&quot;font-family:monospace&quot;&gt;<output value=" /pregnancy/weeks_since_lmp_rounded "/> weeks&lt;/span&gt; pregnant.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_lmp_summary/u_edd_note:label">
            <value>You entered the EDD: **<output value=" /pregnancy/gestational_age/g_edd "/>**</value>
          </text>
          <text id="/pregnancy/gestational_age/method_none/no_info_notice:label">
            <value>You selected "No information is known."</value>
          </text>
          <text id="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason/missed_periods:label">
            <value>The woman is not on any family planning methods and has missed her periods.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason/test_positive:label">
            <value>You performed a pregnancy test and it is positive but the woman does not know the age of the pregnancy or LMP.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason/visibly_pregnant:label">
            <value>The woman is visibly pregnant but does not know for how long.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason:hint">
            <value>Select one.</value>
          </text>
          <text id="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason:label">
            <value>Why do you want to register <output value=" /pregnancy/patient_short_name "/>?</value>
          </text>
          <text id="/pregnancy/gestational_age/method_none/pregnancy_confirm_note:label">
            <value>Refer <output value=" /pregnancy/patient_short_name "/> to the health facility to confirm. You will receive tasks every two weeks to check in on the pregnancy. Schedule will follow WHO recommendations once LMP or EDD is entered.</value>
          </text>
          <text id="/pregnancy/gestational_age/register_method/lmp_method/method_approx:label">
            <value>Current weeks or months pregnant</value>
          </text>
          <text id="/pregnancy/gestational_age/register_method/lmp_method/method_edd:label">
            <value>Expected date of delivery (EDD)</value>
          </text>
          <text id="/pregnancy/gestational_age/register_method/lmp_method/method_lmp:label">
            <value>Last menstrual period (LMP)</value>
          </text>
          <text id="/pregnancy/gestational_age/register_method/lmp_method/method_none:label">
            <value>No information is known</value>
          </text>
          <text id="/pregnancy/gestational_age/register_method/lmp_method:hint">
            <value>Select one.</value>
          </text>
          <text id="/pregnancy/gestational_age/register_method/lmp_method:label">
            <value>How would you like to report the pregnancy?</value>
          </text>
          <text id="/pregnancy/gestational_age/register_method/register_note:label">
            <value>Registering a pregnancy will help you to provide timely guidance and support to the pregnant woman.</value>
          </text>
          <text id="/pregnancy/gestational_age:label">
            <value>Gestational Age</value>
          </text>
          <text id="/pregnancy/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/pregnancy/inputs/contact/date_of_birth:label">
            <value>Date of Birth</value>
          </text>
          <text id="/pregnancy/inputs/contact/name:label">
            <value>Name</value>
          </text>
          <text id="/pregnancy/inputs/contact/parent/_id:label">
            <value>Parent ID</value>
          </text>
          <text id="/pregnancy/inputs/contact/parent/parent/contact/chw_name:label">
            <value>CHW name</value>
          </text>
          <text id="/pregnancy/inputs/contact/parent/parent/contact/phone:label">
            <value>CHW phone</value>
          </text>
          <text id="/pregnancy/inputs/contact/patient_id:label">
            <value>Patient ID</value>
          </text>
          <text id="/pregnancy/inputs/contact/sex:label">
            <value>Sex</value>
          </text>
          <text id="/pregnancy/inputs/contact/short_name:label">
            <value>Short Name</value>
          </text>
          <text id="/pregnancy/inputs/source:label">
            <value>Source</value>
          </text>
          <text id="/pregnancy/inputs/source_id:label">
            <value>Source ID</value>
          </text>
          <text id="/pregnancy/inputs/user/contact_id:label">
            <value>Contact ID</value>
          </text>
          <text id="/pregnancy/inputs/user/parent/_id:label">
            <value>Parent ID</value>
          </text>
          <text id="/pregnancy/inputs/user:label">
            <value>User</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_history/first_pregnancy/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_history/first_pregnancy/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_history/first_pregnancy:label">
            <value>Is this <output value=" /pregnancy/patient_short_name "/>'s first pregnancy?</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage:label">
            <value>Has <output value=" /pregnancy/patient_short_name "/> had any miscarriages or stillbirths?</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/additional_risk:jr:constraintMsg">
            <value>max characters = 100</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/additional_risk:label">
            <value>If yes, please describe.</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/additional_risk_check/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/additional_risk_check/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/additional_risk_check:label">
            <value>Are there additional factors that could make this pregnancy high-risk?</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/primary_condition/asthma:label">
            <value>Asthma</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/primary_condition/diabetes:label">
            <value>Diabetes</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/primary_condition/heart_condition:label">
            <value>Heart condition</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/primary_condition/high_blood_pressure:label">
            <value>High blood pressure</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/primary_condition/none:label">
            <value>None of the above</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/primary_condition:hint">
            <value>Select all that apply.</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/primary_condition:jr:constraintMsg">
            <value>If "None of the above" selected, cannot select any other option.</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/primary_condition:label">
            <value>Does <output value=" /pregnancy/patient_short_name "/> have any of these risk factors?</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/asthma:label">
            <value>Asthma</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/diabetes:label">
            <value>Diabetes</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/heart_condition:label">
            <value>Heart condition</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/high_blood_pressure:label">
            <value>High blood pressure</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/last_baby_born_less_than_1_year_ago:label">
            <value>Last baby born less than one year ago</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/more_than_4_children:label">
            <value>Has delivered four or more children</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/none:label">
            <value>None of the above</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/secondary_condition/previous_difficulties:label">
            <value>Previous difficulties in childbirth</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/secondary_condition:hint">
            <value>Select all that apply.</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/secondary_condition:jr:constraintMsg">
            <value>If "None of the above" selected, cannot select any other option.</value>
          </text>
          <text id="/pregnancy/risk_factors/risk_factors_present/secondary_condition:label">
            <value>Does <output value=" /pregnancy/patient_short_name "/> have any of these risk factors?</value>
          </text>
          <text id="/pregnancy/risk_factors:label">
            <value>Risk Factors</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/deworming/deworming_med/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/deworming/deworming_med/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/deworming/deworming_med:label">
            <value>Has <output value=" /pregnancy/patient_short_name "/> received deworming medication?</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/deworming/deworming_med_note:label">
            <value>Worms can affect the nutritional status of <output value=" /pregnancy/patient_short_name "/> and baby.</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_importance_note:label">
            <value>Frequent testing ensures that <output value=" /pregnancy/patient_short_name "/> receives medicine to prevent transmission of HIV to the baby.</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested:label">
            <value>Has <output value=" /pregnancy/patient_short_name "/> been tested for HIV in the past 3 months?</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily:label">
            <value>Is <output value=" /pregnancy/patient_short_name "/> taking iron folate daily?</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_note:label">
            <value>Iron folate aids in the development of child's brain and spinal cord. It also prevents premature birth, sepsis, anemia and low birth weight.</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/malaria/llin_advice_note:label">
            <value>Sleeping under a LLIN **EVERY night** prevents malaria.</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/malaria/malaria_prophylaxis_note:label">
            <value>Get malaria prophylaxis in second trimester if living in malaria endemic area.</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/malaria/uses_llin/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/malaria/uses_llin/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/malaria/uses_llin:label">
            <value>Does <output value=" /pregnancy/patient_short_name "/> use a long-lasting insecticidal net (LLIN)?</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/safe_practices_tips/deliver_hf_note:label">
            <value>It's safest to deliver in a health facility. Discuss a birth plan with <output value=" /pregnancy/patient_short_name "/>.</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/safe_practices_tips/eat_more_note:label">
            <value>Eat more often than usual and a balanced diet to give you strength and help the baby grow.</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/safe_practices_tips/respond_move_note:label">
            <value>Respond to the baby's movements-kicks by gentle touching or massaging your tummy.</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/safe_practices_tips/talk_softly_note:label">
            <value>Talk softly to the unborn baby. The baby can hear you and will be able to recognize voices.</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received:label">
            <value>Has <output value=" /pregnancy/patient_short_name "/> received any Tetanus Toxoid (TT) immunizations during this pregnancy?</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/tetanus/tt_note_1:label">
            <value>Immunizing with at least two doses of tetanus toxoid before or during pregnancy protects the newborn for the first few weeks of life and protects the mother.</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices/tetanus/tt_note_2:label">
            <value>Women can receive up to two TT vaccines per pregnancy. After five TT vaccines, they are vaccinated for life.</value>
          </text>
          <text id="/pregnancy/safe_pregnancy_practices:label">
            <value>Safe Pregnancy Practices</value>
          </text>
          <text id="/pregnancy/summary/check-:label">
            <value>Follow-up Tasks&lt;I class="fa fa-flag"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/summary/custom_translations/custom_woman_label_translator/woman:label">
            <value>the woman</value>
          </text>
          <text id="/pregnancy/summary/custom_translations/custom_woman_start_label_translator/woman-start:label">
            <value>The woman</value>
          </text>
          <text id="/pregnancy/summary/r_danger_sign_breaking_water:label">
            <value>Breaking of water</value>
          </text>
          <text id="/pregnancy/summary/r_danger_sign_breathlessness:label">
            <value>Breathlessness</value>
          </text>
          <text id="/pregnancy/summary/r_danger_sign_easily_tired:label">
            <value>Getting tired easily</value>
          </text>
          <text id="/pregnancy/summary/r_danger_sign_face_hand_swelling:label">
            <value>Swelling of face and hands</value>
          </text>
          <text id="/pregnancy/summary/r_danger_sign_fever:label">
            <value>Fever</value>
          </text>
          <text id="/pregnancy/summary/r_danger_sign_fits:label">
            <value>Fits</value>
          </text>
          <text id="/pregnancy/summary/r_danger_sign_reduced_or_no_fetal_movements:label">
            <value>Reduced or no fetal movements</value>
          </text>
          <text id="/pregnancy/summary/r_danger_sign_severe_abdominal_pain:label">
            <value>Severe abdominal pain</value>
          </text>
          <text id="/pregnancy/summary/r_danger_sign_severe_headache:label">
            <value>Severe headache</value>
          </text>
          <text id="/pregnancy/summary/r_danger_sign_vaginal_bleeding:label">
            <value>Vaginal bleeding</value>
          </text>
          <text id="/pregnancy/summary/r_danger_sign_very_pale:label">
            <value>Very pale</value>
          </text>
          <text id="/pregnancy/summary/r_danger_signs:label">
            <value>Danger Signs</value>
          </text>
          <text id="/pregnancy/summary/r_following_tasks:label">
            <value>The following tasks will appear:</value>
          </text>
          <text id="/pregnancy/summary/r_fup_danger_sign:label">
            <value>Please conduct a danger sign follow-up in 3 days.</value>
          </text>
          <text id="/pregnancy/summary/r_fup_hf_visit:label">
            <value>Make sure <output value=" /pregnancy/patient_short_name "/> attends her clinic visit on <output value=" /pregnancy/summary/next_appointment_date "/>. Please remind her three days before.</value>
          </text>
          <text id="/pregnancy/summary/r_fup_pregnancy_visit:label">
            <value>Please conduct the next pregnancy home visit in <output value=" /pregnancy/summary/next_visit_weeks "/> week(s).</value>
          </text>
          <text id="/pregnancy/summary/r_fup_pregnancy_visit_2_weeks:label">
            <value>Please conduct the next pregnancy home visit in 2 weeks.</value>
          </text>
          <text id="/pregnancy/summary/r_patient_details:label">
            <value>&lt;h2 style=&quot;text-align:center;margin-bottom:0px;&quot;&gt;<output value=" /pregnancy/patient_name "/>&lt;/h2&gt; &lt;p style=&quot;text-align:center;&quot;&gt;<output value=" /pregnancy/patient_age_in_years "/> years old&lt;/p&gt;</value>
          </text>
          <text id="/pregnancy/summary/r_pregnancy_details:label">
            <value>&lt;p&gt;<output value=" /pregnancy/weeks_since_lmp_rounded "/> weeks pregnant.&lt;/p&gt; &lt;p&gt; EDD: <output value=" /pregnancy/summary/edd_summary "/>&lt;/p&gt;</value>
          </text>
          <text id="/pregnancy/summary/r_pregnancy_details_unknown:label">
            <value>Unknown weeks pregnant.</value>
          </text>
          <text id="/pregnancy/summary/r_refer_clinic_immediately:label">
            <value>Refer to clinic immediately for:</value>
          </text>
          <text id="/pregnancy/summary/r_refer_danger_sign:label">
            <value>Danger Sign</value>
          </text>
          <text id="/pregnancy/summary/r_refer_hf_appropriate_time:label">
            <value>Please refer <output value=" /pregnancy/patient_short_name "/> to the health facility at the appropriate time.</value>
          </text>
          <text id="/pregnancy/summary/r_refer_hf_immediately:label">
            <value>Please refer <output value=" /pregnancy/patient_short_name "/> to the health facility immediately to receive the EDD and appropriate care.</value>
          </text>
          <text id="/pregnancy/summary/r_referrals:label">
            <value>Referrals&lt;I class="fa fa-hospital-o"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/summary/r_request_service_deworming:label">
            <value>Deworming</value>
          </text>
          <text id="/pregnancy/summary/r_request_service_hiv_test:label">
            <value>HIV test</value>
          </text>
          <text id="/pregnancy/summary/r_request_service_iron:label">
            <value>Iron folate</value>
          </text>
          <text id="/pregnancy/summary/r_request_service_tt:label">
            <value>TT</value>
          </text>
          <text id="/pregnancy/summary/r_request_services:label">
            <value>Request the following services:</value>
          </text>
          <text id="/pregnancy/summary/r_risk_additional:label">
            <value><output value=" /pregnancy/risk_factors/risk_factors_present/additional_risk "/></value>
          </text>
          <text id="/pregnancy/summary/r_risk_asthma:label">
            <value>Asthma</value>
          </text>
          <text id="/pregnancy/summary/r_risk_diabetes:label">
            <value>Diabetes</value>
          </text>
          <text id="/pregnancy/summary/r_risk_factors:label">
            <value>Risk Factors</value>
          </text>
          <text id="/pregnancy/summary/r_risk_first_pregnancy:label">
            <value>First pregnancy</value>
          </text>
          <text id="/pregnancy/summary/r_risk_heart_condition:label">
            <value>Heart condition</value>
          </text>
          <text id="/pregnancy/summary/r_risk_high_blood_pressure:label">
            <value>High blood pressure</value>
          </text>
          <text id="/pregnancy/summary/r_risk_last_baby_born_less_than_1_year_ago:label">
            <value>Last baby born less than one year ago</value>
          </text>
          <text id="/pregnancy/summary/r_risk_more_than_4_children:label">
            <value>Has delivered four or more children</value>
          </text>
          <text id="/pregnancy/summary/r_risk_previous_difficulties:label">
            <value>Previous difficulties in childbirth</value>
          </text>
          <text id="/pregnancy/summary/r_risk_previous_miscarriage:label">
            <value>Previous miscarriages or stillbirths</value>
          </text>
          <text id="/pregnancy/summary/r_routine_anc:label">
            <value>Please attend ANC on: <output value=" /pregnancy/summary/next_appointment_date "/></value>
          </text>
          <text id="/pregnancy/summary/r_submit_note:label">
            <value>&lt;h4 style="text-align:center;"&gt;Click the Submit button at the bottom of the form.&lt;/h4&gt;</value>
          </text>
          <text id="/pregnancy/summary/r_summary:label">
            <value>Summary&lt;I class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/summary/r_summary_details:label">
            <value>Patient&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy/summary/r_who_recommends:label">
            <value>The WHO recommends routine ANC visits at 12, 20, 26, 30, 34, 36, 38, 40 weeks.</value>
          </text>
        </translation>
      </itext>
      <instance>
        <pregnancy id="pregnancy" prefix="J1!pregnancy!" delimiter="#" version="2022-09-26 11:42:48">
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
            <user>
              <contact_id/>
              <parent>
                <_id/>
              </parent>
            </user>
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
          <hiv_status_known tag="hidden"/>
          <deworming_med_received tag="hidden"/>
          <tt_received tag="hidden"/>
          <t_pregnancy_follow_up_date tag="hidden"/>
          <t_pregnancy_follow_up tag="hidden"/>
          <t_danger_signs_referral_follow_up_date tag="hidden"/>
          <t_danger_signs_referral_follow_up tag="hidden"/>
          <gestational_age>
            <register_method>
              <register_note tag="hidden"/>
              <lmp_method/>
            </register_method>
            <method_lmp>
              <u_lmp_date/>
            </method_lmp>
            <method_approx>
              <lmp_approx tag="hidden"/>
              <lmp_approx_weeks/>
              <lmp_approx_months/>
            </method_approx>
            <method_edd>
              <u_edd/>
            </method_edd>
            <method_lmp_summary tag="hidden">
              <lmp_check_note/>
              <lmp_approx_weeks_check_note/>
              <lmp_approx_months_check_note/>
              <u_edd_note/>
              <edd_note/>
              <lmp_note/>
              <edd_check_note/>
            </method_lmp_summary>
            <g_lmp_date_8601 tag="hidden"/>
            <g_lmp_date tag="hidden"/>
            <g_edd_8601 tag="hidden"/>
            <g_edd tag="hidden"/>
            <method_none>
              <no_info_notice tag="hidden"/>
              <no_info_pregnancy_reason/>
              <pregnancy_confirm_note tag="hidden"/>
            </method_none>
          </gestational_age>
          <anc_visits_hf>
            <anc_visits_hf_past>
              <visited_hf_count/>
              <visited_dates_group>
                <visited_count_confim_note_single tag="hidden"/>
                <visited_count_confim_note_multiple tag="hidden"/>
                <visited_date_ask_single/>
                <visited_date_single/>
                <visited_dates_multiple_note tag="hidden"/>
                <visited_dates_multiple_note_section tag="hidden"/>
                <visited_dates_count/>
                <visited_dates jr:template="">
                  <visited_date_ask_multiple/>
                  <visited_date/>
                </visited_dates>
              </visited_dates_group>
            </anc_visits_hf_past>
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
          <risk_factors>
            <risk_factors_history>
              <first_pregnancy/>
              <previous_miscarriage/>
            </risk_factors_history>
            <risk_factors_present>
              <primary_condition/>
              <secondary_condition/>
              <additional_risk_check/>
              <additional_risk/>
            </risk_factors_present>
            <r_risk_factor_present tag="hidden"/>
          </risk_factors>
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
              <uses_llin/>
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
            <request_services tag="hidden"/>
          </safe_pregnancy_practices>
          <summary tag="hidden">
            <r_submit_note/>
            <r_summary_details/>
            <r_patient_details/>
            <r_summary/>
            <r_pregnancy_details/>
            <r_pregnancy_details_unknown/>
            <r_risk_factors/>
            <r_risk_first_pregnancy/>
            <r_risk_previous_miscarriage/>
            <r_risk_previous_difficulties/>
            <r_risk_more_than_4_children/>
            <r_risk_last_baby_born_less_than_1_year_ago/>
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
            <r_space_2/>
            <check-/>
            <r_following_tasks/>
            <r_fup_danger_sign/>
            <r_fup_hf_visit/>
            <r_fup_pregnancy_visit/>
            <r_fup_pregnancy_visit_2_weeks/>
            <next_visit_weeks/>
            <edd_summary/>
            <next_appointment_date/>
            <custom_translations>
              <custom_woman_label_translator/>
              <custom_woman_label/>
              <custom_woman_start_label_translator/>
              <custom_woman_start_label/>
            </custom_translations>
          </summary>
          <data tag="hidden">
            <__lmp_method/>
            <__no_lmp_registration_reason/>
            <__lmp_date/>
            <__lmp_approx_weeks/>
            <__lmp_approx_months/>
            <__edd/>
            <__num_previous_anc_hf_visits/>
            <__previous_anc_hf_visit_dates/>
            <__next_anc_hf_visit_date_known/>
            <__next_anc_hf_visit_date/>
            <__has_risk_factors/>
            <__first_pregnancy/>
            <__previous_miscarriage/>
            <__previous_difficulties/>
            <__more_than_4_children/>
            <__last_baby_born_less_than_1_year_ago/>
            <__heart_condition/>
            <__asthma/>
            <__high_blood_pressure/>
            <__diabetes/>
            <__additional_high_risk_condition_to_report/>
            <__additional_high_risk_condition/>
            <__has_danger_sign/>
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
            </meta>
          </data>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </pregnancy>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/pregnancy/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/pregnancy/inputs/source" type="string"/>
      <bind nodeset="/pregnancy/inputs/source_id" type="string"/>
      <bind nodeset="/pregnancy/inputs/user/contact_id" type="string"/>
      <bind nodeset="/pregnancy/inputs/user/parent/_id" type="string"/>
      <bind nodeset="/pregnancy/inputs/contact/_id" type="db:person"/>
      <bind nodeset="/pregnancy/inputs/contact/name" type="string"/>
      <bind nodeset="/pregnancy/inputs/contact/short_name" type="string"/>
      <bind nodeset="/pregnancy/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/pregnancy/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/pregnancy/inputs/contact/sex" type="string"/>
      <bind nodeset="/pregnancy/inputs/contact/parent/_id" type="string"/>
      <bind nodeset="/pregnancy/inputs/contact/parent/parent/contact/chw_name" type="string"/>
      <bind nodeset="/pregnancy/inputs/contact/parent/parent/contact/phone" type="string"/>
      <bind nodeset="/pregnancy/patient_age_in_years" type="string" calculate="floor( difference-in-months( ../inputs/contact/date_of_birth, today() ) div 12 )"/>
      <bind nodeset="/pregnancy/patient_uuid" type="string" calculate="../inputs/contact/_id"/>
      <bind nodeset="/pregnancy/patient_id" type="string" calculate="../inputs/contact/patient_id"/>
      <bind nodeset="/pregnancy/patient_name" type="string" calculate="../inputs/contact/name"/>
      <bind nodeset="/pregnancy/patient_short_name" type="string" calculate="coalesce(../inputs/contact/short_name, ../summary/custom_translations/custom_woman_label)"/>
      <bind nodeset="/pregnancy/patient_short_name_start" type="string" calculate="coalesce(../inputs/contact/short_name, ../summary/custom_translations/custom_woman_start_label)"/>
      <bind nodeset="/pregnancy/lmp_date_8601" type="string" calculate="../gestational_age/g_lmp_date_8601"/>
      <bind nodeset="/pregnancy/edd_8601" type="string" calculate="../gestational_age/g_edd_8601"/>
      <bind nodeset="/pregnancy/days_since_lmp" type="string" relevant="../lmp_date_8601 != ''" calculate="floor(decimal-date-time(today())) - decimal-date-time(../lmp_date_8601)"/>
      <bind nodeset="/pregnancy/weeks_since_lmp" type="string" relevant="../lmp_date_8601 != ''" calculate="round(../days_since_lmp div 7, 2)"/>
      <bind nodeset="/pregnancy/weeks_since_lmp_rounded" type="string" relevant="../lmp_date_8601 != ''" calculate="floor(../days_since_lmp div 7)"/>
      <bind nodeset="/pregnancy/lmp_method_approx" type="string" calculate="if(selected(../gestational_age/register_method/lmp_method, 'method_approx'), 'yes', 'no')"/>
      <bind nodeset="/pregnancy/hiv_status_known" type="string" calculate="../safe_pregnancy_practices/hiv_status/hiv_tested"/>
      <bind nodeset="/pregnancy/deworming_med_received" type="string" calculate="../safe_pregnancy_practices/deworming/deworming_med"/>
      <bind nodeset="/pregnancy/tt_received" type="string" calculate="../safe_pregnancy_practices/tetanus/tt_imm_received"/>
      <bind nodeset="/pregnancy/t_pregnancy_follow_up_date" type="string" calculate="../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date"/>
      <bind nodeset="/pregnancy/t_pregnancy_follow_up" type="string" calculate="../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known"/>
      <bind nodeset="/pregnancy/t_danger_signs_referral_follow_up_date" type="string" calculate="date-time(decimal-date-time(today()) + 3)"/>
      <bind nodeset="/pregnancy/t_danger_signs_referral_follow_up" type="string" calculate="../danger_signs/r_danger_sign_present"/>
      <bind nodeset="/pregnancy/gestational_age/register_method/register_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/gestational_age/register_method/lmp_method" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/gestational_age/method_lmp" relevant="selected(../register_method/lmp_method, 'method_lmp')"/>
      <bind nodeset="/pregnancy/gestational_age/method_lmp/u_lmp_date" type="date" required="true()" constraint=". &lt;= date-time(decimal-date-time(today()) - (1 * 30)) and
. &gt;= date-time(decimal-date-time(today()) - (9 * 30))" jr:constraintMsg="jr:itext('/pregnancy/gestational_age/method_lmp/u_lmp_date:jr:constraintMsg')"/>
      <bind nodeset="/pregnancy/gestational_age/method_approx" relevant="selected(../register_method/lmp_method, 'method_approx')"/>
      <bind nodeset="/pregnancy/gestational_age/method_approx/lmp_approx" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/gestational_age/method_approx/lmp_approx_weeks" type="int" required="true()" relevant="selected(../lmp_approx, 'approx_weeks')" jr:constraintMsg="jr:itext('/pregnancy/gestational_age/method_approx/lmp_approx_weeks:jr:constraintMsg')" constraint=". &gt;= 4 and . &lt;= 40"/>
      <bind nodeset="/pregnancy/gestational_age/method_approx/lmp_approx_months" type="int" required="true()" relevant="selected(../lmp_approx, 'approx_months')" jr:constraintMsg="jr:itext('/pregnancy/gestational_age/method_approx/lmp_approx_months:jr:constraintMsg')" constraint=". &gt;= 1 and . &lt;= 9"/>
      <bind nodeset="/pregnancy/gestational_age/method_edd" relevant="selected(../register_method/lmp_method, 'method_edd')"/>
      <bind nodeset="/pregnancy/gestational_age/method_edd/u_edd" type="date" required="true()" constraint=". &gt;= today() and
. &lt;= date-time(decimal-date-time(today()) + (9 * 30))" jr:constraintMsg="jr:itext('/pregnancy/gestational_age/method_edd/u_edd:jr:constraintMsg')"/>
      <bind nodeset="/pregnancy/gestational_age/method_lmp_summary" relevant="not(selected(../register_method/lmp_method, 'method_none'))"/>
      <bind nodeset="/pregnancy/gestational_age/method_lmp_summary/lmp_check_note" readonly="true()" type="string" relevant="selected(../../register_method/lmp_method, 'method_lmp')"/>
      <bind nodeset="/pregnancy/gestational_age/method_lmp_summary/lmp_approx_weeks_check_note" readonly="true()" type="string" relevant="selected(../../method_approx/lmp_approx, 'approx_weeks')"/>
      <bind nodeset="/pregnancy/gestational_age/method_lmp_summary/lmp_approx_months_check_note" readonly="true()" type="string" relevant="selected(../../method_approx/lmp_approx, 'approx_months')"/>
      <bind nodeset="/pregnancy/gestational_age/method_lmp_summary/u_edd_note" readonly="true()" type="string" relevant="selected(../../register_method/lmp_method, 'method_edd')"/>
      <bind nodeset="/pregnancy/gestational_age/method_lmp_summary/edd_note" readonly="true()" type="string" relevant="selected(../../register_method/lmp_method, 'method_lmp')
or selected(../../method_approx/lmp_approx, 'approx_weeks')
or selected(../../method_approx/lmp_approx, 'approx_months')"/>
      <bind nodeset="/pregnancy/gestational_age/method_lmp_summary/lmp_note" readonly="true()" type="string" relevant="selected(../../register_method/lmp_method, 'method_edd')"/>
      <bind nodeset="/pregnancy/gestational_age/method_lmp_summary/edd_check_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/gestational_age/g_lmp_date_8601" type="string" calculate="format-date-time(
if(selected(../register_method/lmp_method, 'method_lmp'), ../method_lmp/u_lmp_date,
if(selected(../method_approx/lmp_approx, 'approx_weeks'), date-time(decimal-date-time(today()) - (../method_approx/lmp_approx_weeks * 7)), 
if(selected(../method_approx/lmp_approx, 'approx_months'), date-time(decimal-date-time(today()) - round(../method_approx/lmp_approx_months * 30.5)),
if(selected(../register_method/lmp_method, 'method_edd'), date-time(decimal-date-time(../method_edd/u_edd) - 280), '')
))), &quot;%Y-%m-%d&quot;)"/>
      <bind nodeset="/pregnancy/gestational_age/g_lmp_date" type="string" calculate="format-date-time(../g_lmp_date_8601, &quot;%e %b, %Y&quot;)"/>
      <bind nodeset="/pregnancy/gestational_age/g_edd_8601" type="string" calculate="format-date-time(date-time(decimal-date-time(../g_lmp_date_8601)+280),&quot;%Y-%m-%d&quot;)"/>
      <bind nodeset="/pregnancy/gestational_age/g_edd" type="string" calculate="format-date-time(../g_edd_8601,&quot;%e %b, %Y&quot;)"/>
      <bind nodeset="/pregnancy/gestational_age/method_none" relevant="selected(../register_method/lmp_method, 'method_none')"/>
      <bind nodeset="/pregnancy/gestational_age/method_none/no_info_notice" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/gestational_age/method_none/pregnancy_confirm_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/anc_visits_hf" relevant="not(selected(../gestational_age/register_method/lmp_method, 'method_none'))"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count" type="int" required="true()" jr:constraintMsg="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count:jr:constraintMsg')" constraint=".&gt;= 0 and . &lt;= 9"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_count_confim_note_single" readonly="true()" type="string" relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  = 1"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_count_confim_note_multiple" readonly="true()" type="string" relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single" type="select1" required="true()" relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  = 1"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_single" type="date" required="true()" relevant="selected(../visited_date_ask_single, 'yes')" constraint=". &lt;= today() and . &gt;=  /pregnancy/gestational_age/g_lmp_date_8601 " jr:constraintMsg="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_single:jr:constraintMsg')"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_multiple_note" readonly="true()" type="string" relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_multiple_note_section" readonly="true()" type="string" relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_count" type="string" readonly="true()" calculate=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count "/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates" relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple" type="select1" required="true()" relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 1"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date" type="date" required="true()" relevant="selected(../visited_date_ask_multiple, 'yes')" constraint=". &lt;= today() and . &gt;=  /pregnancy/gestational_age/g_lmp_date_8601 " jr:constraintMsg="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date:jr:constraintMsg')"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date" type="date" required="true()" relevant="selected(../appointment_date_known, 'yes')" constraint="(. &gt;= today()) and
(decimal-date-time(.) &lt;= decimal-date-time(today()) + 30)" jr:constraintMsg="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date:jr:constraintMsg')"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note" relevant="selected(../anc_next_visit_date/appointment_date_known, 'no')"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/who_recommends_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/prenancy_age_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/refer_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/risk_factors/risk_factors_history/first_pregnancy" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/risk_factors/risk_factors_present/primary_condition" type="select" required="true()" relevant="selected(../../risk_factors_history/first_pregnancy, 'yes')" jr:constraintMsg="jr:itext('/pregnancy/risk_factors/risk_factors_present/primary_condition:jr:constraintMsg')" constraint="not(selected(.,'none')) or count-selected(.) &lt; 2"/>
      <bind nodeset="/pregnancy/risk_factors/risk_factors_present/secondary_condition" type="select" required="true()" relevant="selected(../../risk_factors_history/first_pregnancy, 'no')" jr:constraintMsg="jr:itext('/pregnancy/risk_factors/risk_factors_present/secondary_condition:jr:constraintMsg')" constraint="not(selected(.,'none')) or count-selected(.) &lt; 2"/>
      <bind nodeset="/pregnancy/risk_factors/risk_factors_present/additional_risk_check" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/risk_factors/risk_factors_present/additional_risk" type="string" required="true()" relevant="selected(../additional_risk_check, 'yes')" jr:constraintMsg="jr:itext('/pregnancy/risk_factors/risk_factors_present/additional_risk:jr:constraintMsg')" constraint="string-length(.) &lt;= 100"/>
      <bind nodeset="/pregnancy/risk_factors/r_risk_factor_present" type="string" calculate="if(selected(../risk_factors_history/first_pregnancy, 'yes') or
selected(../risk_factors_history/previous_miscarriage, 'yes') or 
not(selected(../risk_factors_present/primary_condition, 'none')) and ../risk_factors_present/primary_condition != '' or
not(selected(../risk_factors_present/secondary_condition, 'none')) and ../risk_factors_present/secondary_condition != '' or
selected(../risk_factors_present/additional_risk_check, 'yes')
, 'yes', 'no')"/>
      <bind nodeset="/pregnancy/danger_signs/danger_signs_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/danger_signs/danger_signs_question_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/danger_signs/vaginal_bleeding" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/danger_signs/fits" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/danger_signs/severe_abdominal_pain" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/danger_signs/severe_headache" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/danger_signs/very_pale" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/danger_signs/fever" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/danger_signs/reduced_or_no_fetal_movements" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/danger_signs/breaking_water" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/danger_signs/easily_tired" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/danger_signs/face_hand_swelling" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/danger_signs/breathlessness" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/danger_signs/r_danger_sign_present" type="string" calculate="if(selected(../vaginal_bleeding, 'yes')
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
      <bind nodeset="/pregnancy/danger_signs/congratulate_no_ds_note" readonly="true()" type="string" relevant="../r_danger_sign_present = 'no'"/>
      <bind nodeset="/pregnancy/danger_signs/refer_patient_note_1" readonly="true()" type="string" relevant="../r_danger_sign_present = 'yes'"/>
      <bind nodeset="/pregnancy/danger_signs/refer_patient_note_2" readonly="true()" type="string" relevant="../r_danger_sign_present = 'yes'"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/malaria/uses_llin" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/malaria/llin_advice_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/malaria/malaria_prophylaxis_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/deworming" relevant=" /pregnancy/weeks_since_lmp  &gt; 12"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/deworming/deworming_med" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/deworming/deworming_med_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/safe_practices_tips" relevant="not(selected(../../gestational_age/register_method/lmp_method, 'method_none'))"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/safe_practices_tips/eat_more_note" readonly="true()" type="string" relevant=" /pregnancy/weeks_since_lmp  &lt;= 24"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/safe_practices_tips/talk_softly_note" readonly="true()" type="string" relevant=" /pregnancy/weeks_since_lmp  &gt;= 25 and  /pregnancy/weeks_since_lmp  &lt;= 30"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/safe_practices_tips/respond_move_note" readonly="true()" type="string" relevant=" /pregnancy/weeks_since_lmp  &gt;= 25 and  /pregnancy/weeks_since_lmp  &lt;= 30"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/safe_practices_tips/deliver_hf_note" readonly="true()" type="string" relevant=" /pregnancy/weeks_since_lmp  &gt;= 31"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_importance_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/tetanus" relevant=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count  &gt; 0"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received" type="select1" required="true()"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/tetanus/tt_note_1" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/tetanus/tt_note_2" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/safe_pregnancy_practices/request_services" type="string" calculate="if((selected(../tetanus/tt_imm_received, 'no') or
selected(../hiv_status/hiv_tested, 'no') or
selected(../deworming/deworming_med, 'no') or
selected(../iron_folate/iron_folate_daily, 'no')), 'yes', 'no')"/>
      <bind nodeset="/pregnancy/summary/r_submit_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/summary/r_summary_details" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/summary/r_patient_details" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/summary/r_summary" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/summary/r_pregnancy_details" readonly="true()" type="string" relevant="not(selected(../../gestational_age/register_method/lmp_method, 'method_none'))"/>
      <bind nodeset="/pregnancy/summary/r_pregnancy_details_unknown" readonly="true()" type="string" relevant="selected(../../gestational_age/register_method/lmp_method, 'method_none')"/>
      <bind nodeset="/pregnancy/summary/r_risk_factors" readonly="true()" type="string" relevant="../../risk_factors/r_risk_factor_present = 'yes'"/>
      <bind nodeset="/pregnancy/summary/r_risk_first_pregnancy" readonly="true()" type="string" relevant="selected(../../risk_factors/risk_factors_history/first_pregnancy, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_risk_previous_miscarriage" readonly="true()" type="string" relevant="selected(../../risk_factors/risk_factors_history/previous_miscarriage, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_risk_previous_difficulties" readonly="true()" type="string" relevant="selected(../../risk_factors/risk_factors_present/secondary_condition, 'previous_difficulties')"/>
      <bind nodeset="/pregnancy/summary/r_risk_more_than_4_children" readonly="true()" type="string" relevant="selected(../../risk_factors/risk_factors_present/secondary_condition, 'more_than_4_children')"/>
      <bind nodeset="/pregnancy/summary/r_risk_last_baby_born_less_than_1_year_ago" readonly="true()" type="string" relevant="selected(../../risk_factors/risk_factors_present/secondary_condition, 'last_baby_born_less_than_1_year_ago')"/>
      <bind nodeset="/pregnancy/summary/r_risk_heart_condition" readonly="true()" type="string" relevant="selected(../../risk_factors/risk_factors_present/primary_condition, 'heart_condition') or selected(../../risk_factors/risk_factors_present/secondary_condition, 'heart_condition')"/>
      <bind nodeset="/pregnancy/summary/r_risk_asthma" readonly="true()" type="string" relevant="selected(../../risk_factors/risk_factors_present/primary_condition, 'asthma') or selected(../../risk_factors/risk_factors_present/secondary_condition, 'asthma')"/>
      <bind nodeset="/pregnancy/summary/r_risk_high_blood_pressure" readonly="true()" type="string" relevant="selected(../../risk_factors/risk_factors_present/primary_condition, 'high_blood_pressure') or selected(../../risk_factors/risk_factors_present/secondary_condition, 'high_blood_pressure')"/>
      <bind nodeset="/pregnancy/summary/r_risk_diabetes" readonly="true()" type="string" relevant="selected(../../risk_factors/risk_factors_present/primary_condition, 'diabetes') or selected(../../risk_factors/risk_factors_present/secondary_condition, 'diabetes')"/>
      <bind nodeset="/pregnancy/summary/r_risk_additional" readonly="true()" type="string" relevant="selected(../../risk_factors/risk_factors_present/additional_risk_check, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_danger_signs" readonly="true()" type="string" relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_danger_sign_vaginal_bleeding" readonly="true()" type="string" relevant="selected(../../danger_signs/vaginal_bleeding, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_danger_sign_fits" readonly="true()" type="string" relevant="selected(../../danger_signs/fits, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_danger_sign_severe_abdominal_pain" readonly="true()" type="string" relevant="selected(../../danger_signs/severe_abdominal_pain, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_danger_sign_severe_headache" readonly="true()" type="string" relevant="selected(../../danger_signs/severe_headache, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_danger_sign_very_pale" readonly="true()" type="string" relevant="selected(../../danger_signs/very_pale, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_danger_sign_fever" readonly="true()" type="string" relevant="selected(../../danger_signs/fever, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_danger_sign_reduced_or_no_fetal_movements" readonly="true()" type="string" relevant="selected(../../danger_signs/reduced_or_no_fetal_movements, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_danger_sign_breaking_water" readonly="true()" type="string" relevant="selected(../../danger_signs/breaking_water, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_danger_sign_easily_tired" readonly="true()" type="string" relevant="selected(../../danger_signs/easily_tired, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_danger_sign_face_hand_swelling" readonly="true()" type="string" relevant="selected(../../danger_signs/face_hand_swelling, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_danger_sign_breathlessness" readonly="true()" type="string" relevant="selected(../../danger_signs/breathlessness, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_space_1" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/summary/r_referrals" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/summary/r_refer_clinic_immediately" readonly="true()" type="string" relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_refer_danger_sign" readonly="true()" type="string" relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_routine_anc" readonly="true()" type="string" relevant="selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_request_services" readonly="true()" type="string" relevant="selected(../../safe_pregnancy_practices/request_services, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_request_service_tt" readonly="true()" type="string" relevant="selected(../../safe_pregnancy_practices/tetanus/tt_imm_received, 'no')"/>
      <bind nodeset="/pregnancy/summary/r_request_service_hiv_test" readonly="true()" type="string" relevant="selected(../../safe_pregnancy_practices/hiv_status/hiv_tested, 'no')"/>
      <bind nodeset="/pregnancy/summary/r_request_service_deworming" readonly="true()" type="string" relevant="selected(../../safe_pregnancy_practices/deworming/deworming_med, 'no')"/>
      <bind nodeset="/pregnancy/summary/r_request_service_iron" readonly="true()" type="string" relevant="selected(../../safe_pregnancy_practices/iron_folate/iron_folate_daily, 'no')"/>
      <bind nodeset="/pregnancy/summary/r_who_recommends" readonly="true()" type="string" relevant="selected(../../gestational_age/register_method/lmp_method, 'method_none') or selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'no')"/>
      <bind nodeset="/pregnancy/summary/r_refer_hf_appropriate_time" readonly="true()" type="string" relevant="selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'no')"/>
      <bind nodeset="/pregnancy/summary/r_refer_hf_immediately" readonly="true()" type="string" relevant="selected(../../gestational_age/register_method/lmp_method, 'method_none')"/>
      <bind nodeset="/pregnancy/summary/r_space_2" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/summary/check-" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/summary/r_following_tasks" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy/summary/r_fup_danger_sign" readonly="true()" type="string" relevant="selected(../../danger_signs/r_danger_sign_present, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_fup_hf_visit" readonly="true()" type="string" relevant="selected(../../anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known, 'yes')"/>
      <bind nodeset="/pregnancy/summary/r_fup_pregnancy_visit" readonly="true()" type="string" relevant="not(selected(../../gestational_age/register_method/lmp_method, 'method_none')) and
../next_visit_weeks &lt; 40 and
../next_visit_weeks &gt; 0"/>
      <bind nodeset="/pregnancy/summary/r_fup_pregnancy_visit_2_weeks" readonly="true()" type="string" relevant="selected(../../gestational_age/register_method/lmp_method, 'method_none')"/>
      <bind nodeset="/pregnancy/summary/next_visit_weeks" type="string" calculate="round((if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 12*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 12*7,
if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 20*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 20*7,
if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 26*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 26*7,
if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 30*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 30*7,
if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 34*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 34*7,
if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 36*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 36*7,
if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 38*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 38*7,
if((decimal-date-time( /pregnancy/lmp_date_8601 ) + 40*7) &gt; decimal-date-time(today()), decimal-date-time( /pregnancy/lmp_date_8601 ) + 40*7, 0
)))))))) - decimal-date-time(today())) div 7, 0)"/>
      <bind nodeset="/pregnancy/summary/edd_summary" type="string" calculate="format-date-time( /pregnancy/edd_8601 , &quot;%e %b, %Y&quot;)"/>
      <bind nodeset="/pregnancy/summary/next_appointment_date" type="string" calculate="format-date-time( /pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date , &quot;%e %b, %Y&quot;)"/>
      <bind nodeset="/pregnancy/summary/custom_translations/custom_woman_label_translator" type="select1" calculate="&quot;woman&quot;"/>
      <bind nodeset="/pregnancy/summary/custom_translations/custom_woman_label" type="string" calculate="jr:choice-name( /pregnancy/summary/custom_translations/custom_woman_label_translator ,' /pregnancy/summary/custom_translations/custom_woman_label_translator ')"/>
      <bind nodeset="/pregnancy/summary/custom_translations/custom_woman_start_label_translator" type="select1" calculate="&quot;woman-start&quot;"/>
      <bind nodeset="/pregnancy/summary/custom_translations/custom_woman_start_label" type="string" calculate="jr:choice-name( /pregnancy/summary/custom_translations/custom_woman_start_label_translator ,' /pregnancy/summary/custom_translations/custom_woman_start_label_translator ')"/>
      <bind nodeset="/pregnancy/data/__lmp_method" type="string" calculate=" /pregnancy/gestational_age/register_method/lmp_method "/>
      <bind nodeset="/pregnancy/data/__no_lmp_registration_reason" type="string" calculate=" /pregnancy/gestational_age/method_none/no_info_pregnancy_reason "/>
      <bind nodeset="/pregnancy/data/__lmp_date" type="string" calculate=" /pregnancy/lmp_date_8601 "/>
      <bind nodeset="/pregnancy/data/__lmp_approx_weeks" type="string" calculate=" /pregnancy/gestational_age/method_approx/lmp_approx_weeks "/>
      <bind nodeset="/pregnancy/data/__lmp_approx_months" type="string" calculate=" /pregnancy/gestational_age/method_approx/lmp_approx_months "/>
      <bind nodeset="/pregnancy/data/__edd" type="string" calculate=" /pregnancy/edd_8601 "/>
      <bind nodeset="/pregnancy/data/__num_previous_anc_hf_visits" type="string" calculate=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count "/>
      <bind nodeset="/pregnancy/data/__previous_anc_hf_visit_dates" type="string" calculate="coalesce( /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_single , join(',',  /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date ))"/>
      <bind nodeset="/pregnancy/data/__next_anc_hf_visit_date_known" type="string" calculate=" /pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known "/>
      <bind nodeset="/pregnancy/data/__next_anc_hf_visit_date" type="string" calculate=" /pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date "/>
      <bind nodeset="/pregnancy/data/__has_risk_factors" type="string" calculate=" /pregnancy/risk_factors/r_risk_factor_present "/>
      <bind nodeset="/pregnancy/data/__first_pregnancy" type="string" calculate=" /pregnancy/risk_factors/risk_factors_history/first_pregnancy "/>
      <bind nodeset="/pregnancy/data/__previous_miscarriage" type="string" calculate=" /pregnancy/risk_factors/risk_factors_history/previous_miscarriage "/>
      <bind nodeset="/pregnancy/data/__previous_difficulties" type="string" calculate="if(selected( /pregnancy/risk_factors/risk_factors_present/secondary_condition , 'previous_difficulties'), &quot;yes&quot;, &quot;no&quot;)"/>
      <bind nodeset="/pregnancy/data/__more_than_4_children" type="string" calculate="if(selected( /pregnancy/risk_factors/risk_factors_present/secondary_condition , 'more_than_4_children'), &quot;yes&quot;, &quot;no&quot;)"/>
      <bind nodeset="/pregnancy/data/__last_baby_born_less_than_1_year_ago" type="string" calculate="if(selected( /pregnancy/risk_factors/risk_factors_present/secondary_condition , 'last_baby_born_less_than_1_year_ago'), &quot;yes&quot;, &quot;no&quot;)"/>
      <bind nodeset="/pregnancy/data/__heart_condition" type="string" calculate="if(selected( /pregnancy/risk_factors/risk_factors_present/primary_condition , 'heart_condition'), &quot;yes&quot;, if(selected( /pregnancy/risk_factors/risk_factors_present/secondary_condition , 'heart_condition'), &quot;yes&quot;, &quot;no&quot;))"/>
      <bind nodeset="/pregnancy/data/__asthma" type="string" calculate="if(selected( /pregnancy/risk_factors/risk_factors_present/primary_condition , 'asthma'), &quot;yes&quot;, if(selected( /pregnancy/risk_factors/risk_factors_present/secondary_condition , 'asthma'), &quot;yes&quot;, &quot;no&quot;))"/>
      <bind nodeset="/pregnancy/data/__high_blood_pressure" type="string" calculate="if(selected( /pregnancy/risk_factors/risk_factors_present/primary_condition , 'high_blood_pressure'), &quot;yes&quot;, if(selected( /pregnancy/risk_factors/risk_factors_present/secondary_condition , 'high_blood_pressure'), &quot;yes&quot;, &quot;no&quot;))"/>
      <bind nodeset="/pregnancy/data/__diabetes" type="string" calculate="if(selected( /pregnancy/risk_factors/risk_factors_present/primary_condition , 'diabetes'), &quot;yes&quot;, if(selected( /pregnancy/risk_factors/risk_factors_present/secondary_condition , 'diabetes'), &quot;yes&quot;, &quot;no&quot;))"/>
      <bind nodeset="/pregnancy/data/__additional_high_risk_condition_to_report" type="string" calculate=" /pregnancy/risk_factors/risk_factors_present/additional_risk_check "/>
      <bind nodeset="/pregnancy/data/__additional_high_risk_condition" type="string" calculate=" /pregnancy/risk_factors/risk_factors_present/additional_risk "/>
      <bind nodeset="/pregnancy/data/__has_danger_sign" type="string" calculate=" /pregnancy/danger_signs/r_danger_sign_present "/>
      <bind nodeset="/pregnancy/data/__vaginal_bleeding" type="string" calculate=" /pregnancy/danger_signs/vaginal_bleeding "/>
      <bind nodeset="/pregnancy/data/__fits" type="string" calculate=" /pregnancy/danger_signs/fits "/>
      <bind nodeset="/pregnancy/data/__severe_abdominal_pain" type="string" calculate=" /pregnancy/danger_signs/severe_abdominal_pain "/>
      <bind nodeset="/pregnancy/data/__severe_headache" type="string" calculate=" /pregnancy/danger_signs/severe_headache "/>
      <bind nodeset="/pregnancy/data/__very_pale" type="string" calculate=" /pregnancy/danger_signs/very_pale "/>
      <bind nodeset="/pregnancy/data/__fever" type="string" calculate=" /pregnancy/danger_signs/fever "/>
      <bind nodeset="/pregnancy/data/__reduced_or_no_fetal_movements" type="string" calculate=" /pregnancy/danger_signs/reduced_or_no_fetal_movements "/>
      <bind nodeset="/pregnancy/data/__breaking_water" type="string" calculate=" /pregnancy/danger_signs/breaking_water "/>
      <bind nodeset="/pregnancy/data/__easily_tired" type="string" calculate=" /pregnancy/danger_signs/easily_tired "/>
      <bind nodeset="/pregnancy/data/__face_hand_swelling" type="string" calculate=" /pregnancy/danger_signs/face_hand_swelling "/>
      <bind nodeset="/pregnancy/data/__breathlessness" type="string" calculate=" /pregnancy/danger_signs/breathlessness "/>
      <bind nodeset="/pregnancy/data/__uses_llin" type="string" calculate=" /pregnancy/safe_pregnancy_practices/malaria/uses_llin "/>
      <bind nodeset="/pregnancy/data/__takes_iron_folate_daily" type="string" calculate=" /pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily "/>
      <bind nodeset="/pregnancy/data/__received_deworming_meds" type="string" calculate=" /pregnancy/safe_pregnancy_practices/deworming/deworming_med "/>
      <bind nodeset="/pregnancy/data/__tested_for_hiv_in_past_3_months" type="string" calculate=" /pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested "/>
      <bind nodeset="/pregnancy/data/__received_tetanus_toxoid_this_pregnancy" type="string" calculate=" /pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received "/>
      <bind nodeset="/pregnancy/data/meta/__patient_uuid" type="string" calculate="../../../inputs/contact/_id"/>
      <bind nodeset="/pregnancy/data/meta/__patient_id" type="string" calculate="../../../inputs/contact/patient_id"/>
      <bind nodeset="/pregnancy/data/meta/__household_uuid" type="string" calculate="../../../inputs/contact/parent/_id"/>
      <bind nodeset="/pregnancy/data/meta/__source" type="string" calculate="../../../inputs/source"/>
      <bind nodeset="/pregnancy/data/meta/__source_id" type="string" calculate="../../../inputs/source_id"/>
      <bind nodeset="/pregnancy/meta/instanceID" type="string" readonly="true()" calculate="concat('uuid:', uuid())"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/pregnancy/inputs">
      <group ref="/pregnancy/inputs/user">
        <label ref="jr:itext('/pregnancy/inputs/user:label')"/>
        <input appearance="select-contact type-person" ref="/pregnancy/inputs/user/contact_id">
          <label ref="jr:itext('/pregnancy/inputs/user/contact_id:label')"/>
        </input>
        <group ref="/pregnancy/inputs/user/parent"/>
      </group>
      <group ref="/pregnancy/inputs/contact">
        <input appearance="db-object" ref="/pregnancy/inputs/contact/_id">
          <label ref="jr:itext('/pregnancy/inputs/contact/_id:label')"/>
        </input>
        <group ref="/pregnancy/inputs/contact/parent">
          <group ref="/pregnancy/inputs/contact/parent/parent">
            <group ref="/pregnancy/inputs/contact/parent/parent/contact"/>
          </group>
        </group>
      </group>
    </group>
    <group ref="/pregnancy/gestational_age">
      <label ref="jr:itext('/pregnancy/gestational_age:label')"/>
      <group appearance="field-list" ref="/pregnancy/gestational_age/register_method">
        <input ref="/pregnancy/gestational_age/register_method/register_note">
          <label ref="jr:itext('/pregnancy/gestational_age/register_method/register_note:label')"/>
        </input>
        <select1 ref="/pregnancy/gestational_age/register_method/lmp_method">
          <label ref="jr:itext('/pregnancy/gestational_age/register_method/lmp_method:label')"/>
          <hint ref="jr:itext('/pregnancy/gestational_age/register_method/lmp_method:hint')"/>
          <item>
            <label ref="jr:itext('/pregnancy/gestational_age/register_method/lmp_method/method_lmp:label')"/>
            <value>method_lmp</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/gestational_age/register_method/lmp_method/method_approx:label')"/>
            <value>method_approx</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/gestational_age/register_method/lmp_method/method_edd:label')"/>
            <value>method_edd</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/gestational_age/register_method/lmp_method/method_none:label')"/>
            <value>method_none</value>
          </item>
        </select1>
      </group>
      <group ref="/pregnancy/gestational_age/method_lmp">
        <input ref="/pregnancy/gestational_age/method_lmp/u_lmp_date">
          <label ref="jr:itext('/pregnancy/gestational_age/method_lmp/u_lmp_date:label')"/>
        </input>
      </group>
      <group appearance="field-list" ref="/pregnancy/gestational_age/method_approx">
        <select1 ref="/pregnancy/gestational_age/method_approx/lmp_approx">
          <label ref="jr:itext('/pregnancy/gestational_age/method_approx/lmp_approx:label')"/>
          <hint ref="jr:itext('/pregnancy/gestational_age/method_approx/lmp_approx:hint')"/>
          <item>
            <label ref="jr:itext('/pregnancy/gestational_age/method_approx/lmp_approx/approx_weeks:label')"/>
            <value>approx_weeks</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/gestational_age/method_approx/lmp_approx/approx_months:label')"/>
            <value>approx_months</value>
          </item>
        </select1>
        <input ref="/pregnancy/gestational_age/method_approx/lmp_approx_weeks">
          <label ref="jr:itext('/pregnancy/gestational_age/method_approx/lmp_approx_weeks:label')"/>
        </input>
        <input ref="/pregnancy/gestational_age/method_approx/lmp_approx_months">
          <label ref="jr:itext('/pregnancy/gestational_age/method_approx/lmp_approx_months:label')"/>
        </input>
      </group>
      <group ref="/pregnancy/gestational_age/method_edd">
        <input ref="/pregnancy/gestational_age/method_edd/u_edd">
          <label ref="jr:itext('/pregnancy/gestational_age/method_edd/u_edd:label')"/>
        </input>
      </group>
      <group appearance="field-list" ref="/pregnancy/gestational_age/method_lmp_summary">
        <input ref="/pregnancy/gestational_age/method_lmp_summary/lmp_check_note">
          <label ref="jr:itext('/pregnancy/gestational_age/method_lmp_summary/lmp_check_note:label')"/>
        </input>
        <input ref="/pregnancy/gestational_age/method_lmp_summary/lmp_approx_weeks_check_note">
          <label ref="jr:itext('/pregnancy/gestational_age/method_lmp_summary/lmp_approx_weeks_check_note:label')"/>
        </input>
        <input ref="/pregnancy/gestational_age/method_lmp_summary/lmp_approx_months_check_note">
          <label ref="jr:itext('/pregnancy/gestational_age/method_lmp_summary/lmp_approx_months_check_note:label')"/>
        </input>
        <input ref="/pregnancy/gestational_age/method_lmp_summary/u_edd_note">
          <label ref="jr:itext('/pregnancy/gestational_age/method_lmp_summary/u_edd_note:label')"/>
        </input>
        <input ref="/pregnancy/gestational_age/method_lmp_summary/edd_note">
          <label ref="jr:itext('/pregnancy/gestational_age/method_lmp_summary/edd_note:label')"/>
        </input>
        <input ref="/pregnancy/gestational_age/method_lmp_summary/lmp_note">
          <label ref="jr:itext('/pregnancy/gestational_age/method_lmp_summary/lmp_note:label')"/>
        </input>
        <input ref="/pregnancy/gestational_age/method_lmp_summary/edd_check_note">
          <label ref="jr:itext('/pregnancy/gestational_age/method_lmp_summary/edd_check_note:label')"/>
        </input>
      </group>
      <group appearance="field-list" ref="/pregnancy/gestational_age/method_none">
        <input ref="/pregnancy/gestational_age/method_none/no_info_notice">
          <label ref="jr:itext('/pregnancy/gestational_age/method_none/no_info_notice:label')"/>
        </input>
        <select1 ref="/pregnancy/gestational_age/method_none/no_info_pregnancy_reason">
          <label ref="jr:itext('/pregnancy/gestational_age/method_none/no_info_pregnancy_reason:label')"/>
          <hint ref="jr:itext('/pregnancy/gestational_age/method_none/no_info_pregnancy_reason:hint')"/>
          <item>
            <label ref="jr:itext('/pregnancy/gestational_age/method_none/no_info_pregnancy_reason/visibly_pregnant:label')"/>
            <value>visibly_pregnant</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/gestational_age/method_none/no_info_pregnancy_reason/test_positive:label')"/>
            <value>test_positive</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/gestational_age/method_none/no_info_pregnancy_reason/missed_periods:label')"/>
            <value>missed_periods</value>
          </item>
        </select1>
        <input ref="/pregnancy/gestational_age/method_none/pregnancy_confirm_note">
          <label ref="jr:itext('/pregnancy/gestational_age/method_none/pregnancy_confirm_note:label')"/>
        </input>
      </group>
    </group>
    <group ref="/pregnancy/anc_visits_hf">
      <group ref="/pregnancy/anc_visits_hf/anc_visits_hf_past">
        <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past:label')"/>
        <input ref="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count">
          <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count:label')"/>
          <hint ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count:hint')"/>
        </input>
        <group appearance="field-list" ref="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group">
          <input ref="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_count_confim_note_single">
            <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_count_confim_note_single:label')"/>
          </input>
          <input ref="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_count_confim_note_multiple">
            <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_count_confim_note_multiple:label')"/>
          </input>
          <select1 ref="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single">
            <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single:label')"/>
            <item>
              <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single/no:label')"/>
              <value>no</value>
            </item>
            <item>
              <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_ask_single/yes:label')"/>
              <value>yes</value>
            </item>
          </select1>
          <input ref="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_single">
            <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_date_single:label')"/>
          </input>
          <input ref="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_multiple_note">
            <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_multiple_note:label')"/>
          </input>
          <input ref="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_multiple_note_section">
            <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_multiple_note_section:label')"/>
          </input>
          <group ref="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates">
            <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates:label')"/>
            <repeat nodeset="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates" jr:count=" /pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates_count ">
              <select1 ref="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple">
                <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple:label')"/>
                <item>
                  <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple/no:label')"/>
                  <value>no</value>
                </item>
                <item>
                  <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date_ask_multiple/yes:label')"/>
                  <value>yes</value>
                </item>
              </select1>
              <input ref="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date">
                <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_dates_group/visited_dates/visited_date:label')"/>
              </input>
            </repeat>
          </group>
        </group>
      </group>
      <group ref="/pregnancy/anc_visits_hf/anc_visits_hf_next">
        <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_next:label')"/>
        <group appearance="field-list" ref="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date">
          <select1 ref="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known">
            <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known:label')"/>
            <item>
              <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known/no:label')"/>
              <value>no</value>
            </item>
            <item>
              <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known/yes:label')"/>
              <value>yes</value>
            </item>
          </select1>
          <input ref="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date"/>
        </group>
        <group appearance="field-list" ref="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note">
          <input ref="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/who_recommends_note">
            <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/who_recommends_note:label')"/>
          </input>
          <input ref="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/prenancy_age_note">
            <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/prenancy_age_note:label')"/>
          </input>
          <input ref="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/refer_note">
            <label ref="jr:itext('/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_visit_advice_note/refer_note:label')"/>
          </input>
        </group>
      </group>
    </group>
    <group ref="/pregnancy/risk_factors">
      <label ref="jr:itext('/pregnancy/risk_factors:label')"/>
      <group appearance="field-list" ref="/pregnancy/risk_factors/risk_factors_history">
        <select1 ref="/pregnancy/risk_factors/risk_factors_history/first_pregnancy">
          <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_history/first_pregnancy:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_history/first_pregnancy/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_history/first_pregnancy/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <select1 ref="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage">
          <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_history/previous_miscarriage:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_history/previous_miscarriage/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_history/previous_miscarriage/no:label')"/>
            <value>no</value>
          </item>
        </select1>
      </group>
      <group appearance="field-list" ref="/pregnancy/risk_factors/risk_factors_present">
        <select ref="/pregnancy/risk_factors/risk_factors_present/primary_condition">
          <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/primary_condition:label')"/>
          <hint ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/primary_condition:hint')"/>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/primary_condition/heart_condition:label')"/>
            <value>heart_condition</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/primary_condition/asthma:label')"/>
            <value>asthma</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/primary_condition/high_blood_pressure:label')"/>
            <value>high_blood_pressure</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/primary_condition/diabetes:label')"/>
            <value>diabetes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/primary_condition/none:label')"/>
            <value>none</value>
          </item>
        </select>
        <select ref="/pregnancy/risk_factors/risk_factors_present/secondary_condition">
          <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/secondary_condition:label')"/>
          <hint ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/secondary_condition:hint')"/>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/secondary_condition/previous_difficulties:label')"/>
            <value>previous_difficulties</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/secondary_condition/more_than_4_children:label')"/>
            <value>more_than_4_children</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/secondary_condition/last_baby_born_less_than_1_year_ago:label')"/>
            <value>last_baby_born_less_than_1_year_ago</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/secondary_condition/heart_condition:label')"/>
            <value>heart_condition</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/secondary_condition/asthma:label')"/>
            <value>asthma</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/secondary_condition/high_blood_pressure:label')"/>
            <value>high_blood_pressure</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/secondary_condition/diabetes:label')"/>
            <value>diabetes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/secondary_condition/none:label')"/>
            <value>none</value>
          </item>
        </select>
        <select1 ref="/pregnancy/risk_factors/risk_factors_present/additional_risk_check">
          <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/additional_risk_check:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/additional_risk_check/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/additional_risk_check/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <input ref="/pregnancy/risk_factors/risk_factors_present/additional_risk">
          <label ref="jr:itext('/pregnancy/risk_factors/risk_factors_present/additional_risk:label')"/>
        </input>
      </group>
    </group>
    <group appearance="field-list" ref="/pregnancy/danger_signs">
      <label ref="jr:itext('/pregnancy/danger_signs:label')"/>
      <input ref="/pregnancy/danger_signs/danger_signs_note">
        <label ref="jr:itext('/pregnancy/danger_signs/danger_signs_note:label')"/>
      </input>
      <input ref="/pregnancy/danger_signs/danger_signs_question_note">
        <label ref="jr:itext('/pregnancy/danger_signs/danger_signs_question_note:label')"/>
      </input>
      <select1 ref="/pregnancy/danger_signs/vaginal_bleeding">
        <label ref="jr:itext('/pregnancy/danger_signs/vaginal_bleeding:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/vaginal_bleeding/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/vaginal_bleeding/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy/danger_signs/fits">
        <label ref="jr:itext('/pregnancy/danger_signs/fits:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/fits/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/fits/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy/danger_signs/severe_abdominal_pain">
        <label ref="jr:itext('/pregnancy/danger_signs/severe_abdominal_pain:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/severe_abdominal_pain/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/severe_abdominal_pain/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy/danger_signs/severe_headache">
        <label ref="jr:itext('/pregnancy/danger_signs/severe_headache:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/severe_headache/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/severe_headache/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy/danger_signs/very_pale">
        <label ref="jr:itext('/pregnancy/danger_signs/very_pale:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/very_pale/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/very_pale/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy/danger_signs/fever">
        <label ref="jr:itext('/pregnancy/danger_signs/fever:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/fever/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/fever/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy/danger_signs/reduced_or_no_fetal_movements">
        <label ref="jr:itext('/pregnancy/danger_signs/reduced_or_no_fetal_movements:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/reduced_or_no_fetal_movements/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/reduced_or_no_fetal_movements/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy/danger_signs/breaking_water">
        <label ref="jr:itext('/pregnancy/danger_signs/breaking_water:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/breaking_water/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/breaking_water/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy/danger_signs/easily_tired">
        <label ref="jr:itext('/pregnancy/danger_signs/easily_tired:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/easily_tired/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/easily_tired/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy/danger_signs/face_hand_swelling">
        <label ref="jr:itext('/pregnancy/danger_signs/face_hand_swelling:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/face_hand_swelling/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/face_hand_swelling/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pregnancy/danger_signs/breathlessness">
        <label ref="jr:itext('/pregnancy/danger_signs/breathlessness:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/breathlessness/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy/danger_signs/breathlessness/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <input ref="/pregnancy/danger_signs/congratulate_no_ds_note">
        <label ref="jr:itext('/pregnancy/danger_signs/congratulate_no_ds_note:label')"/>
      </input>
      <input ref="/pregnancy/danger_signs/refer_patient_note_1">
        <label ref="jr:itext('/pregnancy/danger_signs/refer_patient_note_1:label')"/>
      </input>
      <input ref="/pregnancy/danger_signs/refer_patient_note_2">
        <label ref="jr:itext('/pregnancy/danger_signs/refer_patient_note_2:label')"/>
      </input>
    </group>
    <group ref="/pregnancy/safe_pregnancy_practices">
      <label ref="jr:itext('/pregnancy/safe_pregnancy_practices:label')"/>
      <group appearance="field-list" ref="/pregnancy/safe_pregnancy_practices/malaria">
        <select1 ref="/pregnancy/safe_pregnancy_practices/malaria/uses_llin">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/malaria/uses_llin:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/malaria/uses_llin/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/malaria/uses_llin/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <input ref="/pregnancy/safe_pregnancy_practices/malaria/llin_advice_note">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/malaria/llin_advice_note:label')"/>
        </input>
        <input ref="/pregnancy/safe_pregnancy_practices/malaria/malaria_prophylaxis_note">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/malaria/malaria_prophylaxis_note:label')"/>
        </input>
      </group>
      <group appearance="field-list" ref="/pregnancy/safe_pregnancy_practices/iron_folate">
        <select1 ref="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <input ref="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_note">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_note:label')"/>
        </input>
      </group>
      <group appearance="field-list" ref="/pregnancy/safe_pregnancy_practices/deworming">
        <select1 ref="/pregnancy/safe_pregnancy_practices/deworming/deworming_med">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/deworming/deworming_med:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/deworming/deworming_med/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/deworming/deworming_med/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <input ref="/pregnancy/safe_pregnancy_practices/deworming/deworming_med_note">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/deworming/deworming_med_note:label')"/>
        </input>
      </group>
      <group ref="/pregnancy/safe_pregnancy_practices/safe_practices_tips">
        <input ref="/pregnancy/safe_pregnancy_practices/safe_practices_tips/eat_more_note">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/safe_practices_tips/eat_more_note:label')"/>
        </input>
        <input ref="/pregnancy/safe_pregnancy_practices/safe_practices_tips/talk_softly_note">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/safe_practices_tips/talk_softly_note:label')"/>
        </input>
        <input ref="/pregnancy/safe_pregnancy_practices/safe_practices_tips/respond_move_note">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/safe_practices_tips/respond_move_note:label')"/>
        </input>
        <input ref="/pregnancy/safe_pregnancy_practices/safe_practices_tips/deliver_hf_note">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/safe_practices_tips/deliver_hf_note:label')"/>
        </input>
      </group>
      <group appearance="field-list" ref="/pregnancy/safe_pregnancy_practices/hiv_status">
        <select1 ref="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <input ref="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_importance_note">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/hiv_status/hiv_importance_note:label')"/>
        </input>
      </group>
      <group appearance="field-list" ref="/pregnancy/safe_pregnancy_practices/tetanus">
        <select1 ref="/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received:label')"/>
          <item>
            <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received/yes:label')"/>
            <value>yes</value>
          </item>
          <item>
            <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/tetanus/tt_imm_received/no:label')"/>
            <value>no</value>
          </item>
        </select1>
        <input ref="/pregnancy/safe_pregnancy_practices/tetanus/tt_note_1">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/tetanus/tt_note_1:label')"/>
        </input>
        <input ref="/pregnancy/safe_pregnancy_practices/tetanus/tt_note_2">
          <label ref="jr:itext('/pregnancy/safe_pregnancy_practices/tetanus/tt_note_2:label')"/>
        </input>
      </group>
    </group>
    <group appearance="field-list summary" ref="/pregnancy/summary">
      <input ref="/pregnancy/summary/r_submit_note">
        <label ref="jr:itext('/pregnancy/summary/r_submit_note:label')"/>
      </input>
      <input appearance="h1 yellow" ref="/pregnancy/summary/r_summary_details">
        <label ref="jr:itext('/pregnancy/summary/r_summary_details:label')"/>
      </input>
      <input ref="/pregnancy/summary/r_patient_details">
        <label ref="jr:itext('/pregnancy/summary/r_patient_details:label')"/>
      </input>
      <input appearance="h1 blue" ref="/pregnancy/summary/r_summary">
        <label ref="jr:itext('/pregnancy/summary/r_summary:label')"/>
      </input>
      <input appearance="center" ref="/pregnancy/summary/r_pregnancy_details">
        <label ref="jr:itext('/pregnancy/summary/r_pregnancy_details:label')"/>
      </input>
      <input appearance="center" ref="/pregnancy/summary/r_pregnancy_details_unknown">
        <label ref="jr:itext('/pregnancy/summary/r_pregnancy_details_unknown:label')"/>
      </input>
      <input appearance="h3 blue center underline" ref="/pregnancy/summary/r_risk_factors">
        <label ref="jr:itext('/pregnancy/summary/r_risk_factors:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_risk_first_pregnancy">
        <label ref="jr:itext('/pregnancy/summary/r_risk_first_pregnancy:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_risk_previous_miscarriage">
        <label ref="jr:itext('/pregnancy/summary/r_risk_previous_miscarriage:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_risk_previous_difficulties">
        <label ref="jr:itext('/pregnancy/summary/r_risk_previous_difficulties:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_risk_more_than_4_children">
        <label ref="jr:itext('/pregnancy/summary/r_risk_more_than_4_children:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_risk_last_baby_born_less_than_1_year_ago">
        <label ref="jr:itext('/pregnancy/summary/r_risk_last_baby_born_less_than_1_year_ago:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_risk_heart_condition">
        <label ref="jr:itext('/pregnancy/summary/r_risk_heart_condition:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_risk_asthma">
        <label ref="jr:itext('/pregnancy/summary/r_risk_asthma:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_risk_high_blood_pressure">
        <label ref="jr:itext('/pregnancy/summary/r_risk_high_blood_pressure:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_risk_diabetes">
        <label ref="jr:itext('/pregnancy/summary/r_risk_diabetes:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_risk_additional">
        <label ref="jr:itext('/pregnancy/summary/r_risk_additional:label')"/>
      </input>
      <input appearance="h3 blue center underline" ref="/pregnancy/summary/r_danger_signs">
        <label ref="jr:itext('/pregnancy/summary/r_danger_signs:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_danger_sign_vaginal_bleeding">
        <label ref="jr:itext('/pregnancy/summary/r_danger_sign_vaginal_bleeding:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_danger_sign_fits">
        <label ref="jr:itext('/pregnancy/summary/r_danger_sign_fits:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_danger_sign_severe_abdominal_pain">
        <label ref="jr:itext('/pregnancy/summary/r_danger_sign_severe_abdominal_pain:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_danger_sign_severe_headache">
        <label ref="jr:itext('/pregnancy/summary/r_danger_sign_severe_headache:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_danger_sign_very_pale">
        <label ref="jr:itext('/pregnancy/summary/r_danger_sign_very_pale:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_danger_sign_fever">
        <label ref="jr:itext('/pregnancy/summary/r_danger_sign_fever:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_danger_sign_reduced_or_no_fetal_movements">
        <label ref="jr:itext('/pregnancy/summary/r_danger_sign_reduced_or_no_fetal_movements:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_danger_sign_breaking_water">
        <label ref="jr:itext('/pregnancy/summary/r_danger_sign_breaking_water:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_danger_sign_easily_tired">
        <label ref="jr:itext('/pregnancy/summary/r_danger_sign_easily_tired:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_danger_sign_face_hand_swelling">
        <label ref="jr:itext('/pregnancy/summary/r_danger_sign_face_hand_swelling:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_danger_sign_breathlessness">
        <label ref="jr:itext('/pregnancy/summary/r_danger_sign_breathlessness:label')"/>
      </input>
      <input ref="/pregnancy/summary/r_space_1"/>
      <input appearance="h1 lime" ref="/pregnancy/summary/r_referrals">
        <label ref="jr:itext('/pregnancy/summary/r_referrals:label')"/>
      </input>
      <input ref="/pregnancy/summary/r_refer_clinic_immediately">
        <label ref="jr:itext('/pregnancy/summary/r_refer_clinic_immediately:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_refer_danger_sign">
        <label ref="jr:itext('/pregnancy/summary/r_refer_danger_sign:label')"/>
      </input>
      <input ref="/pregnancy/summary/r_routine_anc">
        <label ref="jr:itext('/pregnancy/summary/r_routine_anc:label')"/>
      </input>
      <input ref="/pregnancy/summary/r_request_services">
        <label ref="jr:itext('/pregnancy/summary/r_request_services:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_request_service_tt">
        <label ref="jr:itext('/pregnancy/summary/r_request_service_tt:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_request_service_hiv_test">
        <label ref="jr:itext('/pregnancy/summary/r_request_service_hiv_test:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_request_service_deworming">
        <label ref="jr:itext('/pregnancy/summary/r_request_service_deworming:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy/summary/r_request_service_iron">
        <label ref="jr:itext('/pregnancy/summary/r_request_service_iron:label')"/>
      </input>
      <input ref="/pregnancy/summary/r_who_recommends">
        <label ref="jr:itext('/pregnancy/summary/r_who_recommends:label')"/>
      </input>
      <input ref="/pregnancy/summary/r_refer_hf_appropriate_time">
        <label ref="jr:itext('/pregnancy/summary/r_refer_hf_appropriate_time:label')"/>
      </input>
      <input ref="/pregnancy/summary/r_refer_hf_immediately">
        <label ref="jr:itext('/pregnancy/summary/r_refer_hf_immediately:label')"/>
      </input>
      <input ref="/pregnancy/summary/r_space_2"/>
      <input appearance="h1 green" ref="/pregnancy/summary/check-">
        <label ref="jr:itext('/pregnancy/summary/check-:label')"/>
      </input>
      <input ref="/pregnancy/summary/r_following_tasks">
        <label ref="jr:itext('/pregnancy/summary/r_following_tasks:label')"/>
      </input>
      <input ref="/pregnancy/summary/r_fup_danger_sign">
        <label ref="jr:itext('/pregnancy/summary/r_fup_danger_sign:label')"/>
      </input>
      <input ref="/pregnancy/summary/r_fup_hf_visit">
        <label ref="jr:itext('/pregnancy/summary/r_fup_hf_visit:label')"/>
      </input>
      <input ref="/pregnancy/summary/r_fup_pregnancy_visit">
        <label ref="jr:itext('/pregnancy/summary/r_fup_pregnancy_visit:label')"/>
      </input>
      <input ref="/pregnancy/summary/r_fup_pregnancy_visit_2_weeks">
        <label ref="jr:itext('/pregnancy/summary/r_fup_pregnancy_visit_2_weeks:label')"/>
      </input>
      <group appearance="hidden" ref="/pregnancy/summary/custom_translations">
        <select1 ref="/pregnancy/summary/custom_translations/custom_woman_label_translator">
          <item>
            <label ref="jr:itext('/pregnancy/summary/custom_translations/custom_woman_label_translator/woman:label')"/>
            <value>woman</value>
          </item>
        </select1>
        <select1 ref="/pregnancy/summary/custom_translations/custom_woman_start_label_translator">
          <item>
            <label ref="jr:itext('/pregnancy/summary/custom_translations/custom_woman_start_label_translator/woman-start:label')"/>
            <value>woman-start</value>
          </item>
        </select1>
      </group>
    </group>
    <group appearance="hidden" ref="/pregnancy/data">
      <group ref="/pregnancy/data/meta"/>
    </group>
  </h:body>
</h:html>
`,   
}
