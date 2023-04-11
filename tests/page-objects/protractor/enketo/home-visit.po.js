const utils = require('../../../utils');

const xml = `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa">
  <h:head>
    <h:title>Home visit</h:title>
    <model>
      <instance>
        <home_visit delimiter="#" id="home_visit" prefix="J1!home_visit!" version="2016-12-21">
          <inputs>           
            <source>user</source>
            <source_id/>
            <contact>
              <_id/>
              <patient_id/>
              <name/>           
              <parent>
                <_id/>
              </parent>                
            </contact>
          </inputs>
          <patient_uuid/>
          <patient_id/>
          <patient_name/>
          <visited_contact_uuid/>        
          <meta>
            <instanceID/>
          </meta>
        </home_visit>
      </instance>     
      <bind nodeset="/home_visit/inputs"/>
      <bind nodeset="/home_visit/inputs/source" type="string"/>
      <bind nodeset="/home_visit/inputs/source_id" type="string"/>
      <bind nodeset="/home_visit/inputs/contact/_id" type="db:person"/>
      <bind nodeset="/home_visit/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/home_visit/inputs/contact/name" type="string"/>          
      <bind calculate="../inputs/contact/_id" nodeset="/home_visit/patient_uuid" type="string"/>     
      <bind calculate="../inputs/contact/patient_id" nodeset="/home_visit/patient_id" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/home_visit/patient_name" type="string"/>
      <bind calculate="../inputs/contact/parent/_id" nodeset="/home_visit/visited_contact_uuid" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/home_visit/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/home_visit/inputs">
      <label>Patient</label>
      <input appearance="hidden" ref="/home_visit/inputs/source">
        <label>Source</label>
      </input>
      <input appearance="hidden" ref="/home_visit/inputs/source_id">
        <label>Source ID</label>
      </input>
      <group ref="/home_visit/inputs/contact">
        <input appearance="db-object" ref="/home_visit/inputs/contact/_id">
          <label>What is the patient's name?</label>
          <hint>Select a person from list</hint>
        </input>
        <input appearance="hidden" ref="/home_visit/inputs/contact/patient_id">
          <label>Patient ID</label>
        </input>
        <input appearance="hidden" ref="/home_visit/inputs/contact/name">
          <label>Name</label>
        </input>
      </group>
    </group>   
  </h:body>
</h:html>`;

const formDoc = {
  _id: 'form:home-visit',
  internalId: 'home-visit',
  title: 'Home visit',
  type: 'form',
  context: {
    person: true,
    place: false,
  },
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer.from(xml).toString('base64')
    }
  }
};


module.exports = {
  formId: formDoc.internalId,

  configureForm: () => {
    return utils.saveDoc(formDoc);
  },
};
