const utils = require('../../utils');
const helper = require('../../helper');

const xml = `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa">
	<h:head>
		<h:title>photo-upload</h:title>

		<model>
			<instance>
        <concatenate-strings id="concat">
          <inputs>
            <first_name id="first-name"/>
            <full_name id="full-name"/>
          </inputs>
        </concatenate-strings>
			</instance>

      <bind nodeset="/concatenate-strings/first_name" type="string"/>
      <bind calculate="if( /concatenate-strings/first_name  = 'Bruce', 'Bruce ' + 'Wayne', 'John' + 'Doe')"
        nodeset="/concatenate-strings/full_name" type="string"/>
		</model>
	</h:head>

	<h:body>
    <input ref="concatenate-strings/first_name">
      <label>First Name</label>
    </input>
    <input appearance="hidden" ref="/concatenate-strings/full_name">
      <label>Full Name</label>
    </input>
	</h:body>
</h:html>
`;

const docs = [
  {
    _id: 'form:concatenate-strings',
    internalId: 'concatenate-strings',
    title: 'Concatenate Strings',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(xml).toString('base64')
      }
    }
  }];

module.exports = {
  configureForm: (userContactDoc, done) => {
    utils.seedTestData(done, userContactDoc, docs);
  },

  submit: () => {
    const submitButton = element(by.css('[ng-click="onSubmit()"]'));
    helper.waitElementToBeClickable(submitButton);
    submitButton.click();
    helper.waitElementToBeVisible(element(by.css('div#reports-content')));
  },

  reset: () => {
    element(by.css('.icon.icon-refresh')).click();
  }
};
