/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="pnc_danger_sign_follow_up_mother">
<section class="form-logo"></section><h3 dir="auto" id="form-title">PNC danger sign follow-up - mother</h3>
<select id="form-languages" style="display:none;" data-default-lang=""><option value="en">en</option> </select>
  
  
    <section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pnc_danger_sign_follow_up_mother/inputs" data-relevant="./source = 'user'"><section class="or-group-data " name="/pnc_danger_sign_follow_up_mother/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/inputs/contact/_id:label">What is the patient's name?</span><input type="text" name="/pnc_danger_sign_follow_up_mother/inputs/contact/_id" data-type-xml="person"></label><section class="or-group-data " name="/pnc_danger_sign_follow_up_mother/inputs/contact/parent"><section class="or-group-data " name="/pnc_danger_sign_follow_up_mother/inputs/contact/parent/parent"><section class="or-group-data " name="/pnc_danger_sign_follow_up_mother/inputs/contact/parent/parent/contact">
      </section>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group or-appearance-field-list " name="/pnc_danger_sign_follow_up_mother/danger_signs"><h4><span lang="en" class="question-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs:label">Danger Sign Follow-up - Mother</span></h4>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm:label">Did <span class="or-output" data-value=" /pnc_danger_sign_follow_up_mother/patient_short_name "> </span> visit the health facility as recommended?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm/yes:label">Yes</span></label><label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present:label">Is she still experiencing any danger signs?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present/yes:label">Yes</span></label><label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/danger_signs_question_note:label">Please indicate which danger signs <span class="or-output" data-value=" /pnc_danger_sign_follow_up_mother/patient_short_name "> </span> is experiencing.</span><input type="text" name="/pnc_danger_sign_follow_up_mother/danger_signs/danger_signs_question_note" data-relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" data-type-xml="string" readonly></label><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/fever:label">Fever</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/fever" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/fever" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/fever/yes:label">Yes</span></label><label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/fever" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/fever" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/fever/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache:label">Severe headache</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache/yes:label">Yes</span></label><label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding:label">Vaginal bleeding</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding/yes:label">Yes</span></label><label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge:label">Foul smelling vaginal discharge</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge/yes:label">Yes</span></label><label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/convulsion:label">Convulsions</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/convulsion" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/convulsion" value="yes" data-required="true()" data-relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/convulsion/yes:label">Yes</span></label><label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/convulsion" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/convulsion" value="no" data-required="true()" data-relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/convulsion/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/congratulate_no_ds_note:label">Great news! Please continue to closely monitor her.</span><input type="text" name="/pnc_danger_sign_follow_up_mother/danger_signs/congratulate_no_ds_note" data-relevant="../danger_sign_present = 'no' and ../r_danger_sign_present = 'no'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/refer_patient_note_1:label"><span class="or-output" data-value=" /pnc_danger_sign_follow_up_mother/patient_short_name_start "> </span> should visit the health facility immediately if she is experiencing any of these danger signs.</span><input type="text" name="/pnc_danger_sign_follow_up_mother/danger_signs/refer_patient_note_1" data-relevant="../danger_sign_present = 'yes' or ../r_danger_sign_present = 'yes'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/refer_patient_note_2:label">Please advise her to do so and accompany her if possible.</span><input type="text" name="/pnc_danger_sign_follow_up_mother/danger_signs/refer_patient_note_2" data-relevant="../danger_sign_present = 'yes' or ../r_danger_sign_present = 'yes'" data-type-xml="string" readonly></label><section class="or-group-data or-appearance-hidden " name="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations"><fieldset class="question simple-select "><fieldset>
<legend>
          </legend>
<div class="option-wrapper"><label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_label_translator" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_label_translator" value="woman" data-calculate='"woman"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_label_translator/woman:label">the woman</span></label></div>
</fieldset></fieldset>
<fieldset class="question simple-select "><fieldset>
<legend>
          </legend>
