
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="delivery">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Delivery</h3>
<select id="form-languages" style="display:none;" data-default-lang=""><option value="en">en</option> </select>
  
  
    <section class="or-group-data or-branch pre-init or-appearance-field-list " name="/delivery/inputs" data-relevant="./source = 'user'"><section class="or-group " name="/delivery/inputs/user"><h4><span lang="en" class="question-label active" data-itext-id="/delivery/inputs/user:label">User</span></h4>
<label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/delivery/inputs/user/contact_id:label">Contact ID</span><input type="text" name="/delivery/inputs/user/contact_id" data-type-xml="person"></label>
      </section><section class="or-group-data " name="/delivery/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/delivery/inputs/contact/_id:label">What is the patient's name?</span><input type="text" name="/delivery/inputs/contact/_id" data-type-xml="person"></label><section class="or-group-data " name="/delivery/inputs/contact/parent"><label class="question non-select or-appearance-hidden "><span lang="en" class="question-label active" data-itext-id="/delivery/inputs/contact/parent/_id:label">Household ID</span><input type="text" name="/delivery/inputs/contact/parent/_id" data-type-xml="string"></label><section class="or-group-data " name="/delivery/inputs/contact/parent/parent"><label class="question non-select or-appearance-hidden "><span lang="en" class="question-label active" data-itext-id="/delivery/inputs/contact/parent/parent/_id:label">Area ID</span><input type="text" name="/delivery/inputs/contact/parent/parent/_id" data-type-xml="string"></label><section class="or-group-data " name="/delivery/inputs/contact/parent/parent/parent"><label class="question non-select or-appearance-hidden "><span lang="en" class="question-label active" data-itext-id="/delivery/inputs/contact/parent/parent/parent/_id:label">Health Facility ID</span><input type="text" name="/delivery/inputs/contact/parent/parent/parent/_id" data-type-xml="string"></label>
      </section><section class="or-group-data " name="/delivery/inputs/contact/parent/parent/contact">
      </section>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group " name="/delivery/condition"><h4><span lang="en" class="question-label active" data-itext-id="/delivery/condition:label"><span class="or-output" data-value=" /delivery/patient_short_name_start "> </span>'s Condition</span></h4>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/condition/woman_outcome:label">What is the outcome for the woman?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/condition/woman_outcome" data-name="/delivery/condition/woman_outcome" value="alive_well" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/condition/woman_outcome/alive_well:label">Alive and well</span></label><label class=""><input type="radio" name="/delivery/condition/woman_outcome" data-name="/delivery/condition/woman_outcome" value="alive_unwell" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/condition/woman_outcome/alive_unwell:label">Alive and unwell</span></label><label class=""><input type="radio" name="/delivery/condition/woman_outcome" data-name="/delivery/condition/woman_outcome" value="deceased" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/condition/woman_outcome/deceased:label">Deceased</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/delivery/pnc_danger_sign_check" data-relevant="selected(../condition/woman_outcome, 'alive_well') or selected(../condition/woman_outcome, 'alive_unwell')"><h4><span lang="en" class="question-label active" data-itext-id="/delivery/pnc_danger_sign_check:label">Postnatal Danger Sign Check - Woman</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/pnc_danger_sign_check/pnc_danger_sign_note:label">Does the woman have any of the following danger signs?</span><input type="text" name="/delivery/pnc_danger_sign_check/pnc_danger_sign_note" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/pnc_danger_sign_check/fever:label">Fever</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/pnc_danger_sign_check/fever" data-name="/delivery/pnc_danger_sign_check/fever" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/pnc_danger_sign_check/fever/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/pnc_danger_sign_check/fever" data-name="/delivery/pnc_danger_sign_check/fever" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/pnc_danger_sign_check/fever/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/pnc_danger_sign_check/severe_headache:label">Severe headache</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/pnc_danger_sign_check/severe_headache" data-name="/delivery/pnc_danger_sign_check/severe_headache" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/pnc_danger_sign_check/severe_headache/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/pnc_danger_sign_check/severe_headache" data-name="/delivery/pnc_danger_sign_check/severe_headache" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/pnc_danger_sign_check/severe_headache/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/pnc_danger_sign_check/vaginal_bleeding:label">Vaginal bleeding</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/pnc_danger_sign_check/vaginal_bleeding" data-name="/delivery/pnc_danger_sign_check/vaginal_bleeding" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/pnc_danger_sign_check/vaginal_bleeding/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/pnc_danger_sign_check/vaginal_bleeding" data-name="/delivery/pnc_danger_sign_check/vaginal_bleeding" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/pnc_danger_sign_check/vaginal_bleeding/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/pnc_danger_sign_check/vaginal_discharge:label">Foul smelling vaginal discharge</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/pnc_danger_sign_check/vaginal_discharge" data-name="/delivery/pnc_danger_sign_check/vaginal_discharge" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/pnc_danger_sign_check/vaginal_discharge/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/pnc_danger_sign_check/vaginal_discharge" data-name="/delivery/pnc_danger_sign_check/vaginal_discharge" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/pnc_danger_sign_check/vaginal_discharge/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/pnc_danger_sign_check/convulsion:label">Convulsions</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/pnc_danger_sign_check/convulsion" data-name="/delivery/pnc_danger_sign_check/convulsion" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/pnc_danger_sign_check/convulsion/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/pnc_danger_sign_check/convulsion" data-name="/delivery/pnc_danger_sign_check/convulsion" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/pnc_danger_sign_check/convulsion/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/delivery/death_info_woman" data-relevant="selected(../condition/woman_outcome, 'deceased')"><h4><span lang="en" class="question-label active" data-itext-id="/delivery/death_info_woman:label">Death Information - Woman</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/death_info_woman/woman_death_date:label">Date of death</span><span class="required">*</span><input type="date" name="/delivery/death_info_woman/woman_death_date" data-required="true()" data-constraint=". &lt;= now() and difference-in-months( ., today() ) &lt; 1" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/death_info_woman/woman_death_date:jr:constraintMsg">Date cannot be in the future and older than a month from today.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/death_info_woman/woman_death_place:label">What was the place of death?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/death_info_woman/woman_death_place" data-name="/delivery/death_info_woman/woman_death_place" value="health_facility" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/death_info_woman/woman_death_place/health_facility:label">Health facility</span></label><label class=""><input type="radio" name="/delivery/death_info_woman/woman_death_place" data-name="/delivery/death_info_woman/woman_death_place" value="home" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/death_info_woman/woman_death_place/home:label">Home</span></label><label class=""><input type="radio" name="/delivery/death_info_woman/woman_death_place" data-name="/delivery/death_info_woman/woman_death_place" value="other" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/death_info_woman/woman_death_place/other:label">Other</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/death_info_woman/woman_death_birth:label">Did the woman deliver any babies before she died?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/death_info_woman/woman_death_birth" data-name="/delivery/death_info_woman/woman_death_birth" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/death_info_woman/woman_death_birth/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/death_info_woman/woman_death_birth" data-name="/delivery/death_info_woman/woman_death_birth" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/death_info_woman/woman_death_birth/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/death_info_woman/woman_death_add_notes:label">Additional notes</span><input type="text" name="/delivery/death_info_woman/woman_death_add_notes" data-constraint="string-length(.) &lt;= 300" data-type-xml="string"><span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/death_info_woman/woman_death_add_notes:jr:constraintMsg">300 characters</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/death_info_woman/death_profile_note:label">After reporting a death, the person's profile will be locked. If reported in error, you may undo the death report from the profile.</span><input type="text" name="/delivery/death_info_woman/death_profile_note" data-relevant="../woman_death_date != '' and ../woman_death_place != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/death_info_woman/death_baby_note:label">If babies were delivered, you will have the chance to report on them Next &gt;.</span><input type="text" name="/delivery/death_info_woman/death_baby_note" data-relevant="../woman_death_date != '' and ../woman_death_place != '' and ../woman_death_birth = 'yes'" data-type-xml="string" readonly></label><section class="or-group-data " name="/delivery/death_info_woman/death_report"><section class="or-group-data " name="/delivery/death_info_woman/death_report/fields"><section class="or-group-data " name="/delivery/death_info_woman/death_report/fields/death_details">
      </section>
      </section>
      </section>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/delivery/delivery_outcome" data-relevant="not(selected(../condition/woman_outcome, 'deceased')) or selected(../death_info_woman/woman_death_birth, 'yes')"><h4><span lang="en" class="question-label active" data-itext-id="/delivery/delivery_outcome:label">Delivery Outcome</span></h4>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/delivery_outcome/babies_delivered:label">How many babies were delivered?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/delivery_outcome/babies_delivered" data-name="/delivery/delivery_outcome/babies_delivered" value="1" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/delivery_outcome/babies_delivered/1:label">1</span></label><label class=""><input type="radio" name="/delivery/delivery_outcome/babies_delivered" data-name="/delivery/delivery_outcome/babies_delivered" value="2" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/delivery_outcome/babies_delivered/2:label">2</span></label><label class=""><input type="radio" name="/delivery/delivery_outcome/babies_delivered" data-name="/delivery/delivery_outcome/babies_delivered" value="3" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/delivery_outcome/babies_delivered/3:label">3</span></label><label class=""><input type="radio" name="/delivery/delivery_outcome/babies_delivered" data-name="/delivery/delivery_outcome/babies_delivered" value="other" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/delivery_outcome/babies_delivered/other:label">Other</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span class="required">*</span><input type="number" name="/delivery/delivery_outcome/babies_delivered_other" data-required="true()" data-constraint=". &gt; 3" data-relevant="selected(../babies_delivered, 'other')" data-type-xml="int"><span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/delivery_outcome/babies_delivered_other:jr:constraintMsg">Select this only if more than 3 babies were delivered.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/delivery_outcome/babies_alive:label">How many babies are alive?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class="itemset-template" data-items-path="instance('babies_alive')/root/item[count &lt;=  /delivery/delivery_outcome/babies_delivered_num ]"><input type="radio" name="/delivery/delivery_outcome/babies_alive" data-name="/delivery/delivery_outcome/babies_alive" data-required="true()" data-type-xml="select1" value=""></label><span class="itemset-labels" data-value-ref="name" data-label-type="itext" data-label-ref="itextId"><span lang="en" class="option-label active" data-itext-id="static_instance-babies_alive-0">0</span><span lang="en" class="option-label active" data-itext-id="static_instance-babies_alive-1">1</span><span lang="en" class="option-label active" data-itext-id="static_instance-babies_alive-2">2</span><span lang="en" class="option-label active" data-itext-id="static_instance-babies_alive-3">3</span><span lang="en" class="option-label active" data-itext-id="static_instance-babies_alive-4">Other</span>
      </span>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span class="required">*</span><input type="number" name="/delivery/delivery_outcome/babies_alive_other" data-required="true()" data-constraint=". &lt;= ../babies_delivered_other" data-relevant="selected(../babies_alive, 'other')" data-type-xml="int"><span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/delivery_outcome/babies_alive_other:jr:constraintMsg">Can not be more than babies delivered.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/delivery_outcome/delivery_date:label">Date of delivery</span><span class="required">*</span><input type="date" name="/delivery/delivery_outcome/delivery_date" data-required="true()" data-constraint=". &lt;= now() and difference-in-months( ., today() ) &lt; 1" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/delivery_outcome/delivery_date:jr:constraintMsg">Date cannot be in the future and older than a month from today.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/delivery_outcome/delivery_place:label">Where did delivery take place?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/delivery_outcome/delivery_place" data-name="/delivery/delivery_outcome/delivery_place" value="health_facility" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/delivery_outcome/delivery_place/health_facility:label">Health facility</span></label><label class=""><input type="radio" name="/delivery/delivery_outcome/delivery_place" data-name="/delivery/delivery_outcome/delivery_place" value="home" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/delivery_outcome/delivery_place/home:label">Home</span></label><label class=""><input type="radio" name="/delivery/delivery_outcome/delivery_place" data-name="/delivery/delivery_outcome/delivery_place" value="other" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/delivery_outcome/delivery_place/other:label">Other</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/delivery_outcome/delivery_place_other:label">Please specify other</span><span class="required">*</span><input type="text" name="/delivery/delivery_outcome/delivery_place_other" data-required="true()" data-constraint="string-length(.) &lt;= 100" data-relevant="../delivery_place = 'other'" data-type-xml="string"><span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/delivery_outcome/delivery_place_other:jr:constraintMsg">Maximum 100 characters allowed.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/delivery_outcome/delivery_mode:label">How did she deliver?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/delivery_outcome/delivery_mode" data-name="/delivery/delivery_outcome/delivery_mode" value="vaginal" data-required="true()" data-relevant="../delivery_place = 'health_facility'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/delivery_outcome/delivery_mode/vaginal:label">Vaginal</span></label><label class=""><input type="radio" name="/delivery/delivery_outcome/delivery_mode" data-name="/delivery/delivery_outcome/delivery_mode" value="cesarean" data-required="true()" data-relevant="../delivery_place = 'health_facility'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/delivery_outcome/delivery_mode/cesarean:label">Cesarean</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/delivery_outcome/delivery_conductor:label">Who conducted the delivery?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/delivery_outcome/delivery_conductor" data-name="/delivery/delivery_outcome/delivery_conductor" value="skilled" data-required="true()" data-relevant="../delivery_place = 'home' or ../delivery_place = 'other'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/delivery_outcome/delivery_conductor/skilled:label">Skilled health care provider</span></label><label class=""><input type="radio" name="/delivery/delivery_outcome/delivery_conductor" data-name="/delivery/delivery_outcome/delivery_conductor" value="traditional" data-required="true()" data-relevant="../delivery_place = 'home' or ../delivery_place = 'other'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/delivery_outcome/delivery_conductor/traditional:label">Traditional birth attendant</span></label><label class=""><input type="radio" name="/delivery/delivery_outcome/delivery_conductor" data-name="/delivery/delivery_outcome/delivery_conductor" value="other" data-required="true()" data-relevant="../delivery_place = 'home' or ../delivery_place = 'other'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/delivery_outcome/delivery_conductor/other:label">Other</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/delivery_outcome/delivery_conductor_other:label">Please specify other</span><span class="required">*</span><input type="text" name="/delivery/delivery_outcome/delivery_conductor_other" data-required="true()" data-constraint="string-length(.) &lt;= 100" data-relevant="../delivery_conductor = 'other'" data-type-xml="string"><span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/delivery_outcome/delivery_conductor_other:jr:constraintMsg">Maximum 100 characters allowed.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/delivery/baby_death" data-relevant="../delivery_outcome/babies_deceased_num &gt; 0"><h4><span lang="en" class="question-label active" data-itext-id="/delivery/baby_death:label">Death Information - Baby</span></h4>
<section class="or-group " name="/delivery/baby_death/baby_death_repeat"><h4></h4>
<section class="or-repeat " name="/delivery/baby_death/baby_death_repeat"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/baby_death/baby_death_repeat/baby_death_date:label">Date of death</span><span class="required">*</span><input type="date" name="/delivery/baby_death/baby_death_repeat/baby_death_date" data-required="true()" data-constraint=". &lt;= now() and difference-in-months( ., today() ) &lt; 1" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/baby_death/baby_death_repeat/baby_death_date:jr:constraintMsg">Date cannot be in the future and older than a month from today.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/baby_death/baby_death_repeat/baby_death_place:label">Place of death</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/baby_death/baby_death_repeat/baby_death_place" data-name="/delivery/baby_death/baby_death_repeat/baby_death_place" value="health_facility" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/baby_death/baby_death_repeat/baby_death_place/health_facility:label">Health facility</span></label><label class=""><input type="radio" name="/delivery/baby_death/baby_death_repeat/baby_death_place" data-name="/delivery/baby_death/baby_death_repeat/baby_death_place" value="home" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/baby_death/baby_death_repeat/baby_death_place/home:label">Home</span></label><label class=""><input type="radio" name="/delivery/baby_death/baby_death_repeat/baby_death_place" data-name="/delivery/baby_death/baby_death_repeat/baby_death_place" value="other" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/baby_death/baby_death_repeat/baby_death_place/other:label">Other</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/baby_death/baby_death_repeat/stillbirth:label">Was this a stillbirth?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/baby_death/baby_death_repeat/stillbirth" data-name="/delivery/baby_death/baby_death_repeat/stillbirth" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/baby_death/baby_death_repeat/stillbirth/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/baby_death/baby_death_repeat/stillbirth" data-name="/delivery/baby_death/baby_death_repeat/stillbirth" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/baby_death/baby_death_repeat/stillbirth/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/baby_death/baby_death_repeat/baby_death_add_notes:label">Additional notes about baby's death</span><input type="text" name="/delivery/baby_death/baby_death_repeat/baby_death_add_notes" data-constraint="string-length(.) &lt;= 300" data-type-xml="string"><span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/baby_death/baby_death_repeat/baby_death_add_notes:jr:constraintMsg">Maximum 300 characters allowed.</span></label><section class="or-group-data " name="/delivery/baby_death/baby_death_repeat/baby_death_profile"><section class="or-group-data " name="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent"><section class="or-group-data " name="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent/parent"><section class="or-group-data " name="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent/parent/parent">
      </section>
      </section>
      </section>
      </section>
      </section><div class="or-repeat-info" data-name="/delivery/baby_death/baby_death_repeat" data-repeat-count=" /delivery/baby_death/baby_death_repeat_count "></div>
      </section>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/delivery/babys_condition" data-relevant="../delivery_outcome/babies_alive_num &gt; 0"><h4><span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition:label">Baby's Condition</span></h4>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat_note:label">Sections will repeat if multiple babies were delivered. Please fill out one section per baby.</span><input type="text" name="/delivery/babys_condition/baby_repeat_note" data-relevant="../../delivery_outcome/babies_alive_num &gt; 1" data-type-xml="string" readonly></label><section class="or-group " name="/delivery/babys_condition/baby_repeat"><h4></h4>
