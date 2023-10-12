/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="pregnancy_facility_visit_reminder">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Health facility ANC reminder</h3>
<select id="form-languages" style="display:none;" data-default-lang=""><option value="en">en</option> </select>
  
  
    <section class="or-group-data or-branch pre-init or-appearance-field-list " name="/pregnancy_facility_visit_reminder/inputs" data-relevant="./source = 'user'"><section class="or-group-data " name="/pregnancy_facility_visit_reminder/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/pregnancy_facility_visit_reminder/inputs/contact/_id:label">What is the patient's name?</span><input type="text" name="/pregnancy_facility_visit_reminder/inputs/contact/_id" data-type-xml="person"></label><section class="or-group-data " name="/pregnancy_facility_visit_reminder/inputs/contact/parent"><section class="or-group-data " name="/pregnancy_facility_visit_reminder/inputs/contact/parent/parent"><section class="or-group-data " name="/pregnancy_facility_visit_reminder/inputs/contact/parent/parent/contact">
      </section>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group or-appearance-field-list " name="/pregnancy_facility_visit_reminder/facility_visit_reminder"><h4><span lang="en" class="question-label active" data-itext-id="/pregnancy_facility_visit_reminder/facility_visit_reminder:label">Reminder of Upcoming Health Facility Visit</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_note:label">Please remind the client to attend their ANC visit on <span class="or-output" data-value=" /pregnancy_facility_visit_reminder/visit_date_for_task "> </span>.</span><input type="text" name="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_note" data-type-xml="string" readonly></label><fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method:label">Did you remind the client in-person or by phone?</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method" data-name="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method" value="in_person" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method/in_person:label">In person</span></label><label class=""><input type="radio" name="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method" data-name="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method" value="by_phone" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method/by_phone:label">By phone</span></label>
</div>
</fieldset></fieldset>
<section class="or-group-data or-appearance-hidden " name="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations"><fieldset class="question simple-select "><fieldset>
<legend>
          </legend>
<div class="option-wrapper"><label class=""><input type="radio" name="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_label_translator" data-name="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_label_translator" value="woman" data-calculate='"woman"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_label_translator/woman:label">the woman</span></label></div>
</fieldset></fieldset>
<fieldset class="question simple-select "><fieldset>
<legend>
          </legend>
