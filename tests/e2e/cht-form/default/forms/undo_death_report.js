/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="undo_death_report">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Undo death report</h3>
<select id="form-languages" style="display:none;" data-default-lang=""><option value="en">en</option> </select>
  
  
    <section class="or-group-data or-branch pre-init or-appearance-field-list " name="/undo_death_report/inputs" data-relevant="./source = 'user'"><section class="or-group-data " name="/undo_death_report/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/undo_death_report/inputs/contact/_id:label">What is the patient's name?</span><input type="text" name="/undo_death_report/inputs/contact/_id" data-type-xml="person"></label><section class="or-group-data " name="/undo_death_report/inputs/contact/parent"><section class="or-group-data " name="/undo_death_report/inputs/contact/parent/parent"><section class="or-group-data " name="/undo_death_report/inputs/contact/parent/parent/contact">
      </section>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group-data or-appearance-field-list " name="/undo_death_report/undo"><fieldset class="question simple-select or-appearance-multiline ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/undo_death_report/undo/undo_information:label">Submitting this form will undo the death report of <span class="or-output" data-value=" /undo_death_report/patient_display_name "> </span>. Are you sure you want to undo the death report?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/undo_death_report/undo/undo_information" data-name="/undo_death_report/undo/undo_information" value="yes" data-required="true()" data-constraint=". = 'yes'" data-type-xml="select1"><span lang="" class="option-label active">Yes</span></label><label class=""><input type="radio" name="/undo_death_report/undo/undo_information" data-name="/undo_death_report/undo/undo_information" value="no" data-required="true()" data-constraint=". = 'yes'" data-type-xml="select1"><span lang="" class="option-label active">No</span></label>