<section class="or-repeat " name="/delivery/babys_condition/baby_repeat"><section class="or-group-data " name="/delivery/babys_condition/baby_repeat/baby_details"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/baby_n:label">Baby</span><span lang="en" class="or-hint active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/baby_n:hint">Each baby will be asked about individually.</span><input type="text" name="/delivery/babys_condition/baby_repeat/baby_details/baby_n" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/baby_condition:label">What is the condition of baby?</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/baby_condition:hint">Select one.</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/baby_condition" data-name="/delivery/babys_condition/baby_repeat/baby_details/baby_condition" value="alive_well" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/baby_condition/alive_well:label">Alive and well</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/baby_condition" data-name="/delivery/babys_condition/baby_repeat/baby_details/baby_condition" value="alive_unwell" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/baby_condition/alive_unwell:label">Alive and unwell</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/baby_name:label">Name</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/baby_name:hint">Please enter a name for the baby to identify them in the app. You can change it later.</span><input type="text" name="/delivery/babys_condition/baby_repeat/baby_details/baby_name" data-required="true()" data-type-xml="string"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/baby_sex:label">Sex</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/baby_sex" data-name="/delivery/babys_condition/baby_repeat/baby_details/baby_sex" value="male" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/baby_sex/male:label">Male</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/baby_sex" data-name="/delivery/babys_condition/baby_repeat/baby_details/baby_sex" value="female" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/baby_sex/female:label">Female</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know:label">Birth weight</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know" data-name="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know/no:label">I don't know</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know" data-name="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know/yes:label">Weight in grams</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span class="required">*</span><input type="number" name="/delivery/babys_condition/baby_repeat/baby_details/birth_weight" data-required="true()" data-constraint=". &gt;= 1500 and . &lt;= 5000" data-relevant="selected(../birth_weight_know, 'yes')" data-type-xml="decimal" step="any"><span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/birth_weight:jr:constraintMsg">Should be between 1500 grams and 5000 grams.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know:label">Birth length</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know" data-name="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know/no:label">I don't know</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know" data-name="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know/yes:label">Length in cm</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span class="required">*</span><input type="number" name="/delivery/babys_condition/baby_repeat/baby_details/birth_length" data-required="true()" data-constraint=". &gt;= 35.6 and . &lt;= 70" data-relevant="selected(../birth_length_know, 'yes')" data-type-xml="decimal" step="any"><span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/birth_length:jr:constraintMsg">Should be between 35.6 cms and 70 cms.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received:label">What vaccines have they received?</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received:hint">Select one.</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received" data-name="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received" value="bcg_only" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received/bcg_only:label">BCG only</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received" data-name="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received" value="birth_polio_only" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received/birth_polio_only:label">Birth Polio only</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received" data-name="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received" value="bcg_and_birth_polio" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received/bcg_and_birth_polio:label">BCG and Birth Polio</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received" data-name="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received" value="none" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received/none:label">None</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/imm_counsel_note:label">Please counsel the family and refer the child to the nearest health center where the baby can be immunized.</span><input type="text" name="/delivery/babys_condition/baby_repeat/baby_details/imm_counsel_note" data-relevant="selected(../vaccines_received, 'none')" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/breastfeeding:label">Is the child exclusively breastfeeding?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/breastfeeding" data-name="/delivery/babys_condition/baby_repeat/baby_details/breastfeeding" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/breastfeeding/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/breastfeeding" data-name="/delivery/babys_condition/baby_repeat/baby_details/breastfeeding" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/breastfeeding/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour:label">Were they initiated on breastfeeding within on hour of delivery?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour" data-name="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour" data-name="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/baby_danger_sign_note:label">Does the baby have any of the following danger signs?</span><input type="text" name="/delivery/babys_condition/baby_repeat/baby_details/baby_danger_sign_note" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord:label">Infected umbilical cord</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord" data-name="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord" data-name="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/convulsion:label">Convulsions</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/convulsion" data-name="/delivery/babys_condition/baby_repeat/baby_details/convulsion" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/convulsion/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/convulsion" data-name="/delivery/babys_condition/baby_repeat/baby_details/convulsion" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/convulsion/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding:label">Difficulty feeding or drinking</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding" data-name="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding" data-name="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/vomit:label">Vomits everything</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/vomit" data-name="/delivery/babys_condition/baby_repeat/baby_details/vomit" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/vomit/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/vomit" data-name="/delivery/babys_condition/baby_repeat/baby_details/vomit" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/vomit/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/drowsy:label">Drowsy or unconscious</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/drowsy" data-name="/delivery/babys_condition/baby_repeat/baby_details/drowsy" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/drowsy/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/drowsy" data-name="/delivery/babys_condition/baby_repeat/baby_details/drowsy" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/drowsy/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/stiff:label">Body stiffness</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/stiff" data-name="/delivery/babys_condition/baby_repeat/baby_details/stiff" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/stiff/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/stiff" data-name="/delivery/babys_condition/baby_repeat/baby_details/stiff" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/stiff/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin:label">Yellow skin color</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin" data-name="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin" data-name="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/fever:label">Fever</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/fever" data-name="/delivery/babys_condition/baby_repeat/baby_details/fever" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/fever/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/fever" data-name="/delivery/babys_condition/baby_repeat/baby_details/fever" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/fever/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/blue_skin:label">Blue skin color (hypothermia)</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/blue_skin" data-name="/delivery/babys_condition/baby_repeat/baby_details/blue_skin" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/blue_skin/yes:label">Yes</span></label><label class=""><input type="radio" name="/delivery/babys_condition/baby_repeat/baby_details/blue_skin" data-name="/delivery/babys_condition/baby_repeat/baby_details/blue_skin" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/babys_condition/baby_repeat/baby_details/blue_skin/no:label">No</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<section class="or-group-data " name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile"><section class="or-group-data " name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/measurements">
      </section><section class="or-group-data " name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs">
      </section><section class="or-group-data or-appearance-hidden " name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent"><section class="or-group-data or-appearance-hidden " name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent/parent"><section class="or-group-data or-appearance-hidden " name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent/parent/parent">
      </section>
      </section>
      </section>
      </section>
      </section>
      </section><div class="or-repeat-info" data-name="/delivery/babys_condition/baby_repeat" data-repeat-count=" /delivery/babys_condition/baby_repeat_count "></div>
      </section>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list or-appearance-summary " name="/delivery/safe_postnatal_practices" data-relevant="../delivery_outcome/babies_alive_num &gt; 0"><h4><span lang="en" class="question-label active" data-itext-id="/delivery/safe_postnatal_practices:label">Safe Postnatal Practices</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/safe_postnatal_practices/safe_postnatal_practice_1:label">Lactating mothers need to eat more than usual to feed their baby well. Ask the woman to eat a variety of foods, especially extra fluids, fruits, and vegetables.</span><input type="text" name="/delivery/safe_postnatal_practices/safe_postnatal_practice_1" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/safe_postnatal_practices/safe_postnatal_practice_2:label">For the first 6 months, give the baby breastmilk only.</span><input type="text" name="/delivery/safe_postnatal_practices/safe_postnatal_practice_2" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/safe_postnatal_practices/safe_postnatal_practice_3:label">To keep the baby warm, use kangaroo mother care, wrap the baby with clothes and cover the head, and keep the baby in a warm room.</span><input type="text" name="/delivery/safe_postnatal_practices/safe_postnatal_practice_3" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/safe_postnatal_practices/safe_postnatal_practice_4:label">Always sleep with the baby under a long-lasting insecticide treated net (LLIN).</span><input type="text" name="/delivery/safe_postnatal_practices/safe_postnatal_practice_4" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/safe_postnatal_practices/safe_postnatal_practice_5:label">Keep the baby's umbilical cord clean and dry.</span><input type="text" name="/delivery/safe_postnatal_practices/safe_postnatal_practice_5" data-type-xml="string" readonly></label>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/delivery/pnc_visits" data-relevant="selected(../condition/woman_outcome, 'alive_well') or selected(../condition/woman_outcome, 'alive_unwell') or ../delivery_outcome/babies_alive_num &gt; 0"><h4><span lang="en" class="question-label active" data-itext-id="/delivery/pnc_visits:label">PNC Visits</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/pnc_visits/who_note:label">The WHO recommends PNC visits within 24 hours and on 3 days, 7 days, and 6 weeks from date of delivery.</span><input type="text" name="/delivery/pnc_visits/who_note" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/delivery/pnc_visits/pnc_visits_attended:label">Which PNC visits have taken place so far?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class="itemset-template" data-items-path="instance('pnc_visits')/root/item[count &lt;=  /delivery/pnc_visits/days ]"><input type="checkbox" name="/delivery/pnc_visits/pnc_visits_attended" data-required="true()" data-constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" data-type-xml="select" value=""></label><span class="itemset-labels" data-value-ref="name" data-label-type="itext" data-label-ref="itextId"><span lang="en" class="option-label active" data-itext-id="static_instance-pnc_visits-0">Within 24 hours (check this box if facility delivery)</span><span lang="en" class="option-label active" data-itext-id="static_instance-pnc_visits-1">3 days</span><span lang="en" class="option-label active" data-itext-id="static_instance-pnc_visits-2">7 days</span><span lang="en" class="option-label active" data-itext-id="static_instance-pnc_visits-3">6 weeks</span><span lang="en" class="option-label active" data-itext-id="static_instance-pnc_visits-4">None of the above</span>
      </span>
</div>
</fieldset>
<span class="or-constraint-msg active" lang="" data-i18n="constraint.invalid">Value not allowed</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/pnc_visits/pnc_visits_additional:label">Any additional PNC visits, please report the number of visits below to be counted in the total.</span><input type="number" name="/delivery/pnc_visits/pnc_visits_additional" data-constraint=". &gt;=0 and . &lt;= 6" data-type-xml="int"><span lang="en" class="or-constraint-msg active" data-itext-id="/delivery/pnc_visits/pnc_visits_additional:jr:constraintMsg">Must be between 0 and 6.</span></label>
      </section>
    <section class="or-group-data or-appearance-field-list or-appearance-summary " name="/delivery/summary"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_submit_note:label"><h4 style="text-align:center;">To finish, be sure to click the Submit button.</h4></span><input type="text" name="/delivery/summary/r_submit_note" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-yellow "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_summary_details:label">Patient<i class="fa fa-user"></i></span><input type="text" name="/delivery/summary/r_summary_details" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_patient_details:label"><h2 style="text-align:center;margin-bottom:0px;"><span class="or-output" data-value=" /delivery/patient_name "> </span></h2> <p style="text-align:center;"><span class="or-output" data-value=" /delivery/patient_age_in_years "> </span> years old</p></span><input type="text" name="/delivery/summary/r_patient_details" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-yellow "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_pregnancy_outcome:label">Pregnancy Outcome<i class="fa fa-user"></i></span><input type="text" name="/delivery/summary/r_pregnancy_outcome" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h3 or-appearance-blue or-appearance-center or-appearance-underline "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_woman_condition:label">Woman's Condition</span><input type="text" name="/delivery/summary/r_woman_condition" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_condition_well:label">Alive and well</span><input type="text" name="/delivery/summary/r_condition_well" data-relevant="selected(../../condition/woman_outcome, 'alive_well')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_condition_unwell:label">Alive and unwell</span><input type="text" name="/delivery/summary/r_condition_unwell" data-relevant="selected(../../condition/woman_outcome, 'alive_unwell')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_condition_deceased:label">Deceased</span><input type="text" name="/delivery/summary/r_condition_deceased" data-relevant="selected(../../condition/woman_outcome, 'deceased')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h3 or-appearance-blue or-appearance-center or-appearance-underline "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_woman_death:label">Death</span><input type="text" name="/delivery/summary/r_woman_death" data-relevant="selected(../../condition/woman_outcome, 'deceased')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_death_date:label">Date of Death: <span class="or-output" data-value=" /delivery/death_info_woman/woman_death_date "> </span></span><input type="text" name="/delivery/summary/r_death_date" data-relevant="selected(../../condition/woman_outcome, 'deceased')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_death_place:label">Place of Death: <span class="or-output" data-value=" /delivery/summary/custom_translations/woman_death_place_label "> </span></span><input type="text" name="/delivery/summary/r_death_place" data-relevant="selected(../../condition/woman_outcome, 'deceased')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h3 or-appearance-blue or-appearance-center or-appearance-underline "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_delivery_details:label">Delivery Details</span><input type="text" name="/delivery/summary/r_delivery_details" data-relevant="not(selected(../../condition/woman_outcome, 'deceased')) or selected(../../death_info_woman/woman_death_birth, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_delivery_date:label">Date of Delivery: <span class="or-output" data-value=" /delivery/delivery_outcome/delivery_date "> </span></span><input type="text" name="/delivery/summary/r_delivery_date" data-relevant=" /delivery/delivery_outcome/delivery_date  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_delivery_place:label">Place of Delivery: <span class="or-output" data-value=" /delivery/summary/custom_translations/delivery_place_label "> </span></span><input type="text" name="/delivery/summary/r_delivery_place" data-relevant=" /delivery/delivery_outcome/delivery_place  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_babies_delivered_num:label">Number of babies delivered: <span class="or-output" data-value=" /delivery/delivery_outcome/babies_delivered_num "> </span></span><input type="text" name="/delivery/summary/r_babies_delivered_num" data-relevant=" /delivery/delivery_outcome/babies_delivered_num  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_babies_deceased_num:label">Number of babies deceased: <span class="or-output" data-value=" /delivery/delivery_outcome/babies_deceased_num "> </span></span><input type="text" name="/delivery/summary/r_babies_deceased_num" data-relevant=" /delivery/delivery_outcome/babies_deceased_num  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h3 or-appearance-blue or-appearance-center or-appearance-underline "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_danger_signs:label">Danger signs</span><input type="text" name="/delivery/summary/r_danger_signs" data-relevant="../../pnc_danger_sign_check/r_pnc_danger_sign_present = 'yes'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_mom_fever:label">Fever</span><input type="text" name="/delivery/summary/r_mom_fever" data-relevant="selected(../../pnc_danger_sign_check/fever, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_mom_severe_headache:label">Severe headache</span><input type="text" name="/delivery/summary/r_mom_severe_headache" data-relevant="selected(../../pnc_danger_sign_check/severe_headache, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_mom_vaginal_bleeding:label">Vaginal bleeding</span><input type="text" name="/delivery/summary/r_mom_vaginal_bleeding" data-relevant="selected(../../pnc_danger_sign_check/vaginal_bleeding, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_mom_vaginal_discharge:label">Foul smelling vaginal discharge</span><input type="text" name="/delivery/summary/r_mom_vaginal_discharge" data-relevant="selected(../../pnc_danger_sign_check/vaginal_discharge, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_mom_convulsion:label">Convulsions</span><input type="text" name="/delivery/summary/r_mom_convulsion" data-relevant="selected(../../pnc_danger_sign_check/convulsion, 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h3 or-appearance-blue or-appearance-center or-appearance-underline "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_pnc_visits:label">PNC Visits</span><input type="text" name="/delivery/summary/r_pnc_visits" data-relevant="selected(../../condition/woman_outcome, 'alive_well') or selected(../../condition/woman_outcome, 'alive_unwell') or ../../delivery_outcome/babies_alive_num &gt; 0" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_pnc_visits_completed:label">PNC visits completed so far:</span><input type="text" name="/delivery/summary/r_pnc_visits_completed" data-relevant="selected(../../condition/woman_outcome, 'alive_well') or selected(../../condition/woman_outcome, 'alive_unwell') or ../../delivery_outcome/babies_alive_num &gt; 0" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_pnc_visit_24hrs:label">24 hours</span><input type="text" name="/delivery/summary/r_pnc_visit_24hrs" data-relevant="selected(../../pnc_visits/pnc_visits_attended, 'within_24_hrs')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_pnc_visit_3days:label">3 days</span><input type="text" name="/delivery/summary/r_pnc_visit_3days" data-relevant="selected(../../pnc_visits/pnc_visits_attended, '3_days')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_pnc_visit_7days:label">7 days</span><input type="text" name="/delivery/summary/r_pnc_visit_7days" data-relevant="selected(../../pnc_visits/pnc_visits_attended, '7_days')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_pnc_visit_6weeks:label">6 weeks</span><input type="text" name="/delivery/summary/r_pnc_visit_6weeks" data-relevant="selected(../../pnc_visits/pnc_visits_attended, '6_weeks')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_pnc_visit_none:label">None</span><input type="text" name="/delivery/summary/r_pnc_visit_none" data-relevant="selected(../../pnc_visits/pnc_visits_attended, 'none')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_pnc_visits_add:label">Additional PNC visits completed: <span class="or-output" data-value=" /delivery/pnc_visits/pnc_visits_additional "> </span></span><input type="text" name="/delivery/summary/r_pnc_visits_add" data-relevant="../../pnc_visits/pnc_visits_additional != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h1 or-appearance-lime "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_referrals:label">Referrals<I class="fa fa-hospital-o"></i></span><input type="text" name="/delivery/summary/r_referrals" data-relevant="not(selected(../../condition/woman_outcome, 'deceased')) or ../../delivery_outcome/babies_alive_num &gt; 0" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_refer_clinic_immediately:label">Refer to clinic immediately for:</span><input type="text" name="/delivery/summary/r_refer_clinic_immediately" data-relevant="../../pnc_danger_sign_check/r_pnc_danger_sign_present = 'yes' or selected(../../condition/woman_outcome, 'alive_unwell')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_refer_danger_sign:label">Danger signs</span><input type="text" name="/delivery/summary/r_refer_danger_sign" data-relevant="../../pnc_danger_sign_check/r_pnc_danger_sign_present = 'yes'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_mom_alive_unwell:label">Mom is alive and unwell</span><input type="text" name="/delivery/summary/r_mom_alive_unwell" data-relevant="selected(../../condition/woman_outcome, 'alive_unwell')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_who_schedule_note:label">The WHO recommends routine PNC visits at 24 hours, 3 days, 7 days, and 6 weeks from the date of delivery.</span><input type="text" name="/delivery/summary/r_who_schedule_note" data-relevant="not(selected(../../condition/woman_outcome, 'deceased')) or ../../delivery_outcome/babies_alive_num &gt; 0" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_pnc_schedule_note:label">Please continue to refer the woman to the health facility at the appropriate time.</span><input type="text" name="/delivery/summary/r_pnc_schedule_note" data-relevant="not(selected(../../condition/woman_outcome, 'deceased')) or ../../delivery_outcome/babies_alive_num &gt; 0" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h1 or-appearance-green "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_follow_up_tasks:label">Follow-up Tasks<I class="fa fa-flag"></i></span><input type="text" name="/delivery/summary/r_follow_up_tasks" data-relevant="../../pnc_danger_sign_check/r_pnc_danger_sign_present = 'yes'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_following_tasks:label">The following tasks will appear:</span><input type="text" name="/delivery/summary/r_following_tasks" data-relevant="../../pnc_danger_sign_check/r_pnc_danger_sign_present = 'yes'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_fup_danger_sign:label">Please conduct a danger sign follow-up for the mother in 3 days.</span><input type="text" name="/delivery/summary/r_fup_danger_sign" data-relevant="../../pnc_danger_sign_check/r_pnc_danger_sign_present = 'yes'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/delivery/summary/r_fup_danger_sign_baby:label">Please conduct a danger sign follow-up for the baby in 3 days.</span><input type="text" name="/delivery/summary/r_fup_danger_sign_baby" data-relevant="../../babys_condition/r_baby_danger_sign_present_any = 'yes'" data-type-xml="string" readonly></label><section class="or-group-data or-appearance-hidden " name="/delivery/summary/custom_translations"><fieldset class="question simple-select "><fieldset>
<legend>
          </legend>
<div class="option-wrapper"><label class=""><input type="radio" name="/delivery/summary/custom_translations/custom_woman_label_translator" data-name="/delivery/summary/custom_translations/custom_woman_label_translator" value="woman" data-calculate='"woman"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/summary/custom_translations/custom_woman_label_translator/woman:label">the woman</span></label></div>
</fieldset></fieldset>
<fieldset class="question simple-select "><fieldset>
<legend>
          </legend>
