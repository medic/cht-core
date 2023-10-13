/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="replace_user">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Replace User</h3>
<select id="form-languages" style="display:none;" data-default-lang=""><option value="en">en</option> </select>
  
  
    <section class="or-group-data or-branch pre-init or-appearance-field-list " name="/replace_user/inputs" data-relevant="false()"><section class="or-group-data " name="/replace_user/inputs/user">
      </section><section class="or-group-data " name="/replace_user/inputs/contact"><label class="question non-select or-appearance-select-contact or-appearance-type-person "><span lang="en" class="question-label active" data-itext-id="/replace_user/inputs/contact/_id:label">The user being replaced</span><input type="text" name="/replace_user/inputs/contact/_id" data-type-xml="string"></label><section class="or-group-data or-appearance-hidden " name="/replace_user/inputs/contact/parent"><section class="or-group-data " name="/replace_user/inputs/contact/parent/parent"><section class="or-group-data " name="/replace_user/inputs/contact/parent/parent/parent">
      </section>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group-data or-appearance-field-list or-appearance-summary " name="/replace_user/intro"><label class="question non-select or-appearance-h1 or-appearance-red "><span lang="en" class="question-label active" data-itext-id="/replace_user/intro/warning_header:label"><i class="fa fa-exclamation-triangle"></i> Warning</span><input type="text" name="/replace_user/intro/warning_header" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/replace_user/intro/warning:label"><p>Users should only be replaced by their supervisors.</p>This action can only be taken with the proper admin code.</span><input type="text" name="/replace_user/intro/warning" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/replace_user/intro/admin_code:label">Admin Code</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/replace_user/intro/admin_code:hint">The code is '1234'</span><input type="text" name="/replace_user/intro/admin_code" data-required="true()" data-constraint=". = '1234'" data-type-xml="string"><span lang="en" class="or-constraint-msg active" data-itext-id="/replace_user/intro/admin_code:jr:constraintMsg">Invalid code. Contact your administrator if you need access to this form.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section>
    <section class="or-group or-appearance-field-list " name="/replace_user/new_contact"><h4><span lang="en" class="question-label active" data-itext-id="/replace_user/new_contact:label">New User</span></h4>
<section class="or-group-data or-appearance-hidden " name="/replace_user/new_contact/parent"><section class="or-group-data or-branch pre-init or-appearance-hidden " name="/replace_user/new_contact/parent/parent" data-relevant=" /replace_user/parent_2_id  != ''"><section class="or-group-data or-branch pre-init " name="/replace_user/new_contact/parent/parent/parent" data-relevant=" /replace_user/parent_3_id  != ''">
      </section>
      </section>
      </section><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/replace_user/new_contact/name:label">Full name</span><span class="required">*</span><input type="text" name="/replace_user/new_contact/name" data-required="true()" data-type-xml="string"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/replace_user/new_contact/short_name:label">Short name</span><span lang="en" class="or-hint active" data-itext-id="/replace_user/new_contact/short_name:hint">Please enter a short name that is preferred by the person.</span><input type="text" name="/replace_user/new_contact/short_name" data-constraint="string-length(.) &lt;= 10" data-type-xml="string"><span lang="en" class="or-constraint-msg active" data-itext-id="/replace_user/new_contact/short_name:jr:constraintMsg">Short name can not be more than 10 characters long.</span></label><section class="or-group-data " name="/replace_user/new_contact/ephemeral_dob"><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/replace_user/new_contact/ephemeral_dob/dob_calendar:label">Age</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/replace_user/new_contact/ephemeral_dob/dob_calendar:hint">Date of Birth</span><input type="date" name="/replace_user/new_contact/ephemeral_dob/dob_calendar" data-required="true()" data-constraint="floor(decimal-date-time(.)) &lt;= floor(decimal-date-time(today()))" data-relevant="not(selected( /replace_user/new_contact/ephemeral_dob/dob_method ,'approx'))" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/replace_user/new_contact/ephemeral_dob/dob_calendar:jr:constraintMsg">Date must be before today</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/replace_user/new_contact/ephemeral_dob/age_label:label"><strong>Please enter date of birth</strong></span><input type="text" name="/replace_user/new_contact/ephemeral_dob/age_label" data-relevant="selected( /replace_user/new_contact/ephemeral_dob/dob_method ,'approx')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/replace_user/new_contact/ephemeral_dob/age_years:label">Years</span><span class="required">*</span><input type="number" name="/replace_user/new_contact/ephemeral_dob/age_years" data-required="true()" data-constraint=". &gt;= 0 and . &lt;= 130" data-relevant="selected( /replace_user/new_contact/ephemeral_dob/dob_method ,'approx')" data-type-xml="int"><span lang="en" class="or-constraint-msg active" data-itext-id="/replace_user/new_contact/ephemeral_dob/age_years:jr:constraintMsg">Age must be between 0 and 130</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/replace_user/new_contact/ephemeral_dob/age_months:label">Months</span><input type="number" name="/replace_user/new_contact/ephemeral_dob/age_months" data-constraint=". &gt;= 0 and . &lt;= 11" data-relevant="selected( /replace_user/new_contact/ephemeral_dob/dob_method ,'approx')" data-type-xml="int"><span lang="en" class="or-constraint-msg active" data-itext-id="/replace_user/new_contact/ephemeral_dob/age_months:jr:constraintMsg">Months must between 0 and 11</span></label><fieldset class="question simple-select or-appearance-horizontal or-appearance-columns "><fieldset>