<div class="option-wrapper"><label class=""><input type="radio" name="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_start_label_translator" data-name="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_start_label_translator" value="woman-start" data-calculate='"woman-start"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_start_label_translator/woman-start:label">The woman</span></label></div>
</fieldset></fieldset>
      </section>
      </section>
    <section class="or-group-data or-appearance-hidden " name="/pnc_danger_sign_follow_up_mother/data"><section class="or-group-data " name="/pnc_danger_sign_follow_up_mother/data/meta">
      </section>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/patient_age_in_years" data-calculate="floor( difference-in-months( ../inputs/contact/date_of_birth, today() ) div 12 )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/patient_short_name" data-calculate="coalesce(../inputs/contact/short_name, ../danger_signs/custom_translations/custom_woman_label)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/patient_short_name_start" data-calculate="coalesce(../inputs/contact/short_name, ../danger_signs/custom_translations/custom_woman_start_label)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/t_danger_signs_referral_follow_up_date" data-calculate="date-time(decimal-date-time(today()) + 3)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/t_danger_signs_referral_follow_up" data-calculate="../danger_signs/r_danger_sign_present" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/danger_signs/r_danger_sign_present" data-calculate="if(selected(../fever, 'yes') or selected(../severe_headache, 'yes') or selected(../vaginal_bleeding, 'yes') or selected(../vaginal_discharge, 'yes') or selected(../convulsion, 'yes'), 'yes', if(selected(../severe_headache, 'no') and selected(../vaginal_bleeding, 'no') and selected(../vaginal_discharge, 'no') and selected(../convulsion, 'no'), 'no', ''))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_label" data-calculate="jr:choice-name( /pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_label_translator ,' /pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_label_translator ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_start_label" data-calculate="jr:choice-name( /pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_start_label_translator ,' /pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_start_label_translator ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/data/__visited_hf" data-calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/data/__still_experiencing_danger_sign" data-calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/data/__fever" data-calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/fever " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/data/__severe_headache" data-calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/severe_headache " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/data/__vaginal_bleeding" data-calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/data/__vaginal_discharge" data-calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/data/__convulsions" data-calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/convulsion " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/data/__has_danger_sign" data-calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/r_danger_sign_present " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/data/meta/__patient_uuid" data-calculate="../../../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/data/meta/__patient_id" data-calculate="../../../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/data/meta/__household_uuid" data-calculate="../../../inputs/contact/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/data/meta/__source" data-calculate="../../../inputs/source" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/data/meta/__source_id" data-calculate="../../../inputs/source_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/data/meta/__delivery_uuid" data-calculate="../../../inputs/delivery_uuid" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pnc_danger_sign_follow_up_mother/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <pnc_danger_sign_follow_up_mother xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" id="pnc_danger_sign_follow_up_mother" prefix="J1!pnc_danger_sign_follow_up_mother!" delimiter="#" version="2022-09-26 09:14:27">
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
            <delivery_uuid/>
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
          <danger_signs>
            <visit_confirm/>
            <danger_sign_present/>
            <danger_signs_question_note tag="hidden"/>
            <fever/>
            <severe_headache/>
            <vaginal_bleeding/>
            <vaginal_discharge/>
            <convulsion/>
            <r_danger_sign_present tag="hidden"/>
            <congratulate_no_ds_note tag="hidden"/>
            <refer_patient_note_1 tag="hidden"/>
            <refer_patient_note_2 tag="hidden"/>
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
            <__fever/>
            <__severe_headache/>
            <__vaginal_bleeding/>
            <__vaginal_discharge/>
            <__convulsions/>
            <__has_danger_sign/>
            <meta tag="hidden">
              <__patient_uuid/>
              <__patient_id/>
              <__household_uuid/>
              <__source/>
              <__source_id/>
              <__delivery_uuid/>
            </meta>
          </data>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </pnc_danger_sign_follow_up_mother>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
  <h:head>
    <h:title>PNC danger sign follow-up - mother</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/congratulate_no_ds_note:label">
            <value>Great news! Please continue to closely monitor her.</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/convulsion/no:label">
            <value>No</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/convulsion/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/convulsion:label">
            <value>Convulsions</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_label_translator/woman:label">
            <value>the woman</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_start_label_translator/woman-start:label">
            <value>The woman</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present/no:label">
            <value>No</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present:label">
            <value>Is she still experiencing any danger signs?</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/danger_signs_question_note:label">
            <value>Please indicate which danger signs <output value=" /pnc_danger_sign_follow_up_mother/patient_short_name "/> is experiencing.</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/fever/no:label">
            <value>No</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/fever/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/fever:label">
            <value>Fever</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/refer_patient_note_1:label">
            <value><output value=" /pnc_danger_sign_follow_up_mother/patient_short_name_start "/> should visit the health facility immediately if she is experiencing any of these danger signs.</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/refer_patient_note_2:label">
            <value>Please advise her to do so and accompany her if possible.</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache/no:label">
            <value>No</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache:label">
            <value>Severe headache</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding/no:label">
            <value>No</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding:label">
            <value>Vaginal bleeding</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge/no:label">
            <value>No</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge:label">
            <value>Foul smelling vaginal discharge</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm/no:label">
            <value>No</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm:label">
            <value>Did <output value=" /pnc_danger_sign_follow_up_mother/patient_short_name "/> visit the health facility as recommended?</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/danger_signs:label">
            <value>Danger Sign Follow-up - Mother</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/inputs/contact/date_of_birth:label">
            <value>Date of Birth</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/inputs/contact/name:label">
            <value>Name</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/inputs/contact/parent/_id:label">
            <value>Parent ID</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/inputs/contact/parent/parent/contact/chw_name:label">
            <value>CHW name</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/inputs/contact/parent/parent/contact/phone:label">
            <value>CHW phone</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/inputs/contact/patient_id:label">
            <value>Patient ID</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/inputs/contact/sex:label">
            <value>Sex</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/inputs/contact/short_name:label">
            <value>Short Name</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/inputs/delivery_uuid:label">
            <value>Delivery Report ID</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/inputs/source:label">
            <value>Source</value>
          </text>
          <text id="/pnc_danger_sign_follow_up_mother/inputs/source_id:label">
            <value>Source ID</value>
          </text>
        </translation>
      </itext>
      <instance>
        <pnc_danger_sign_follow_up_mother id="pnc_danger_sign_follow_up_mother" prefix="J1!pnc_danger_sign_follow_up_mother!" delimiter="#" version="2022-09-26 09:14:27">
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
            <delivery_uuid/>
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
          <danger_signs>
            <visit_confirm/>
            <danger_sign_present/>
            <danger_signs_question_note tag="hidden"/>
            <fever/>
            <severe_headache/>
            <vaginal_bleeding/>
            <vaginal_discharge/>
            <convulsion/>
            <r_danger_sign_present tag="hidden"/>
            <congratulate_no_ds_note tag="hidden"/>
            <refer_patient_note_1 tag="hidden"/>
            <refer_patient_note_2 tag="hidden"/>
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
            <__fever/>
            <__severe_headache/>
            <__vaginal_bleeding/>
            <__vaginal_discharge/>
            <__convulsions/>
            <__has_danger_sign/>
            <meta tag="hidden">
              <__patient_uuid/>
              <__patient_id/>
              <__household_uuid/>
              <__source/>
              <__source_id/>
              <__delivery_uuid/>
            </meta>
          </data>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </pnc_danger_sign_follow_up_mother>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/inputs/source" type="string"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/inputs/source_id" type="string"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/inputs/delivery_uuid" type="string"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/inputs/contact/_id" type="db:person"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/inputs/contact/name" type="string"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/inputs/contact/short_name" type="string"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/inputs/contact/sex" type="string"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/inputs/contact/parent/_id" type="string"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/inputs/contact/parent/parent/contact/chw_name" type="string"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/inputs/contact/parent/parent/contact/phone" type="string"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/patient_age_in_years" type="string" calculate="floor( difference-in-months( ../inputs/contact/date_of_birth, today() ) div 12 )"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/patient_uuid" type="string" calculate="../inputs/contact/_id"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/patient_id" type="string" calculate="../inputs/contact/patient_id"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/patient_name" type="string" calculate="../inputs/contact/name"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/patient_short_name" type="string" calculate="coalesce(../inputs/contact/short_name, ../danger_signs/custom_translations/custom_woman_label)"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/patient_short_name_start" type="string" calculate="coalesce(../inputs/contact/short_name, ../danger_signs/custom_translations/custom_woman_start_label)"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/t_danger_signs_referral_follow_up_date" type="string" calculate="date-time(decimal-date-time(today()) + 3)"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/t_danger_signs_referral_follow_up" type="string" calculate="../danger_signs/r_danger_sign_present"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm" type="select1" required="true()"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present" type="select1" required="true()"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/danger_signs_question_note" readonly="true()" type="string" relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/fever" type="select1" relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" required="true()"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache" type="select1" relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" required="true()"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding" type="select1" relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" required="true()"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge" type="select1" relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" required="true()"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/convulsion" type="select1" relevant="../danger_sign_present = 'yes' or ../danger_sign_present = 'no'" required="true()"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/r_danger_sign_present" type="string" calculate="if(selected(../fever, 'yes') or
selected(../severe_headache, 'yes') or
selected(../vaginal_bleeding, 'yes') or
selected(../vaginal_discharge, 'yes') or
selected(../convulsion, 'yes'), 'yes',
if(selected(../severe_headache, 'no') and
selected(../vaginal_bleeding, 'no') and
selected(../vaginal_discharge, 'no') and
selected(../convulsion, 'no'), 'no', ''))"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/congratulate_no_ds_note" readonly="true()" type="string" relevant="../danger_sign_present = 'no' and ../r_danger_sign_present = 'no'"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/refer_patient_note_1" readonly="true()" type="string" relevant="../danger_sign_present = 'yes' or ../r_danger_sign_present = 'yes'"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/refer_patient_note_2" readonly="true()" type="string" relevant="../danger_sign_present = 'yes' or ../r_danger_sign_present = 'yes'"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_label_translator" type="select1" calculate="&quot;woman&quot;"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_label" type="string" calculate="jr:choice-name( /pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_label_translator ,' /pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_label_translator ')"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_start_label_translator" type="select1" calculate="&quot;woman-start&quot;"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_start_label" type="string" calculate="jr:choice-name( /pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_start_label_translator ,' /pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_start_label_translator ')"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/data/__visited_hf" type="string" calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm "/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/data/__still_experiencing_danger_sign" type="string" calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present "/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/data/__fever" type="string" calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/fever "/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/data/__severe_headache" type="string" calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/severe_headache "/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/data/__vaginal_bleeding" type="string" calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding "/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/data/__vaginal_discharge" type="string" calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge "/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/data/__convulsions" type="string" calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/convulsion "/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/data/__has_danger_sign" type="string" calculate=" /pnc_danger_sign_follow_up_mother/danger_signs/r_danger_sign_present "/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/data/meta/__patient_uuid" type="string" calculate="../../../inputs/contact/_id"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/data/meta/__patient_id" type="string" calculate="../../../inputs/contact/patient_id"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/data/meta/__household_uuid" type="string" calculate="../../../inputs/contact/parent/_id"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/data/meta/__source" type="string" calculate="../../../inputs/source"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/data/meta/__source_id" type="string" calculate="../../../inputs/source_id"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/data/meta/__delivery_uuid" type="string" calculate="../../../inputs/delivery_uuid"/>
      <bind nodeset="/pnc_danger_sign_follow_up_mother/meta/instanceID" type="string" readonly="true()" calculate="concat('uuid:', uuid())"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/pnc_danger_sign_follow_up_mother/inputs">
      <group ref="/pnc_danger_sign_follow_up_mother/inputs/contact">
        <input appearance="db-object" ref="/pnc_danger_sign_follow_up_mother/inputs/contact/_id">
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/inputs/contact/_id:label')"/>
        </input>
        <group ref="/pnc_danger_sign_follow_up_mother/inputs/contact/parent">
          <group ref="/pnc_danger_sign_follow_up_mother/inputs/contact/parent/parent">
            <group ref="/pnc_danger_sign_follow_up_mother/inputs/contact/parent/parent/contact"/>
          </group>
        </group>
      </group>
    </group>
    <group appearance="field-list" ref="/pnc_danger_sign_follow_up_mother/danger_signs">
      <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs:label')"/>
      <select1 ref="/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm">
        <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm:label')"/>
        <item>
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/visit_confirm/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present">
        <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present:label')"/>
        <item>
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/danger_sign_present/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <input ref="/pnc_danger_sign_follow_up_mother/danger_signs/danger_signs_question_note">
        <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/danger_signs_question_note:label')"/>
      </input>
      <select1 ref="/pnc_danger_sign_follow_up_mother/danger_signs/fever">
        <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/fever:label')"/>
        <item>
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/fever/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/fever/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache">
        <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache:label')"/>
        <item>
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/severe_headache/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding">
        <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding:label')"/>
        <item>
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_bleeding/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge">
        <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge:label')"/>
        <item>
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/vaginal_discharge/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/pnc_danger_sign_follow_up_mother/danger_signs/convulsion">
        <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/convulsion:label')"/>
        <item>
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/convulsion/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/convulsion/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <input ref="/pnc_danger_sign_follow_up_mother/danger_signs/congratulate_no_ds_note">
        <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/congratulate_no_ds_note:label')"/>
      </input>
      <input ref="/pnc_danger_sign_follow_up_mother/danger_signs/refer_patient_note_1">
        <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/refer_patient_note_1:label')"/>
      </input>
      <input ref="/pnc_danger_sign_follow_up_mother/danger_signs/refer_patient_note_2">
        <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/refer_patient_note_2:label')"/>
      </input>
      <group appearance="hidden" ref="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations">
        <select1 ref="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_label_translator">
          <item>
            <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_label_translator/woman:label')"/>
            <value>woman</value>
          </item>
        </select1>
        <select1 ref="/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_start_label_translator">
          <item>
            <label ref="jr:itext('/pnc_danger_sign_follow_up_mother/danger_signs/custom_translations/custom_woman_start_label_translator/woman-start:label')"/>
            <value>woman-start</value>
          </item>
        </select1>
      </group>
    </group>
    <group appearance="hidden" ref="/pnc_danger_sign_follow_up_mother/data">
      <group ref="/pnc_danger_sign_follow_up_mother/data/meta"/>
    </group>
  </h:body>
</h:html>
`,   
};