<div class="option-wrapper"><label class=""><input type="radio" name="/delivery/summary/custom_translations/custom_woman_start_label_translator" data-name="/delivery/summary/custom_translations/custom_woman_start_label_translator" value="woman-start" data-calculate='"woman-start"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/summary/custom_translations/custom_woman_start_label_translator/woman-start:label">Woman</span></label></div>
</fieldset></fieldset>
<fieldset class="question simple-select "><fieldset>
<legend>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/summary/custom_translations/delivery_place_label_translator" data-name="/delivery/summary/custom_translations/delivery_place_label_translator" value="health_facility" data-calculate=" /delivery/delivery_outcome/delivery_place " data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/summary/custom_translations/delivery_place_label_translator/health_facility:label">Health facility</span></label><label class=""><input type="radio" name="/delivery/summary/custom_translations/delivery_place_label_translator" data-name="/delivery/summary/custom_translations/delivery_place_label_translator" value="home" data-calculate=" /delivery/delivery_outcome/delivery_place " data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/summary/custom_translations/delivery_place_label_translator/home:label">Home</span></label><label class=""><input type="radio" name="/delivery/summary/custom_translations/delivery_place_label_translator" data-name="/delivery/summary/custom_translations/delivery_place_label_translator" value="other" data-calculate=" /delivery/delivery_outcome/delivery_place " data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/summary/custom_translations/delivery_place_label_translator/other:label">Other</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question simple-select "><fieldset>
<legend>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/delivery/summary/custom_translations/woman_death_place_label_translator" data-name="/delivery/summary/custom_translations/woman_death_place_label_translator" value="health_facility" data-calculate=" /delivery/death_info_woman/woman_death_place " data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/summary/custom_translations/woman_death_place_label_translator/health_facility:label">Health facility</span></label><label class=""><input type="radio" name="/delivery/summary/custom_translations/woman_death_place_label_translator" data-name="/delivery/summary/custom_translations/woman_death_place_label_translator" value="home" data-calculate=" /delivery/death_info_woman/woman_death_place " data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/summary/custom_translations/woman_death_place_label_translator/home:label">Home</span></label><label class=""><input type="radio" name="/delivery/summary/custom_translations/woman_death_place_label_translator" data-name="/delivery/summary/custom_translations/woman_death_place_label_translator" value="other" data-calculate=" /delivery/death_info_woman/woman_death_place " data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/delivery/summary/custom_translations/woman_death_place_label_translator/other:label">Other</span></label>
</div>
</fieldset></fieldset>
      </section>
      </section>
    <section class="or-group-data or-appearance-hidden " name="/delivery/data"><section class="or-group-data " name="/delivery/data/meta">
      </section>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/delivery/household_id" data-calculate="../inputs/contact/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/area_id" data-calculate="../inputs/contact/parent/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/facility_id" data-calculate="../inputs/contact/parent/parent/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/patient_age_in_years" data-calculate="floor( difference-in-months( ../inputs/contact/date_of_birth, today() ) div 12 )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/patient_short_name" data-calculate="coalesce(../inputs/contact/short_name, ../summary/custom_translations/custom_woman_label)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/patient_short_name_start" data-calculate="coalesce(../inputs/contact/short_name, ../summary/custom_translations/custom_woman_start_label)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/t_danger_signs_referral_follow_up" data-calculate="../pnc_danger_sign_check/r_pnc_danger_sign_present" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/t_danger_signs_referral_follow_up_date" data-calculate="date-time(decimal-date-time(today()) + 3)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/pnc_danger_sign_check/r_pnc_danger_sign_present" data-calculate="if(selected(../fever, 'yes') or selected(../severe_headache, 'yes') or selected(../vaginal_bleeding, 'yes') or selected(../vaginal_discharge, 'yes') or selected(../convulsion, 'yes'), 'yes', 'no')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/death_info_woman/death_report/form" data-calculate='"death_report"' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/death_info_woman/death_report/type" data-calculate='"data_record"' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/death_info_woman/death_report/content_type" data-calculate='"xml"' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/death_info_woman/death_report/from" data-calculate="../../../inputs/user/phone" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/death_info_woman/death_report/fields/patient_id" data-calculate="../../../../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/death_info_woman/death_report/fields/patient_uuid" data-calculate="../../../../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/death_info_woman/death_report/fields/death_details/date_of_death" data-calculate="../../../../../death_info_woman/woman_death_date" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/death_info_woman/death_report/fields/death_details/place_of_death" data-calculate="../../../../../death_info_woman/woman_death_place" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/death_info_woman/death_report/fields/death_details/place_of_death_other" data-calculate='""' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/death_info_woman/death_report/fields/death_details/death_information" data-calculate="../../../../../death_info_woman/woman_death_add_notes" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/death_info_woman/death_report/created_by_doc" data-calculate="." data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/death_info_woman/woman_death_report_doc" data-calculate=" /delivery/death_info_woman/death_report " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/delivery_outcome/babies_delivered_num" data-calculate="if(selected(../babies_delivered, '1'), 1, if(selected(../babies_delivered, '2'), 2, if(selected(../babies_delivered, '3'), 3, if(selected(../babies_delivered, 'other'), ../babies_delivered_other, 0))))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/delivery_outcome/babies_alive_num" data-calculate="if(selected(../babies_alive, '1'), 1, if(selected(../babies_alive, '2'), 2, if(selected(../babies_alive, '3'), 3, if(selected(../babies_alive, 'other'), ../babies_alive_other, 0))))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/delivery_outcome/babies_deceased_num" data-calculate="../babies_delivered_num - ../babies_alive_num" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/baby_death/baby_death_repeat_count" data-calculate=" /delivery/delivery_outcome/babies_deceased_num " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/baby_death/baby_death_repeat/baby_death_profile/type" data-calculate='"person"' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/baby_death/baby_death_repeat/baby_death_profile/name" data-calculate='"Deceased baby"' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/baby_death/baby_death_repeat/baby_death_profile/sex" data-calculate='"undefined"' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/baby_death/baby_death_repeat/baby_death_profile/date_of_birth" data-calculate="../../../../delivery_outcome/delivery_date" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/baby_death/baby_death_repeat/baby_death_profile/date_of_death" data-calculate="../../baby_death_date" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent/_id" data-calculate=" /delivery/household_id " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent/parent/_id" data-calculate=" /delivery/area_id " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent/parent/parent/_id" data-calculate=" /delivery/facility_id " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/baby_death/baby_death_repeat/baby_death_profile/created_by_doc" data-calculate="." data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/baby_death/baby_death_repeat/baby_death_profile_doc" data-calculate=" /delivery/baby_death/baby_death_repeat/baby_death_profile " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat_count" data-calculate=" /delivery/delivery_outcome/babies_alive_num " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/r_baby_danger_sign_present" data-calculate="if(selected(../infected_umbilical_cord, 'yes') or selected(../convulsion, 'yes') or selected(../difficulty_feeding, 'yes') or selected(../vomit, 'yes') or selected(../drowsy, 'yes') or selected(../stiff, 'yes') or selected(../yellow_skin, 'yes') or selected(../fever, 'yes') or selected(../blue_skin, 'yes'), 'yes', 'no')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/name" data-calculate="../../baby_name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/sex" data-calculate="../../baby_sex" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/date_of_birth" data-calculate="../../../../../delivery_outcome/delivery_date" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/vaccines_received" data-calculate="../../vaccines_received" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/t_danger_signs_referral_follow_up" data-calculate="../../r_baby_danger_sign_present" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/t_danger_signs_referral_follow_up_date" data-calculate="date-time(decimal-date-time(today()) + 3)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/measurements/weight" data-calculate="../../../birth_weight" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/measurements/length" data-calculate="../../../birth_length" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/infected_umbilical_cord" data-calculate="../../../infected_umbilical_cord" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/convulsion" data-calculate="../../../convulsion" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/difficulty_feeding" data-calculate="../../../difficulty_feeding" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/vomit" data-calculate="../../../vomit" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/drowsy" data-calculate="../../../drowsy" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/stiff" data-calculate="../../../stiff" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/yellow_skin" data-calculate="../../../yellow_skin" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/fever" data-calculate="../../../fever" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/blue_skin" data-calculate="../../../blue_skin" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent/_id" data-calculate=" /delivery/household_id " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent/parent/_id" data-calculate=" /delivery/area_id " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent/parent/parent/_id" data-calculate=" /delivery/facility_id " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/type" data-calculate='"person"' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/created_by_doc" data-calculate="." data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/baby_repeat/baby_details/child_doc" data-calculate=" /delivery/babys_condition/baby_repeat/baby_details " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/r_baby_danger_sign_present_joined" data-calculate="join(', ',  /delivery/babys_condition/baby_repeat/baby_details/r_baby_danger_sign_present )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/babys_condition/r_baby_danger_sign_present_any" data-calculate="if(contains(../r_baby_danger_sign_present_joined, 'yes'), 'yes', 'no')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/pnc_visits/days" data-calculate="floor(decimal-date-time(today()) - decimal-date-time( /delivery/delivery_outcome/delivery_date ))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/summary/custom_translations/custom_woman_label" data-calculate="jr:choice-name( /delivery/summary/custom_translations/custom_woman_label_translator ,' /delivery/summary/custom_translations/custom_woman_label_translator ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/summary/custom_translations/custom_woman_start_label" data-calculate="jr:choice-name( /delivery/summary/custom_translations/custom_woman_start_label_translator ,' /delivery/summary/custom_translations/custom_woman_start_label_translator ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/summary/custom_translations/delivery_place_label" data-calculate="jr:choice-name( /delivery/summary/custom_translations/delivery_place_label_translator ,' /delivery/summary/custom_translations/delivery_place_label_translator ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/summary/custom_translations/woman_death_place_label" data-calculate="jr:choice-name( /delivery/summary/custom_translations/woman_death_place_label_translator ,' /delivery/summary/custom_translations/woman_death_place_label_translator ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__woman_condition" data-calculate=" /delivery/condition/woman_outcome " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__fever" data-calculate="../../pnc_danger_sign_check/fever" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__severe_headache" data-calculate="../../pnc_danger_sign_check/severe_headache" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__vaginal_bleeding" data-calculate="../../pnc_danger_sign_check/vaginal_bleeding" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__vaginal_discharge" data-calculate="../../pnc_danger_sign_check/vaginal_discharge" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__convulsions" data-calculate="../../pnc_danger_sign_check/convulsion" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__has_danger_sign" data-calculate=" /delivery/pnc_danger_sign_check/r_pnc_danger_sign_present " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__woman_death_date" data-calculate=" /delivery/death_info_woman/woman_death_date " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__woman_death_place" data-calculate=" /delivery/death_info_woman/woman_death_place " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__delivered_before_death" data-calculate=" /delivery/death_info_woman/woman_death_birth " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__woman_death_notes" data-calculate=" /delivery/death_info_woman/woman_death_add_notes " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__babies_delivered" data-calculate=" /delivery/delivery_outcome/babies_delivered_num " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__babies_deceased" data-calculate=" /delivery/delivery_outcome/babies_deceased_num " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__babies_alive" data-calculate=" /delivery/delivery_outcome/babies_alive_num " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__delivery_date" data-calculate=" /delivery/delivery_outcome/delivery_date " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__delivery_place" data-calculate=" /delivery/delivery_outcome/delivery_place " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__delivery_place_other" data-calculate=" /delivery/delivery_outcome/delivery_place_other " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__delivery_mode" data-calculate=" /delivery/delivery_outcome/delivery_mode " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__delivery_conductor" data-calculate=" /delivery/delivery_outcome/delivery_conductor " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__delivery_conductor_other" data-calculate=" /delivery/delivery_outcome/delivery_conductor_other " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__pnc_visit_within_24_hrs" data-calculate="if(selected( /delivery/pnc_visits/pnc_visits_attended , 'within_24_hrs'), &quot;yes&quot;, &quot;no&quot;)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__pnc_visit_3_days" data-calculate="if(selected( /delivery/pnc_visits/pnc_visits_attended , '3_days'), &quot;yes&quot;, &quot;no&quot;)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__pnc_visit_7_days" data-calculate="if(selected( /delivery/pnc_visits/pnc_visits_attended , '7_days'), &quot;yes&quot;, &quot;no&quot;)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__pnc_visit_6_weeks" data-calculate="if(selected( /delivery/pnc_visits/pnc_visits_attended , '6_weeks'), &quot;yes&quot;, &quot;no&quot;)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__pnc_visits_num_selected" data-calculate="if(selected( /delivery/pnc_visits/pnc_visits_attended , 'none'), 0, if(selected( /delivery/pnc_visits/pnc_visits_attended , 'within_24_hrs'), 1, 0) + if(selected( /delivery/pnc_visits/pnc_visits_attended , '3_days'), 1, 0) + if(selected( /delivery/pnc_visits/pnc_visits_attended , '7_days'), 1, 0) + if(selected( /delivery/pnc_visits/pnc_visits_attended , '6_weeks'), 1, 0))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/__pnc_visits_additional" data-calculate=" /delivery/pnc_visits/pnc_visits_additional " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/meta/__patient_uuid" data-calculate="../../../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/meta/__patient_id" data-calculate="../../../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/meta/__household_uuid" data-calculate="../../../inputs/contact/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/meta/__source" data-calculate="../../../inputs/source" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/meta/__source_id" data-calculate="../../../inputs/source_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/data/meta/__pregnancy_uuid" data-calculate="instance('contact-summary')/context/pregnancy_uuid" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/delivery/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <delivery xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="delivery" prefix="J1!delivery!" version="2022-11-04 2-47">
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
              <name/>
              <phone/>
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
                  <_id/>
                  <parent>
                    <_id/>
                  </parent>
                  <contact>
                    <chw_name/>
                    <phone/>
                  </contact>
                </parent>
              </parent>
            </contact>
          </inputs>
          <household_id tag="hidden"/>
          <area_id tag="hidden"/>
          <facility_id tag="hidden"/>
          <patient_age_in_years tag="hidden"/>
          <patient_uuid tag="hidden"/>
          <patient_id tag="hidden"/>
          <patient_name tag="hidden"/>
          <patient_short_name tag="hidden"/>
          <patient_short_name_start tag="hidden"/>
          <t_danger_signs_referral_follow_up tag="hidden"/>
          <t_danger_signs_referral_follow_up_date tag="hidden"/>
          <condition>
            <woman_outcome/>
          </condition>
          <pnc_danger_sign_check>
            <pnc_danger_sign_note/>
            <fever/>
            <severe_headache/>
            <vaginal_bleeding/>
            <vaginal_discharge/>
            <convulsion/>
            <r_pnc_danger_sign_present tag="hidden"/>
          </pnc_danger_sign_check>
          <death_info_woman>
            <woman_death_date/>
            <woman_death_place/>
            <woman_death_birth/>
            <woman_death_add_notes/>
            <death_profile_note/>
            <death_baby_note tag="hidden"/>
            <death_report db-doc="true" tag="hidden">
              <form/>
              <type/>
              <content_type/>
              <from/>
              <fields>
                <patient_id/>
                <patient_uuid/>
                <death_details>
                  <date_of_death/>
                  <place_of_death/>
                  <place_of_death_other/>
                  <death_information/>
                </death_details>
              </fields>
              <created_by_doc db-doc-ref="/delivery"/>
            </death_report>
            <woman_death_report_doc db-doc-ref=" /delivery/death_info_woman/death_report "/>
          </death_info_woman>
          <delivery_outcome>
            <babies_delivered/>
            <babies_delivered_other/>
            <babies_alive/>
            <babies_alive_other/>
            <babies_delivered_num/>
            <babies_alive_num/>
            <babies_deceased_num/>
            <delivery_date/>
            <delivery_place/>
            <delivery_place_other/>
            <delivery_mode/>
            <delivery_conductor/>
            <delivery_conductor_other/>
          </delivery_outcome>
          <baby_death>
            <baby_death_repeat_count/>
            <baby_death_repeat jr:template="">
              <baby_death_date/>
              <baby_death_place/>
              <stillbirth/>
              <baby_death_add_notes/>
              <baby_death_profile db-doc="true" tag="hidden">
                <type/>
                <name/>
                <sex/>
                <date_of_birth/>
                <date_of_death/>
                <parent>
                  <_id/>
                  <parent>
                    <_id/>
                    <parent>
                      <_id/>
                    </parent>
                  </parent>
                </parent>
                <created_by_doc db-doc-ref="/delivery"/>
              </baby_death_profile>
              <baby_death_profile_doc db-doc-ref=" /delivery/baby_death/baby_death_repeat/baby_death_profile "/>
            </baby_death_repeat>
          </baby_death>
          <babys_condition>
            <baby_repeat_note tag="hidden"/>
            <baby_repeat_count/>
            <baby_repeat jr:template="">
              <baby_details>
                <baby_n tag="hidden"/>
                <baby_condition/>
                <baby_name/>
                <baby_sex/>
                <birth_weight_know/>
                <birth_weight/>
                <birth_length_know/>
                <birth_length/>
                <vaccines_received/>
                <imm_counsel_note tag="hidden"/>
                <breastfeeding/>
                <breastfed_within_1_hour/>
                <baby_danger_sign_note tag="hidden"/>
                <infected_umbilical_cord/>
                <convulsion/>
                <difficulty_feeding/>
                <vomit/>
                <drowsy/>
                <stiff/>
                <yellow_skin/>
                <fever/>
                <blue_skin/>
                <r_baby_danger_sign_present tag="hidden"/>
                <baby_profile db-doc="true">
                  <name tag="hidden"/>
                  <sex tag="hidden"/>
                  <date_of_birth tag="hidden"/>
                  <vaccines_received/>
                  <t_danger_signs_referral_follow_up/>
                  <t_danger_signs_referral_follow_up_date/>
                  <measurements>
                    <weight/>
                    <length/>
                  </measurements>
                  <danger_signs>
                    <infected_umbilical_cord/>
                    <convulsion/>
                    <difficulty_feeding/>
                    <vomit/>
                    <drowsy/>
                    <stiff/>
                    <yellow_skin/>
                    <fever/>
                    <blue_skin/>
                  </danger_signs>
                  <parent tag="hidden">
                    <_id/>
                    <parent tag="hidden">
                      <_id/>
                      <parent tag="hidden">
                        <_id/>
                      </parent>
                    </parent>
                  </parent>
                  <type tag="hidden"/>
                  <created_by_doc db-doc-ref="/delivery" tag="hidden"/>
                </baby_profile>
                <child_doc db-doc-ref=" /delivery/babys_condition/baby_repeat/baby_details/baby_profile " tag="hidden"/>
              </baby_details>
            </baby_repeat>
            <r_baby_danger_sign_present_joined/>
            <r_baby_danger_sign_present_any/>
          </babys_condition>
          <safe_postnatal_practices tag="hidden">
            <safe_postnatal_practice_1/>
            <safe_postnatal_practice_2/>
            <safe_postnatal_practice_3/>
            <safe_postnatal_practice_4/>
            <safe_postnatal_practice_5/>
          </safe_postnatal_practices>
          <pnc_visits>
            <who_note tag="hidden"/>
            <pnc_visits_attended/>
            <pnc_visits_additional/>
            <days tag="hidden"/>
          </pnc_visits>
          <summary tag="hidden">
            <r_submit_note/>
            <r_summary_details/>
            <r_patient_details/>
            <r_pregnancy_outcome/>
            <r_woman_condition/>
            <r_condition_well/>
            <r_condition_unwell/>
            <r_condition_deceased/>
            <r_woman_death/>
            <r_death_date/>
            <r_death_place/>
            <r_delivery_details/>
            <r_delivery_date/>
            <r_delivery_place/>
            <r_babies_delivered_num/>
            <r_babies_deceased_num/>
            <r_danger_signs/>
            <r_mom_fever/>
            <r_mom_severe_headache/>
            <r_mom_vaginal_bleeding/>
            <r_mom_vaginal_discharge/>
            <r_mom_convulsion/>
            <r_pnc_visits/>
            <r_pnc_visits_completed/>
            <r_pnc_visit_24hrs/>
            <r_pnc_visit_3days/>
            <r_pnc_visit_7days/>
            <r_pnc_visit_6weeks/>
            <r_pnc_visit_none/>
            <r_pnc_visits_add/>
            <r_referrals/>
            <r_refer_clinic_immediately/>
            <r_refer_danger_sign/>
            <r_mom_alive_unwell/>
            <r_who_schedule_note/>
            <r_pnc_schedule_note/>
            <r_follow_up_tasks/>
            <r_following_tasks/>
            <r_fup_danger_sign/>
            <r_fup_danger_sign_baby/>
            <custom_translations tag="hidden">
              <custom_woman_label_translator/>
              <custom_woman_label/>
              <custom_woman_start_label_translator/>
              <custom_woman_start_label/>
              <delivery_place_label_translator/>
              <delivery_place_label/>
              <woman_death_place_label_translator/>
              <woman_death_place_label/>
            </custom_translations>
          </summary>
          <data tag="hidden">
            <__woman_condition/>
            <__fever/>
            <__severe_headache/>
            <__vaginal_bleeding/>
            <__vaginal_discharge/>
            <__convulsions/>
            <__has_danger_sign/>
            <__woman_death_date/>
            <__woman_death_place/>
            <__delivered_before_death/>
            <__woman_death_notes/>
            <__babies_delivered/>
            <__babies_deceased/>
            <__babies_alive/>
            <__delivery_date/>
            <__delivery_place/>
            <__delivery_place_other/>
            <__delivery_mode/>
            <__delivery_conductor/>
            <__delivery_conductor_other/>
            <__pnc_visit_within_24_hrs/>
            <__pnc_visit_3_days/>
            <__pnc_visit_7_days/>
            <__pnc_visit_6_weeks/>
            <__pnc_visits_num_selected/>
            <__pnc_visits_additional/>
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
        </delivery>
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
    <instance id="modes">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-modes-0</itextId>
            <name>vaginal</name>
          </item>
          <item>
            <itextId>static_instance-modes-1</itextId>
            <name>cesarean</name>
          </item>
        </root>
      </instance>
    <instance id="conductors">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-conductors-0</itextId>
            <name>skilled</name>
          </item>
          <item>
            <itextId>static_instance-conductors-1</itextId>
            <name>traditional</name>
          </item>
          <item>
            <itextId>static_instance-conductors-2</itextId>
            <name>other</name>
          </item>
        </root>
      </instance>
    <instance id="life_conditions_woman">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-life_conditions_woman-0</itextId>
            <name>alive_well</name>
          </item>
          <item>
            <itextId>static_instance-life_conditions_woman-1</itextId>
            <name>alive_unwell</name>
          </item>
          <item>
            <itextId>static_instance-life_conditions_woman-2</itextId>
            <name>deceased</name>
          </item>
        </root>
      </instance>
    <instance id="life_conditions_baby">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-life_conditions_baby-0</itextId>
            <name>alive_well</name>
          </item>
          <item>
            <itextId>static_instance-life_conditions_baby-1</itextId>
            <name>alive_unwell</name>
          </item>
        </root>
      </instance>
    <instance id="places">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-places-0</itextId>
            <name>health_facility</name>
          </item>
          <item>
            <itextId>static_instance-places-1</itextId>
            <name>home</name>
          </item>
          <item>
            <itextId>static_instance-places-2</itextId>
            <name>other</name>
          </item>
        </root>
      </instance>
    <instance id="babies_delivered">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-babies_delivered-0</itextId>
            <name>1</name>
          </item>
          <item>
            <itextId>static_instance-babies_delivered-1</itextId>
            <name>2</name>
          </item>
          <item>
            <itextId>static_instance-babies_delivered-2</itextId>
            <name>3</name>
          </item>
          <item>
            <itextId>static_instance-babies_delivered-3</itextId>
            <name>other</name>
          </item>
        </root>
      </instance>
    <instance id="babies_alive">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-babies_alive-0</itextId>
            <name>0</name>
            <count>0</count>
          </item>
          <item>
            <itextId>static_instance-babies_alive-1</itextId>
            <name>1</name>
            <count>1</count>
          </item>
          <item>
            <itextId>static_instance-babies_alive-2</itextId>
            <name>2</name>
            <count>2</count>
          </item>
          <item>
            <itextId>static_instance-babies_alive-3</itextId>
            <name>3</name>
            <count>3</count>
          </item>
          <item>
            <itextId>static_instance-babies_alive-4</itextId>
            <name>other</name>
            <count>4</count>
          </item>
        </root>
      </instance>
    <instance id="male_female">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-male_female-0</itextId>
            <name>male</name>
          </item>
          <item>
            <itextId>static_instance-male_female-1</itextId>
            <name>female</name>
          </item>
        </root>
      </instance>
    <instance id="knows_weight">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-knows_weight-0</itextId>
            <name>no</name>
          </item>
          <item>
            <itextId>static_instance-knows_weight-1</itextId>
            <name>yes</name>
          </item>
        </root>
      </instance>
    <instance id="knows_length">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-knows_length-0</itextId>
            <name>no</name>
          </item>
          <item>
            <itextId>static_instance-knows_length-1</itextId>
            <name>yes</name>
          </item>
        </root>
      </instance>
    <instance id="vaccines">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-vaccines-0</itextId>
            <name>bcg_only</name>
          </item>
          <item>
            <itextId>static_instance-vaccines-1</itextId>
            <name>birth_polio_only</name>
          </item>
          <item>
            <itextId>static_instance-vaccines-2</itextId>
            <name>bcg_and_birth_polio</name>
          </item>
          <item>
            <itextId>static_instance-vaccines-3</itextId>
            <name>none</name>
          </item>
        </root>
      </instance>
    <instance id="pnc_visits">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-pnc_visits-0</itextId>
            <name>within_24_hrs</name>
            <count>0</count>
          </item>
          <item>
            <itextId>static_instance-pnc_visits-1</itextId>
            <name>3_days</name>
            <count>3</count>
          </item>
          <item>
            <itextId>static_instance-pnc_visits-2</itextId>
            <name>7_days</name>
            <count>7</count>
          </item>
          <item>
            <itextId>static_instance-pnc_visits-3</itextId>
            <name>6_weeks</name>
            <count>42</count>
          </item>
          <item>
            <itextId>static_instance-pnc_visits-4</itextId>
            <name>none</name>
            <count>0</count>
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
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Delivery</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/delivery/baby_death/baby_death_repeat/baby_death_add_notes:jr:constraintMsg">
            <value>Maximum 300 characters allowed.</value>
          </text>
          <text id="/delivery/baby_death/baby_death_repeat/baby_death_add_notes:label">
            <value>Additional notes about baby's death</value>
          </text>
          <text id="/delivery/baby_death/baby_death_repeat/baby_death_date:jr:constraintMsg">
            <value>Date cannot be in the future and older than a month from today.</value>
          </text>
          <text id="/delivery/baby_death/baby_death_repeat/baby_death_date:label">
            <value>Date of death</value>
          </text>
          <text id="/delivery/baby_death/baby_death_repeat/baby_death_place/health_facility:label">
            <value>Health facility</value>
          </text>
          <text id="/delivery/baby_death/baby_death_repeat/baby_death_place/home:label">
            <value>Home</value>
          </text>
          <text id="/delivery/baby_death/baby_death_repeat/baby_death_place/other:label">
            <value>Other</value>
          </text>
          <text id="/delivery/baby_death/baby_death_repeat/baby_death_place:label">
            <value>Place of death</value>
          </text>
          <text id="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent/_id:label">
            <value>Parent</value>
          </text>
          <text id="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent/parent/_id:label">
            <value>Area</value>
          </text>
          <text id="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent/parent/parent/_id:label">
            <value>Health Facility ID</value>
          </text>
          <text id="/delivery/baby_death/baby_death_repeat/stillbirth/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/baby_death/baby_death_repeat/stillbirth/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/baby_death/baby_death_repeat/stillbirth:label">
            <value>Was this a stillbirth?</value>
          </text>
          <text id="/delivery/baby_death:label">
            <value>Death Information - Baby</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_condition/alive_unwell:label">
            <value>Alive and unwell</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_condition/alive_well:label">
            <value>Alive and well</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_condition:hint">
            <value>Select one.</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_condition:label">
            <value>What is the condition of baby?</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_danger_sign_note:label">
            <value>Does the baby have any of the following danger signs?</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_n:hint">
            <value>Each baby will be asked about individually.</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_n:label">
            <value>Baby</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_name:hint">
            <value>Please enter a name for the baby to identify them in the app. You can change it later.</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_name:label">
            <value>Name</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent/_id:label">
            <value>Parent</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent/parent/_id:label">
            <value>Area</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent/parent/parent/_id:label">
            <value>Health Facility ID</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/type:label">
            <value>Type</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_sex/female:label">
            <value>Female</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_sex/male:label">
            <value>Male</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/baby_sex:label">
            <value>Sex</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/birth_length:jr:constraintMsg">
            <value>Should be between 35.6 cms and 70 cms.</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/birth_length:label">
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know/no:label">
            <value>I don't know</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know/yes:label">
            <value>Length in cm</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know:label">
            <value>Birth length</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/birth_weight:jr:constraintMsg">
            <value>Should be between 1500 grams and 5000 grams.</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/birth_weight:label">
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know/no:label">
            <value>I don't know</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know/yes:label">
            <value>Weight in grams</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know:label">
            <value>Birth weight</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/blue_skin/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/blue_skin/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/blue_skin:label">
            <value>Blue skin color (hypothermia)</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour:label">
            <value>Were they initiated on breastfeeding within on hour of delivery?</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/breastfeeding/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/breastfeeding/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/breastfeeding:label">
            <value>Is the child exclusively breastfeeding?</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/convulsion/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/convulsion/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/convulsion:label">
            <value>Convulsions</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding:label">
            <value>Difficulty feeding or drinking</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/drowsy/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/drowsy/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/drowsy:label">
            <value>Drowsy or unconscious</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/fever/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/fever/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/fever:label">
            <value>Fever</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/imm_counsel_note:label">
            <value>Please counsel the family and refer the child to the nearest health center where the baby can be immunized.</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord:label">
            <value>Infected umbilical cord</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/stiff/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/stiff/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/stiff:label">
            <value>Body stiffness</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received/bcg_and_birth_polio:label">
            <value>BCG and Birth Polio</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received/bcg_only:label">
            <value>BCG only</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received/birth_polio_only:label">
            <value>Birth Polio only</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received/none:label">
            <value>None</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received:hint">
            <value>Select one.</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received:label">
            <value>What vaccines have they received?</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/vomit/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/vomit/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/vomit:label">
            <value>Vomits everything</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin:label">
            <value>Yellow skin color</value>
          </text>
          <text id="/delivery/babys_condition/baby_repeat_note:label">
            <value>Sections will repeat if multiple babies were delivered. Please fill out one section per baby.</value>
          </text>
          <text id="/delivery/babys_condition:label">
            <value>Baby's Condition</value>
          </text>
          <text id="/delivery/condition/woman_outcome/alive_unwell:label">
            <value>Alive and unwell</value>
          </text>
          <text id="/delivery/condition/woman_outcome/alive_well:label">
            <value>Alive and well</value>
          </text>
          <text id="/delivery/condition/woman_outcome/deceased:label">
            <value>Deceased</value>
          </text>
          <text id="/delivery/condition/woman_outcome:label">
            <value>What is the outcome for the woman?</value>
          </text>
          <text id="/delivery/condition:label">
            <value><output value=" /delivery/patient_short_name_start "/>'s Condition</value>
          </text>
          <text id="/delivery/death_info_woman/death_baby_note:label">
            <value>If babies were delivered, you will have the chance to report on them Next &gt;.</value>
          </text>
          <text id="/delivery/death_info_woman/death_profile_note:label">
            <value>After reporting a death, the person's profile will be locked. If reported in error, you may undo the death report from the profile.</value>
          </text>
          <text id="/delivery/death_info_woman/death_report/type:label">
            <value>Type</value>
          </text>
          <text id="/delivery/death_info_woman/woman_death_add_notes:jr:constraintMsg">
            <value>300 characters</value>
          </text>
          <text id="/delivery/death_info_woman/woman_death_add_notes:label">
            <value>Additional notes</value>
          </text>
          <text id="/delivery/death_info_woman/woman_death_birth/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/death_info_woman/woman_death_birth/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/death_info_woman/woman_death_birth:label">
            <value>Did the woman deliver any babies before she died?</value>
          </text>
          <text id="/delivery/death_info_woman/woman_death_date:jr:constraintMsg">
            <value>Date cannot be in the future and older than a month from today.</value>
          </text>
          <text id="/delivery/death_info_woman/woman_death_date:label">
            <value>Date of death</value>
          </text>
          <text id="/delivery/death_info_woman/woman_death_place/health_facility:label">
            <value>Health facility</value>
          </text>
          <text id="/delivery/death_info_woman/woman_death_place/home:label">
            <value>Home</value>
          </text>
          <text id="/delivery/death_info_woman/woman_death_place/other:label">
            <value>Other</value>
          </text>
          <text id="/delivery/death_info_woman/woman_death_place:label">
            <value>What was the place of death?</value>
          </text>
          <text id="/delivery/death_info_woman:label">
            <value>Death Information - Woman</value>
          </text>
          <text id="/delivery/delivery_outcome/babies_alive:label">
            <value>How many babies are alive?</value>
          </text>
          <text id="/delivery/delivery_outcome/babies_alive_other:jr:constraintMsg">
            <value>Can not be more than babies delivered.</value>
          </text>
          <text id="/delivery/delivery_outcome/babies_delivered/1:label">
            <value>1</value>
          </text>
          <text id="/delivery/delivery_outcome/babies_delivered/2:label">
            <value>2</value>
          </text>
          <text id="/delivery/delivery_outcome/babies_delivered/3:label">
            <value>3</value>
          </text>
          <text id="/delivery/delivery_outcome/babies_delivered/other:label">
            <value>Other</value>
          </text>
          <text id="/delivery/delivery_outcome/babies_delivered:label">
            <value>How many babies were delivered?</value>
          </text>
          <text id="/delivery/delivery_outcome/babies_delivered_other:jr:constraintMsg">
            <value>Select this only if more than 3 babies were delivered.</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_conductor/other:label">
            <value>Other</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_conductor/skilled:label">
            <value>Skilled health care provider</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_conductor/traditional:label">
            <value>Traditional birth attendant</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_conductor:label">
            <value>Who conducted the delivery?</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_conductor_other:jr:constraintMsg">
            <value>Maximum 100 characters allowed.</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_conductor_other:label">
            <value>Please specify other</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_date:jr:constraintMsg">
            <value>Date cannot be in the future and older than a month from today.</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_date:label">
            <value>Date of delivery</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_mode/cesarean:label">
            <value>Cesarean</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_mode/vaginal:label">
            <value>Vaginal</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_mode:label">
            <value>How did she deliver?</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_place/health_facility:label">
            <value>Health facility</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_place/home:label">
            <value>Home</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_place/other:label">
            <value>Other</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_place:label">
            <value>Where did delivery take place?</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_place_other:jr:constraintMsg">
            <value>Maximum 100 characters allowed.</value>
          </text>
          <text id="/delivery/delivery_outcome/delivery_place_other:label">
            <value>Please specify other</value>
          </text>
          <text id="/delivery/delivery_outcome:label">
            <value>Delivery Outcome</value>
          </text>
          <text id="/delivery/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/delivery/inputs/contact/date_of_birth:label">
            <value>Date of Birth</value>
          </text>
          <text id="/delivery/inputs/contact/name:label">
            <value>Name</value>
          </text>
          <text id="/delivery/inputs/contact/parent/_id:label">
            <value>Household ID</value>
          </text>
          <text id="/delivery/inputs/contact/parent/parent/_id:label">
            <value>Area ID</value>
          </text>
          <text id="/delivery/inputs/contact/parent/parent/contact/chw_name:label">
            <value>CHW name</value>
          </text>
          <text id="/delivery/inputs/contact/parent/parent/contact/phone:label">
            <value>CHW phone</value>
          </text>
          <text id="/delivery/inputs/contact/parent/parent/parent/_id:label">
            <value>Health Facility ID</value>
          </text>
          <text id="/delivery/inputs/contact/patient_id:label">
            <value>Patient ID</value>
          </text>
          <text id="/delivery/inputs/contact/sex:label">
            <value>Sex</value>
          </text>
          <text id="/delivery/inputs/contact/short_name:label">
            <value>Short Name</value>
          </text>
          <text id="/delivery/inputs/source:label">
            <value>Source</value>
          </text>
          <text id="/delivery/inputs/source_id:label">
            <value>Source ID</value>
          </text>
          <text id="/delivery/inputs/user/contact_id:label">
            <value>Contact ID</value>
          </text>
          <text id="/delivery/inputs/user/name:label">
            <value>Name</value>
          </text>
          <text id="/delivery/inputs/user/phone:label">
            <value>Phone</value>
          </text>
          <text id="/delivery/inputs/user:label">
            <value>User</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/convulsion/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/convulsion/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/convulsion:label">
            <value>Convulsions</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/fever/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/fever/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/fever:label">
            <value>Fever</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/pnc_danger_sign_note:label">
            <value>Does the woman have any of the following danger signs?</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/severe_headache/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/severe_headache/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/severe_headache:label">
            <value>Severe headache</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/vaginal_bleeding/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/vaginal_bleeding/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/vaginal_bleeding:label">
            <value>Vaginal bleeding</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/vaginal_discharge/no:label">
            <value>No</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/vaginal_discharge/yes:label">
            <value>Yes</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check/vaginal_discharge:label">
            <value>Foul smelling vaginal discharge</value>
          </text>
          <text id="/delivery/pnc_danger_sign_check:label">
            <value>Postnatal Danger Sign Check - Woman</value>
          </text>
          <text id="/delivery/pnc_visits/pnc_visits_additional:jr:constraintMsg">
            <value>Must be between 0 and 6.</value>
          </text>
          <text id="/delivery/pnc_visits/pnc_visits_additional:label">
            <value>Any additional PNC visits, please report the number of visits below to be counted in the total.</value>
          </text>
          <text id="/delivery/pnc_visits/pnc_visits_attended:label">
            <value>Which PNC visits have taken place so far?</value>
          </text>
          <text id="/delivery/pnc_visits/who_note:label">
            <value>The WHO recommends PNC visits within 24 hours and on 3 days, 7 days, and 6 weeks from date of delivery.</value>
          </text>
          <text id="/delivery/pnc_visits:label">
            <value>PNC Visits</value>
          </text>
          <text id="/delivery/safe_postnatal_practices/safe_postnatal_practice_1:label">
            <value>Lactating mothers need to eat more than usual to feed their baby well. Ask the woman to eat a variety of foods, especially extra fluids, fruits, and vegetables.</value>
          </text>
          <text id="/delivery/safe_postnatal_practices/safe_postnatal_practice_2:label">
            <value>For the first 6 months, give the baby breastmilk only.</value>
          </text>
          <text id="/delivery/safe_postnatal_practices/safe_postnatal_practice_3:label">
            <value>To keep the baby warm, use kangaroo mother care, wrap the baby with clothes and cover the head, and keep the baby in a warm room.</value>
          </text>
          <text id="/delivery/safe_postnatal_practices/safe_postnatal_practice_4:label">
            <value>Always sleep with the baby under a long-lasting insecticide treated net (LLIN).</value>
          </text>
          <text id="/delivery/safe_postnatal_practices/safe_postnatal_practice_5:label">
            <value>Keep the baby's umbilical cord clean and dry.</value>
          </text>
          <text id="/delivery/safe_postnatal_practices:label">
            <value>Safe Postnatal Practices</value>
          </text>
          <text id="/delivery/summary/custom_translations/custom_woman_label_translator/woman:label">
            <value>the woman</value>
          </text>
          <text id="/delivery/summary/custom_translations/custom_woman_start_label_translator/woman-start:label">
            <value>Woman</value>
          </text>
          <text id="/delivery/summary/custom_translations/delivery_place_label_translator/health_facility:label">
            <value>Health facility</value>
          </text>
          <text id="/delivery/summary/custom_translations/delivery_place_label_translator/home:label">
            <value>Home</value>
          </text>
          <text id="/delivery/summary/custom_translations/delivery_place_label_translator/other:label">
            <value>Other</value>
          </text>
          <text id="/delivery/summary/custom_translations/woman_death_place_label_translator/health_facility:label">
            <value>Health facility</value>
          </text>
          <text id="/delivery/summary/custom_translations/woman_death_place_label_translator/home:label">
            <value>Home</value>
          </text>
          <text id="/delivery/summary/custom_translations/woman_death_place_label_translator/other:label">
            <value>Other</value>
          </text>
          <text id="/delivery/summary/r_babies_deceased_num:label">
            <value>Number of babies deceased: <output value=" /delivery/delivery_outcome/babies_deceased_num "/></value>
          </text>
          <text id="/delivery/summary/r_babies_delivered_num:label">
            <value>Number of babies delivered: <output value=" /delivery/delivery_outcome/babies_delivered_num "/></value>
          </text>
          <text id="/delivery/summary/r_condition_deceased:label">
            <value>Deceased</value>
          </text>
          <text id="/delivery/summary/r_condition_unwell:label">
            <value>Alive and unwell</value>
          </text>
          <text id="/delivery/summary/r_condition_well:label">
            <value>Alive and well</value>
          </text>
          <text id="/delivery/summary/r_danger_signs:label">
            <value>Danger signs</value>
          </text>
          <text id="/delivery/summary/r_death_date:label">
            <value>Date of Death: <output value=" /delivery/death_info_woman/woman_death_date "/></value>
          </text>
          <text id="/delivery/summary/r_death_place:label">
            <value>Place of Death: <output value=" /delivery/summary/custom_translations/woman_death_place_label "/></value>
          </text>
          <text id="/delivery/summary/r_delivery_date:label">
            <value>Date of Delivery: <output value=" /delivery/delivery_outcome/delivery_date "/></value>
          </text>
          <text id="/delivery/summary/r_delivery_details:label">
            <value>Delivery Details</value>
          </text>
          <text id="/delivery/summary/r_delivery_place:label">
            <value>Place of Delivery: <output value=" /delivery/summary/custom_translations/delivery_place_label "/></value>
          </text>
          <text id="/delivery/summary/r_follow_up_tasks:label">
            <value>Follow-up Tasks&lt;I class="fa fa-flag"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/delivery/summary/r_following_tasks:label">
            <value>The following tasks will appear:</value>
          </text>
          <text id="/delivery/summary/r_fup_danger_sign:label">
            <value>Please conduct a danger sign follow-up for the mother in 3 days.</value>
          </text>
          <text id="/delivery/summary/r_fup_danger_sign_baby:label">
            <value>Please conduct a danger sign follow-up for the baby in 3 days.</value>
          </text>
          <text id="/delivery/summary/r_mom_alive_unwell:label">
            <value>Mom is alive and unwell</value>
          </text>
          <text id="/delivery/summary/r_mom_convulsion:label">
            <value>Convulsions</value>
          </text>
          <text id="/delivery/summary/r_mom_fever:label">
            <value>Fever</value>
          </text>
          <text id="/delivery/summary/r_mom_severe_headache:label">
            <value>Severe headache</value>
          </text>
          <text id="/delivery/summary/r_mom_vaginal_bleeding:label">
            <value>Vaginal bleeding</value>
          </text>
          <text id="/delivery/summary/r_mom_vaginal_discharge:label">
            <value>Foul smelling vaginal discharge</value>
          </text>
          <text id="/delivery/summary/r_patient_details:label">
            <value>&lt;h2 style=&quot;text-align:center;margin-bottom:0px;&quot;&gt;<output value=" /delivery/patient_name "/>&lt;/h2&gt; &lt;p style=&quot;text-align:center;&quot;&gt;<output value=" /delivery/patient_age_in_years "/> years old&lt;/p&gt;</value>
          </text>
          <text id="/delivery/summary/r_pnc_schedule_note:label">
            <value>Please continue to refer the woman to the health facility at the appropriate time.</value>
          </text>
          <text id="/delivery/summary/r_pnc_visit_24hrs:label">
            <value>24 hours</value>
          </text>
          <text id="/delivery/summary/r_pnc_visit_3days:label">
            <value>3 days</value>
          </text>
          <text id="/delivery/summary/r_pnc_visit_6weeks:label">
            <value>6 weeks</value>
          </text>
          <text id="/delivery/summary/r_pnc_visit_7days:label">
            <value>7 days</value>
          </text>
          <text id="/delivery/summary/r_pnc_visit_none:label">
            <value>None</value>
          </text>
          <text id="/delivery/summary/r_pnc_visits:label">
            <value>PNC Visits</value>
          </text>
          <text id="/delivery/summary/r_pnc_visits_add:label">
            <value>Additional PNC visits completed: <output value=" /delivery/pnc_visits/pnc_visits_additional "/></value>
          </text>
          <text id="/delivery/summary/r_pnc_visits_completed:label">
            <value>PNC visits completed so far:</value>
          </text>
          <text id="/delivery/summary/r_pregnancy_outcome:label">
            <value>Pregnancy Outcome&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/delivery/summary/r_refer_clinic_immediately:label">
            <value>Refer to clinic immediately for:</value>
          </text>
          <text id="/delivery/summary/r_refer_danger_sign:label">
            <value>Danger signs</value>
          </text>
          <text id="/delivery/summary/r_referrals:label">
            <value>Referrals&lt;I class="fa fa-hospital-o"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/delivery/summary/r_submit_note:label">
            <value>&lt;h4 style="text-align:center;"&gt;To finish, be sure to click the Submit button.&lt;/h4&gt;</value>
          </text>
          <text id="/delivery/summary/r_summary_details:label">
            <value>Patient&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/delivery/summary/r_who_schedule_note:label">
            <value>The WHO recommends routine PNC visits at 24 hours, 3 days, 7 days, and 6 weeks from the date of delivery.</value>
          </text>
          <text id="/delivery/summary/r_woman_condition:label">
            <value>Woman's Condition</value>
          </text>
          <text id="/delivery/summary/r_woman_death:label">
            <value>Death</value>
          </text>
          <text id="static_instance-babies_alive-0">
            <value>0</value>
          </text>
          <text id="static_instance-babies_alive-1">
            <value>1</value>
          </text>
          <text id="static_instance-babies_alive-2">
            <value>2</value>
          </text>
          <text id="static_instance-babies_alive-3">
            <value>3</value>
          </text>
          <text id="static_instance-babies_alive-4">
            <value>Other</value>
          </text>
          <text id="static_instance-babies_delivered-0">
            <value>1</value>
          </text>
          <text id="static_instance-babies_delivered-1">
            <value>2</value>
          </text>
          <text id="static_instance-babies_delivered-2">
            <value>3</value>
          </text>
          <text id="static_instance-babies_delivered-3">
            <value>Other</value>
          </text>
          <text id="static_instance-conductors-0">
            <value>Skilled health care provider</value>
          </text>
          <text id="static_instance-conductors-1">
            <value>Traditional birth attendant</value>
          </text>
          <text id="static_instance-conductors-2">
            <value>Other</value>
          </text>
          <text id="static_instance-knows_length-0">
            <value>I don't know</value>
          </text>
          <text id="static_instance-knows_length-1">
            <value>Length in cm</value>
          </text>
          <text id="static_instance-knows_weight-0">
            <value>I don't know</value>
          </text>
          <text id="static_instance-knows_weight-1">
            <value>Weight in grams</value>
          </text>
          <text id="static_instance-life_conditions_baby-0">
            <value>Alive and well</value>
          </text>
          <text id="static_instance-life_conditions_baby-1">
            <value>Alive and unwell</value>
          </text>
          <text id="static_instance-life_conditions_woman-0">
            <value>Alive and well</value>
          </text>
          <text id="static_instance-life_conditions_woman-1">
            <value>Alive and unwell</value>
          </text>
          <text id="static_instance-life_conditions_woman-2">
            <value>Deceased</value>
          </text>
          <text id="static_instance-male_female-0">
            <value>Male</value>
          </text>
          <text id="static_instance-male_female-1">
            <value>Female</value>
          </text>
          <text id="static_instance-modes-0">
            <value>Vaginal</value>
          </text>
          <text id="static_instance-modes-1">
            <value>Cesarean</value>
          </text>
          <text id="static_instance-places-0">
            <value>Health facility</value>
          </text>
          <text id="static_instance-places-1">
            <value>Home</value>
          </text>
          <text id="static_instance-places-2">
            <value>Other</value>
          </text>
          <text id="static_instance-pnc_visits-0">
            <value>Within 24 hours (check this box if facility delivery)</value>
          </text>
          <text id="static_instance-pnc_visits-1">
            <value>3 days</value>
          </text>
          <text id="static_instance-pnc_visits-2">
            <value>7 days</value>
          </text>
          <text id="static_instance-pnc_visits-3">
            <value>6 weeks</value>
          </text>
          <text id="static_instance-pnc_visits-4">
            <value>None of the above</value>
          </text>
          <text id="static_instance-translate_woman_label-0">
            <value>the woman</value>
          </text>
          <text id="static_instance-translate_woman_start_label-0">
            <value>Woman</value>
          </text>
          <text id="static_instance-vaccines-0">
            <value>BCG only</value>
          </text>
          <text id="static_instance-vaccines-1">
            <value>Birth Polio only</value>
          </text>
          <text id="static_instance-vaccines-2">
            <value>BCG and Birth Polio</value>
          </text>
          <text id="static_instance-vaccines-3">
            <value>None</value>
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
        <delivery delimiter="#" id="delivery" prefix="J1!delivery!" version="2022-11-04 2-47">
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
              <name/>
              <phone/>
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
                  <_id/>
                  <parent>
                    <_id/>
                  </parent>
                  <contact>
                    <chw_name/>
                    <phone/>
                  </contact>
                </parent>
              </parent>
            </contact>
          </inputs>
          <household_id tag="hidden"/>
          <area_id tag="hidden"/>
          <facility_id tag="hidden"/>
          <patient_age_in_years tag="hidden"/>
          <patient_uuid tag="hidden"/>
          <patient_id tag="hidden"/>
          <patient_name tag="hidden"/>
          <patient_short_name tag="hidden"/>
          <patient_short_name_start tag="hidden"/>
          <t_danger_signs_referral_follow_up tag="hidden"/>
          <t_danger_signs_referral_follow_up_date tag="hidden"/>
          <condition>
            <woman_outcome/>
          </condition>
          <pnc_danger_sign_check>
            <pnc_danger_sign_note/>
            <fever/>
            <severe_headache/>
            <vaginal_bleeding/>
            <vaginal_discharge/>
            <convulsion/>
            <r_pnc_danger_sign_present tag="hidden"/>
          </pnc_danger_sign_check>
          <death_info_woman>
            <woman_death_date/>
            <woman_death_place/>
            <woman_death_birth/>
            <woman_death_add_notes/>
            <death_profile_note/>
            <death_baby_note tag="hidden"/>
            <death_report db-doc="true" tag="hidden">
              <form/>
              <type/>
              <content_type/>
              <from/>
              <fields>
                <patient_id/>
                <patient_uuid/>
                <death_details>
                  <date_of_death/>
                  <place_of_death/>
                  <place_of_death_other/>
                  <death_information/>
                </death_details>
              </fields>
              <created_by_doc db-doc-ref="/delivery"/>
            </death_report>
            <woman_death_report_doc db-doc-ref=" /delivery/death_info_woman/death_report "/>
          </death_info_woman>
          <delivery_outcome>
            <babies_delivered/>
            <babies_delivered_other/>
            <babies_alive/>
            <babies_alive_other/>
            <babies_delivered_num/>
            <babies_alive_num/>
            <babies_deceased_num/>
            <delivery_date/>
            <delivery_place/>
            <delivery_place_other/>
            <delivery_mode/>
            <delivery_conductor/>
            <delivery_conductor_other/>
          </delivery_outcome>
          <baby_death>
            <baby_death_repeat_count/>
            <baby_death_repeat jr:template="">
              <baby_death_date/>
              <baby_death_place/>
              <stillbirth/>
              <baby_death_add_notes/>
              <baby_death_profile db-doc="true" tag="hidden">
                <type/>
                <name/>
                <sex/>
                <date_of_birth/>
                <date_of_death/>
                <parent>
                  <_id/>
                  <parent>
                    <_id/>
                    <parent>
                      <_id/>
                    </parent>
                  </parent>
                </parent>
                <created_by_doc db-doc-ref="/delivery"/>
              </baby_death_profile>
              <baby_death_profile_doc db-doc-ref=" /delivery/baby_death/baby_death_repeat/baby_death_profile "/>
            </baby_death_repeat>
          </baby_death>
          <babys_condition>
            <baby_repeat_note tag="hidden"/>
            <baby_repeat_count/>
            <baby_repeat jr:template="">
              <baby_details>
                <baby_n tag="hidden"/>
                <baby_condition/>
                <baby_name/>
                <baby_sex/>
                <birth_weight_know/>
                <birth_weight/>
                <birth_length_know/>
                <birth_length/>
                <vaccines_received/>
                <imm_counsel_note tag="hidden"/>
                <breastfeeding/>
                <breastfed_within_1_hour/>
                <baby_danger_sign_note tag="hidden"/>
                <infected_umbilical_cord/>
                <convulsion/>
                <difficulty_feeding/>
                <vomit/>
                <drowsy/>
                <stiff/>
                <yellow_skin/>
                <fever/>
                <blue_skin/>
                <r_baby_danger_sign_present tag="hidden"/>
                <baby_profile db-doc="true">
                  <name tag="hidden"/>
                  <sex tag="hidden"/>
                  <date_of_birth tag="hidden"/>
                  <vaccines_received/>
                  <t_danger_signs_referral_follow_up/>
                  <t_danger_signs_referral_follow_up_date/>
                  <measurements>
                    <weight/>
                    <length/>
                  </measurements>
                  <danger_signs>
                    <infected_umbilical_cord/>
                    <convulsion/>
                    <difficulty_feeding/>
                    <vomit/>
                    <drowsy/>
                    <stiff/>
                    <yellow_skin/>
                    <fever/>
                    <blue_skin/>
                  </danger_signs>
                  <parent tag="hidden">
                    <_id/>
                    <parent tag="hidden">
                      <_id/>
                      <parent tag="hidden">
                        <_id/>
                      </parent>
                    </parent>
                  </parent>
                  <type tag="hidden"/>
                  <created_by_doc db-doc-ref="/delivery" tag="hidden"/>
                </baby_profile>
                <child_doc db-doc-ref=" /delivery/babys_condition/baby_repeat/baby_details/baby_profile " tag="hidden"/>
              </baby_details>
            </baby_repeat>
            <r_baby_danger_sign_present_joined/>
            <r_baby_danger_sign_present_any/>
          </babys_condition>
          <safe_postnatal_practices tag="hidden">
            <safe_postnatal_practice_1/>
            <safe_postnatal_practice_2/>
            <safe_postnatal_practice_3/>
            <safe_postnatal_practice_4/>
            <safe_postnatal_practice_5/>
          </safe_postnatal_practices>
          <pnc_visits>
            <who_note tag="hidden"/>
            <pnc_visits_attended/>
            <pnc_visits_additional/>
            <days tag="hidden"/>
          </pnc_visits>
          <summary tag="hidden">
            <r_submit_note/>
            <r_summary_details/>
            <r_patient_details/>
            <r_pregnancy_outcome/>
            <r_woman_condition/>
            <r_condition_well/>
            <r_condition_unwell/>
            <r_condition_deceased/>
            <r_woman_death/>
            <r_death_date/>
            <r_death_place/>
            <r_delivery_details/>
            <r_delivery_date/>
            <r_delivery_place/>
            <r_babies_delivered_num/>
            <r_babies_deceased_num/>
            <r_danger_signs/>
            <r_mom_fever/>
            <r_mom_severe_headache/>
            <r_mom_vaginal_bleeding/>
            <r_mom_vaginal_discharge/>
            <r_mom_convulsion/>
            <r_pnc_visits/>
            <r_pnc_visits_completed/>
            <r_pnc_visit_24hrs/>
            <r_pnc_visit_3days/>
            <r_pnc_visit_7days/>
            <r_pnc_visit_6weeks/>
            <r_pnc_visit_none/>
            <r_pnc_visits_add/>
            <r_referrals/>
            <r_refer_clinic_immediately/>
            <r_refer_danger_sign/>
            <r_mom_alive_unwell/>
            <r_who_schedule_note/>
            <r_pnc_schedule_note/>
            <r_follow_up_tasks/>
            <r_following_tasks/>
            <r_fup_danger_sign/>
            <r_fup_danger_sign_baby/>
            <custom_translations tag="hidden">
              <custom_woman_label_translator/>
              <custom_woman_label/>
              <custom_woman_start_label_translator/>
              <custom_woman_start_label/>
              <delivery_place_label_translator/>
              <delivery_place_label/>
              <woman_death_place_label_translator/>
              <woman_death_place_label/>
            </custom_translations>
          </summary>
          <data tag="hidden">
            <__woman_condition/>
            <__fever/>
            <__severe_headache/>
            <__vaginal_bleeding/>
            <__vaginal_discharge/>
            <__convulsions/>
            <__has_danger_sign/>
            <__woman_death_date/>
            <__woman_death_place/>
            <__delivered_before_death/>
            <__woman_death_notes/>
            <__babies_delivered/>
            <__babies_deceased/>
            <__babies_alive/>
            <__delivery_date/>
            <__delivery_place/>
            <__delivery_place_other/>
            <__delivery_mode/>
            <__delivery_conductor/>
            <__delivery_conductor_other/>
            <__pnc_visit_within_24_hrs/>
            <__pnc_visit_3_days/>
            <__pnc_visit_7_days/>
            <__pnc_visit_6_weeks/>
            <__pnc_visits_num_selected/>
            <__pnc_visits_additional/>
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
        </delivery>
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
      <instance id="modes">
        <root>
          <item>
            <itextId>static_instance-modes-0</itextId>
            <name>vaginal</name>
          </item>
          <item>
            <itextId>static_instance-modes-1</itextId>
            <name>cesarean</name>
          </item>
        </root>
      </instance>
      <instance id="conductors">
        <root>
          <item>
            <itextId>static_instance-conductors-0</itextId>
            <name>skilled</name>
          </item>
          <item>
            <itextId>static_instance-conductors-1</itextId>
            <name>traditional</name>
          </item>
          <item>
            <itextId>static_instance-conductors-2</itextId>
            <name>other</name>
          </item>
        </root>
      </instance>
      <instance id="life_conditions_woman">
        <root>
          <item>
            <itextId>static_instance-life_conditions_woman-0</itextId>
            <name>alive_well</name>
          </item>
          <item>
            <itextId>static_instance-life_conditions_woman-1</itextId>
            <name>alive_unwell</name>
          </item>
          <item>
            <itextId>static_instance-life_conditions_woman-2</itextId>
            <name>deceased</name>
          </item>
        </root>
      </instance>
      <instance id="life_conditions_baby">
        <root>
          <item>
            <itextId>static_instance-life_conditions_baby-0</itextId>
            <name>alive_well</name>
          </item>
          <item>
            <itextId>static_instance-life_conditions_baby-1</itextId>
            <name>alive_unwell</name>
          </item>
        </root>
      </instance>
      <instance id="places">
        <root>
          <item>
            <itextId>static_instance-places-0</itextId>
            <name>health_facility</name>
          </item>
          <item>
            <itextId>static_instance-places-1</itextId>
            <name>home</name>
          </item>
          <item>
            <itextId>static_instance-places-2</itextId>
            <name>other</name>
          </item>
        </root>
      </instance>
      <instance id="babies_delivered">
        <root>
          <item>
            <itextId>static_instance-babies_delivered-0</itextId>
            <name>1</name>
          </item>
          <item>
            <itextId>static_instance-babies_delivered-1</itextId>
            <name>2</name>
          </item>
          <item>
            <itextId>static_instance-babies_delivered-2</itextId>
            <name>3</name>
          </item>
          <item>
            <itextId>static_instance-babies_delivered-3</itextId>
            <name>other</name>
          </item>
        </root>
      </instance>
      <instance id="babies_alive">
        <root>
          <item>
            <itextId>static_instance-babies_alive-0</itextId>
            <name>0</name>
            <count>0</count>
          </item>
          <item>
            <itextId>static_instance-babies_alive-1</itextId>
            <name>1</name>
            <count>1</count>
          </item>
          <item>
            <itextId>static_instance-babies_alive-2</itextId>
            <name>2</name>
            <count>2</count>
          </item>
          <item>
            <itextId>static_instance-babies_alive-3</itextId>
            <name>3</name>
            <count>3</count>
          </item>
          <item>
            <itextId>static_instance-babies_alive-4</itextId>
            <name>other</name>
            <count>4</count>
          </item>
        </root>
      </instance>
      <instance id="male_female">
        <root>
          <item>
            <itextId>static_instance-male_female-0</itextId>
            <name>male</name>
          </item>
          <item>
            <itextId>static_instance-male_female-1</itextId>
            <name>female</name>
          </item>
        </root>
      </instance>
      <instance id="knows_weight">
        <root>
          <item>
            <itextId>static_instance-knows_weight-0</itextId>
            <name>no</name>
          </item>
          <item>
            <itextId>static_instance-knows_weight-1</itextId>
            <name>yes</name>
          </item>
        </root>
      </instance>
      <instance id="knows_length">
        <root>
          <item>
            <itextId>static_instance-knows_length-0</itextId>
            <name>no</name>
          </item>
          <item>
            <itextId>static_instance-knows_length-1</itextId>
            <name>yes</name>
          </item>
        </root>
      </instance>
      <instance id="vaccines">
        <root>
          <item>
            <itextId>static_instance-vaccines-0</itextId>
            <name>bcg_only</name>
          </item>
          <item>
            <itextId>static_instance-vaccines-1</itextId>
            <name>birth_polio_only</name>
          </item>
          <item>
            <itextId>static_instance-vaccines-2</itextId>
            <name>bcg_and_birth_polio</name>
          </item>
          <item>
            <itextId>static_instance-vaccines-3</itextId>
            <name>none</name>
          </item>
        </root>
      </instance>
      <instance id="pnc_visits">
        <root>
          <item>
            <itextId>static_instance-pnc_visits-0</itextId>
            <name>within_24_hrs</name>
            <count>0</count>
          </item>
          <item>
            <itextId>static_instance-pnc_visits-1</itextId>
            <name>3_days</name>
            <count>3</count>
          </item>
          <item>
            <itextId>static_instance-pnc_visits-2</itextId>
            <name>7_days</name>
            <count>7</count>
          </item>
          <item>
            <itextId>static_instance-pnc_visits-3</itextId>
            <name>6_weeks</name>
            <count>42</count>
          </item>
          <item>
            <itextId>static_instance-pnc_visits-4</itextId>
            <name>none</name>
            <count>0</count>
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
      <bind nodeset="/delivery/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/delivery/inputs/source" type="string"/>
      <bind nodeset="/delivery/inputs/source_id" type="string"/>
      <bind nodeset="/delivery/inputs/user/contact_id" type="db:person"/>
      <bind nodeset="/delivery/inputs/user/name" type="string"/>
      <bind nodeset="/delivery/inputs/user/phone" type="string"/>
      <bind nodeset="/delivery/inputs/contact/_id" type="db:person"/>
      <bind nodeset="/delivery/inputs/contact/name" type="string"/>
      <bind nodeset="/delivery/inputs/contact/short_name" type="string"/>
      <bind nodeset="/delivery/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/delivery/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/delivery/inputs/contact/sex" type="string"/>
      <bind nodeset="/delivery/inputs/contact/parent/_id" type="string"/>
      <bind nodeset="/delivery/inputs/contact/parent/parent/_id" type="string"/>
      <bind nodeset="/delivery/inputs/contact/parent/parent/parent/_id" type="string"/>
      <bind nodeset="/delivery/inputs/contact/parent/parent/contact/chw_name" type="string"/>
      <bind nodeset="/delivery/inputs/contact/parent/parent/contact/phone" type="string"/>
      <bind calculate="../inputs/contact/parent/_id" nodeset="/delivery/household_id" type="string"/>
      <bind calculate="../inputs/contact/parent/parent/_id" nodeset="/delivery/area_id" type="string"/>
      <bind calculate="../inputs/contact/parent/parent/parent/_id" nodeset="/delivery/facility_id" type="string"/>
      <bind calculate="floor( difference-in-months( ../inputs/contact/date_of_birth, today() ) div 12 )" nodeset="/delivery/patient_age_in_years" type="string"/>
      <bind calculate="../inputs/contact/_id" nodeset="/delivery/patient_uuid" type="string"/>
      <bind calculate="../inputs/contact/patient_id" nodeset="/delivery/patient_id" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/delivery/patient_name" type="string"/>
      <bind calculate="coalesce(../inputs/contact/short_name, ../summary/custom_translations/custom_woman_label)" nodeset="/delivery/patient_short_name" type="string"/>
      <bind calculate="coalesce(../inputs/contact/short_name, ../summary/custom_translations/custom_woman_start_label)" nodeset="/delivery/patient_short_name_start" type="string"/>
      <bind calculate="../pnc_danger_sign_check/r_pnc_danger_sign_present" nodeset="/delivery/t_danger_signs_referral_follow_up" type="string"/>
      <bind calculate="date-time(decimal-date-time(today()) + 3)" nodeset="/delivery/t_danger_signs_referral_follow_up_date" type="string"/>
      <bind nodeset="/delivery/condition/woman_outcome" required="true()" type="select1"/>
      <bind nodeset="/delivery/pnc_danger_sign_check" relevant="selected(../condition/woman_outcome, 'alive_well') or