<legend>
          </legend>
<div class="option-wrapper"><label class=""><input type="checkbox" name="/replace_user/new_contact/ephemeral_dob/dob_method" value="approx" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/replace_user/new_contact/ephemeral_dob/dob_method/approx:label">Date of birth unknown</span></label></div>
</fieldset></fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/replace_user/new_contact/ephemeral_dob/dob_debug:label">Months: <span class="or-output" data-value=" /replace_user/new_contact/ephemeral_dob/ephemeral_months "> </span><br>Year: <span class="or-output" data-value=" /replace_user/new_contact/ephemeral_dob/ephemeral_years "> </span><br>DOB Approx: <span class="or-output" data-value=" /replace_user/new_contact/ephemeral_dob/dob_approx "> </span><br>DOB Calendar: <span class="or-output" data-value=" /replace_user/new_contact/ephemeral_dob/dob_calendar "> </span><br>DOB ISO: <span class="or-output" data-value=" /replace_user/new_contact/ephemeral_dob/dob_iso "> </span></span><input type="text" name="/replace_user/new_contact/ephemeral_dob/dob_debug" data-relevant="false()" data-type-xml="string" readonly></label>
      </section><fieldset class="question simple-select or-appearance-horizontal or-appearance-columns ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/replace_user/new_contact/sex:label">Sex</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/replace_user/new_contact/sex" data-name="/replace_user/new_contact/sex" value="male" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/replace_user/new_contact/sex/male:label">Male</span></label><label class=""><input type="radio" name="/replace_user/new_contact/sex" data-name="/replace_user/new_contact/sex" value="female" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/replace_user/new_contact/sex/female:label">Female</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/replace_user/new_contact/phone_read_only:label">Phone Number</span><span lang="en" class="or-hint active" data-itext-id="/replace_user/new_contact/phone_read_only:hint">Inherited from existing user</span><input type="text" name="/replace_user/new_contact/phone_read_only" data-relevant=" /replace_user/user_phone  != ''" data-calculate=" /replace_user/user_phone " data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/replace_user/new_contact/new_phone:label">Phone Number</span><span class="required">*</span><input type="tel" name="/replace_user/new_contact/new_phone" data-required="true()" data-constraint="true()" data-relevant=" /replace_user/user_phone  = ''" data-type-xml="tel"><span lang="en" class="or-constraint-msg active" data-itext-id="/replace_user/new_contact/new_phone:jr:constraintMsg">Please enter a valid local number, or use the standard international format, which includes a plus sign (+) and country code. For example: +254712345678</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/replace_user/new_contact/phone_alternate:label">Alternate Phone Number</span><input type="tel" name="/replace_user/new_contact/phone_alternate" data-constraint="true()" data-type-xml="tel"><span lang="en" class="or-constraint-msg active" data-itext-id="/replace_user/new_contact/phone_alternate:jr:constraintMsg">Please enter a valid local number, or use the standard international format, which includes a plus sign (+) and country code. For example: +254712345678</span></label><label class="question or-appearance-minimal "><span lang="en" class="question-label active" data-itext-id="/replace_user/new_contact/role:label">Role</span><span lang="en" class="or-hint active" data-itext-id="/replace_user/new_contact/role:hint">Inherited from existing user</span><select name="/replace_user/new_contact/role" data-name="/replace_user/new_contact/role" data-calculate=" /replace_user/contact_role " data-type-xml="select1" readonly><option value="">...</option>
