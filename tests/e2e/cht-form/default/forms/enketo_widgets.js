/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="enketo_widgets">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Enketo Widgets</h3>
<select id="form-languages" style="display:none;" data-default-lang=""><option value="en">en</option> </select>
  
  
    <section class="or-group or-appearance-field-list " name="/enketo_widgets/enketo_test_select"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/enketo_test_select:label">Select widgets</span></h4>
<label class="question or-appearance-minimal "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/enketo_test_select/select_spinner:label">Select multiple: pulldown</span><span lang="" class="or-hint active">Showing a pull-down list of options (type=select_multiple list, appearance=minimal)</span><select multiple name="/enketo_widgets/enketo_test_select/select_spinner" data-type-xml="select"><option value="">...</option>
<option value="a">option a</option>
<option value="b">option b</option>
<option value="c">option c</option>
<option value="d">option d</option></select><span class="or-option-translations" style="display:none;">
        </span></label><label class="question or-appearance-minimal "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/enketo_test_select/select1_spinner:label">Select one: pulldown</span><span lang="" class="or-hint active">Showing a pull-down list of options (type=select_one list, appearance=minimal)</span><select name="/enketo_widgets/enketo_test_select/select1_spinner" data-name="/enketo_widgets/enketo_test_select/select1_spinner" data-type-xml="select1"><option value="">...</option>
<option value="a">option a</option>
<option value="b">option b</option>
<option value="c">option c</option>
<option value="d">option d</option></select><span class="or-option-translations" style="display:none;">
        </span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/enketo_test_select/phone:label">Phone Number</span><span class="required">*</span><input type="tel" name="/enketo_widgets/enketo_test_select/phone" data-required="true()" data-constraint="true()" data-type-xml="tel"><span lang="en" class="or-constraint-msg active" data-itext-id="/enketo_widgets/enketo_test_select/phone:jr:constraintMsg">Please enter a valid local number, or use the standard international format, which includes a plus sign (+) and country code. For example: +254712345678</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label>
      </section>
    <section class="or-group or-appearance-field-list " name="/enketo_widgets/cascading_widgets"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets:label">Cascading Select widgets</span></h4>
<section class="or-group " name="/enketo_widgets/cascading_widgets/group1"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group1:label">Cascading Selects with Radio Buttons</span></h4>
<fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group1/country:label">Country</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/enketo_widgets/cascading_widgets/group1/country" data-name="/enketo_widgets/cascading_widgets/group1/country" value="nl" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/cascading_widgets/group1/country/nl:label">The Netherlands</span></label><label class=""><input type="radio" name="/enketo_widgets/cascading_widgets/group1/country" data-name="/enketo_widgets/cascading_widgets/group1/country" value="usa" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/enketo_widgets/cascading_widgets/group1/country/usa:label">United States</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group1/city:label">City</span><span lang="" class="or-hint active">Using a choice filter to update options based on a previous answer (choice_filter: country = <span class="or-output" data-value=" /enketo_widgets/cascading_widgets/group1/country "> </span>)</span>
          </legend>
<div class="option-wrapper">
<label class="itemset-template" data-items-path="instance('cities')/root/item[country= /enketo_widgets/cascading_widgets/group1/country ]"><input type="radio" name="/enketo_widgets/cascading_widgets/group1/city" data-name="/enketo_widgets/cascading_widgets/group1/city" data-type-xml="select1" value=""></label><span class="itemset-labels" data-value-ref="name" data-label-type="itext" data-label-ref="itextId"><span lang="en" class="option-label active" data-itext-id="static_instance-cities-0">Amsterdam</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-1">Denver</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-2">New York City</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-3">Los Angeles</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-4">Rotterdam</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-5">Dronten</span>
      </span>
</div>
</fieldset></fieldset>
<fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group1/neighborhood:label">Neighborhood</span><span lang="" class="or-hint active">Using a choice filter to update options based on previous answers (choice_filter: country = <span class="or-output" data-value=" /enketo_widgets/cascading_widgets/group1/country "> </span> and city = <span class="or-output" data-value=" /enketo_widgets/cascading_widgets/group1/city "> </span>)</span>
          </legend>