selected(../condition/woman_outcome, 'alive_unwell')"/>
      <bind nodeset="/delivery/pnc_danger_sign_check/pnc_danger_sign_note" readonly="true()" type="string"/>
      <bind nodeset="/delivery/pnc_danger_sign_check/fever" required="true()" type="select1"/>
      <bind nodeset="/delivery/pnc_danger_sign_check/severe_headache" required="true()" type="select1"/>
      <bind nodeset="/delivery/pnc_danger_sign_check/vaginal_bleeding" required="true()" type="select1"/>
      <bind nodeset="/delivery/pnc_danger_sign_check/vaginal_discharge" required="true()" type="select1"/>
      <bind nodeset="/delivery/pnc_danger_sign_check/convulsion" required="true()" type="select1"/>
      <bind calculate="if(selected(../fever, 'yes') or
selected(../severe_headache, 'yes') or
selected(../vaginal_bleeding, 'yes') or
selected(../vaginal_discharge, 'yes') or
selected(../convulsion, 'yes'), 'yes', 'no')" nodeset="/delivery/pnc_danger_sign_check/r_pnc_danger_sign_present" type="string"/>
      <bind nodeset="/delivery/death_info_woman" relevant="selected(../condition/woman_outcome, 'deceased')"/>
      <bind constraint=". &lt;= now() and difference-in-months( ., today() ) &lt; 1" jr:constraintMsg="jr:itext('/delivery/death_info_woman/woman_death_date:jr:constraintMsg')" nodeset="/delivery/death_info_woman/woman_death_date" required="true()" type="date"/>
      <bind nodeset="/delivery/death_info_woman/woman_death_place" required="true()" type="select1"/>
      <bind nodeset="/delivery/death_info_woman/woman_death_birth" required="true()" type="select1"/>
      <bind constraint="string-length(.) &lt;= 300" jr:constraintMsg="jr:itext('/delivery/death_info_woman/woman_death_add_notes:jr:constraintMsg')" nodeset="/delivery/death_info_woman/woman_death_add_notes" required="false()" type="string"/>
      <bind nodeset="/delivery/death_info_woman/death_profile_note" readonly="true()" relevant="../woman_death_date != '' and ../woman_death_place != ''" type="string"/>
      <bind nodeset="/delivery/death_info_woman/death_baby_note" readonly="true()" relevant="../woman_death_date != '' and ../woman_death_place != '' and ../woman_death_birth = 'yes'" type="string"/>
      <bind calculate="&quot;death_report&quot;" nodeset="/delivery/death_info_woman/death_report/form" type="string"/>
      <bind calculate="&quot;data_record&quot;" nodeset="/delivery/death_info_woman/death_report/type" type="string"/>
      <bind calculate="&quot;xml&quot;" nodeset="/delivery/death_info_woman/death_report/content_type" type="string"/>
      <bind calculate="../../../inputs/user/phone" nodeset="/delivery/death_info_woman/death_report/from" type="string"/>
      <bind calculate="../../../../inputs/contact/patient_id" nodeset="/delivery/death_info_woman/death_report/fields/patient_id" type="string"/>
      <bind calculate="../../../../inputs/contact/_id" nodeset="/delivery/death_info_woman/death_report/fields/patient_uuid" type="string"/>
      <bind calculate="../../../../../death_info_woman/woman_death_date" nodeset="/delivery/death_info_woman/death_report/fields/death_details/date_of_death" type="string"/>
      <bind calculate="../../../../../death_info_woman/woman_death_place" nodeset="/delivery/death_info_woman/death_report/fields/death_details/place_of_death" type="string"/>
      <bind calculate="&quot;&quot;" nodeset="/delivery/death_info_woman/death_report/fields/death_details/place_of_death_other" type="string"/>
      <bind calculate="../../../../../death_info_woman/woman_death_add_notes" nodeset="/delivery/death_info_woman/death_report/fields/death_details/death_information" type="string"/>
      <bind calculate="." nodeset="/delivery/death_info_woman/death_report/created_by_doc" type="string"/>
      <bind calculate=" /delivery/death_info_woman/death_report " nodeset="/delivery/death_info_woman/woman_death_report_doc" type="string"/>
      <bind nodeset="/delivery/delivery_outcome" relevant="not(selected(../condition/woman_outcome, 'deceased')) or selected(../death_info_woman/woman_death_birth, 'yes')"/>
      <bind nodeset="/delivery/delivery_outcome/babies_delivered" required="true()" type="select1"/>
      <bind constraint=". &gt; 3" jr:constraintMsg="jr:itext('/delivery/delivery_outcome/babies_delivered_other:jr:constraintMsg')" nodeset="/delivery/delivery_outcome/babies_delivered_other" relevant="selected(../babies_delivered, 'other')" required="true()" type="int"/>
      <bind nodeset="/delivery/delivery_outcome/babies_alive" required="true()" type="select1"/>
      <bind constraint=". &lt;= ../babies_delivered_other" jr:constraintMsg="jr:itext('/delivery/delivery_outcome/babies_alive_other:jr:constraintMsg')" nodeset="/delivery/delivery_outcome/babies_alive_other" relevant="selected(../babies_alive, 'other')" required="true()" type="int"/>
      <bind calculate="if(selected(../babies_delivered, '1'), 1, if(selected(../babies_delivered, '2'), 2, if(selected(../babies_delivered, '3'), 3, if(selected(../babies_delivered, 'other'), ../babies_delivered_other, 0))))" nodeset="/delivery/delivery_outcome/babies_delivered_num" type="string"/>
      <bind calculate="if(selected(../babies_alive, '1'), 1, if(selected(../babies_alive, '2'), 2, if(selected(../babies_alive, '3'), 3, if(selected(../babies_alive, 'other'), ../babies_alive_other, 0))))" nodeset="/delivery/delivery_outcome/babies_alive_num" type="string"/>
      <bind calculate="../babies_delivered_num - ../babies_alive_num" nodeset="/delivery/delivery_outcome/babies_deceased_num" type="string"/>
      <bind constraint=". &lt;= now() and difference-in-months( ., today() ) &lt; 1" jr:constraintMsg="jr:itext('/delivery/delivery_outcome/delivery_date:jr:constraintMsg')" nodeset="/delivery/delivery_outcome/delivery_date" required="true()" type="date"/>
      <bind nodeset="/delivery/delivery_outcome/delivery_place" required="true()" type="select1"/>
      <bind constraint="string-length(.) &lt;= 100" jr:constraintMsg="jr:itext('/delivery/delivery_outcome/delivery_place_other:jr:constraintMsg')" nodeset="/delivery/delivery_outcome/delivery_place_other" relevant="../delivery_place = 'other'" required="true()" type="string"/>
      <bind nodeset="/delivery/delivery_outcome/delivery_mode" relevant="../delivery_place = 'health_facility'" required="true()" type="select1"/>
      <bind nodeset="/delivery/delivery_outcome/delivery_conductor" relevant="../delivery_place = 'home' or ../delivery_place = 'other'" required="true()" type="select1"/>
      <bind constraint="string-length(.) &lt;= 100" jr:constraintMsg="jr:itext('/delivery/delivery_outcome/delivery_conductor_other:jr:constraintMsg')" nodeset="/delivery/delivery_outcome/delivery_conductor_other" relevant="../delivery_conductor = 'other'" required="true()" type="string"/>
      <bind nodeset="/delivery/baby_death" relevant="../delivery_outcome/babies_deceased_num &gt; 0"/>
      <bind calculate=" /delivery/delivery_outcome/babies_deceased_num " nodeset="/delivery/baby_death/baby_death_repeat_count" readonly="true()" type="string"/>
      <bind constraint=". &lt;= now() and difference-in-months( ., today() ) &lt; 1" jr:constraintMsg="jr:itext('/delivery/baby_death/baby_death_repeat/baby_death_date:jr:constraintMsg')" nodeset="/delivery/baby_death/baby_death_repeat/baby_death_date" required="true()" type="date"/>
      <bind nodeset="/delivery/baby_death/baby_death_repeat/baby_death_place" required="true()" type="select1"/>
      <bind nodeset="/delivery/baby_death/baby_death_repeat/stillbirth" required="true()" type="select1"/>
      <bind constraint="string-length(.) &lt;= 300" jr:constraintMsg="jr:itext('/delivery/baby_death/baby_death_repeat/baby_death_add_notes:jr:constraintMsg')" nodeset="/delivery/baby_death/baby_death_repeat/baby_death_add_notes" required="false()" type="string"/>
      <bind calculate="&quot;person&quot;" nodeset="/delivery/baby_death/baby_death_repeat/baby_death_profile/type" type="string"/>
      <bind calculate="&quot;Deceased baby&quot;" nodeset="/delivery/baby_death/baby_death_repeat/baby_death_profile/name" type="string"/>
      <bind calculate="&quot;undefined&quot;" nodeset="/delivery/baby_death/baby_death_repeat/baby_death_profile/sex" type="string"/>
      <bind calculate="../../../../delivery_outcome/delivery_date" nodeset="/delivery/baby_death/baby_death_repeat/baby_death_profile/date_of_birth" type="string"/>
      <bind calculate="../../baby_death_date" nodeset="/delivery/baby_death/baby_death_repeat/baby_death_profile/date_of_death" type="string"/>
      <bind calculate=" /delivery/household_id " nodeset="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent/_id" type="string"/>
      <bind calculate=" /delivery/area_id " nodeset="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent/parent/_id" type="string"/>
      <bind calculate=" /delivery/facility_id " nodeset="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent/parent/parent/_id" type="string"/>
      <bind calculate="." nodeset="/delivery/baby_death/baby_death_repeat/baby_death_profile/created_by_doc" type="string"/>
      <bind calculate=" /delivery/baby_death/baby_death_repeat/baby_death_profile " nodeset="/delivery/baby_death/baby_death_repeat/baby_death_profile_doc" type="string"/>
      <bind nodeset="/delivery/babys_condition" relevant="../delivery_outcome/babies_alive_num &gt; 0"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat_note" readonly="true()" relevant="../../delivery_outcome/babies_alive_num &gt; 1" type="string"/>
      <bind calculate=" /delivery/delivery_outcome/babies_alive_num " nodeset="/delivery/babys_condition/baby_repeat_count" readonly="true()" type="string"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_n" readonly="true()" type="string"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_condition" required="true()" type="select1"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_name" required="true()" type="string"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_sex" required="true()" type="select1"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know" required="true()" type="select1"/>
      <bind constraint=". &gt;= 1500 and . &lt;= 5000" jr:constraintMsg="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/birth_weight:jr:constraintMsg')" nodeset="/delivery/babys_condition/baby_repeat/baby_details/birth_weight" relevant="selected(../birth_weight_know, 'yes')" required="true()" type="decimal"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know" required="true()" type="select1"/>
      <bind constraint=". &gt;= 35.6 and . &lt;= 70" jr:constraintMsg="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/birth_length:jr:constraintMsg')" nodeset="/delivery/babys_condition/baby_repeat/baby_details/birth_length" relevant="selected(../birth_length_know, 'yes')" required="true()" type="decimal"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received" required="true()" type="select1"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/imm_counsel_note" readonly="true()" relevant="selected(../vaccines_received, 'none')" type="string"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/breastfeeding" required="true()" type="select1"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour" required="true()" type="select1"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_danger_sign_note" readonly="true()" type="string"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord" required="true()" type="select1"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/convulsion" required="true()" type="select1"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding" required="true()" type="select1"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/vomit" required="true()" type="select1"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/drowsy" required="true()" type="select1"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/stiff" required="true()" type="select1"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin" required="true()" type="select1"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/fever" required="true()" type="select1"/>
      <bind nodeset="/delivery/babys_condition/baby_repeat/baby_details/blue_skin" required="true()" type="select1"/>
      <bind calculate="if(selected(../infected_umbilical_cord, 'yes') or
