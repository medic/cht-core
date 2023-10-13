/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="death_report">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Death report</h3>
<select id="form-languages" style="display:none;" data-default-lang=""><option value="en">en</option><option value="es">es</option></select>
  
  
    <section class="or-group-data or-branch pre-init or-appearance-field-list " name="/death_report/inputs" data-relevant="./source = 'user'"><section class="or-group " name="/death_report/inputs/contact"><h4><span lang="en" class="question-label active" data-itext-id="/death_report/inputs/contact:label">Contact</span><span lang="es" class="question-label" data-itext-id="/death_report/inputs/contact:label">Contacto</span></h4>
<label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/death_report/inputs/contact/_id:label">What is the patient's name?</span><span lang="es" class="question-label" data-itext-id="/death_report/inputs/contact/_id:label">¿Cuál es el nombre del paciente?</span><input type="text" name="/death_report/inputs/contact/_id" data-type-xml="person"></label><section class="or-group-data " name="/death_report/inputs/contact/parent"><section class="or-group-data " name="/death_report/inputs/contact/parent/parent"><section class="or-group " name="/death_report/inputs/contact/parent/parent/contact"><h4><span lang="en" class="question-label active" data-itext-id="/death_report/inputs/contact/parent/parent/contact:label">Contact</span><span lang="es" class="question-label" data-itext-id="/death_report/inputs/contact/parent/parent/contact:label">Contacto</span></h4>
      </section>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group or-appearance-field-list " name="/death_report/death_details"><h4><span lang="en" class="question-label active" data-itext-id="/death_report/death_details:label">Death details</span><span lang="es" class="question-label" data-itext-id="/death_report/death_details:label">Detalles del fallecimiento</span></h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/death_report/death_details/date_of_death:label">Date of Death</span><span lang="es" class="question-label" data-itext-id="/death_report/death_details/date_of_death:label">Fecha del fallecimiento</span><span class="required">*</span><input type="date" name="/death_report/death_details/date_of_death" data-required="true()" data-constraint="(. &lt;= now()) and floor(decimal-date-time(today()) - decimal-date-time(.)) &lt;= 365" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/death_report/death_details/date_of_death:jr:constraintMsg">Date of death can only be from today up to 1 year ago.</span><span lang="es" class="or-constraint-msg" data-itext-id="/death_report/death_details/date_of_death:jr:constraintMsg">La fecha de fallecimineto no puede tener más de un año de antigüedad.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/death_report/death_details/place_of_death:label">Place of death</span><span lang="es" class="question-label" data-itext-id="/death_report/death_details/place_of_death:label">Lugar del fallecimiento</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/death_report/death_details/place_of_death" data-name="/death_report/death_details/place_of_death" value="health_facility" data-required="true()" data-type-xml="select1"><span lang="es" class="option-label">Centro de salud</span><span lang="en" class="option-label active">Health facility</span></label><label class=""><input type="radio" name="/death_report/death_details/place_of_death" data-name="/death_report/death_details/place_of_death" value="home" data-required="true()" data-type-xml="select1"><span lang="es" class="option-label active">Casa</span><span lang="en" class="option-label active">Home</span></label><label class=""><input type="radio" name="/death_report/death_details/place_of_death" data-name="/death_report/death_details/place_of_death" value="other" data-required="true()" data-type-xml="select1"><span lang="es" class="option-label active">Otro</span><span lang="en" class="option-label active">Other</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/death_report/death_details/place_of_death_other:label">Specify other</span><span lang="es" class="question-label" data-itext-id="/death_report/death_details/place_of_death_other:label">Especifique otro</span><span class="required">*</span><input type="text" name="/death_report/death_details/place_of_death_other" data-required="true()" data-relevant="selected(../place_of_death, 'other')" data-type-xml="string"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select or-appearance-multiline "><span lang="en" class="question-label active" data-itext-id="/death_report/death_details/death_information:label">Provide any relevant information related to the death of <span class="or-output" data-value=" /death_report/patient_display_name "> </span>.</span><span lang="es" class="question-label" data-itext-id="/death_report/death_details/death_information:label">Provea cualquier información relevante relacionada con el fallecimiento de <span class="or-output" data-value=" /death_report/patient_display_name "> </span>.</span><textarea name="/death_report/death_details/death_information" data-type-xml="string"></textarea></label>
      </section>
    <section class="or-group-data or-appearance-field-list or-appearance-summary " name="/death_report/group_review"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/death_report/group_review/submit:label"><h4 style="text-align:center;">To finish, be sure to click the Submit button.</h4></span><span lang="es" class="question-label" data-itext-id="/death_report/group_review/submit:label"><h4 style="text-align:center;">Para finalizar, asegurese de presionar el botón Enviar.</h4></span><input type="text" name="/death_report/group_review/submit" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-yellow "><span lang="en" class="question-label active" data-itext-id="/death_report/group_review/r_summary_details:label">Patient Details<I class="fa fa-user"></i></span><span lang="es" class="question-label" data-itext-id="/death_report/group_review/r_summary_details:label">Detalles del paciente<I class="fa fa-user"></i></span><input type="text" name="/death_report/group_review/r_summary_details" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/death_report/group_review/r_patient_details:label"><div style="text-align:center;"><span class="or-output" data-value=" /death_report/patient_display_name "> </span><span lang="es" class="question-label" data-itext-id="/death_report/group_review/r_patient_details:label"><div style="text-align:center;"><span class="or-output" data-value=" /death_report/patient_display_name "> </span><br><span class="or-output" data-value=" /death_report/group_review/c_patient_age "> </span><br>Date of Death: <span class="or-output" data-value=" /death_report/death_details/date_of_death "> </span></div></span><input type="text" name="/death_report/group_review/r_patient_details" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/death_report/group_review/r_death_info:label"><div style="text-align:center;">Relevant Information: <span class="or-output" data-value=" /death_report/death_details/death_information "> </span></div></span><span lang="es" class="question-label" data-itext-id="/death_report/group_review/r_death_info:label"><div style="text-align:center;">Información relevante: <span class="or-output" data-value=" /death_report/death_details/death_information "> </span></div></span><input type="text" name="/death_report/group_review/r_death_info" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-blue "><span lang="en" class="question-label active" data-itext-id="/death_report/group_review/r_key_instruction:label"><b>Important Information</b><i class="fa fa-warning"></i></span><span lang="es" class="question-label" data-itext-id="/death_report/group_review/r_key_instruction:label"><b>Información importante</b><i class="fa fa-warning"></i></span><input type="text" name="/death_report/group_review/r_key_instruction" data-type-xml="string" readonly></label><label class="question non-select "><input type="text" name="/death_report/group_review/blank_note" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-red "><span lang="en" class="question-label active" data-itext-id="/death_report/group_review/r_referral:label"><b>You will never be able to do any follow ups on <span class="or-output" data-value=" /death_report/patient_display_name "> </span> when you submit this death report.</b></span><span lang="es" class="question-label" data-itext-id="/death_report/group_review/r_referral:label"><b>Nunca va a ser capaz de hacer ningún seguimiento para <span class="or-output" data-value=" /death_report/patient_display_name "> </span> cuando envíe este reporte de fallecimiento.</b></span><input type="text" name="/death_report/group_review/r_referral" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/death_report/group_review/r_undo:label">You will be able to undo this death report later, if needed.</span><span lang="es" class="question-label active" data-itext-id="/death_report/group_review/r_undo:label">Puede deshacer este reporte de fallecimiento después si fuera necesario.</span><input type="text" name="/death_report/group_review/r_undo" data-type-xml="string" readonly></label>
      </section>
    <section class="or-group-data or-appearance-hidden " name="/death_report/data"><section class="or-group-data " name="/death_report/data/meta">
      </section>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/death_report/patient_age_in_years" data-calculate="floor( difference-in-months(  /death_report/inputs/contact/date_of_birth , today() ) div 12 )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/patient_age_in_months" data-calculate="difference-in-months(  /death_report/inputs/contact/date_of_birth , today() )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/patient_age_in_days" data-calculate="floor(decimal-date-time(today()) - decimal-date-time( /death_report/inputs/contact/date_of_birth ) )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/patient_short_name" data-calculate="../inputs/contact/short_name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/patient_display_name" data-calculate="if(../patient_short_name = '', ../patient_name, concat(../patient_name, ' (', ../patient_short_name, ')'))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/group_review/c_patient_age" data-calculate="if(../../patient_age_in_days &lt; 31,  concat(../../patient_age_in_days, ' days old'), if(../../patient_age_in_months &lt; 12,  concat(../../patient_age_in_months, ' months old'),  concat(../../patient_age_in_years, ' years old')))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/data/__date_of_death" data-calculate=" /death_report/death_details/date_of_death " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/data/__place_of_death" data-calculate=" /death_report/death_details/place_of_death " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/data/__place_of_death_other" data-calculate=" /death_report/death_details/place_of_death_other " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/data/__death_information" data-calculate=" /death_report/death_details/death_information " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/data/meta/__patient_uuid" data-calculate="../../../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/data/meta/__patient_id" data-calculate="../../../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/data/meta/__household_uuid" data-calculate="../../../inputs/contact/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/data/meta/__source" data-calculate="../../../inputs/source" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/data/meta/__source_id" data-calculate="../../../inputs/source_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/death_report/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <death_report xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" id="death_report" prefix="J1!death_report!" delimiter="#" version="2022-09-26 12:09:48">
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
          <death_details>
            <date_of_death/>
            <place_of_death/>
            <place_of_death_other/>
            <death_information/>
          </death_details>
          <group_review tag="hidden">
            <submit/>
            <r_summary_details/>
            <c_patient_age/>
            <r_patient_details/>
            <r_death_info/>
            <r_key_instruction/>
            <blank_note/>
            <r_referral/>
            <r_undo/>
          </group_review>
          <data tag="hidden">
            <__date_of_death/>
            <__place_of_death/>
            <__place_of_death_other/>
            <__death_information/>
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
        </death_report>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
  <h:head>
    <h:title>Death report</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/death_report/death_details/date_of_death:jr:constraintMsg">
            <value>Date of death can only be from today up to 1 year ago.</value>
          </text>
          <text id="/death_report/death_details/date_of_death:label">
            <value>Date of Death</value>
          </text>
          <text id="/death_report/death_details/death_information:label">
            <value>Provide any relevant information related to the death of <output value=" /death_report/patient_display_name "/>.</value>
          </text>
          <text id="/death_report/death_details/place_of_death:label">
            <value>Place of death</value>
          </text>
          <text id="/death_report/death_details/place_of_death_other:label">
            <value>Specify other</value>
          </text>
          <text id="/death_report/death_details:label">
            <value>Death details</value>
          </text>
          <text id="/death_report/group_review/r_death_info:label">
            <value>&lt;div style=&quot;text-align:center;&quot;&gt;Relevant Information: <output value=" /death_report/death_details/death_information "/>&lt;/div&gt;</value>
          </text>
          <text id="/death_report/group_review/r_key_instruction:label">
            <value>&lt;b&gt;Important Information&lt;/b&gt;&lt;i class="fa fa-warning"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/death_report/group_review/r_patient_details:label">
            <value>&lt;div style=&quot;text-align:center;&quot;&gt;<output value=" /death_report/patient_display_name "/>