<div class="option-wrapper">
<label class="itemset-template" data-items-path="instance('neighborhoods')/root/item[country= /enketo_widgets/cascading_widgets/group1/country  and city= /enketo_widgets/cascading_widgets/group1/city ]"><input type="radio" name="/enketo_widgets/cascading_widgets/group1/neighborhood" data-name="/enketo_widgets/cascading_widgets/group1/neighborhood" data-type-xml="select1" value=""></label><span class="itemset-labels" data-value-ref="name" data-label-type="itext" data-label-ref="itextId"><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-0">Bronx</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-1">Harlem</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-2">Bel Air</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-3">Westerpark</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-4">Park Hill</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-5">Harbor</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-6">Dam</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-7">Downtown</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-8">Harbor</span>
      </span>
</div>
</fieldset></fieldset>
      </section><section class="or-group " name="/enketo_widgets/cascading_widgets/group2"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group2:label">Cascading Selects with Pulldowns</span></h4>
<label class="question or-appearance-minimal "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group2/country2:label">Country</span><span lang="" class="or-hint active">(appearance: minimal)</span><select name="/enketo_widgets/cascading_widgets/group2/country2" data-name="/enketo_widgets/cascading_widgets/group2/country2" data-type-xml="select1"><option value="">...</option>
<option value="nl">The Netherlands</option>
<option value="usa">United States</option></select><span class="or-option-translations" style="display:none;">
        </span></label><label class="question or-appearance-minimal "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group2/city2:label">City</span><span lang="" class="or-hint active">Using a choice filter to update options based on a previous answer (choice_filter: country = <span class="or-output" data-value=" /enketo_widgets/cascading_widgets/group2/country2 "> </span>, appearance: minimal)</span><select name="/enketo_widgets/cascading_widgets/group2/city2" data-name="/enketo_widgets/cascading_widgets/group2/city2" data-type-xml="select1"><option class="itemset-template" value="" data-items-path="instance('cities')/root/item[country= /enketo_widgets/cascading_widgets/group2/country2 ]">...</option></select><span class="or-option-translations" style="display:none;">
        </span><span class="itemset-labels" data-value-ref="name" data-label-type="itext" data-label-ref="itextId"><span lang="en" class="option-label active" data-itext-id="static_instance-cities-0">Amsterdam</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-1">Denver</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-2">New York City</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-3">Los Angeles</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-4">Rotterdam</span><span lang="en" class="option-label active" data-itext-id="static_instance-cities-5">Dronten</span>
      </span></label><label class="question or-appearance-minimal "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/cascading_widgets/group2/neighborhood2:label">Neighborhood</span><span lang="" class="or-hint active">Using a choice filter to update options based on previous answers (choice_filter: country = <span class="or-output" data-value=" /enketo_widgets/cascading_widgets/group2/country2 "> </span> and city = <span class="or-output" data-value=" /enketo_widgets/cascading_widgets/group2/city2 "> </span>, appearance = minimal)</span><select name="/enketo_widgets/cascading_widgets/group2/neighborhood2" data-name="/enketo_widgets/cascading_widgets/group2/neighborhood2" data-type-xml="select1"><option class="itemset-template" value="" data-items-path="instance('neighborhoods')/root/item[country= /enketo_widgets/cascading_widgets/group2/country2  and city= /enketo_widgets/cascading_widgets/group2/city2 ]">...</option></select><span class="or-option-translations" style="display:none;">
        </span><span class="itemset-labels" data-value-ref="name" data-label-type="itext" data-label-ref="itextId"><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-0">Bronx</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-1">Harlem</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-2">Bel Air</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-3">Westerpark</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-4">Park Hill</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-5">Harbor</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-6">Dam</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-7">Downtown</span><span lang="en" class="option-label active" data-itext-id="static_instance-neighborhoods-8">Harbor</span>
      </span></label>
      </section>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/enketo_widgets/inputs" data-relevant="./source = 'user'"><h4><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/inputs:label">Patient</span></h4>