selected(../convulsion, 'yes') or
selected(../difficulty_feeding, 'yes') or
selected(../vomit, 'yes') or
selected(../drowsy, 'yes') or
selected(../stiff, 'yes') or
selected(../yellow_skin, 'yes') or
selected(../fever, 'yes') or
selected(../blue_skin, 'yes'), 'yes', 'no')" nodeset="/delivery/babys_condition/baby_repeat/baby_details/r_baby_danger_sign_present" type="string"/>
      <bind calculate="../../baby_name" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/name" type="string"/>
      <bind calculate="../../baby_sex" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/sex" type="string"/>
      <bind calculate="../../../../../delivery_outcome/delivery_date" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/date_of_birth" type="string"/>
      <bind calculate="../../vaccines_received" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/vaccines_received" type="string"/>
      <bind calculate="../../r_baby_danger_sign_present" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/t_danger_signs_referral_follow_up" type="string"/>
      <bind calculate="date-time(decimal-date-time(today()) + 3)" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/t_danger_signs_referral_follow_up_date" type="string"/>
      <bind calculate="../../../birth_weight" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/measurements/weight" type="string"/>
      <bind calculate="../../../birth_length" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/measurements/length" type="string"/>
      <bind calculate="../../../infected_umbilical_cord" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/infected_umbilical_cord" type="string"/>
      <bind calculate="../../../convulsion" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/convulsion" type="string"/>
      <bind calculate="../../../difficulty_feeding" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/difficulty_feeding" type="string"/>
      <bind calculate="../../../vomit" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/vomit" type="string"/>
      <bind calculate="../../../drowsy" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/drowsy" type="string"/>
      <bind calculate="../../../stiff" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/stiff" type="string"/>
      <bind calculate="../../../yellow_skin" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/yellow_skin" type="string"/>
      <bind calculate="../../../fever" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/fever" type="string"/>
      <bind calculate="../../../blue_skin" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs/blue_skin" type="string"/>
      <bind calculate=" /delivery/household_id " nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent/_id" type="string"/>
      <bind calculate=" /delivery/area_id " nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent/parent/_id" type="string"/>
      <bind calculate=" /delivery/facility_id " nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent/parent/parent/_id" type="string"/>
      <bind calculate="&quot;person&quot;" nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/type" type="string"/>
      <bind calculate="." nodeset="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/created_by_doc" type="string"/>
      <bind calculate=" /delivery/babys_condition/baby_repeat/baby_details " nodeset="/delivery/babys_condition/baby_repeat/baby_details/child_doc" type="string"/>
      <bind calculate="join(', ',  /delivery/babys_condition/baby_repeat/baby_details/r_baby_danger_sign_present )" nodeset="/delivery/babys_condition/r_baby_danger_sign_present_joined" type="string"/>
      <bind calculate="if(contains(../r_baby_danger_sign_present_joined, 'yes'), 'yes', 'no')" nodeset="/delivery/babys_condition/r_baby_danger_sign_present_any" type="string"/>
      <bind nodeset="/delivery/safe_postnatal_practices" relevant="../delivery_outcome/babies_alive_num &gt; 0"/>
      <bind nodeset="/delivery/safe_postnatal_practices/safe_postnatal_practice_1" readonly="true()" type="string"/>
      <bind nodeset="/delivery/safe_postnatal_practices/safe_postnatal_practice_2" readonly="true()" type="string"/>
      <bind nodeset="/delivery/safe_postnatal_practices/safe_postnatal_practice_3" readonly="true()" type="string"/>
      <bind nodeset="/delivery/safe_postnatal_practices/safe_postnatal_practice_4" readonly="true()" type="string"/>
      <bind nodeset="/delivery/safe_postnatal_practices/safe_postnatal_practice_5" readonly="true()" type="string"/>
      <bind nodeset="/delivery/pnc_visits" relevant="selected(../condition/woman_outcome, 'alive_well') or