<output value=" /death_report/group_review/c_patient_age "/>
Date of Death: <output value=" /death_report/death_details/date_of_death "/>&lt;/div&gt;</value>
          </text>
          <text id="/death_report/group_review/r_referral:label">
            <value>&lt;b&gt;You will never be able to do any follow ups on <output value=" /death_report/patient_display_name "/> when you submit this death report.&lt;/b&gt;</value>
          </text>
          <text id="/death_report/group_review/r_summary_details:label">
            <value>Patient Details&lt;I class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/death_report/group_review/r_undo:label">
            <value>You will be able to undo this death report later, if needed.</value>
          </text>
          <text id="/death_report/group_review/submit:label">
            <value>&lt;h4 style="text-align:center;"&gt;Para finalizar, asegurese de presionar el botón Enviar.&lt;/h4&gt;</value>
          </text>
          <text id="/death_report/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/death_report/inputs/contact/date_of_birth:label">
            <value>Date of Birth</value>
          </text>
          <text id="/death_report/inputs/contact/name:label">
            <value>Name</value>
          </text>
          <text id="/death_report/inputs/contact/parent/_id:label">
            <value>Household ID</value>
          </text>
          <text id="/death_report/inputs/contact/parent/parent/contact/name:label">
            <value>CHW name</value>
          </text>
          <text id="/death_report/inputs/contact/parent/parent/contact/phone:label">
            <value>CHW phone</value>
          </text>
          <text id="/death_report/inputs/contact/parent/parent/contact:label">
            <value>Contact</value>
          </text>
          <text id="/death_report/inputs/contact/patient_id:label">
            <value>Patient ID</value>
          </text>
          <text id="/death_report/inputs/contact/sex:label">
            <value>Sex</value>
          </text>
          <text id="/death_report/inputs/contact/short_name:label">
            <value>Short Name</value>
          </text>
          <text id="/death_report/inputs/contact:label">
            <value>Contact</value>
          </text>
          <text id="/death_report/inputs/source:label">
            <value>Source</value>
          </text>
          <text id="/death_report/inputs/source_id:label">
            <value>Source ID</value>
          </text>
        </translation>        
        <translation lang="es">
          <text id="/death_report/death_details/date_of_death:jr:constraintMsg">
            <value>La fecha de fallecimineto no puede tener más de un año de antigüedad.</value>
          </text>
          <text id="/death_report/death_details/date_of_death:label">
            <value>Fecha del fallecimiento</value>
          </text>
          <text id="/death_report/death_details/death_information:label">
            <value>Provea cualquier información relevante relacionada con el fallecimiento de <output value=" /death_report/patient_display_name "/>.</value>
          </text>
          <text id="/death_report/death_details/place_of_death:label">
            <value>Lugar del fallecimiento</value>
          </text>
          <text id="/death_report/death_details/place_of_death_other:label">
            <value>Especifique otro</value>
          </text>
          <text id="/death_report/death_details:label">
            <value>Detalles del fallecimiento</value>
          </text>
          <text id="/death_report/group_review/r_death_info:label">
            <value>&lt;div style=&quot;text-align:center;&quot;&gt;Relevant Information: <output value=" /death_report/death_details/death_information "/>&lt;/div&gt;</value>
          </text>
          <text id="/death_report/group_review/r_key_instruction:label">
            <value>&lt;b&gt;Información importante&lt;/b&gt;&lt;i class="fa fa-warning"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/death_report/group_review/r_patient_details:label">
            <value>&lt;div style=&quot;text-align:center;&quot;&gt;<output value=" /death_report/patient_display_name "/>