<option disabled value="chw">CHW</option>
<option disabled value="chw_supervisor">CHW Supervisor</option>
<option disabled value="nurse">Nurse</option>
<option disabled value="manager">Facility Manager</option>
<option disabled value="patient">Patient</option>
<option disabled value="other">Other</option></select><span class="or-option-translations" style="display:none;">
        </span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/replace_user/new_contact/external_id:label">External ID</span><input type="text" name="/replace_user/new_contact/external_id" data-type-xml="string"></label><section class="or-group-data or-appearance-hidden " name="/replace_user/new_contact/meta">
      </section>
      </section>
    <section class="or-group-data or-appearance-field-list or-appearance-summary " name="/replace_user/outro"><label class="question non-select or-appearance-h1 or-appearance-red "><span lang="en" class="question-label active" data-itext-id="/replace_user/outro/warning_header:label"><i class="fa fa-exclamation-triangle"></i> Warning</span><input type="text" name="/replace_user/outro/warning_header" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/replace_user/outro/warning:label"><p>Submitting this form will cause the current user to be <em>automatically logged after the next sync.</em></p><p>This could happen immediately if you are currently connected to the internet.</p><p>After the current user is logged out, a SMS message will be sent to <strong><span class="or-output" data-value=" /replace_user/new_contact_phone "> </span></strong> containing a login link. Open that link to login as <strong><span class="or-output" data-value=" /replace_user/new_contact_name "> </span></strong>.</p>Please contact your administrator if you do not receive a login link.</span><input type="text" name="/replace_user/outro/warning" data-type-xml="string" readonly></label>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/replace_user/patient_id" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/parent_1_id" data-calculate="../inputs/contact/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/parent_2_id" data-calculate="../inputs/contact/parent/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/parent_3_id" data-calculate="../inputs/contact/parent/parent/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/user_phone" data-calculate="../inputs/user/phone" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/contact_role" data-calculate="../inputs/contact/role" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/created_by" data-calculate="../inputs/user/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/created_by_person_uuid" data-calculate="../inputs/user/contact_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/created_by_place_uuid" data-calculate="../inputs/user/facility_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/parent/_id" data-calculate=" /replace_user/parent_1_id " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/parent/parent/_id" data-calculate=" /replace_user/parent_2_id " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/parent/parent/parent/_id" data-calculate=" /replace_user/parent_3_id " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/type" data-calculate='"person"' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/date_of_birth" data-calculate=" /replace_user/new_contact/ephemeral_dob/dob_iso " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/date_of_birth_method" data-calculate=" /replace_user/new_contact/ephemeral_dob/dob_method " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/ephemeral_dob/ephemeral_months" data-calculate='if(format-date-time(today(),"%m") -  /replace_user/new_contact/ephemeral_dob/age_months  &lt; 0, format-date-time(today(),"%m") -  /replace_user/new_contact/ephemeral_dob/age_months  + 12, format-date-time(today(),"%m") -  /replace_user/new_contact/ephemeral_dob/age_months )' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/ephemeral_dob/ephemeral_years" data-calculate='if(format-date-time(today(),"%m") -  /replace_user/new_contact/ephemeral_dob/age_months  &lt; 0, format-date-time(today(),"%Y") -  /replace_user/new_contact/ephemeral_dob/age_years  - 1, format-date-time(today(),"%Y") - /replace_user/new_contact/ephemeral_dob/age_years )' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/ephemeral_dob/dob_approx" data-calculate="concat(string( /replace_user/new_contact/ephemeral_dob/ephemeral_years ),'-',if( /replace_user/new_contact/ephemeral_dob/ephemeral_months &lt;10, concat('0',string( /replace_user/new_contact/ephemeral_dob/ephemeral_months )),  /replace_user/new_contact/ephemeral_dob/ephemeral_months ),'-',string(format-date-time(today(), &quot;%d&quot;)))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/ephemeral_dob/dob_raw" data-calculate="if(not(selected(  /replace_user/new_contact/ephemeral_dob/dob_method ,'approx')),   /replace_user/new_contact/ephemeral_dob/dob_calendar ,  /replace_user/new_contact/ephemeral_dob/dob_approx )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/ephemeral_dob/dob_iso" data-calculate='format-date-time( /replace_user/new_contact/ephemeral_dob/dob_raw ,"%Y-%m-%d")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/phone" data-calculate="coalesce( /replace_user/user_phone ,  /replace_user/new_contact/new_phone )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/meta/created_by" data-calculate="../../../created_by" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/meta/created_by_person_uuid" data-calculate="../../../created_by_person_uuid" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/meta/created_by_place_uuid" data-calculate="../../../created_by_place_uuid" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact/created_by_doc" data-calculate="." data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/replacement_contact_id" data-calculate=" /replace_user/new_contact " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact_name" data-calculate="../new_contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/new_contact_phone" data-calculate="../new_contact/phone" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/replace_user/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <replace_user xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="replace_user" prefix="J1!replace_user!" version="2022-11-23 12-06">
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
              <facility_id/>
              <name/>
              <phone/>
            </user>
            <contact>
              <_id/>
              <role/>
              <parent>
                <_id/>
                <parent>
                  <_id/>
                  <parent>
                    <_id/>
                  </parent>
                </parent>
              </parent>
            </contact>
          </inputs>
          <patient_id/>
          <parent_1_id/>
          <parent_2_id/>
          <parent_3_id/>
          <user_phone/>
          <contact_role/>
          <created_by/>
          <created_by_person_uuid/>
          <created_by_place_uuid/>
          <intro>
            <warning_header/>
            <warning/>
            <admin_code/>
          </intro>
          <new_contact db-doc="true">
            <parent>
              <_id/>
              <parent>
                <_id/>
                <parent>
                  <_id/>
                </parent>
              </parent>
            </parent>
            <type/>
            <name/>
            <short_name/>
            <date_of_birth/>
            <date_of_birth_method/>
            <ephemeral_dob>
              <dob_calendar/>
              <age_label/>
              <age_years/>
              <age_months/>
              <dob_method/>
              <ephemeral_months/>
              <ephemeral_years/>
              <dob_approx/>
              <dob_raw/>
              <dob_iso/>
              <dob_debug/>
            </ephemeral_dob>
            <sex/>
            <phone_read_only/>
            <new_phone/>
            <phone/>
            <phone_alternate/>
            <role/>
            <external_id/>
            <meta tag="hidden">
              <created_by/>
              <created_by_person_uuid/>
              <created_by_place_uuid/>
            </meta>
            <created_by_doc db-doc-ref="/replace_user"/>
          </new_contact>
          <replacement_contact_id db-doc-ref=" /replace_user/new_contact "/>
          <new_contact_name/>
          <new_contact_phone/>
          <outro>
            <warning_header/>
            <warning/>
          </outro>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </replace_user>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Replace User</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/replace_user/inputs/contact/_id:label">
            <value>The user being replaced</value>
          </text>
          <text id="/replace_user/inputs/contact/parent/_id:label">
            <value>Parent 1 ID</value>
          </text>
          <text id="/replace_user/inputs/contact/parent/parent/_id:label">
            <value>Parent 2 ID</value>
          </text>
          <text id="/replace_user/inputs/contact/parent/parent/parent/_id:label">
            <value>Parent 3 ID</value>
          </text>
          <text id="/replace_user/inputs/contact/role:label">
            <value>Role</value>
          </text>
          <text id="/replace_user/inputs/source:label">
            <value>Source</value>
          </text>
          <text id="/replace_user/inputs/source_id:label">
            <value>Source ID</value>
          </text>
          <text id="/replace_user/inputs/user/contact_id:label">
            <value>User's Contact ID</value>
          </text>
          <text id="/replace_user/inputs/user/facility_id:label">
            <value>Facility ID</value>
          </text>
          <text id="/replace_user/inputs/user/name:label">
            <value>Username</value>
          </text>
          <text id="/replace_user/inputs/user/phone:label">
            <value>Phone Number</value>
          </text>
          <text id="/replace_user/intro/admin_code:hint">
            <value>The code is '1234'</value>
          </text>
          <text id="/replace_user/intro/admin_code:jr:constraintMsg">
            <value>Invalid code. Contact your administrator if you need access to this form.</value>
          </text>
          <text id="/replace_user/intro/admin_code:label">
            <value>Admin Code</value>
          </text>
          <text id="/replace_user/intro/warning:label">
            <value>Users should only be replaced by their supervisors. 