selected(../condition/woman_outcome, 'alive_unwell') or
../delivery_outcome/babies_alive_num &gt; 0"/>
      <bind nodeset="/delivery/pnc_visits/who_note" readonly="true()" type="string"/>
      <bind constraint="not(selected(.,'none')) or count-selected(.) &lt; 2" nodeset="/delivery/pnc_visits/pnc_visits_attended" required="true()" type="select"/>
      <bind constraint=". &gt;=0 and . &lt;= 6" jr:constraintMsg="jr:itext('/delivery/pnc_visits/pnc_visits_additional:jr:constraintMsg')" nodeset="/delivery/pnc_visits/pnc_visits_additional" required="false()" type="int"/>
      <bind calculate="floor(decimal-date-time(today()) - decimal-date-time( /delivery/delivery_outcome/delivery_date ))" nodeset="/delivery/pnc_visits/days" type="string"/>
      <bind nodeset="/delivery/summary/r_submit_note" readonly="true()" type="string"/>
      <bind nodeset="/delivery/summary/r_summary_details" readonly="true()" type="string"/>
      <bind nodeset="/delivery/summary/r_patient_details" readonly="true()" type="string"/>
      <bind nodeset="/delivery/summary/r_pregnancy_outcome" readonly="true()" type="string"/>
      <bind nodeset="/delivery/summary/r_woman_condition" readonly="true()" type="string"/>
      <bind nodeset="/delivery/summary/r_condition_well" readonly="true()" relevant="selected(../../condition/woman_outcome, 'alive_well')" type="string"/>
      <bind nodeset="/delivery/summary/r_condition_unwell" readonly="true()" relevant="selected(../../condition/woman_outcome, 'alive_unwell')" type="string"/>
      <bind nodeset="/delivery/summary/r_condition_deceased" readonly="true()" relevant="selected(../../condition/woman_outcome, 'deceased')" type="string"/>
      <bind nodeset="/delivery/summary/r_woman_death" readonly="true()" relevant="selected(../../condition/woman_outcome, 'deceased')" type="string"/>
      <bind nodeset="/delivery/summary/r_death_date" readonly="true()" relevant="selected(../../condition/woman_outcome, 'deceased')" type="string"/>
      <bind nodeset="/delivery/summary/r_death_place" readonly="true()" relevant="selected(../../condition/woman_outcome, 'deceased')" type="string"/>
      <bind nodeset="/delivery/summary/r_delivery_details" readonly="true()" relevant="not(selected(../../condition/woman_outcome, 'deceased')) or