<output value=" /death_report/group_review/c_patient_age "/>
Fecha del fallecimiento: <output value=" /death_report/death_details/date_of_death "/>&lt;/div&gt;</value>
          </text>
          <text id="/death_report/group_review/r_referral:label">
            <value>&lt;b&gt;Nunca va a ser capaz de hacer ningún seguimiento para <output value=" /death_report/patient_display_name "/> cuando envíe este reporte de fallecimiento..&lt;/b&gt;</value>
          </text>
          <text id="/death_report/group_review/r_summary_details:label">
            <value>Detalles del paciente&lt;I class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/death_report/group_review/r_undo:label">
            <value>Puede deshacer este reporte de fallecimiento después si fuera necesario.</value>
          </text>
          <text id="/death_report/group_review/submit:label">
            <value>&lt;h4 style="text-align:center;"&gt;To finish, be sure to click the Submit button.&lt;/h4&gt;</value>
          </text>
          <text id="/death_report/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/death_report/inputs/contact/date_of_birth:label">
            <value>Date of Birth</value>
          </text>
          <text id="/death_report/inputs/contact/name:label">
            <value>Name</value>
          </text>
          <text id="/death_report/inputs/contact/parent/_id:label">
            <value>Household ID</value>
          </text>
          <text id="/death_report/inputs/contact/parent/parent/contact/name:label">
            <value>CHW name</value>
          </text>
          <text id="/death_report/inputs/contact/parent/parent/contact/phone:label">
            <value>CHW phone</value>
          </text>
          <text id="/death_report/inputs/contact/parent/parent/contact:label">
            <value>Contact</value>
          </text>
          <text id="/death_report/inputs/contact/patient_id:label">
            <value>Patient ID</value>
          </text>
          <text id="/death_report/inputs/contact/sex:label">
            <value>Sex</value>
          </text>
          <text id="/death_report/inputs/contact/short_name:label">
            <value>Short Name</value>
          </text>
          <text id="/death_report/inputs/contact:label">
            <value>Contact</value>
          </text>
          <text id="/death_report/inputs/source:label">
            <value>Source</value>
          </text>
          <text id="/death_report/inputs/source_id:label">
            <value>Source ID</value>
          </text>
        </translation>
      </itext>
      <instance>
        <death_report id="death_report" prefix="J1!death_report!" delimiter="#" version="2022-09-26 12:09:48">
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
          <death_details>
            <date_of_death/>
            <place_of_death/>
            <place_of_death_other/>
            <death_information/>
          </death_details>
          <group_review tag="hidden">
            <submit/>
            <r_summary_details/>
            <c_patient_age/>
            <r_patient_details/>
            <r_death_info/>
            <r_key_instruction/>
            <blank_note/>
            <r_referral/>
            <r_undo/>
          </group_review>
          <data tag="hidden">
            <__date_of_death/>
            <__place_of_death/>
            <__place_of_death_other/>
            <__death_information/>
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
        </death_report>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/death_report/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/death_report/inputs/source" type="string"/>
      <bind nodeset="/death_report/inputs/source_id" type="string"/>
      <bind nodeset="/death_report/inputs/contact/_id" type="db:person"/>
      <bind nodeset="/death_report/inputs/contact/name" type="string"/>
      <bind nodeset="/death_report/inputs/contact/short_name" type="string"/>
      <bind nodeset="/death_report/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/death_report/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/death_report/inputs/contact/sex" type="string"/>
      <bind nodeset="/death_report/inputs/contact/parent/_id" type="string"/>
      <bind nodeset="/death_report/inputs/contact/parent/parent/contact/name" type="string"/>
      <bind nodeset="/death_report/inputs/contact/parent/parent/contact/phone" type="string"/>
      <bind nodeset="/death_report/patient_age_in_years" type="string" calculate="floor( difference-in-months(  /death_report/inputs/contact/date_of_birth , today() ) div 12 )"/>
      <bind nodeset="/death_report/patient_age_in_months" type="string" calculate="difference-in-months(  /death_report/inputs/contact/date_of_birth , today() )"/>
      <bind nodeset="/death_report/patient_age_in_days" type="string" calculate="floor(decimal-date-time(today()) - decimal-date-time( /death_report/inputs/contact/date_of_birth ) )"/>
      <bind nodeset="/death_report/patient_uuid" type="string" calculate="../inputs/contact/_id"/>
      <bind nodeset="/death_report/patient_id" type="string" calculate="../inputs/contact/patient_id"/>
      <bind nodeset="/death_report/patient_name" type="string" calculate="../inputs/contact/name"/>
      <bind nodeset="/death_report/patient_short_name" type="string" calculate="../inputs/contact/short_name"/>
      <bind nodeset="/death_report/patient_display_name" type="string" calculate="if(../patient_short_name = '', ../patient_name, concat(../patient_name, ' (', ../patient_short_name, ')'))"/>
      <bind nodeset="/death_report/death_details/date_of_death" type="date" required="true()" constraint="(. &lt;= now()) and floor(decimal-date-time(today()) - decimal-date-time(.)) &lt;= 365" jr:constraintMsg="jr:itext('/death_report/death_details/date_of_death:jr:constraintMsg')"/>
      <bind nodeset="/death_report/death_details/place_of_death" type="select1" required="true()"/>
      <bind nodeset="/death_report/death_details/place_of_death_other" type="string" required="true()" relevant="selected(../place_of_death, 'other')"/>
      <bind nodeset="/death_report/death_details/death_information" type="string"/>
      <bind nodeset="/death_report/group_review/submit" readonly="true()" type="string"/>
      <bind nodeset="/death_report/group_review/r_summary_details" readonly="true()" type="string"/>
      <bind nodeset="/death_report/group_review/c_patient_age" type="string" calculate="if(../../patient_age_in_days &lt; 31, 
