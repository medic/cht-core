const utils = require('../../../utils');

const xml = `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa">
  <h:head>
    <h:title>Unmute person</h:title>
    <model>
      <instance>
        <unmute_person delimiter="#" id="unmute_person" prefix="J1!unmute_person!" version="2016-12-21">
          <inputs>
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
          <meta>
            <instanceID/>
          </meta>
        </unmute_person>
      </instance>
      <bind nodeset="/unmute_person/inputs"/>
      <bind nodeset="/unmute_person/inputs/source" type="string"/>
      <bind nodeset="/unmute_person/inputs/source_id" type="string"/>
      <bind nodeset="/unmute_person/inputs/contact/_id" type="db:person"/>
      <bind nodeset="/unmute_person/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/unmute_person/inputs/contact/name" type="string"/>     
      <bind calculate="../inputs/contact/_id" nodeset="/unmute_person/patient_uuid" type="string"/>
      <bind calculate="../inputs/contact/patient_id" nodeset="/unmute_person/patient_id" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/unmute_person/patient_name" type="string"/>     
      <bind calculate="concat('uuid:', uuid())" 
      nodeset="/unmute_person/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/unmute_person/inputs">
      <label>Patient</label>
      <input appearance="hidden" ref="/unmute_person/inputs/source">
        <label>Source</label>
      </input>
      <input appearance="hidden" ref="/unmute_person/inputs/source_id">
        <label>Source ID</label>
      </input>
      <group ref="/unmute_person/inputs/contact">
        <input appearance="db-object" ref="/unmute_person/inputs/contact/_id">
          <label>What is the patient's name?</label>
          <hint>Select a person from list</hint>
        </input>
        <input appearance="hidden" ref="/unmute_person/inputs/contact/patient_id">
          <label>Patient ID</label>
        </input>
        <input appearance="hidden" ref="/unmute_person/inputs/contact/name">
          <label>Name</label>
        </input>
      </group>
    </group>
  </h:body>
</h:html>`;

const formDoc = {
  _id: 'form:unmute-person',
  internalId: 'unmute-person',
  title: 'Unmute Person',
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