This action can only be taken with the proper admin code.</value>
          </text>
          <text id="/replace_user/intro/warning_header:label">
            <value>&lt;i class="fa fa-exclamation-triangle"&gt;&lt;/i&gt; Warning</value>
          </text>
          <text id="/replace_user/new_contact/ephemeral_dob/age_label:label">
            <value>**Please enter date of birth**</value>
          </text>
          <text id="/replace_user/new_contact/ephemeral_dob/age_months:jr:constraintMsg">
            <value>Months must between 0 and 11</value>
          </text>
          <text id="/replace_user/new_contact/ephemeral_dob/age_months:label">
            <value>Months</value>
          </text>
          <text id="/replace_user/new_contact/ephemeral_dob/age_years:jr:constraintMsg">
            <value>Age must be between 0 and 130</value>
          </text>
          <text id="/replace_user/new_contact/ephemeral_dob/age_years:label">
            <value>Years</value>
          </text>
          <text id="/replace_user/new_contact/ephemeral_dob/dob_calendar:hint">
            <value>Date of Birth</value>
          </text>
          <text id="/replace_user/new_contact/ephemeral_dob/dob_calendar:jr:constraintMsg">
            <value>Date must be before today</value>
          </text>
          <text id="/replace_user/new_contact/ephemeral_dob/dob_calendar:label">
            <value>Age</value>
          </text>
          <text id="/replace_user/new_contact/ephemeral_dob/dob_debug:label">
            <value>Months: <output value=" /replace_user/new_contact/ephemeral_dob/ephemeral_months "/>
