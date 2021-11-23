const utils = require('../../utils');
const xml = `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa">
	<h:head>
		<h:title>photo-upload</h:title>

		<model>
    <instance>
    <concatenate-strings id="concat">
      <inputs>
        <first_name/>
        <full_name/>
      </inputs>
      <meta>
        <instanceID/>
      </meta>
    </concatenate-strings>
  </instance>

  <bind nodeset="/concatenate-strings/inputs/first_name" type="string"/>
  <bind calculate="if( /concatenate-strings/inputs/first_name  = 'Bruce', 'Bruce ' + 'Wayne', 'John ' + 'Doe')"
    nodeset="/concatenate-strings/inputs/full_name" type="string"/>
		</model>
	</h:head>

	<h:body>
    <input ref="/concatenate-strings/inputs/first_name">
      <label>First Name</label>
    </input>
    <input ref="/concatenate-strings/inputs/full_name">
      <label>Full Name</label>
    </input>
	</h:body>
</h:html>
`;

const formInternalId = 'concatenate-strings';
const docs = [
  {
    _id: `form:${formInternalId}`,
    internalId: formInternalId,
    title: 'Concatenate Strings',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(xml).toString('base64')
      }
    }
  }];
const submitButton = () => $('[ng-click="onSubmit()"]');
const reportContent = () => $('div#reports-content');
const refreshIcon = () => $('.icon.icon-refresh');

module.exports = {
  configureForm: async (userContactDoc) => {
    return await utils.seedTestData(userContactDoc, docs);
  },

  submit: async () => {
    await (await submitButton()).click();
    await (await reportContent()).waitForDisplayed();
  },

  reset: async () => {
    return await(await refreshIcon()).click();
  },

  formInternalId: formInternalId,
};
