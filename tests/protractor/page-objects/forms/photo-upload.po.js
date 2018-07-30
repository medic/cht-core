const utils = require('../../utils'),
      helper = require('../../helper');

const xml = `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa">
	<h:head>
		<h:title>photo-upload</h:title>

		<model>
			<instance>
				<photo-upload id="photo-upload">
					<my_photo/>
					<meta>
						<instanceID/>
					</meta>
				</photo-upload>
			</instance>

			<bind nodeset="/photo-upload/my_photo" type="binary"/>
		</model>
	</h:head>

	<h:body>
		<upload ref="/photo-upload/my_photo" mediatype="image/*">
			<hint>Select a picture or take a photo</hint>
			<label>Image widget</label>
		</upload>
	</h:body>
</h:html>
`;

const docs = [
  {
    _id: 'form:photo-upload',
    internalId: 'photo-upload',
    title: 'Photo upload',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: new Buffer(xml).toString('base64')
      }
    }
  }];

const selectRadioButton = (value) => {
  element(by.css(`[value=${value}]`)).click();
};

module.exports = {
  configureForm: (contactId, done) => {
    utils.seedTestData(done, contactId, docs);
  },
  nextPage: () => {
    const nextButton = element(by.css('button.btn.btn-primary.next-page'));
    helper.waitElementToBeClickable(nextButton);
    nextButton.click();
  },

  goBack: () => {
    element(by.css('button.btn.btn-default.previous-page')).click();
  },

  submit: () => {
    const submitButton = element(by.css('[ng-click="onSubmit()"]'));
    helper.waitElementToBeClickable(submitButton);
    submitButton.click();
    helper.waitElementToBeVisible(element(by.css('div#reports-content')));
  },

  //patient page
  getPatientPageTitle: () => {
    return element(by.css('span[data-itext-id=/delivery/inputs:label]'));
  },

  selectPatientName: (name) => {
    helper.waitElementToBeClickable(element(by.css('button.btn.btn-primary.next-page')));
    element(by.css('.selection')).click();
    const search = element(by.css('.select2-search__field'));
    search.click();
    search.sendKeys(name);
    helper.waitElementToBeVisible(element(by.css('.name')));
    element(by.css('.name')).click();
  },

  //Delivery Info page -- Pregnancy outcomes
  selectLiveBirthButton: () => {
    selectRadioButton('healthy');
  },
  selectStillBirthButton: () => {
    selectRadioButton('still_birth');
  },

  selectMiscarriageButton: () => {
    selectRadioButton('miscarriage');
  },

  //Delivery Info page -- Location of delivery
  selectFacilityButton: () => {
    selectRadioButton('f');
  },

  selectHomeSkilledButton: () => {
    selectRadioButton('s');
  },

  selectHomeNonSkilledButton: () => {
    selectRadioButton('ns');
  },

  //Delivery Info page -- Delivery date
  enterDeliveryDate: (deliveryDate) => {
    const datePicker = element(by.css('[placeholder="yyyy-mm-dd"]'));
    datePicker.click();
    //type date in the text box as '2017-04-23'
    datePicker.sendKeys(deliveryDate);
  },

  reset: () => {
    element(by.css('.icon.icon-refresh')).click();
  },

  //note to CHW
  getNoteToCHW: () => {
    return element(by.css('textarea')).getAttribute('value');
  },

  //summary page
  getOutcomeText: () => {
    return element(by.css('[lang="en"] [data-value=" /delivery/group_delivery_summary/display_delivery_outcome "]'))
      .getText();
  },

  getDeliveryLocationSummaryText: () => {
    return element(by.css('[lang="en"] [data-value=" /delivery/group_summary/r_delivery_location "]'))
      .getText();
  },

  getFollowUpMessage: () => {
    return element(by.css('[lang="en"] [data-value=" /delivery/group_note/g_chw_sms "]'))
      .getText();
  },
};