<div class="option-wrapper"><label class=""><input type="radio" name="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_start_label_translator" data-name="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_start_label_translator" value="woman-start" data-calculate='"woman-start"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_start_label_translator/woman-start:label">The woman</span></label></div>
</fieldset></fieldset>
      </section>
      </section>
    <section class="or-group-data or-appearance-hidden " name="/pregnancy_facility_visit_reminder/data"><section class="or-group-data " name="/pregnancy_facility_visit_reminder/data/meta">
      </section>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/patient_age_in_years" data-calculate="floor( difference-in-months( ../inputs/contact/date_of_birth, today() ) div 12 )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/patient_short_name" data-calculate="coalesce(../inputs/contact/short_name, ../facility_visit_reminder/custom_translations/custom_woman_label)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/patient_short_name_start" data-calculate="coalesce(../inputs/contact/short_name, ../facility_visit_reminder/custom_translations/custom_woman_start_label)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/pregnancy_uuid_ctx" data-calculate="if(instance('contact-summary')/context/pregnancy_uuid != '', instance('contact-summary')/context/pregnancy_uuid, .)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/visit_date_for_task" data-calculate='format-date-time(../inputs/source_visit_date, "%e %b, %Y")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_label" data-calculate="jr:choice-name( /pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_label_translator ,' /pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_label_translator ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_start_label" data-calculate="jr:choice-name( /pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_start_label_translator ,' /pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_start_label_translator ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/data/__how_reminded" data-calculate=" /pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/data/meta/__patient_uuid" data-calculate="../../../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/data/meta/__patient_id" data-calculate="../../../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/data/meta/__household_uuid" data-calculate="../../../inputs/contact/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/data/meta/__source" data-calculate="../../../inputs/source" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/data/meta/__source_id" data-calculate="../../../inputs/source_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/data/meta/__pregnancy_uuid" data-calculate=" /pregnancy_facility_visit_reminder/pregnancy_uuid_ctx " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_facility_visit_reminder/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <pregnancy_facility_visit_reminder xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="pregnancy_facility_visit_reminder" prefix="J1!pregnancy_facility_visit_reminder!" version="2019-11-04 14:15:20">
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
            <source_visit_date/>
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
          <pregnancy_uuid_ctx/>
          <visit_date_for_task/>
          <facility_visit_reminder>
            <remind_note tag="hidden"/>
            <remind_method/>
            <custom_translations tag="hidden">
              <custom_woman_label_translator/>
              <custom_woman_label/>
              <custom_woman_start_label_translator/>
              <custom_woman_start_label/>
            </custom_translations>
          </facility_visit_reminder>
          <data tag="hidden">
            <__how_reminded/>
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
        </pregnancy_facility_visit_reminder>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Health facility ANC reminder</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_label_translator/woman:label">
            <value>the woman</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_start_label_translator/woman-start:label">
            <value>The woman</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method/by_phone:label">
            <value>By phone</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method/in_person:label">
            <value>In person</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method:label">
            <value>Did you remind the client in-person or by phone?</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_note:label">
            <value>Please remind the client to attend their ANC visit on <output value=" /pregnancy_facility_visit_reminder/visit_date_for_task "/>.</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/facility_visit_reminder:label">
            <value>Reminder of Upcoming Health Facility Visit</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/inputs/contact/date_of_birth:label">
            <value>Date of Birth</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/inputs/contact/name:label">
            <value>Name</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/inputs/contact/parent/_id:label">
            <value>Parent ID</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/inputs/contact/parent/parent/contact/chw_name:label">
            <value>CHW name</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/inputs/contact/parent/parent/contact/phone:label">
            <value>CHW phone</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/inputs/contact/patient_id:label">
            <value>Patient ID</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/inputs/contact/sex:label">
            <value>Sex</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/inputs/contact/short_name:label">
            <value>Short Name</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/inputs/source:label">
            <value>Source</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/inputs/source_id:label">
            <value>Source ID</value>
          </text>
          <text id="/pregnancy_facility_visit_reminder/inputs/source_visit_date:label">
            <value>Visit Date</value>
          </text>
        </translation>
      </itext>
      <instance>
        <pregnancy_facility_visit_reminder delimiter="#" id="pregnancy_facility_visit_reminder" prefix="J1!pregnancy_facility_visit_reminder!" version="2019-11-04 14:15:20">
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
            <source_visit_date/>
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
          <pregnancy_uuid_ctx/>
          <visit_date_for_task/>
          <facility_visit_reminder>
            <remind_note tag="hidden"/>
            <remind_method/>
            <custom_translations tag="hidden">
              <custom_woman_label_translator/>
              <custom_woman_label/>
              <custom_woman_start_label_translator/>
              <custom_woman_start_label/>
            </custom_translations>
          </facility_visit_reminder>
          <data tag="hidden">
            <__how_reminded/>
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
        </pregnancy_facility_visit_reminder>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/inputs/source" type="string"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/inputs/source_id" type="string"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/inputs/source_visit_date" type="string"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/inputs/contact/_id" type="db:person"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/inputs/contact/name" type="string"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/inputs/contact/short_name" type="string"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/inputs/contact/sex" type="string"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/inputs/contact/parent/_id" type="string"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/inputs/contact/parent/parent/contact/chw_name" type="string"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/inputs/contact/parent/parent/contact/phone" type="string"/>
      <bind calculate="floor( difference-in-months( ../inputs/contact/date_of_birth, today() ) div 12 )" nodeset="/pregnancy_facility_visit_reminder/patient_age_in_years" type="string"/>
      <bind calculate="../inputs/contact/_id" nodeset="/pregnancy_facility_visit_reminder/patient_uuid" type="string"/>
      <bind calculate="../inputs/contact/patient_id" nodeset="/pregnancy_facility_visit_reminder/patient_id" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/pregnancy_facility_visit_reminder/patient_name" type="string"/>
      <bind calculate="coalesce(../inputs/contact/short_name, ../facility_visit_reminder/custom_translations/custom_woman_label)" nodeset="/pregnancy_facility_visit_reminder/patient_short_name" type="string"/>
      <bind calculate="coalesce(../inputs/contact/short_name, ../facility_visit_reminder/custom_translations/custom_woman_start_label)" nodeset="/pregnancy_facility_visit_reminder/patient_short_name_start" type="string"/>
      <bind calculate="if(instance('contact-summary')/context/pregnancy_uuid != '', instance('contact-summary')/context/pregnancy_uuid, .)" nodeset="/pregnancy_facility_visit_reminder/pregnancy_uuid_ctx" type="string"/>
      <bind calculate="format-date-time(../inputs/source_visit_date, &quot;%e %b, %Y&quot;)" nodeset="/pregnancy_facility_visit_reminder/visit_date_for_task" type="string"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method" type="select1"/>
      <bind calculate="&quot;woman&quot;" nodeset="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_label_translator" type="select1"/>
      <bind calculate="jr:choice-name( /pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_label_translator ,' /pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_label_translator ')" nodeset="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_label" type="string"/>
      <bind calculate="&quot;woman-start&quot;" nodeset="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_start_label_translator" type="select1"/>
      <bind calculate="jr:choice-name( /pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_start_label_translator ,' /pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_start_label_translator ')" nodeset="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_start_label" type="string"/>
      <bind calculate=" /pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method " nodeset="/pregnancy_facility_visit_reminder/data/__how_reminded" type="string"/>
      <bind calculate="../../../inputs/contact/_id" nodeset="/pregnancy_facility_visit_reminder/data/meta/__patient_uuid" type="string"/>
      <bind calculate="../../../inputs/contact/patient_id" nodeset="/pregnancy_facility_visit_reminder/data/meta/__patient_id" type="string"/>
      <bind calculate="../../../inputs/contact/parent/_id" nodeset="/pregnancy_facility_visit_reminder/data/meta/__household_uuid" type="string"/>
      <bind calculate="../../../inputs/source" nodeset="/pregnancy_facility_visit_reminder/data/meta/__source" type="string"/>
      <bind calculate="../../../inputs/source_id" nodeset="/pregnancy_facility_visit_reminder/data/meta/__source_id" type="string"/>
      <bind calculate=" /pregnancy_facility_visit_reminder/pregnancy_uuid_ctx " nodeset="/pregnancy_facility_visit_reminder/data/meta/__pregnancy_uuid" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/pregnancy_facility_visit_reminder/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/pregnancy_facility_visit_reminder/inputs">
      <group ref="/pregnancy_facility_visit_reminder/inputs/contact">
        <input appearance="db-object" ref="/pregnancy_facility_visit_reminder/inputs/contact/_id">
          <label ref="jr:itext('/pregnancy_facility_visit_reminder/inputs/contact/_id:label')"/>
        </input>
        <group ref="/pregnancy_facility_visit_reminder/inputs/contact/parent">
          <group ref="/pregnancy_facility_visit_reminder/inputs/contact/parent/parent">
            <group ref="/pregnancy_facility_visit_reminder/inputs/contact/parent/parent/contact"/>
          </group>
        </group>
      </group>
    </group>
    <group appearance="field-list" ref="/pregnancy_facility_visit_reminder/facility_visit_reminder">
      <label ref="jr:itext('/pregnancy_facility_visit_reminder/facility_visit_reminder:label')"/>
      <input ref="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_note">
        <label ref="jr:itext('/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_note:label')"/>
      </input>
      <select1 ref="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method">
        <label ref="jr:itext('/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method/in_person:label')"/>
          <value>in_person</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method/by_phone:label')"/>
          <value>by_phone</value>
        </item>
      </select1>
      <group appearance="hidden" ref="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations">
        <select1 ref="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_label_translator">
          <item>
            <label ref="jr:itext('/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_label_translator/woman:label')"/>
            <value>woman</value>
          </item>
        </select1>
        <select1 ref="/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_start_label_translator">
          <item>
            <label ref="jr:itext('/pregnancy_facility_visit_reminder/facility_visit_reminder/custom_translations/custom_woman_start_label_translator/woman-start:label')"/>
            <value>woman-start</value>
          </item>
        </select1>
      </group>
    </group>
    <group appearance="hidden" ref="/pregnancy_facility_visit_reminder/data">
      <group ref="/pregnancy_facility_visit_reminder/data/meta"/>
    </group>
  </h:body>
</h:html>
`,   
};