selected(../../death_info_woman/woman_death_birth, 'yes')" type="string"/>
      <bind nodeset="/delivery/summary/r_delivery_date" readonly="true()" relevant=" /delivery/delivery_outcome/delivery_date  != ''" type="string"/>
      <bind nodeset="/delivery/summary/r_delivery_place" readonly="true()" relevant=" /delivery/delivery_outcome/delivery_place  != ''" type="string"/>
      <bind nodeset="/delivery/summary/r_babies_delivered_num" readonly="true()" relevant=" /delivery/delivery_outcome/babies_delivered_num  != ''" type="string"/>
      <bind nodeset="/delivery/summary/r_babies_deceased_num" readonly="true()" relevant=" /delivery/delivery_outcome/babies_deceased_num  != ''" type="string"/>
      <bind nodeset="/delivery/summary/r_danger_signs" readonly="true()" relevant="../../pnc_danger_sign_check/r_pnc_danger_sign_present = 'yes'" type="string"/>
      <bind nodeset="/delivery/summary/r_mom_fever" readonly="true()" relevant="selected(../../pnc_danger_sign_check/fever, 'yes')" type="string"/>
      <bind nodeset="/delivery/summary/r_mom_severe_headache" readonly="true()" relevant="selected(../../pnc_danger_sign_check/severe_headache, 'yes')" type="string"/>
      <bind nodeset="/delivery/summary/r_mom_vaginal_bleeding" readonly="true()" relevant="selected(../../pnc_danger_sign_check/vaginal_bleeding, 'yes')" type="string"/>
      <bind nodeset="/delivery/summary/r_mom_vaginal_discharge" readonly="true()" relevant="selected(../../pnc_danger_sign_check/vaginal_discharge, 'yes')" type="string"/>
      <bind nodeset="/delivery/summary/r_mom_convulsion" readonly="true()" relevant="selected(../../pnc_danger_sign_check/convulsion, 'yes')" type="string"/>
      <bind nodeset="/delivery/summary/r_pnc_visits" readonly="true()" relevant="selected(../../condition/woman_outcome, 'alive_well') or
selected(../../condition/woman_outcome, 'alive_unwell') or
../../delivery_outcome/babies_alive_num &gt; 0" type="string"/>
      <bind nodeset="/delivery/summary/r_pnc_visits_completed" readonly="true()" relevant="selected(../../condition/woman_outcome, 'alive_well') or
selected(../../condition/woman_outcome, 'alive_unwell') or
../../delivery_outcome/babies_alive_num &gt; 0" type="string"/>
      <bind nodeset="/delivery/summary/r_pnc_visit_24hrs" readonly="true()" relevant="selected(../../pnc_visits/pnc_visits_attended, 'within_24_hrs')" type="string"/>
      <bind nodeset="/delivery/summary/r_pnc_visit_3days" readonly="true()" relevant="selected(../../pnc_visits/pnc_visits_attended, '3_days')" type="string"/>
      <bind nodeset="/delivery/summary/r_pnc_visit_7days" readonly="true()" relevant="selected(../../pnc_visits/pnc_visits_attended, '7_days')" type="string"/>
      <bind nodeset="/delivery/summary/r_pnc_visit_6weeks" readonly="true()" relevant="selected(../../pnc_visits/pnc_visits_attended, '6_weeks')" type="string"/>
      <bind nodeset="/delivery/summary/r_pnc_visit_none" readonly="true()" relevant="selected(../../pnc_visits/pnc_visits_attended, 'none')" type="string"/>
      <bind nodeset="/delivery/summary/r_pnc_visits_add" readonly="true()" relevant="../../pnc_visits/pnc_visits_additional != ''" type="string"/>
      <bind nodeset="/delivery/summary/r_referrals" readonly="true()" relevant="not(selected(../../condition/woman_outcome, 'deceased')) or
../../delivery_outcome/babies_alive_num &gt; 0" type="string"/>
      <bind nodeset="/delivery/summary/r_refer_clinic_immediately" readonly="true()" relevant="../../pnc_danger_sign_check/r_pnc_danger_sign_present = 'yes' or
selected(../../condition/woman_outcome, 'alive_unwell')" type="string"/>
      <bind nodeset="/delivery/summary/r_refer_danger_sign" readonly="true()" relevant="../../pnc_danger_sign_check/r_pnc_danger_sign_present = 'yes'" type="string"/>
      <bind nodeset="/delivery/summary/r_mom_alive_unwell" readonly="true()" relevant="selected(../../condition/woman_outcome, 'alive_unwell')" type="string"/>
      <bind nodeset="/delivery/summary/r_who_schedule_note" readonly="true()" relevant="not(selected(../../condition/woman_outcome, 'deceased')) or
../../delivery_outcome/babies_alive_num &gt; 0" type="string"/>
      <bind nodeset="/delivery/summary/r_pnc_schedule_note" readonly="true()" relevant="not(selected(../../condition/woman_outcome, 'deceased')) or
../../delivery_outcome/babies_alive_num &gt; 0" type="string"/>
      <bind nodeset="/delivery/summary/r_follow_up_tasks" readonly="true()" relevant="../../pnc_danger_sign_check/r_pnc_danger_sign_present = 'yes'" type="string"/>
      <bind nodeset="/delivery/summary/r_following_tasks" readonly="true()" relevant="../../pnc_danger_sign_check/r_pnc_danger_sign_present = 'yes'" type="string"/>
      <bind nodeset="/delivery/summary/r_fup_danger_sign" readonly="true()" relevant="../../pnc_danger_sign_check/r_pnc_danger_sign_present = 'yes'" type="string"/>
      <bind nodeset="/delivery/summary/r_fup_danger_sign_baby" readonly="true()" relevant="../../babys_condition/r_baby_danger_sign_present_any = 'yes'" type="string"/>
      <bind calculate="&quot;woman&quot;" nodeset="/delivery/summary/custom_translations/custom_woman_label_translator" type="select1"/>
      <bind calculate="jr:choice-name( /delivery/summary/custom_translations/custom_woman_label_translator ,' /delivery/summary/custom_translations/custom_woman_label_translator ')" nodeset="/delivery/summary/custom_translations/custom_woman_label" type="string"/>
      <bind calculate="&quot;woman-start&quot;" nodeset="/delivery/summary/custom_translations/custom_woman_start_label_translator" type="select1"/>
      <bind calculate="jr:choice-name( /delivery/summary/custom_translations/custom_woman_start_label_translator ,' /delivery/summary/custom_translations/custom_woman_start_label_translator ')" nodeset="/delivery/summary/custom_translations/custom_woman_start_label" type="string"/>
      <bind calculate=" /delivery/delivery_outcome/delivery_place " nodeset="/delivery/summary/custom_translations/delivery_place_label_translator" type="select1"/>
      <bind calculate="jr:choice-name( /delivery/summary/custom_translations/delivery_place_label_translator ,' /delivery/summary/custom_translations/delivery_place_label_translator ')" nodeset="/delivery/summary/custom_translations/delivery_place_label" type="string"/>
      <bind calculate=" /delivery/death_info_woman/woman_death_place " nodeset="/delivery/summary/custom_translations/woman_death_place_label_translator" type="select1"/>
      <bind calculate="jr:choice-name( /delivery/summary/custom_translations/woman_death_place_label_translator ,' /delivery/summary/custom_translations/woman_death_place_label_translator ')" nodeset="/delivery/summary/custom_translations/woman_death_place_label" type="string"/>
      <bind calculate=" /delivery/condition/woman_outcome " nodeset="/delivery/data/__woman_condition" type="string"/>
      <bind calculate="../../pnc_danger_sign_check/fever" nodeset="/delivery/data/__fever" type="string"/>
      <bind calculate="../../pnc_danger_sign_check/severe_headache" nodeset="/delivery/data/__severe_headache" type="string"/>
      <bind calculate="../../pnc_danger_sign_check/vaginal_bleeding" nodeset="/delivery/data/__vaginal_bleeding" type="string"/>
      <bind calculate="../../pnc_danger_sign_check/vaginal_discharge" nodeset="/delivery/data/__vaginal_discharge" type="string"/>
      <bind calculate="../../pnc_danger_sign_check/convulsion" nodeset="/delivery/data/__convulsions" type="string"/>
      <bind calculate=" /delivery/pnc_danger_sign_check/r_pnc_danger_sign_present " nodeset="/delivery/data/__has_danger_sign" type="string"/>
      <bind calculate=" /delivery/death_info_woman/woman_death_date " nodeset="/delivery/data/__woman_death_date" type="string"/>
      <bind calculate=" /delivery/death_info_woman/woman_death_place " nodeset="/delivery/data/__woman_death_place" type="string"/>
      <bind calculate=" /delivery/death_info_woman/woman_death_birth " nodeset="/delivery/data/__delivered_before_death" type="string"/>
      <bind calculate=" /delivery/death_info_woman/woman_death_add_notes " nodeset="/delivery/data/__woman_death_notes" type="string"/>
      <bind calculate=" /delivery/delivery_outcome/babies_delivered_num " nodeset="/delivery/data/__babies_delivered" type="string"/>
      <bind calculate=" /delivery/delivery_outcome/babies_deceased_num " nodeset="/delivery/data/__babies_deceased" type="string"/>
      <bind calculate=" /delivery/delivery_outcome/babies_alive_num " nodeset="/delivery/data/__babies_alive" type="string"/>
      <bind calculate=" /delivery/delivery_outcome/delivery_date " nodeset="/delivery/data/__delivery_date" type="string"/>
      <bind calculate=" /delivery/delivery_outcome/delivery_place " nodeset="/delivery/data/__delivery_place" type="string"/>
      <bind calculate=" /delivery/delivery_outcome/delivery_place_other " nodeset="/delivery/data/__delivery_place_other" type="string"/>
      <bind calculate=" /delivery/delivery_outcome/delivery_mode " nodeset="/delivery/data/__delivery_mode" type="string"/>
      <bind calculate=" /delivery/delivery_outcome/delivery_conductor " nodeset="/delivery/data/__delivery_conductor" type="string"/>
      <bind calculate=" /delivery/delivery_outcome/delivery_conductor_other " nodeset="/delivery/data/__delivery_conductor_other" type="string"/>
      <bind calculate="if(selected( /delivery/pnc_visits/pnc_visits_attended , 'within_24_hrs'), &quot;yes&quot;, &quot;no&quot;)" nodeset="/delivery/data/__pnc_visit_within_24_hrs" type="string"/>
      <bind calculate="if(selected( /delivery/pnc_visits/pnc_visits_attended , '3_days'), &quot;yes&quot;, &quot;no&quot;)" nodeset="/delivery/data/__pnc_visit_3_days" type="string"/>
      <bind calculate="if(selected( /delivery/pnc_visits/pnc_visits_attended , '7_days'), &quot;yes&quot;, &quot;no&quot;)" nodeset="/delivery/data/__pnc_visit_7_days" type="string"/>
      <bind calculate="if(selected( /delivery/pnc_visits/pnc_visits_attended , '6_weeks'), &quot;yes&quot;, &quot;no&quot;)" nodeset="/delivery/data/__pnc_visit_6_weeks" type="string"/>
      <bind calculate="if(selected( /delivery/pnc_visits/pnc_visits_attended , 'none'), 0, if(selected( /delivery/pnc_visits/pnc_visits_attended , 'within_24_hrs'), 1, 0) +