Year: <output value=" /replace_user/new_contact/ephemeral_dob/ephemeral_years "/>
DOB Approx: <output value=" /replace_user/new_contact/ephemeral_dob/dob_approx "/>
DOB Calendar: <output value=" /replace_user/new_contact/ephemeral_dob/dob_calendar "/>
DOB ISO: <output value=" /replace_user/new_contact/ephemeral_dob/dob_iso "/></value></text>
          <text id="/replace_user/new_contact/ephemeral_dob/dob_method/approx:label">
            <value>Date of birth unknown</value>
          </text>
          <text id="/replace_user/new_contact/external_id:label">
            <value>External ID</value>
          </text>
          <text id="/replace_user/new_contact/name:label">
            <value>Full name</value>
          </text>
          <text id="/replace_user/new_contact/new_phone:jr:constraintMsg">
            <value>Please enter a valid local number, or use the standard international format, which includes a plus sign (+) and country code. For example: +254712345678</value>
          </text>
          <text id="/replace_user/new_contact/new_phone:label">
            <value>Phone Number</value>
          </text>
          <text id="/replace_user/new_contact/parent/_id:label">
            <value>Parent 1 ID</value>
          </text>
          <text id="/replace_user/new_contact/parent/parent/_id:label">
            <value>Parent 2 ID</value>
          </text>
          <text id="/replace_user/new_contact/parent/parent/parent/_id:label">
            <value>Parent 3 ID</value>
          </text>
          <text id="/replace_user/new_contact/phone:label">
            <value>Phone Number</value>
          </text>
          <text id="/replace_user/new_contact/phone_alternate:jr:constraintMsg">
            <value>Please enter a valid local number, or use the standard international format, which includes a plus sign (+) and country code. For example: +254712345678</value>
          </text>
          <text id="/replace_user/new_contact/phone_alternate:label">
            <value>Alternate Phone Number</value>
          </text>
          <text id="/replace_user/new_contact/phone_read_only:hint">
            <value>Inherited from existing user</value>
          </text>
          <text id="/replace_user/new_contact/phone_read_only:label">
            <value>Phone Number</value>
          </text>
          <text id="/replace_user/new_contact/role/chw:label">
            <value>CHW</value>
          </text>
          <text id="/replace_user/new_contact/role/chw_supervisor:label">
            <value>CHW Supervisor</value>
          </text>
          <text id="/replace_user/new_contact/role/manager:label">
            <value>Facility Manager</value>
          </text>
          <text id="/replace_user/new_contact/role/nurse:label">
            <value>Nurse</value>
          </text>
          <text id="/replace_user/new_contact/role/other:label">
            <value>Other</value>
          </text>
          <text id="/replace_user/new_contact/role/patient:label">
            <value>Patient</value>
          </text>
          <text id="/replace_user/new_contact/role:hint">
            <value>Inherited from existing user</value>
          </text>
          <text id="/replace_user/new_contact/role:label">
            <value>Role</value>
          </text>
          <text id="/replace_user/new_contact/sex/female:label">
            <value>Female</value>
          </text>
          <text id="/replace_user/new_contact/sex/male:label">
            <value>Male</value>
          </text>
          <text id="/replace_user/new_contact/sex:label">
            <value>Sex</value>
          </text>
          <text id="/replace_user/new_contact/short_name:hint">
            <value>Please enter a short name that is preferred by the person.</value>
          </text>
          <text id="/replace_user/new_contact/short_name:jr:constraintMsg">
            <value>Short name can not be more than 10 characters long.</value>
          </text>
          <text id="/replace_user/new_contact/short_name:label">
            <value>Short name</value>
          </text>
          <text id="/replace_user/new_contact/type:label">
            <value>Type</value>
          </text>
          <text id="/replace_user/new_contact:label">
            <value>New User</value>
          </text>
          <text id="/replace_user/outro/warning:label">
            <value>Submitting this form will cause the current user to be *automatically logged after the next sync.*

This could happen immediately if you are currently connected to the internet.

After the current user is logged out, a SMS message will be sent to **<output value=" /replace_user/new_contact_phone "/>** containing a login link. Open that link to login as **<output value=" /replace_user/new_contact_name "/>**.