concat(../../patient_age_in_days, ' days old'),
if(../../patient_age_in_months &lt; 12, 
concat(../../patient_age_in_months, ' months old'), 
concat(../../patient_age_in_years, ' years old')))"/>
      <bind nodeset="/death_report/group_review/r_patient_details" readonly="true()" type="string"/>
      <bind nodeset="/death_report/group_review/r_death_info" readonly="true()" type="string"/>
      <bind nodeset="/death_report/group_review/r_key_instruction" readonly="true()" type="string"/>
      <bind nodeset="/death_report/group_review/blank_note" readonly="true()" type="string"/>
      <bind nodeset="/death_report/group_review/r_referral" readonly="true()" type="string"/>
      <bind nodeset="/death_report/group_review/r_undo" readonly="true()" type="string"/>
      <bind nodeset="/death_report/data/__date_of_death" type="string" calculate=" /death_report/death_details/date_of_death "/>
      <bind nodeset="/death_report/data/__place_of_death" type="string" calculate=" /death_report/death_details/place_of_death "/>
      <bind nodeset="/death_report/data/__place_of_death_other" type="string" calculate=" /death_report/death_details/place_of_death_other "/>
      <bind nodeset="/death_report/data/__death_information" type="string" calculate=" /death_report/death_details/death_information "/>
      <bind nodeset="/death_report/data/meta/__patient_uuid" type="string" calculate="../../../inputs/contact/_id"/>
      <bind nodeset="/death_report/data/meta/__patient_id" type="string" calculate="../../../inputs/contact/patient_id"/>
      <bind nodeset="/death_report/data/meta/__household_uuid" type="string" calculate="../../../inputs/contact/parent/_id"/>
      <bind nodeset="/death_report/data/meta/__source" type="string" calculate="../../../inputs/source"/>
      <bind nodeset="/death_report/data/meta/__source_id" type="string" calculate="../../../inputs/source_id"/>
      <bind nodeset="/death_report/meta/instanceID" type="string" readonly="true()" calculate="concat('uuid:', uuid())"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/death_report/inputs">
      <group ref="/death_report/inputs/contact">
        <label ref="jr:itext('/death_report/inputs/contact:label')"/>
        <input appearance="db-object" ref="/death_report/inputs/contact/_id">
          <label ref="jr:itext('/death_report/inputs/contact/_id:label')"/>
        </input>
        <group ref="/death_report/inputs/contact/parent">
          <group ref="/death_report/inputs/contact/parent/parent">
            <group ref="/death_report/inputs/contact/parent/parent/contact">
              <label ref="jr:itext('/death_report/inputs/contact/parent/parent/contact:label')"/>
            </group>
          </group>
        </group>
      </group>
    </group>
    <group appearance="field-list" ref="/death_report/death_details">
      <label ref="jr:itext('/death_report/death_details:label')"/>
      <input ref="/death_report/death_details/date_of_death">
        <label ref="jr:itext('/death_report/death_details/date_of_death:label')"/>
      </input>
      <select1 ref="/death_report/death_details/place_of_death">
        <label ref="jr:itext('/death_report/death_details/place_of_death:label')"/>
        <item>
          <label>Health facility</label>
          <value>health_facility</value>
        </item>
        <item>
          <label>Home</label>
          <value>home</value>
        </item>
        <item>
          <label>Other</label>
          <value>other</value>
        </item>
      </select1>
      <input ref="/death_report/death_details/place_of_death_other">
        <label ref="jr:itext('/death_report/death_details/place_of_death_other:label')"/>
      </input>
      <input appearance="multiline" ref="/death_report/death_details/death_information">
        <label ref="jr:itext('/death_report/death_details/death_information:label')"/>
      </input>
    </group>
    <group appearance="field-list summary" ref="/death_report/group_review">
      <input ref="/death_report/group_review/submit">
        <label ref="jr:itext('/death_report/group_review/submit:label')"/>
      </input>
      <input appearance="h1 yellow" ref="/death_report/group_review/r_summary_details">
        <label ref="jr:itext('/death_report/group_review/r_summary_details:label')"/>
      </input>
      <input ref="/death_report/group_review/r_patient_details">
        <label ref="jr:itext('/death_report/group_review/r_patient_details:label')"/>
      </input>
      <input ref="/death_report/group_review/r_death_info">
        <label ref="jr:itext('/death_report/group_review/r_death_info:label')"/>
      </input>
      <input appearance="h1 blue" ref="/death_report/group_review/r_key_instruction">
        <label ref="jr:itext('/death_report/group_review/r_key_instruction:label')"/>
      </input>
      <input ref="/death_report/group_review/blank_note"/>
      <input appearance="h1 red" ref="/death_report/group_review/r_referral">
        <label ref="jr:itext('/death_report/group_review/r_referral:label')"/>
      </input>
      <input ref="/death_report/group_review/r_undo">
        <label ref="jr:itext('/death_report/group_review/r_undo:label')"/>
      </input>
    </group>
    <group appearance="hidden" ref="/death_report/data">
      <group ref="/death_report/data/meta"/>
    </group>
  </h:body>
</h:html>
`,   
};