if(selected( /delivery/pnc_visits/pnc_visits_attended , '3_days'), 1, 0) +
if(selected( /delivery/pnc_visits/pnc_visits_attended , '7_days'), 1, 0) +
if(selected( /delivery/pnc_visits/pnc_visits_attended , '6_weeks'), 1, 0))" nodeset="/delivery/data/__pnc_visits_num_selected" type="string"/>
      <bind calculate=" /delivery/pnc_visits/pnc_visits_additional " nodeset="/delivery/data/__pnc_visits_additional" type="string"/>
      <bind calculate="../../../inputs/contact/_id" nodeset="/delivery/data/meta/__patient_uuid" type="string"/>
      <bind calculate="../../../inputs/contact/patient_id" nodeset="/delivery/data/meta/__patient_id" type="string"/>
      <bind calculate="../../../inputs/contact/parent/_id" nodeset="/delivery/data/meta/__household_uuid" type="string"/>
      <bind calculate="../../../inputs/source" nodeset="/delivery/data/meta/__source" type="string"/>
      <bind calculate="../../../inputs/source_id" nodeset="/delivery/data/meta/__source_id" type="string"/>
      <bind calculate="instance('contact-summary')/context/pregnancy_uuid" nodeset="/delivery/data/meta/__pregnancy_uuid" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/delivery/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/delivery/inputs">
      <group ref="/delivery/inputs/user">
        <label ref="jr:itext('/delivery/inputs/user:label')"/>
        <input appearance="db-object" ref="/delivery/inputs/user/contact_id">
          <label ref="jr:itext('/delivery/inputs/user/contact_id:label')"/>
        </input>
      </group>
      <group ref="/delivery/inputs/contact">
        <input appearance="db-object" ref="/delivery/inputs/contact/_id">
          <label ref="jr:itext('/delivery/inputs/contact/_id:label')"/>
        </input>
        <group ref="/delivery/inputs/contact/parent">
          <input appearance="hidden" ref="/delivery/inputs/contact/parent/_id">
            <label ref="jr:itext('/delivery/inputs/contact/parent/_id:label')"/>
          </input>
          <group ref="/delivery/inputs/contact/parent/parent">
            <input appearance="hidden" ref="/delivery/inputs/contact/parent/parent/_id">
              <label ref="jr:itext('/delivery/inputs/contact/parent/parent/_id:label')"/>
            </input>
            <group ref="/delivery/inputs/contact/parent/parent/parent">
              <input appearance="hidden" ref="/delivery/inputs/contact/parent/parent/parent/_id">
                <label ref="jr:itext('/delivery/inputs/contact/parent/parent/parent/_id:label')"/>
              </input>
            </group>
            <group ref="/delivery/inputs/contact/parent/parent/contact"/>
          </group>
        </group>
      </group>
    </group>
    <group ref="/delivery/condition">
      <label ref="jr:itext('/delivery/condition:label')"/>
      <select1 ref="/delivery/condition/woman_outcome">
        <label ref="jr:itext('/delivery/condition/woman_outcome:label')"/>
        <item>
          <label ref="jr:itext('/delivery/condition/woman_outcome/alive_well:label')"/>
          <value>alive_well</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/condition/woman_outcome/alive_unwell:label')"/>
          <value>alive_unwell</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/condition/woman_outcome/deceased:label')"/>
          <value>deceased</value>
        </item>
      </select1>
    </group>
    <group appearance="field-list" ref="/delivery/pnc_danger_sign_check">
      <label ref="jr:itext('/delivery/pnc_danger_sign_check:label')"/>
      <input ref="/delivery/pnc_danger_sign_check/pnc_danger_sign_note">
        <label ref="jr:itext('/delivery/pnc_danger_sign_check/pnc_danger_sign_note:label')"/>
      </input>
      <select1 ref="/delivery/pnc_danger_sign_check/fever">
        <label ref="jr:itext('/delivery/pnc_danger_sign_check/fever:label')"/>
        <item>
          <label ref="jr:itext('/delivery/pnc_danger_sign_check/fever/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/pnc_danger_sign_check/fever/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/delivery/pnc_danger_sign_check/severe_headache">
        <label ref="jr:itext('/delivery/pnc_danger_sign_check/severe_headache:label')"/>
        <item>
          <label ref="jr:itext('/delivery/pnc_danger_sign_check/severe_headache/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/pnc_danger_sign_check/severe_headache/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/delivery/pnc_danger_sign_check/vaginal_bleeding">
        <label ref="jr:itext('/delivery/pnc_danger_sign_check/vaginal_bleeding:label')"/>
        <item>
          <label ref="jr:itext('/delivery/pnc_danger_sign_check/vaginal_bleeding/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/pnc_danger_sign_check/vaginal_bleeding/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/delivery/pnc_danger_sign_check/vaginal_discharge">
        <label ref="jr:itext('/delivery/pnc_danger_sign_check/vaginal_discharge:label')"/>
        <item>
          <label ref="jr:itext('/delivery/pnc_danger_sign_check/vaginal_discharge/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/pnc_danger_sign_check/vaginal_discharge/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/delivery/pnc_danger_sign_check/convulsion">
        <label ref="jr:itext('/delivery/pnc_danger_sign_check/convulsion:label')"/>
        <item>
          <label ref="jr:itext('/delivery/pnc_danger_sign_check/convulsion/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/pnc_danger_sign_check/convulsion/no:label')"/>
          <value>no</value>
        </item>
      </select1>
    </group>
    <group appearance="field-list" ref="/delivery/death_info_woman">
      <label ref="jr:itext('/delivery/death_info_woman:label')"/>
      <input ref="/delivery/death_info_woman/woman_death_date">
        <label ref="jr:itext('/delivery/death_info_woman/woman_death_date:label')"/>
      </input>
      <select1 ref="/delivery/death_info_woman/woman_death_place">
        <label ref="jr:itext('/delivery/death_info_woman/woman_death_place:label')"/>
        <item>
          <label ref="jr:itext('/delivery/death_info_woman/woman_death_place/health_facility:label')"/>
          <value>health_facility</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/death_info_woman/woman_death_place/home:label')"/>
          <value>home</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/death_info_woman/woman_death_place/other:label')"/>
          <value>other</value>
        </item>
      </select1>
      <select1 ref="/delivery/death_info_woman/woman_death_birth">
        <label ref="jr:itext('/delivery/death_info_woman/woman_death_birth:label')"/>
        <item>
          <label ref="jr:itext('/delivery/death_info_woman/woman_death_birth/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/death_info_woman/woman_death_birth/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <input ref="/delivery/death_info_woman/woman_death_add_notes">
        <label ref="jr:itext('/delivery/death_info_woman/woman_death_add_notes:label')"/>
      </input>
      <input ref="/delivery/death_info_woman/death_profile_note">
        <label ref="jr:itext('/delivery/death_info_woman/death_profile_note:label')"/>
      </input>
      <input ref="/delivery/death_info_woman/death_baby_note">
        <label ref="jr:itext('/delivery/death_info_woman/death_baby_note:label')"/>
      </input>
      <group ref="/delivery/death_info_woman/death_report">
        <group ref="/delivery/death_info_woman/death_report/fields">
          <group ref="/delivery/death_info_woman/death_report/fields/death_details"/>
        </group>
      </group>
    </group>
    <group appearance="field-list" ref="/delivery/delivery_outcome">
      <label ref="jr:itext('/delivery/delivery_outcome:label')"/>
      <select1 ref="/delivery/delivery_outcome/babies_delivered">
        <label ref="jr:itext('/delivery/delivery_outcome/babies_delivered:label')"/>
        <item>
          <label ref="jr:itext('/delivery/delivery_outcome/babies_delivered/1:label')"/>
          <value>1</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/delivery_outcome/babies_delivered/2:label')"/>
          <value>2</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/delivery_outcome/babies_delivered/3:label')"/>
          <value>3</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/delivery_outcome/babies_delivered/other:label')"/>
          <value>other</value>
        </item>
      </select1>
      <input ref="/delivery/delivery_outcome/babies_delivered_other"/>
      <select1 ref="/delivery/delivery_outcome/babies_alive">
        <label ref="jr:itext('/delivery/delivery_outcome/babies_alive:label')"/>
        <itemset nodeset="instance('babies_alive')/root/item[count &lt;=  /delivery/delivery_outcome/babies_delivered_num ]">
          <value ref="name"/>
          <label ref="jr:itext(itextId)"/>
        </itemset>
      </select1>
      <input ref="/delivery/delivery_outcome/babies_alive_other"/>
      <input ref="/delivery/delivery_outcome/delivery_date">
        <label ref="jr:itext('/delivery/delivery_outcome/delivery_date:label')"/>
      </input>
      <select1 ref="/delivery/delivery_outcome/delivery_place">
        <label ref="jr:itext('/delivery/delivery_outcome/delivery_place:label')"/>
        <item>
          <label ref="jr:itext('/delivery/delivery_outcome/delivery_place/health_facility:label')"/>
          <value>health_facility</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/delivery_outcome/delivery_place/home:label')"/>
          <value>home</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/delivery_outcome/delivery_place/other:label')"/>
          <value>other</value>
        </item>
      </select1>
      <input ref="/delivery/delivery_outcome/delivery_place_other">
        <label ref="jr:itext('/delivery/delivery_outcome/delivery_place_other:label')"/>
      </input>
      <select1 ref="/delivery/delivery_outcome/delivery_mode">
        <label ref="jr:itext('/delivery/delivery_outcome/delivery_mode:label')"/>
        <item>
          <label ref="jr:itext('/delivery/delivery_outcome/delivery_mode/vaginal:label')"/>
          <value>vaginal</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/delivery_outcome/delivery_mode/cesarean:label')"/>
          <value>cesarean</value>
        </item>
      </select1>
      <select1 ref="/delivery/delivery_outcome/delivery_conductor">
        <label ref="jr:itext('/delivery/delivery_outcome/delivery_conductor:label')"/>
        <item>
          <label ref="jr:itext('/delivery/delivery_outcome/delivery_conductor/skilled:label')"/>
          <value>skilled</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/delivery_outcome/delivery_conductor/traditional:label')"/>
          <value>traditional</value>
        </item>
        <item>
          <label ref="jr:itext('/delivery/delivery_outcome/delivery_conductor/other:label')"/>
          <value>other</value>
        </item>
      </select1>
      <input ref="/delivery/delivery_outcome/delivery_conductor_other">
        <label ref="jr:itext('/delivery/delivery_outcome/delivery_conductor_other:label')"/>
      </input>
    </group>
    <group appearance="field-list" ref="/delivery/baby_death">
      <label ref="jr:itext('/delivery/baby_death:label')"/>
      <group ref="/delivery/baby_death/baby_death_repeat">
        <label ref="jr:itext('/delivery/baby_death/baby_death_repeat:label')"/>
        <repeat jr:count=" /delivery/baby_death/baby_death_repeat_count " nodeset="/delivery/baby_death/baby_death_repeat">
          <input ref="/delivery/baby_death/baby_death_repeat/baby_death_date">
            <label ref="jr:itext('/delivery/baby_death/baby_death_repeat/baby_death_date:label')"/>
          </input>
          <select1 ref="/delivery/baby_death/baby_death_repeat/baby_death_place">
            <label ref="jr:itext('/delivery/baby_death/baby_death_repeat/baby_death_place:label')"/>
            <item>
              <label ref="jr:itext('/delivery/baby_death/baby_death_repeat/baby_death_place/health_facility:label')"/>
              <value>health_facility</value>
            </item>
            <item>
              <label ref="jr:itext('/delivery/baby_death/baby_death_repeat/baby_death_place/home:label')"/>
              <value>home</value>
            </item>
            <item>
              <label ref="jr:itext('/delivery/baby_death/baby_death_repeat/baby_death_place/other:label')"/>
              <value>other</value>
            </item>
          </select1>
          <select1 ref="/delivery/baby_death/baby_death_repeat/stillbirth">
            <label ref="jr:itext('/delivery/baby_death/baby_death_repeat/stillbirth:label')"/>
            <item>
              <label ref="jr:itext('/delivery/baby_death/baby_death_repeat/stillbirth/yes:label')"/>
              <value>yes</value>
            </item>
            <item>
              <label ref="jr:itext('/delivery/baby_death/baby_death_repeat/stillbirth/no:label')"/>
              <value>no</value>
            </item>
          </select1>
          <input ref="/delivery/baby_death/baby_death_repeat/baby_death_add_notes">
            <label ref="jr:itext('/delivery/baby_death/baby_death_repeat/baby_death_add_notes:label')"/>
          </input>
          <group ref="/delivery/baby_death/baby_death_repeat/baby_death_profile">
            <group ref="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent">
              <group ref="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent/parent">
                <group ref="/delivery/baby_death/baby_death_repeat/baby_death_profile/parent/parent/parent"/>
              </group>
            </group>
          </group>
        </repeat>
      </group>
    </group>
    <group appearance="field-list" ref="/delivery/babys_condition">
      <label ref="jr:itext('/delivery/babys_condition:label')"/>
      <input ref="/delivery/babys_condition/baby_repeat_note">
        <label ref="jr:itext('/delivery/babys_condition/baby_repeat_note:label')"/>
      </input>
      <group ref="/delivery/babys_condition/baby_repeat">
        <label ref="jr:itext('/delivery/babys_condition/baby_repeat:label')"/>
        <repeat jr:count=" /delivery/babys_condition/baby_repeat_count " nodeset="/delivery/babys_condition/baby_repeat">
          <group ref="/delivery/babys_condition/baby_repeat/baby_details">
            <input ref="/delivery/babys_condition/baby_repeat/baby_details/baby_n">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/baby_n:label')"/>
              <hint ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/baby_n:hint')"/>
            </input>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/baby_condition">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/baby_condition:label')"/>
              <hint ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/baby_condition:hint')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/baby_condition/alive_well:label')"/>
                <value>alive_well</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/baby_condition/alive_unwell:label')"/>
                <value>alive_unwell</value>
              </item>
            </select1>
            <input ref="/delivery/babys_condition/baby_repeat/baby_details/baby_name">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/baby_name:label')"/>
              <hint ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/baby_name:hint')"/>
            </input>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/baby_sex">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/baby_sex:label')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/baby_sex/male:label')"/>
                <value>male</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/baby_sex/female:label')"/>
                <value>female</value>
              </item>
            </select1>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know:label')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know/no:label')"/>
                <value>no</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know/yes:label')"/>
                <value>yes</value>
              </item>
            </select1>
            <input ref="/delivery/babys_condition/baby_repeat/baby_details/birth_weight">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/birth_weight:label')"/>
            </input>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/birth_length_know:label')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/birth_length_know/no:label')"/>
                <value>no</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/birth_length_know/yes:label')"/>
                <value>yes</value>
              </item>
            </select1>
            <input ref="/delivery/babys_condition/baby_repeat/baby_details/birth_length">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/birth_length:label')"/>
            </input>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/vaccines_received:label')"/>
              <hint ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/vaccines_received:hint')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/vaccines_received/bcg_only:label')"/>
                <value>bcg_only</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/vaccines_received/birth_polio_only:label')"/>
                <value>birth_polio_only</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/vaccines_received/bcg_and_birth_polio:label')"/>
                <value>bcg_and_birth_polio</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/vaccines_received/none:label')"/>
                <value>none</value>
              </item>
            </select1>
            <input ref="/delivery/babys_condition/baby_repeat/baby_details/imm_counsel_note">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/imm_counsel_note:label')"/>
            </input>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/breastfeeding">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/breastfeeding:label')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/breastfeeding/yes:label')"/>
                <value>yes</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/breastfeeding/no:label')"/>
                <value>no</value>
              </item>
            </select1>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour:label')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour/yes:label')"/>
                <value>yes</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour/no:label')"/>
                <value>no</value>
              </item>
            </select1>
            <input ref="/delivery/babys_condition/baby_repeat/baby_details/baby_danger_sign_note">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/baby_danger_sign_note:label')"/>
            </input>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord:label')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord/yes:label')"/>
                <value>yes</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord/no:label')"/>
                <value>no</value>
              </item>
            </select1>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/convulsion">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/convulsion:label')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/convulsion/yes:label')"/>
                <value>yes</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/convulsion/no:label')"/>
                <value>no</value>
              </item>
            </select1>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding:label')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding/yes:label')"/>
                <value>yes</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding/no:label')"/>
                <value>no</value>
              </item>
            </select1>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/vomit">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/vomit:label')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/vomit/yes:label')"/>
                <value>yes</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/vomit/no:label')"/>
                <value>no</value>
              </item>
            </select1>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/drowsy">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/drowsy:label')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/drowsy/yes:label')"/>
                <value>yes</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/drowsy/no:label')"/>
                <value>no</value>
              </item>
            </select1>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/stiff">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/stiff:label')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/stiff/yes:label')"/>
                <value>yes</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/stiff/no:label')"/>
                <value>no</value>
              </item>
            </select1>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/yellow_skin:label')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/yellow_skin/yes:label')"/>
                <value>yes</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/yellow_skin/no:label')"/>
                <value>no</value>
              </item>
            </select1>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/fever">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/fever:label')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/fever/yes:label')"/>
                <value>yes</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/fever/no:label')"/>
                <value>no</value>
              </item>
            </select1>
            <select1 ref="/delivery/babys_condition/baby_repeat/baby_details/blue_skin">
              <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/blue_skin:label')"/>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/blue_skin/yes:label')"/>
                <value>yes</value>
              </item>
              <item>
                <label ref="jr:itext('/delivery/babys_condition/baby_repeat/baby_details/blue_skin/no:label')"/>
                <value>no</value>
              </item>
            </select1>
            <group ref="/delivery/babys_condition/baby_repeat/baby_details/baby_profile">
              <group ref="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/measurements"/>
              <group ref="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/danger_signs"/>
              <group appearance="hidden" ref="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent">
                <group appearance="hidden" ref="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent/parent">
                  <group appearance="hidden" ref="/delivery/babys_condition/baby_repeat/baby_details/baby_profile/parent/parent/parent"/>
                </group>
              </group>
            </group>
          </group>
        </repeat>
      </group>
    </group>
    <group appearance="field-list summary" ref="/delivery/safe_postnatal_practices">
      <label ref="jr:itext('/delivery/safe_postnatal_practices:label')"/>
      <input ref="/delivery/safe_postnatal_practices/safe_postnatal_practice_1">
        <label ref="jr:itext('/delivery/safe_postnatal_practices/safe_postnatal_practice_1:label')"/>
      </input>
      <input ref="/delivery/safe_postnatal_practices/safe_postnatal_practice_2">
        <label ref="jr:itext('/delivery/safe_postnatal_practices/safe_postnatal_practice_2:label')"/>
      </input>
      <input ref="/delivery/safe_postnatal_practices/safe_postnatal_practice_3">
        <label ref="jr:itext('/delivery/safe_postnatal_practices/safe_postnatal_practice_3:label')"/>
      </input>
      <input ref="/delivery/safe_postnatal_practices/safe_postnatal_practice_4">
        <label ref="jr:itext('/delivery/safe_postnatal_practices/safe_postnatal_practice_4:label')"/>
      </input>
      <input ref="/delivery/safe_postnatal_practices/safe_postnatal_practice_5">
        <label ref="jr:itext('/delivery/safe_postnatal_practices/safe_postnatal_practice_5:label')"/>
      </input>
    </group>
    <group appearance="field-list" ref="/delivery/pnc_visits">
      <label ref="jr:itext('/delivery/pnc_visits:label')"/>
      <input ref="/delivery/pnc_visits/who_note">
        <label ref="jr:itext('/delivery/pnc_visits/who_note:label')"/>
      </input>
      <select ref="/delivery/pnc_visits/pnc_visits_attended">
        <label ref="jr:itext('/delivery/pnc_visits/pnc_visits_attended:label')"/>
        <itemset nodeset="instance('pnc_visits')/root/item[count &lt;=  /delivery/pnc_visits/days ]">
          <value ref="name"/>
          <label ref="jr:itext(itextId)"/>
        </itemset>
      </select>
      <input ref="/delivery/pnc_visits/pnc_visits_additional">
        <label ref="jr:itext('/delivery/pnc_visits/pnc_visits_additional:label')"/>
      </input>
    </group>
    <group appearance="field-list summary" ref="/delivery/summary">
      <input ref="/delivery/summary/r_submit_note">
        <label ref="jr:itext('/delivery/summary/r_submit_note:label')"/>
      </input>
      <input appearance="h1 yellow" ref="/delivery/summary/r_summary_details">
        <label ref="jr:itext('/delivery/summary/r_summary_details:label')"/>
      </input>
      <input ref="/delivery/summary/r_patient_details">
        <label ref="jr:itext('/delivery/summary/r_patient_details:label')"/>
      </input>
      <input appearance="h1 yellow" ref="/delivery/summary/r_pregnancy_outcome">
        <label ref="jr:itext('/delivery/summary/r_pregnancy_outcome:label')"/>
      </input>
      <input appearance="h3 blue center underline" ref="/delivery/summary/r_woman_condition">
        <label ref="jr:itext('/delivery/summary/r_woman_condition:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_condition_well">
        <label ref="jr:itext('/delivery/summary/r_condition_well:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_condition_unwell">
        <label ref="jr:itext('/delivery/summary/r_condition_unwell:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_condition_deceased">
        <label ref="jr:itext('/delivery/summary/r_condition_deceased:label')"/>
      </input>
      <input appearance="h3 blue center underline" ref="/delivery/summary/r_woman_death">
        <label ref="jr:itext('/delivery/summary/r_woman_death:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_death_date">
        <label ref="jr:itext('/delivery/summary/r_death_date:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_death_place">
        <label ref="jr:itext('/delivery/summary/r_death_place:label')"/>
      </input>
      <input appearance="h3 blue center underline" ref="/delivery/summary/r_delivery_details">
        <label ref="jr:itext('/delivery/summary/r_delivery_details:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_delivery_date">
        <label ref="jr:itext('/delivery/summary/r_delivery_date:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_delivery_place">
        <label ref="jr:itext('/delivery/summary/r_delivery_place:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_babies_delivered_num">
        <label ref="jr:itext('/delivery/summary/r_babies_delivered_num:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_babies_deceased_num">
        <label ref="jr:itext('/delivery/summary/r_babies_deceased_num:label')"/>
      </input>
      <input appearance="h3 blue center underline" ref="/delivery/summary/r_danger_signs">
        <label ref="jr:itext('/delivery/summary/r_danger_signs:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_mom_fever">
        <label ref="jr:itext('/delivery/summary/r_mom_fever:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_mom_severe_headache">
        <label ref="jr:itext('/delivery/summary/r_mom_severe_headache:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_mom_vaginal_bleeding">
        <label ref="jr:itext('/delivery/summary/r_mom_vaginal_bleeding:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_mom_vaginal_discharge">
        <label ref="jr:itext('/delivery/summary/r_mom_vaginal_discharge:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_mom_convulsion">
        <label ref="jr:itext('/delivery/summary/r_mom_convulsion:label')"/>
      </input>
      <input appearance="h3 blue center underline" ref="/delivery/summary/r_pnc_visits">
        <label ref="jr:itext('/delivery/summary/r_pnc_visits:label')"/>
      </input>
      <input ref="/delivery/summary/r_pnc_visits_completed">
        <label ref="jr:itext('/delivery/summary/r_pnc_visits_completed:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_pnc_visit_24hrs">
        <label ref="jr:itext('/delivery/summary/r_pnc_visit_24hrs:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_pnc_visit_3days">
        <label ref="jr:itext('/delivery/summary/r_pnc_visit_3days:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_pnc_visit_7days">
        <label ref="jr:itext('/delivery/summary/r_pnc_visit_7days:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_pnc_visit_6weeks">
        <label ref="jr:itext('/delivery/summary/r_pnc_visit_6weeks:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_pnc_visit_none">
        <label ref="jr:itext('/delivery/summary/r_pnc_visit_none:label')"/>
      </input>
      <input ref="/delivery/summary/r_pnc_visits_add">
        <label ref="jr:itext('/delivery/summary/r_pnc_visits_add:label')"/>
      </input>
      <input appearance="h1 lime" ref="/delivery/summary/r_referrals">
        <label ref="jr:itext('/delivery/summary/r_referrals:label')"/>
      </input>
      <input ref="/delivery/summary/r_refer_clinic_immediately">
        <label ref="jr:itext('/delivery/summary/r_refer_clinic_immediately:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_refer_danger_sign">
        <label ref="jr:itext('/delivery/summary/r_refer_danger_sign:label')"/>
      </input>
      <input appearance="li" ref="/delivery/summary/r_mom_alive_unwell">
        <label ref="jr:itext('/delivery/summary/r_mom_alive_unwell:label')"/>
      </input>
      <input ref="/delivery/summary/r_who_schedule_note">
        <label ref="jr:itext('/delivery/summary/r_who_schedule_note:label')"/>
      </input>
      <input ref="/delivery/summary/r_pnc_schedule_note">
        <label ref="jr:itext('/delivery/summary/r_pnc_schedule_note:label')"/>
      </input>
      <input appearance="h1 green" ref="/delivery/summary/r_follow_up_tasks">
        <label ref="jr:itext('/delivery/summary/r_follow_up_tasks:label')"/>
      </input>
      <input ref="/delivery/summary/r_following_tasks">
        <label ref="jr:itext('/delivery/summary/r_following_tasks:label')"/>
      </input>
      <input ref="/delivery/summary/r_fup_danger_sign">
        <label ref="jr:itext('/delivery/summary/r_fup_danger_sign:label')"/>
      </input>
      <input ref="/delivery/summary/r_fup_danger_sign_baby">
        <label ref="jr:itext('/delivery/summary/r_fup_danger_sign_baby:label')"/>
      </input>
      <group appearance="hidden" ref="/delivery/summary/custom_translations">
        <select1 ref="/delivery/summary/custom_translations/custom_woman_label_translator">
          <item>
            <label ref="jr:itext('/delivery/summary/custom_translations/custom_woman_label_translator/woman:label')"/>
            <value>woman</value>
          </item>
        </select1>
        <select1 ref="/delivery/summary/custom_translations/custom_woman_start_label_translator">
          <item>
            <label ref="jr:itext('/delivery/summary/custom_translations/custom_woman_start_label_translator/woman-start:label')"/>
            <value>woman-start</value>
          </item>
        </select1>
        <select1 ref="/delivery/summary/custom_translations/delivery_place_label_translator">
          <item>
            <label ref="jr:itext('/delivery/summary/custom_translations/delivery_place_label_translator/health_facility:label')"/>
            <value>health_facility</value>
          </item>
          <item>
            <label ref="jr:itext('/delivery/summary/custom_translations/delivery_place_label_translator/home:label')"/>
            <value>home</value>
          </item>
          <item>
            <label ref="jr:itext('/delivery/summary/custom_translations/delivery_place_label_translator/other:label')"/>
            <value>other</value>
          </item>
        </select1>
        <select1 ref="/delivery/summary/custom_translations/woman_death_place_label_translator">
          <item>
            <label ref="jr:itext('/delivery/summary/custom_translations/woman_death_place_label_translator/health_facility:label')"/>
            <value>health_facility</value>
          </item>
          <item>
            <label ref="jr:itext('/delivery/summary/custom_translations/woman_death_place_label_translator/home:label')"/>
            <value>home</value>
          </item>
          <item>
            <label ref="jr:itext('/delivery/summary/custom_translations/woman_death_place_label_translator/other:label')"/>
            <value>other</value>
          </item>
        </select1>
      </group>
    </group>
    <group appearance="hidden" ref="/delivery/data">
      <group ref="/delivery/data/meta"/>
    </group>
  </h:body>
</h:html>
`,   
}