Please contact your administrator if you do not receive a login link.</value>
          </text>
          <text id="/replace_user/outro/warning_header:label">
            <value>&lt;i class="fa fa-exclamation-triangle"&gt;&lt;/i&gt; Warning</value>
          </text>
          <text id="/replace_user/patient_id:label">
            <value>Assocaite form with original contact</value>
          </text>
        </translation>
      </itext>
      <instance>
        <replace_user delimiter="#" id="replace_user" prefix="J1!replace_user!" version="2022-11-23 12-06">
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
              <facility_id/>
              <name/>
              <phone/>
            </user>
            <contact>
              <_id/>
              <role/>
              <parent>
                <_id/>
                <parent>
                  <_id/>
                  <parent>
                    <_id/>
                  </parent>
                </parent>
              </parent>
            </contact>
          </inputs>
          <patient_id/>
          <parent_1_id/>
          <parent_2_id/>
          <parent_3_id/>
          <user_phone/>
          <contact_role/>
          <created_by/>
          <created_by_person_uuid/>
          <created_by_place_uuid/>
          <intro>
            <warning_header/>
            <warning/>
            <admin_code/>
          </intro>
          <new_contact db-doc="true">
            <parent>
              <_id/>
              <parent>
                <_id/>
                <parent>
                  <_id/>
                </parent>
              </parent>
            </parent>
            <type/>
            <name/>
            <short_name/>
            <date_of_birth/>
            <date_of_birth_method/>
            <ephemeral_dob>
              <dob_calendar/>
              <age_label/>
              <age_years/>
              <age_months/>
              <dob_method/>
              <ephemeral_months/>
              <ephemeral_years/>
              <dob_approx/>
              <dob_raw/>
              <dob_iso/>
              <dob_debug/>
            </ephemeral_dob>
            <sex/>
            <phone_read_only/>
            <new_phone/>
            <phone/>
            <phone_alternate/>
            <role/>
            <external_id/>
            <meta tag="hidden">
              <created_by/>
              <created_by_person_uuid/>
              <created_by_place_uuid/>
            </meta>
            <created_by_doc db-doc-ref="/replace_user"/>
          </new_contact>
          <replacement_contact_id db-doc-ref=" /replace_user/new_contact "/>
          <new_contact_name/>
          <new_contact_phone/>
          <outro>
            <warning_header/>
            <warning/>
          </outro>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </replace_user>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/replace_user/inputs" relevant="false()"/>
      <bind nodeset="/replace_user/inputs/source" type="string"/>
      <bind nodeset="/replace_user/inputs/source_id" type="string"/>
      <bind nodeset="/replace_user/inputs/user/contact_id" type="string"/>
      <bind nodeset="/replace_user/inputs/user/facility_id" type="string"/>
      <bind nodeset="/replace_user/inputs/user/name" type="string"/>
      <bind nodeset="/replace_user/inputs/user/phone" type="string"/>
      <bind nodeset="/replace_user/inputs/contact/_id" type="string"/>
      <bind nodeset="/replace_user/inputs/contact/role" type="string"/>
      <bind nodeset="/replace_user/inputs/contact/parent/_id" type="string"/>
      <bind nodeset="/replace_user/inputs/contact/parent/parent/_id" type="string"/>
      <bind nodeset="/replace_user/inputs/contact/parent/parent/parent/_id" type="string"/>
      <bind calculate="../inputs/contact/_id" nodeset="/replace_user/patient_id" type="string"/>
      <bind calculate="../inputs/contact/parent/_id" nodeset="/replace_user/parent_1_id" type="string"/>
      <bind calculate="../inputs/contact/parent/parent/_id" nodeset="/replace_user/parent_2_id" type="string"/>
      <bind calculate="../inputs/contact/parent/parent/parent/_id" nodeset="/replace_user/parent_3_id" type="string"/>
      <bind calculate="../inputs/user/phone" nodeset="/replace_user/user_phone" type="string"/>
      <bind calculate="../inputs/contact/role" nodeset="/replace_user/contact_role" type="string"/>
      <bind calculate="../inputs/user/name" nodeset="/replace_user/created_by" type="string"/>
      <bind calculate="../inputs/user/contact_id" nodeset="/replace_user/created_by_person_uuid" type="string"/>
      <bind calculate="../inputs/user/facility_id" nodeset="/replace_user/created_by_place_uuid" type="string"/>
      <bind nodeset="/replace_user/intro/warning_header" readonly="true()" type="string"/>
      <bind nodeset="/replace_user/intro/warning" readonly="true()" type="string"/>
      <bind constraint=". = '1234'" jr:constraintMsg="jr:itext('/replace_user/intro/admin_code:jr:constraintMsg')" nodeset="/replace_user/intro/admin_code" required="true()" type="string"/>
      <bind calculate=" /replace_user/parent_1_id " nodeset="/replace_user/new_contact/parent/_id" type="string"/>
      <bind nodeset="/replace_user/new_contact/parent/parent" relevant=" /replace_user/parent_2_id  != ''"/>
      <bind calculate=" /replace_user/parent_2_id " nodeset="/replace_user/new_contact/parent/parent/_id" type="string"/>
      <bind nodeset="/replace_user/new_contact/parent/parent/parent" relevant=" /replace_user/parent_3_id  != ''"/>
      <bind calculate=" /replace_user/parent_3_id " nodeset="/replace_user/new_contact/parent/parent/parent/_id" type="string"/>
      <bind calculate="&quot;person&quot;" nodeset="/replace_user/new_contact/type" type="string"/>
      <bind nodeset="/replace_user/new_contact/name" required="true()" type="string"/>
      <bind constraint="string-length(.) &lt;= 10" jr:constraintMsg="jr:itext('/replace_user/new_contact/short_name:jr:constraintMsg')" nodeset="/replace_user/new_contact/short_name" type="string"/>
      <bind calculate=" /replace_user/new_contact/ephemeral_dob/dob_iso " nodeset="/replace_user/new_contact/date_of_birth" required="true()" type="string"/>
      <bind calculate=" /replace_user/new_contact/ephemeral_dob/dob_method " nodeset="/replace_user/new_contact/date_of_birth_method" type="string"/>
      <bind constraint="floor(decimal-date-time(.)) &lt;= floor(decimal-date-time(today()))" jr:constraintMsg="jr:itext('/replace_user/new_contact/ephemeral_dob/dob_calendar:jr:constraintMsg')" nodeset="/replace_user/new_contact/ephemeral_dob/dob_calendar" relevant="not(selected( /replace_user/new_contact/ephemeral_dob/dob_method ,'approx'))" required="true()" type="date"/>
      <bind nodeset="/replace_user/new_contact/ephemeral_dob/age_label" readonly="true()" relevant="selected( /replace_user/new_contact/ephemeral_dob/dob_method ,'approx')" type="string"/>
      <bind constraint=". &gt;= 0 and . &lt;= 130" jr:constraintMsg="jr:itext('/replace_user/new_contact/ephemeral_dob/age_years:jr:constraintMsg')" nodeset="/replace_user/new_contact/ephemeral_dob/age_years" relevant="selected( /replace_user/new_contact/ephemeral_dob/dob_method ,'approx')" required="true()" type="int"/>
      <bind constraint=". &gt;= 0 and . &lt;= 11" jr:constraintMsg="jr:itext('/replace_user/new_contact/ephemeral_dob/age_months:jr:constraintMsg')" nodeset="/replace_user/new_contact/ephemeral_dob/age_months" relevant="selected( /replace_user/new_contact/ephemeral_dob/dob_method ,'approx')" type="int"/>
      <bind nodeset="/replace_user/new_contact/ephemeral_dob/dob_method" type="select"/>
      <bind calculate="if(format-date-time(today(),&quot;%m&quot;) -  /replace_user/new_contact/ephemeral_dob/age_months  &lt; 0, format-date-time(today(),&quot;%m&quot;) -  /replace_user/new_contact/ephemeral_dob/age_months  + 12, format-date-time(today(),&quot;%m&quot;) -  /replace_user/new_contact/ephemeral_dob/age_months )" nodeset="/replace_user/new_contact/ephemeral_dob/ephemeral_months" type="string"/>
      <bind calculate="if(format-date-time(today(),&quot;%m&quot;) -  /replace_user/new_contact/ephemeral_dob/age_months  &lt; 0, format-date-time(today(),&quot;%Y&quot;) -  /replace_user/new_contact/ephemeral_dob/age_years  - 1, format-date-time(today(),&quot;%Y&quot;) - /replace_user/new_contact/ephemeral_dob/age_years )" nodeset="/replace_user/new_contact/ephemeral_dob/ephemeral_years" type="string"/>
      <bind calculate="concat(string( /replace_user/new_contact/ephemeral_dob/ephemeral_years ),'-',if( /replace_user/new_contact/ephemeral_dob/ephemeral_months &lt;10, concat('0',string( /replace_user/new_contact/ephemeral_dob/ephemeral_months )),  /replace_user/new_contact/ephemeral_dob/ephemeral_months ),'-',string(format-date-time(today(), &quot;%d&quot;)))" nodeset="/replace_user/new_contact/ephemeral_dob/dob_approx" type="string"/>
      <bind calculate="if(not(selected(  /replace_user/new_contact/ephemeral_dob/dob_method ,'approx')), 
 /replace_user/new_contact/ephemeral_dob/dob_calendar ,
 /replace_user/new_contact/ephemeral_dob/dob_approx )" nodeset="/replace_user/new_contact/ephemeral_dob/dob_raw" type="string"/>
      <bind calculate="format-date-time( /replace_user/new_contact/ephemeral_dob/dob_raw ,&quot;%Y-%m-%d&quot;)" nodeset="/replace_user/new_contact/ephemeral_dob/dob_iso" type="string"/>
      <bind nodeset="/replace_user/new_contact/ephemeral_dob/dob_debug" readonly="true()" relevant="false()" type="string"/>
      <bind nodeset="/replace_user/new_contact/sex" required="true()" type="select1"/>
      <bind calculate=" /replace_user/user_phone " nodeset="/replace_user/new_contact/phone_read_only" readonly="true()" relevant=" /replace_user/user_phone  != ''" type="string"/>
      <bind constraint="true()" jr:constraintMsg="jr:itext('/replace_user/new_contact/new_phone:jr:constraintMsg')" nodeset="/replace_user/new_contact/new_phone" relevant=" /replace_user/user_phone  = ''" required="true()" type="tel"/>
      <bind calculate="coalesce( /replace_user/user_phone ,  /replace_user/new_contact/new_phone )" nodeset="/replace_user/new_contact/phone" type="string"/>
      <bind constraint="true()" jr:constraintMsg="jr:itext('/replace_user/new_contact/phone_alternate:jr:constraintMsg')" nodeset="/replace_user/new_contact/phone_alternate" type="tel"/>
      <bind calculate=" /replace_user/contact_role " nodeset="/replace_user/new_contact/role" readonly="true()" type="select1"/>
      <bind nodeset="/replace_user/new_contact/external_id" type="string"/>
      <bind calculate="../../../created_by" nodeset="/replace_user/new_contact/meta/created_by" type="string"/>
      <bind calculate="../../../created_by_person_uuid" nodeset="/replace_user/new_contact/meta/created_by_person_uuid" type="string"/>
      <bind calculate="../../../created_by_place_uuid" nodeset="/replace_user/new_contact/meta/created_by_place_uuid" type="string"/>
      <bind calculate="." nodeset="/replace_user/new_contact/created_by_doc" type="string"/>
      <bind calculate=" /replace_user/new_contact " nodeset="/replace_user/replacement_contact_id" type="string"/>
      <bind calculate="../new_contact/name" nodeset="/replace_user/new_contact_name" type="string"/>
      <bind calculate="../new_contact/phone" nodeset="/replace_user/new_contact_phone" type="string"/>
      <bind nodeset="/replace_user/outro/warning_header" readonly="true()" type="string"/>
      <bind nodeset="/replace_user/outro/warning" readonly="true()" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/replace_user/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/replace_user/inputs">
      <group ref="/replace_user/inputs/user"/>
      <group ref="/replace_user/inputs/contact">
        <input appearance="select-contact type-person" ref="/replace_user/inputs/contact/_id">
          <label ref="jr:itext('/replace_user/inputs/contact/_id:label')"/>
        </input>
        <group appearance="hidden" ref="/replace_user/inputs/contact/parent">
          <group ref="/replace_user/inputs/contact/parent/parent">
            <group ref="/replace_user/inputs/contact/parent/parent/parent"/>
          </group>
        </group>
      </group>
    </group>
    <group appearance="field-list summary" ref="/replace_user/intro">
      <input appearance="h1 red" ref="/replace_user/intro/warning_header">
        <label ref="jr:itext('/replace_user/intro/warning_header:label')"/>
      </input>
      <input ref="/replace_user/intro/warning">
        <label ref="jr:itext('/replace_user/intro/warning:label')"/>
      </input>
      <input ref="/replace_user/intro/admin_code">
        <label ref="jr:itext('/replace_user/intro/admin_code:label')"/>
        <hint ref="jr:itext('/replace_user/intro/admin_code:hint')"/>
      </input>
    </group>
    <group appearance="field-list" ref="/replace_user/new_contact">
      <label ref="jr:itext('/replace_user/new_contact:label')"/>
      <group appearance="hidden" ref="/replace_user/new_contact/parent">
        <group appearance="hidden" ref="/replace_user/new_contact/parent/parent">
          <group ref="/replace_user/new_contact/parent/parent/parent"/>
        </group>
      </group>
      <input ref="/replace_user/new_contact/name">
        <label ref="jr:itext('/replace_user/new_contact/name:label')"/>
      </input>
      <input ref="/replace_user/new_contact/short_name">
        <label ref="jr:itext('/replace_user/new_contact/short_name:label')"/>
        <hint ref="jr:itext('/replace_user/new_contact/short_name:hint')"/>
      </input>
      <group ref="/replace_user/new_contact/ephemeral_dob">
        <input ref="/replace_user/new_contact/ephemeral_dob/dob_calendar">
          <label ref="jr:itext('/replace_user/new_contact/ephemeral_dob/dob_calendar:label')"/>
          <hint ref="jr:itext('/replace_user/new_contact/ephemeral_dob/dob_calendar:hint')"/>
        </input>
        <input ref="/replace_user/new_contact/ephemeral_dob/age_label">
          <label ref="jr:itext('/replace_user/new_contact/ephemeral_dob/age_label:label')"/>
        </input>
        <input ref="/replace_user/new_contact/ephemeral_dob/age_years">
          <label ref="jr:itext('/replace_user/new_contact/ephemeral_dob/age_years:label')"/>
        </input>
        <input ref="/replace_user/new_contact/ephemeral_dob/age_months">
          <label ref="jr:itext('/replace_user/new_contact/ephemeral_dob/age_months:label')"/>
        </input>
        <select appearance="horizontal" ref="/replace_user/new_contact/ephemeral_dob/dob_method">
          <item>
            <label ref="jr:itext('/replace_user/new_contact/ephemeral_dob/dob_method/approx:label')"/>
            <value>approx</value>
          </item>
        </select>
        <input ref="/replace_user/new_contact/ephemeral_dob/dob_debug">
          <label ref="jr:itext('/replace_user/new_contact/ephemeral_dob/dob_debug:label')"/>
        </input>
      </group>
      <select1 appearance="horizontal" ref="/replace_user/new_contact/sex">
        <label ref="jr:itext('/replace_user/new_contact/sex:label')"/>
        <item>
          <label ref="jr:itext('/replace_user/new_contact/sex/male:label')"/>
          <value>male</value>
        </item>
        <item>
          <label ref="jr:itext('/replace_user/new_contact/sex/female:label')"/>
          <value>female</value>
        </item>
      </select1>
      <input ref="/replace_user/new_contact/phone_read_only">
        <label ref="jr:itext('/replace_user/new_contact/phone_read_only:label')"/>
        <hint ref="jr:itext('/replace_user/new_contact/phone_read_only:hint')"/>
      </input>
      <input ref="/replace_user/new_contact/new_phone">
        <label ref="jr:itext('/replace_user/new_contact/new_phone:label')"/>
      </input>
      <input ref="/replace_user/new_contact/phone_alternate">
        <label ref="jr:itext('/replace_user/new_contact/phone_alternate:label')"/>
      </input>
      <select1 appearance="minimal" ref="/replace_user/new_contact/role">
        <label ref="jr:itext('/replace_user/new_contact/role:label')"/>
        <hint ref="jr:itext('/replace_user/new_contact/role:hint')"/>
        <item>
          <label ref="jr:itext('/replace_user/new_contact/role/chw:label')"/>
          <value>chw</value>
        </item>
        <item>
          <label ref="jr:itext('/replace_user/new_contact/role/chw_supervisor:label')"/>
          <value>chw_supervisor</value>
        </item>
        <item>
          <label ref="jr:itext('/replace_user/new_contact/role/nurse:label')"/>
          <value>nurse</value>
        </item>
        <item>
          <label ref="jr:itext('/replace_user/new_contact/role/manager:label')"/>
          <value>manager</value>
        </item>
        <item>
          <label ref="jr:itext('/replace_user/new_contact/role/patient:label')"/>
          <value>patient</value>
        </item>
        <item>
          <label ref="jr:itext('/replace_user/new_contact/role/other:label')"/>
          <value>other</value>
        </item>
      </select1>
      <input ref="/replace_user/new_contact/external_id">
        <label ref="jr:itext('/replace_user/new_contact/external_id:label')"/>
      </input>
      <group appearance="hidden" ref="/replace_user/new_contact/meta"/>
    </group>
    <group appearance="field-list summary" ref="/replace_user/outro">
      <input appearance="h1 red" ref="/replace_user/outro/warning_header">
        <label ref="jr:itext('/replace_user/outro/warning_header:label')"/>
      </input>
      <input ref="/replace_user/outro/warning">
        <label ref="jr:itext('/replace_user/outro/warning:label')"/>
      </input>
    </group>
  </h:body>
</h:html>
`,   
};
