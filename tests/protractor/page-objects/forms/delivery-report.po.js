const getPatientNameDropDown = () => {
	element(by.id('select2-/delivery/inputs/contact/_id-wg-container'));
};

module.exports = {

	goNext: () => {
		element(by.css('.btn btn-primary next-page')).click();
	},

	goBack: () => {
		element(by.css('.btn btn-default previous-page')).click();
	},

	submit: () => {
		element(by.css('.btn submit btn-primary')).click();
	},

	//patient page
	getPatientPageTitle: () => {
		return element(by.css('span[data-itext-id=/delivery/inputs:label]'));
	},

	selectPatientName: () => {
		getPatientNameDropDown().click();
	},

	//Delivery Info page -- Pregnancy outcomes
	selectLiveBirthButton: () => {
		element(by.css('[value="health"]')).click();
	},

	selectStillBirthButton: () => {
		element(by.css('[value="still_birth"]')).click();
	},

	selectMiscarriageButton: () => {
		element(by.css('[value="miscarriage"]')).click();
	},

	//Delivery Info page -- Location of delivery
	selectFacilityButton: () => {
		element(by.css('[value="f"]')).click();
	},

	selectHomeSkilledButton: () => {
		element(by.css('[value="s"]')).click();
	},

	selectHomeNonSkilledButton: () => {
		element(by.css('[value="ns"]')).click();
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
	getTextArea: () => {
		return element(by.name('/delivery/group_note/g_chw_sms'));
	},

	//summary page
	getOutcomeText: () => {
		return element(by.css('[data-value=" /delivery/group_delivery_summary/display_delivery_outcome "]'))
			.getText();
	},

	getDeliveryLocationSummaryText: () => {
		return element(by.css('[data-value=" /delivery/group_summary/r_delivery_location "]'))
			.getText();
	},

	getFollowUpMessage: () => {
		return element(by.css('[data-value=" /delivery/group_note/g_chw_sms "]')).getText();
	}
};