</div>
</fieldset>
<span lang="en" class="or-constraint-msg active" data-itext-id="/undo_death_report/undo/undo_information:jr:constraintMsg">Only submit this report if you want to undo the death report.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
      </section>
    <section class="or-group-data or-appearance-hidden " name="/undo_death_report/data"><section class="or-group-data " name="/undo_death_report/data/meta">
      </section>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_age_in_years" data-calculate="floor( difference-in-months(  /undo_death_report/inputs/contact/date_of_birth , today() ) div 12 )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_age_in_months" data-calculate="difference-in-months(  /undo_death_report/inputs/contact/date_of_birth , today() )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_age_in_days" data-calculate="floor(decimal-date-time(today()) - decimal-date-time( /undo_death_report/inputs/contact/date_of_birth ) )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_short_name" data-calculate="../inputs/contact/short_name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_display_name" data-calculate="if(../patient_short_name = '', ../patient_name, concat(../patient_name, ' (', ../patient_short_name, ')'))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/data/__confirm_undo" data-calculate=" /undo_death_report/undo/undo_information " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/data/meta/__patient_uuid" data-calculate="../../../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/data/meta/__patient_id" data-calculate="../../../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/data/meta/__household_uuid" data-calculate="../../../inputs/contact/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/data/meta/__source" data-calculate="../../../inputs/source" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/data/meta/__source_id" data-calculate="../../../inputs/source_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <undo_death_report xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="undo_death_report" prefix="J1!undo_death_report!" version="2022-08-19 15:59:55">
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
                    <name/>
                    <phone/>
                  </contact>
                </parent>
              </parent>
            </contact>
          </inputs>
          <patient_age_in_years tag="hidden">0</patient_age_in_years>
          <patient_age_in_months tag="hidden">0</patient_age_in_months>
          <patient_age_in_days tag="hidden"/>
          <patient_uuid tag="hidden"/>
          <patient_id tag="hidden"/>
          <patient_name tag="hidden"/>
          <patient_short_name tag="hidden"/>
          <patient_display_name tag="hidden"/>
          <undo>
            <undo_information/>
          </undo>
          <data tag="hidden">
            <__confirm_undo/>
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
        </undo_death_report>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Undo death report</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/undo_death_report/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/undo_death_report/inputs/contact/date_of_birth:label">
            <value>Date of Birth</value>
          </text>
          <text id="/undo_death_report/inputs/contact/name:label">
            <value>Name</value>
          </text>
          <text id="/undo_death_report/inputs/contact/parent/_id:label">
            <value>Household ID</value>
          </text>
          <text id="/undo_death_report/inputs/contact/parent/parent/contact/name:label">
            <value>CHW name</value>
          </text>
          <text id="/undo_death_report/inputs/contact/parent/parent/contact/phone:label">
            <value>CHW phone</value>
          </text>
          <text id="/undo_death_report/inputs/contact/patient_id:label">
            <value>Patient ID</value>
          </text>
          <text id="/undo_death_report/inputs/contact/sex:label">
            <value>Sex</value>
          </text>
          <text id="/undo_death_report/inputs/contact/short_name:label">
            <value>Short Name</value>
          </text>
          <text id="/undo_death_report/inputs/source:label">
            <value>Source</value>
          </text>
          <text id="/undo_death_report/inputs/source_id:label">
            <value>Source ID</value>
          </text>
          <text id="/undo_death_report/undo/undo_information:jr:constraintMsg">
            <value>Only submit this report if you want to undo the death report.</value>
          </text>
          <text id="/undo_death_report/undo/undo_information:label">
            <value>Submitting this form will undo the death report of <output value=" /undo_death_report/patient_display_name "/>. Are you sure you want to undo the death report?</value>
          </text>
        </translation>
      </itext>
      <instance>
        <undo_death_report delimiter="#" id="undo_death_report" prefix="J1!undo_death_report!" version="2022-08-19 15:59:55">
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
                    <name/>
                    <phone/>
                  </contact>
                </parent>
              </parent>
            </contact>
          </inputs>
          <patient_age_in_years tag="hidden">0</patient_age_in_years>
          <patient_age_in_months tag="hidden">0</patient_age_in_months>
          <patient_age_in_days tag="hidden"/>
          <patient_uuid tag="hidden"/>
          <patient_id tag="hidden"/>
          <patient_name tag="hidden"/>
          <patient_short_name tag="hidden"/>
          <patient_display_name tag="hidden"/>
          <undo>
            <undo_information/>
          </undo>
          <data tag="hidden">
            <__confirm_undo/>
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
        </undo_death_report>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/undo_death_report/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/undo_death_report/inputs/source" type="string"/>
      <bind nodeset="/undo_death_report/inputs/source_id" type="string"/>
      <bind nodeset="/undo_death_report/inputs/contact/_id" type="db:person"/>
      <bind nodeset="/undo_death_report/inputs/contact/name" type="string"/>
      <bind nodeset="/undo_death_report/inputs/contact/short_name" type="string"/>
      <bind nodeset="/undo_death_report/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/undo_death_report/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/undo_death_report/inputs/contact/sex" type="string"/>
      <bind nodeset="/undo_death_report/inputs/contact/parent/_id" type="string"/>
      <bind nodeset="/undo_death_report/inputs/contact/parent/parent/contact/name" type="string"/>
      <bind nodeset="/undo_death_report/inputs/contact/parent/parent/contact/phone" type="string"/>
      <bind calculate="floor( difference-in-months(  /undo_death_report/inputs/contact/date_of_birth , today() ) div 12 )" nodeset="/undo_death_report/patient_age_in_years" type="string"/>
      <bind calculate="difference-in-months(  /undo_death_report/inputs/contact/date_of_birth , today() )" nodeset="/undo_death_report/patient_age_in_months" type="string"/>
      <bind calculate="floor(decimal-date-time(today()) - decimal-date-time( /undo_death_report/inputs/contact/date_of_birth ) )" nodeset="/undo_death_report/patient_age_in_days" type="string"/>
      <bind calculate="../inputs/contact/_id" nodeset="/undo_death_report/patient_uuid" type="string"/>
      <bind calculate="../inputs/contact/patient_id" nodeset="/undo_death_report/patient_id" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/undo_death_report/patient_name" type="string"/>
      <bind calculate="../inputs/contact/short_name" nodeset="/undo_death_report/patient_short_name" type="string"/>
      <bind calculate="if(../patient_short_name = '', ../patient_name, concat(../patient_name, ' (', ../patient_short_name, ')'))" nodeset="/undo_death_report/patient_display_name" type="string"/>
      <bind constraint=". = 'yes'" jr:constraintMsg="jr:itext('/undo_death_report/undo/undo_information:jr:constraintMsg')" nodeset="/undo_death_report/undo/undo_information" required="true()" type="select1"/>
      <bind calculate=" /undo_death_report/undo/undo_information " nodeset="/undo_death_report/data/__confirm_undo" type="string"/>
      <bind calculate="../../../inputs/contact/_id" nodeset="/undo_death_report/data/meta/__patient_uuid" type="string"/>
      <bind calculate="../../../inputs/contact/patient_id" nodeset="/undo_death_report/data/meta/__patient_id" type="string"/>
      <bind calculate="../../../inputs/contact/parent/_id" nodeset="/undo_death_report/data/meta/__household_uuid" type="string"/>
      <bind calculate="../../../inputs/source" nodeset="/undo_death_report/data/meta/__source" type="string"/>
      <bind calculate="../../../inputs/source_id" nodeset="/undo_death_report/data/meta/__source_id" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/undo_death_report/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/undo_death_report/inputs">
      <group ref="/undo_death_report/inputs/contact">
        <input appearance="db-object" ref="/undo_death_report/inputs/contact/_id">
          <label ref="jr:itext('/undo_death_report/inputs/contact/_id:label')"/>
        </input>
        <group ref="/undo_death_report/inputs/contact/parent">
          <group ref="/undo_death_report/inputs/contact/parent/parent">
            <group ref="/undo_death_report/inputs/contact/parent/parent/contact"/>
          </group>
        </group>
      </group>
    </group>
    <group appearance="field-list" ref="/undo_death_report/undo">
      <select1 appearance="multiline" ref="/undo_death_report/undo/undo_information">
        <label ref="jr:itext('/undo_death_report/undo/undo_information:label')"/>
        <item>
          <label>Yes</label>
          <value>yes</value>
        </item>
        <item>
          <label>No</label>
          <value>no</value>
        </item>
      </select1>
    </group>
    <group appearance="hidden" ref="/undo_death_report/data">
      <group ref="/undo_death_report/data/meta"/>
    </group>
  </h:body>
</h:html>
`,   
};