<section class="or-group-data " name="/enketo_widgets/inputs/contact"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/inputs/contact/_id:label">What is the patient's uuid?</span><input type="text" name="/enketo_widgets/inputs/contact/_id" data-type-xml="string"></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/inputs/contact/patient_id:label">What is the patient's id?</span><input type="text" name="/enketo_widgets/inputs/contact/patient_id" data-type-xml="string"></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/enketo_widgets/inputs/contact/name:label">What is the patient's name?</span><input type="text" name="/enketo_widgets/inputs/contact/name" data-constraint="string-length(.) &gt; 4" data-type-xml="string"><span lang="en" class="or-constraint-msg active" data-itext-id="/enketo_widgets/inputs/contact/name:jr:constraintMsg">Name should contain more than 4 characters</span></label>
      </section>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/enketo_widgets/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/enketo_widgets/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/enketo_widgets/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/enketo_widgets/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <enketo_widgets xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="enketo_widgets" prefix="J1!enketo_widgets!" version="2023-09-11 00:00:00">
          <enketo_test_select>
            <select_spinner/>
            <select1_spinner/>
            <phone/>
          </enketo_test_select>
          <cascading_widgets>
            <group1>
              <country/>
              <city/>
              <neighborhood/>
            </group1>
            <group2>
              <country2/>
              <city2/>
              <neighborhood2/>
            </group2>
          </cascading_widgets>
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
            </contact>
          </inputs>
          <patient_uuid/>
          <patient_id/>
          <patient_name/>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </enketo_widgets>
      </instance>
    <instance id="contact-summary"/>
    <instance id="cities">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-cities-0</itextId>
            <country>nl</country>
            <name>ams</name>
          </item>
          <item>
            <itextId>static_instance-cities-1</itextId>
            <country>usa</country>
            <name>den</name>
          </item>
          <item>
            <itextId>static_instance-cities-2</itextId>
            <country>usa</country>
            <name>nyc</name>
          </item>
          <item>
            <itextId>static_instance-cities-3</itextId>
            <country>usa</country>
            <name>la</name>
          </item>
          <item>
            <itextId>static_instance-cities-4</itextId>
            <country>nl</country>
            <name>rot</name>
          </item>
          <item>
            <itextId>static_instance-cities-5</itextId>
            <country>nl</country>
            <name>dro</name>
          </item>
        </root>
      </instance>
    <instance id="list">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-list-0</itextId>
            <name>a</name>
          </item>
          <item>
            <itextId>static_instance-list-1</itextId>
            <name>b</name>
          </item>
          <item>
            <itextId>static_instance-list-2</itextId>
            <name>c</name>
          </item>
          <item>
            <itextId>static_instance-list-3</itextId>
            <name>d</name>
          </item>
        </root>
      </instance>
    <instance id="neighborhoods">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-neighborhoods-0</itextId>
            <country>usa</country>
            <name>bronx</name>
            <city>nyc</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-1</itextId>
            <country>usa</country>
            <name>harlem</name>
            <city>nyc</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-2</itextId>
            <country>usa</country>
            <name>belair</name>
            <city>la</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-3</itextId>
            <country>nl</country>
            <name>wes</name>
            <city>ams</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-4</itextId>
            <country>usa</country>
            <name>parkhill</name>
            <city>den</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-5</itextId>
            <country>nl</country>
            <name>haven</name>
            <city>rot</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-6</itextId>
            <country>nl</country>
            <name>dam</name>
            <city>ams</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-7</itextId>
            <country>nl</country>
            <name>centrum</name>
            <city>rot</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-8</itextId>
            <country>nl</country>
            <name>havendr</name>
            <city>dro</city>
          </item>
        </root>
      </instance>
    <instance id="countries">
        <root xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
          <item>
            <itextId>static_instance-countries-0</itextId>
            <name>nl</name>
          </item>
          <item>
            <itextId>static_instance-countries-1</itextId>
            <name>usa</name>
          </item>
        </root>
      </instance>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Enketo Widgets</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/enketo_widgets/cascading_widgets/group1/city:label">
            <value>City</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group1/country/nl:label">
            <value>The Netherlands</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group1/country/usa:label">
            <value>United States</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group1/country:label">
            <value>Country</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group1/neighborhood:label">
            <value>Neighborhood</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group1:label">
            <value>Cascading Selects with Radio Buttons</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group2/city2:label">
            <value>City</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group2/country2/nl:label">
            <value>The Netherlands</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group2/country2/usa:label">
            <value>United States</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group2/country2:label">
            <value>Country</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group2/neighborhood2:label">
            <value>Neighborhood</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets/group2:label">
            <value>Cascading Selects with Pulldowns</value>
          </text>
          <text id="/enketo_widgets/cascading_widgets:label">
            <value>Cascading Select widgets</value>
          </text>
          <text id="/enketo_widgets/enketo_test_select/phone:jr:constraintMsg">
            <value>Please enter a valid local number, or use the standard international format, which includes a plus sign (+) and country code. For example: +254712345678</value>
          </text>
          <text id="/enketo_widgets/enketo_test_select/phone:label">
            <value>Phone Number</value>
          </text>
          <text id="/enketo_widgets/enketo_test_select/select1_spinner/a:label">
            <value>option a</value>
          </text>
          <text id="/enketo_widgets/enketo_test_select/select1_spinner/b:label">
            <value>option b</value>
          </text>
          <text id="/enketo_widgets/enketo_test_select/select1_spinner/c:label">
            <value>option c</value>
          </text>
          <text id="/enketo_widgets/enketo_test_select/select1_spinner/d:label">
            <value>option d</value>
          </text>
          <text id="/enketo_widgets/enketo_test_select/select1_spinner:label">
            <value>Select one: pulldown</value>
          </text>
          <text id="/enketo_widgets/enketo_test_select/select_spinner/a:label">
            <value>option a</value>
          </text>
          <text id="/enketo_widgets/enketo_test_select/select_spinner/b:label">
            <value>option b</value>
          </text>
          <text id="/enketo_widgets/enketo_test_select/select_spinner/c:label">
            <value>option c</value>
          </text>
          <text id="/enketo_widgets/enketo_test_select/select_spinner/d:label">
            <value>option d</value>
          </text>
          <text id="/enketo_widgets/enketo_test_select/select_spinner:label">
            <value>Select multiple: pulldown</value>
          </text>
          <text id="/enketo_widgets/enketo_test_select:label">
            <value>Select widgets</value>
          </text>
          <text id="/enketo_widgets/inputs/contact/_id:label">
            <value>What is the patient's uuid?</value>
          </text>
          <text id="/enketo_widgets/inputs/contact/name:jr:constraintMsg">
            <value>Name should contain more than 4 characters</value>
          </text>
          <text id="/enketo_widgets/inputs/contact/name:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/enketo_widgets/inputs/contact/patient_id:label">
            <value>What is the patient's id?</value>
          </text>
          <text id="/enketo_widgets/inputs:label">
            <value>Patient</value>
          </text>
          <text id="/enketo_widgets/patient_id:label">
            <value>Patient ID</value>
          </text>
          <text id="/enketo_widgets/patient_name:label">
            <value>Patient Name</value>
          </text>
          <text id="/enketo_widgets/patient_uuid:label">
            <value>Patient UUID</value>
          </text>
          <text id="static_instance-cities-0">
            <value>Amsterdam</value>
          </text>
          <text id="static_instance-cities-1">
            <value>Denver</value>
          </text>
          <text id="static_instance-cities-2">
            <value>New York City</value>
          </text>
          <text id="static_instance-cities-3">
            <value>Los Angeles</value>
          </text>
          <text id="static_instance-cities-4">
            <value>Rotterdam</value>
          </text>
          <text id="static_instance-cities-5">
            <value>Dronten</value>
          </text>
          <text id="static_instance-countries-0">
            <value>The Netherlands</value>
          </text>
          <text id="static_instance-countries-1">
            <value>United States</value>
          </text>
          <text id="static_instance-list-0">
            <value>option a</value>
          </text>
          <text id="static_instance-list-1">
            <value>option b</value>
          </text>
          <text id="static_instance-list-2">
            <value>option c</value>
          </text>
          <text id="static_instance-list-3">
            <value>option d</value>
          </text>
          <text id="static_instance-neighborhoods-0">
            <value>Bronx</value>
          </text>
          <text id="static_instance-neighborhoods-1">
            <value>Harlem</value>
          </text>
          <text id="static_instance-neighborhoods-2">
            <value>Bel Air</value>
          </text>
          <text id="static_instance-neighborhoods-3">
            <value>Westerpark</value>
          </text>
          <text id="static_instance-neighborhoods-4">
            <value>Park Hill</value>
          </text>
          <text id="static_instance-neighborhoods-5">
            <value>Harbor</value>
          </text>
          <text id="static_instance-neighborhoods-6">
            <value>Dam</value>
          </text>
          <text id="static_instance-neighborhoods-7">
            <value>Downtown</value>
          </text>
          <text id="static_instance-neighborhoods-8">
            <value>Harbor</value>
          </text>
        </translation>
      </itext>
      <instance>
        <enketo_widgets delimiter="#" id="enketo_widgets" prefix="J1!enketo_widgets!" version="2023-09-11 00:00:00">
          <enketo_test_select>
            <select_spinner/>
            <select1_spinner/>
            <phone/>
          </enketo_test_select>
          <cascading_widgets>
            <group1>
              <country/>
              <city/>
              <neighborhood/>
            </group1>
            <group2>
              <country2/>
              <city2/>
              <neighborhood2/>
            </group2>
          </cascading_widgets>
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
            </contact>
          </inputs>
          <patient_uuid/>
          <patient_id/>
          <patient_name/>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </enketo_widgets>
      </instance>
      <instance id="contact-summary"/>
      <instance id="cities">
        <root>
          <item>
            <itextId>static_instance-cities-0</itextId>
            <country>nl</country>
            <name>ams</name>
          </item>
          <item>
            <itextId>static_instance-cities-1</itextId>
            <country>usa</country>
            <name>den</name>
          </item>
          <item>
            <itextId>static_instance-cities-2</itextId>
            <country>usa</country>
            <name>nyc</name>
          </item>
          <item>
            <itextId>static_instance-cities-3</itextId>
            <country>usa</country>
            <name>la</name>
          </item>
          <item>
            <itextId>static_instance-cities-4</itextId>
            <country>nl</country>
            <name>rot</name>
          </item>
          <item>
            <itextId>static_instance-cities-5</itextId>
            <country>nl</country>
            <name>dro</name>
          </item>
        </root>
      </instance>
      <instance id="list">
        <root>
          <item>
            <itextId>static_instance-list-0</itextId>
            <name>a</name>
          </item>
          <item>
            <itextId>static_instance-list-1</itextId>
            <name>b</name>
          </item>
          <item>
            <itextId>static_instance-list-2</itextId>
            <name>c</name>
          </item>
          <item>
            <itextId>static_instance-list-3</itextId>
            <name>d</name>
          </item>
        </root>
      </instance>
      <instance id="neighborhoods">
        <root>
          <item>
            <itextId>static_instance-neighborhoods-0</itextId>
            <country>usa</country>
            <name>bronx</name>
            <city>nyc</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-1</itextId>
            <country>usa</country>
            <name>harlem</name>
            <city>nyc</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-2</itextId>
            <country>usa</country>
            <name>belair</name>
            <city>la</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-3</itextId>
            <country>nl</country>
            <name>wes</name>
            <city>ams</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-4</itextId>
            <country>usa</country>
            <name>parkhill</name>
            <city>den</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-5</itextId>
            <country>nl</country>
            <name>haven</name>
            <city>rot</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-6</itextId>
            <country>nl</country>
            <name>dam</name>
            <city>ams</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-7</itextId>
            <country>nl</country>
            <name>centrum</name>
            <city>rot</city>
          </item>
          <item>
            <itextId>static_instance-neighborhoods-8</itextId>
            <country>nl</country>
            <name>havendr</name>
            <city>dro</city>
          </item>
        </root>
      </instance>
      <instance id="countries">
        <root>
          <item>
            <itextId>static_instance-countries-0</itextId>
            <name>nl</name>
          </item>
          <item>
            <itextId>static_instance-countries-1</itextId>
            <name>usa</name>
          </item>
        </root>
      </instance>
      <bind nodeset="/enketo_widgets/enketo_test_select/select_spinner" type="select"/>
      <bind nodeset="/enketo_widgets/enketo_test_select/select1_spinner" type="select1"/>
      <bind constraint="true()" jr:constraintMsg="jr:itext('/enketo_widgets/enketo_test_select/phone:jr:constraintMsg')" nodeset="/enketo_widgets/enketo_test_select/phone" required="true()" type="tel"/>
      <bind nodeset="/enketo_widgets/cascading_widgets/group1/country" type="select1"/>
      <bind nodeset="/enketo_widgets/cascading_widgets/group1/city" type="select1"/>
      <bind nodeset="/enketo_widgets/cascading_widgets/group1/neighborhood" type="select1"/>
      <bind nodeset="/enketo_widgets/cascading_widgets/group2/country2" type="select1"/>
      <bind nodeset="/enketo_widgets/cascading_widgets/group2/city2" type="select1"/>
      <bind nodeset="/enketo_widgets/cascading_widgets/group2/neighborhood2" type="select1"/>
      <bind nodeset="/enketo_widgets/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/enketo_widgets/inputs/source" type="string"/>
      <bind nodeset="/enketo_widgets/inputs/source_id" type="string"/>
      <bind nodeset="/enketo_widgets/inputs/contact/_id" type="string"/>
      <bind nodeset="/enketo_widgets/inputs/contact/patient_id" type="string"/>
      <bind constraint="string-length(.) &gt; 4" jr:constraintMsg="jr:itext('/enketo_widgets/inputs/contact/name:jr:constraintMsg')" nodeset="/enketo_widgets/inputs/contact/name" type="string"/>
      <bind calculate="../inputs/contact/_id" nodeset="/enketo_widgets/patient_uuid" type="string"/>
      <bind calculate="../inputs/contact/patient_id" nodeset="/enketo_widgets/patient_id" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/enketo_widgets/patient_name" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/enketo_widgets/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/enketo_widgets/enketo_test_select">
      <label ref="jr:itext('/enketo_widgets/enketo_test_select:label')"/>
      <select appearance="minimal" ref="/enketo_widgets/enketo_test_select/select_spinner">
        <label ref="jr:itext('/enketo_widgets/enketo_test_select/select_spinner:label')"/>
        <hint>Showing a pull-down list of options (type=select_multiple list, appearance=minimal)</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/enketo_test_select/select_spinner/a:label')"/>
          <value>a</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/enketo_test_select/select_spinner/b:label')"/>
          <value>b</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/enketo_test_select/select_spinner/c:label')"/>
          <value>c</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/enketo_test_select/select_spinner/d:label')"/>
          <value>d</value>
        </item>
      </select>
      <select1 appearance="minimal" ref="/enketo_widgets/enketo_test_select/select1_spinner">
        <label ref="jr:itext('/enketo_widgets/enketo_test_select/select1_spinner:label')"/>
        <hint>Showing a pull-down list of options (type=select_one list, appearance=minimal)</hint>
        <item>
          <label ref="jr:itext('/enketo_widgets/enketo_test_select/select1_spinner/a:label')"/>
          <value>a</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/enketo_test_select/select1_spinner/b:label')"/>
          <value>b</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/enketo_test_select/select1_spinner/c:label')"/>
          <value>c</value>
        </item>
        <item>
          <label ref="jr:itext('/enketo_widgets/enketo_test_select/select1_spinner/d:label')"/>
          <value>d</value>
        </item>
      </select1>
      <input ref="/enketo_widgets/enketo_test_select/phone">
        <label ref="jr:itext('/enketo_widgets/enketo_test_select/phone:label')"/>
      </input>
    </group>
    <group appearance="field-list" ref="/enketo_widgets/cascading_widgets">
      <label ref="jr:itext('/enketo_widgets/cascading_widgets:label')"/>
      <group ref="/enketo_widgets/cascading_widgets/group1">
        <label ref="jr:itext('/enketo_widgets/cascading_widgets/group1:label')"/>
        <select1 ref="/enketo_widgets/cascading_widgets/group1/country">
          <label ref="jr:itext('/enketo_widgets/cascading_widgets/group1/country:label')"/>
          <item>
            <label ref="jr:itext('/enketo_widgets/cascading_widgets/group1/country/nl:label')"/>
            <value>nl</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/cascading_widgets/group1/country/usa:label')"/>
            <value>usa</value>
          </item>
        </select1>
        <select1 ref="/enketo_widgets/cascading_widgets/group1/city">
          <label ref="jr:itext('/enketo_widgets/cascading_widgets/group1/city:label')"/>
          <hint>Using a choice filter to update options based on a previous answer (choice_filter: country = <output value=" /enketo_widgets/cascading_widgets/group1/country "/>)</hint>
          <itemset nodeset="instance('cities')/root/item[country= /enketo_widgets/cascading_widgets/group1/country ]">
            <value ref="name"/>
            <label ref="jr:itext(itextId)"/>
          </itemset>
        </select1>
        <select1 ref="/enketo_widgets/cascading_widgets/group1/neighborhood">
          <label ref="jr:itext('/enketo_widgets/cascading_widgets/group1/neighborhood:label')"/>
          <hint>Using a choice filter to update options based on previous answers (choice_filter: country = <output value=" /enketo_widgets/cascading_widgets/group1/country "/> and city = <output value=" /enketo_widgets/cascading_widgets/group1/city "/>)</hint>
          <itemset nodeset="instance('neighborhoods')/root/item[country= /enketo_widgets/cascading_widgets/group1/country  and city= /enketo_widgets/cascading_widgets/group1/city ]">
            <value ref="name"/>
            <label ref="jr:itext(itextId)"/>
          </itemset>
        </select1>
      </group>
      <group ref="/enketo_widgets/cascading_widgets/group2">
        <label ref="jr:itext('/enketo_widgets/cascading_widgets/group2:label')"/>
        <select1 appearance="minimal" ref="/enketo_widgets/cascading_widgets/group2/country2">
          <label ref="jr:itext('/enketo_widgets/cascading_widgets/group2/country2:label')"/>
          <hint>(appearance: minimal)</hint>
          <item>
            <label ref="jr:itext('/enketo_widgets/cascading_widgets/group2/country2/nl:label')"/>
            <value>nl</value>
          </item>
          <item>
            <label ref="jr:itext('/enketo_widgets/cascading_widgets/group2/country2/usa:label')"/>
            <value>usa</value>
          </item>
        </select1>
        <select1 appearance="minimal" ref="/enketo_widgets/cascading_widgets/group2/city2">
          <label ref="jr:itext('/enketo_widgets/cascading_widgets/group2/city2:label')"/>
          <hint>Using a choice filter to update options based on a previous answer (choice_filter: country = <output value=" /enketo_widgets/cascading_widgets/group2/country2 "/>, appearance: minimal)</hint>
          <itemset nodeset="instance('cities')/root/item[country= /enketo_widgets/cascading_widgets/group2/country2 ]">
            <value ref="name"/>
            <label ref="jr:itext(itextId)"/>
          </itemset>
        </select1>
        <select1 appearance="minimal" ref="/enketo_widgets/cascading_widgets/group2/neighborhood2">
          <label ref="jr:itext('/enketo_widgets/cascading_widgets/group2/neighborhood2:label')"/>
          <hint>Using a choice filter to update options based on previous answers (choice_filter: country = <output value=" /enketo_widgets/cascading_widgets/group2/country2 "/> and city = <output value=" /enketo_widgets/cascading_widgets/group2/city2 "/>, appearance = minimal)</hint>
          <itemset nodeset="instance('neighborhoods')/root/item[country= /enketo_widgets/cascading_widgets/group2/country2  and city= /enketo_widgets/cascading_widgets/group2/city2 ]">
            <value ref="name"/>
            <label ref="jr:itext(itextId)"/>
          </itemset>
        </select1>
      </group>
    </group>
    <group appearance="field-list" ref="/enketo_widgets/inputs">
      <label ref="jr:itext('/enketo_widgets/inputs:label')"/>
      <group ref="/enketo_widgets/inputs/contact">
        <input ref="/enketo_widgets/inputs/contact/_id">
          <label ref="jr:itext('/enketo_widgets/inputs/contact/_id:label')"/>
        </input>
        <input ref="/enketo_widgets/inputs/contact/patient_id">
          <label ref="jr:itext('/enketo_widgets/inputs/contact/patient_id:label')"/>
        </input>
        <input ref="/enketo_widgets/inputs/contact/name">
          <label ref="jr:itext('/enketo_widgets/inputs/contact/name:label')"/>
        </input>
      </group>
    </group>
  </h:body>
</h:html>
`,   
};
