/* eslint-disable max-len */
module.exports = {
  xml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Family Survey</h:title>
    <model>
      <instance>
        <family_survey delimiter="#" id="family_survey" prefix="J1!family_survey!" version="2016-04-06">
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
            </contact>
          </inputs>
          <place_id/>
          <place_name/>
          <pregnant/>
          <no_children_u5/>
          <improved_cook_stove/>
          <solar_light/>
          <water_filter/>
          <p_note/>
          <a>
            <g_pregnant/>
            <g_no_children_u5/>
          </a>
          <b>
            <g_improved_cook_stove/>
            <g_solar_light/>
            <g_water_filter/>
          </b>
          <meta>
            <instanceID/>
          </meta>
        </family_survey>
      </instance>
      <bind nodeset="/family_survey/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/family_survey/inputs/source" type="string"/>
      <bind nodeset="/family_survey/inputs/source_id" type="string"/>
      <bind nodeset="/family_survey/inputs/contact/_id" type="db:clinic"/>
      <bind nodeset="/family_survey/inputs/contact/name" type="string"/>
      <bind calculate="../inputs/contact/_id" nodeset="/family_survey/place_id" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/family_survey/place_name" type="string"/>
      <bind calculate=" /family_survey/a/g_pregnant " nodeset="/family_survey/pregnant" type="string"/>
      <bind calculate=" /family_survey/a/g_no_children_u5 " nodeset="/family_survey/no_children_u5" type="string"/>
      <bind calculate=" /family_survey/b/g_improved_cook_stove " nodeset="/family_survey/improved_cook_stove" type="string"/>
      <bind calculate=" /family_survey/b/g_solar_light " nodeset="/family_survey/solar_light" type="string"/>
      <bind calculate=" /family_survey/b/g_water_filter " nodeset="/family_survey/water_filter" type="string"/>
      <bind nodeset="/family_survey/p_note" readonly="true()" relevant="false()" type="string"/>
      <bind nodeset="/family_survey/a/g_pregnant" required="true()" type="select1"/>
      <bind constraint=". &gt;= 0" jr:constraintMsg="Number of children must be greater than 0" nodeset="/family_survey/a/g_no_children_u5" required="true()" type="int"/>
      <bind nodeset="/family_survey/b/g_improved_cook_stove" required="true()" type="select1"/>
      <bind nodeset="/family_survey/b/g_solar_light" required="true()" type="select1"/>
      <bind nodeset="/family_survey/b/g_water_filter" type="select1"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/family_survey/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/family_survey/inputs">
      <label>Family</label>
      <input appearance="hidden" ref="/family_survey/inputs/source">
        <label>Source</label>
      </input>
      <input appearance="hidden" ref="/family_survey/inputs/source_id">
        <label>Source ID</label>
      </input>
      <group ref="/family_survey/inputs/contact">
        <input appearance="db-object" ref="/family_survey/inputs/contact/_id">
          <label>What is the family's name?</label>
          <hint>Select the family from the list</hint>
        </input>
        <input appearance="hidden" ref="/family_survey/inputs/contact/name">
          <label>Name</label>
        </input>
      </group>
    </group>
    <input ref="/family_survey/p_note">
      <label>ID: <output value=" /family_survey/place_id "/>
Name: <output value=" /family_survey/place_name "/></label></input>
    <group appearance="field-list" ref="/family_survey/a">
      <label>Survey for <output value=" /family_survey/place_name "/></label><select1 appearance="horizontal" ref="/family_survey/a/g_pregnant">
        <label>Is the head of family pregnant?</label>
        <item>
          <label>Yes</label>
          <value>yes</value>
        </item>
        <item>
          <label>No</label>
          <value>no</value>
        </item>
      </select1>
      <input ref="/family_survey/a/g_no_children_u5">
        <label>How many children are under 5 years old?</label>
      </input>
    </group>
    <group appearance="field-list" ref="/family_survey/b">
      <label>Survey for <output value=" /family_survey/place_name "/></label><select1 appearance="horizontal" ref="/family_survey/b/g_improved_cook_stove">
        <label>Does the family own an improved cook stove?</label>
        <item>
          <label>Yes</label>
          <value>yes</value>
        </item>
        <item>
          <label>No</label>
          <value>no</value>
        </item>
      </select1>
      <select1 appearance="horizontal" ref="/family_survey/b/g_solar_light">
        <label>Does the family own a solar light?</label>
        <item>
          <label>Yes</label>
          <value>yes</value>
        </item>
        <item>
          <label>No</label>
          <value>no</value>
        </item>
      </select1>
      <select1 appearance="horizontal" ref="/family_survey/b/g_water_filter">
        <label>Does the family own a water filter?</label>
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
  </h:body>
</h:html>
`,
};
