const utils = require('../../../utils');

const xml = `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Countdown timer</h:title>
    <model>
      <instance>
        <countdown delimiter="#" id="countdown" prefix="J1!countdown!" version="2018-03-08 17-42">
          <group>
            <timer/>
          </group>
          <meta>
            <instanceID/>
          </meta>
        </countdown>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/countdown/group/timer" readonly="true()" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/countdown/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/countdown/group">
      <label>Testing Timer</label>
      <input appearance="countdown-timer" ref="/countdown/group/timer">
        <label>Text for timer</label>
      </input>
    </group>
  </h:body>
</h:html>
`;

const INTERNAL_ID = 'countdown-timer';

const docs = [
  {
    _id: 'form:countdown-timer',
    internalId: INTERNAL_ID,
    title: 'Countdown Timer',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(xml).toString('base64')
      }
    }
  }
];

const configureForm = (userContactDoc) => {
  return utils.seedTestData(userContactDoc, docs);
};

const clickTimer = async () => {
  const timer = await $('form[data-form-id="countdown"] .or-appearance-countdown-timer canvas');
  await timer.click();
};

module.exports = {
  INTERNAL_ID,
  configureForm,
  clickTimer,
};
