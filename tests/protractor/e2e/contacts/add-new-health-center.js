const commonElements = require('../../page-objects/common/common.po.js'),
			contactPage = require('../../page-objects/contacts/contacts.po.js'),
			helper = require('../../helper'),
			utils = require('../../utils');

describe('Add new health center tests : ', () => {

	afterEach(utils.afterEach);

	it('should add new health center', () => {
		commonElements.goToPeople();
		contactPage.addNewDistrict('Auckland');
		contactPage.completeNewPersonForm('Kiwimate');
		helper.waitUntilReady(element(by.css('.card-title')));
		const newHealthCenterButton = element(by.css('[ng-show="actionBar.right.selected[0].child.type"]'));
		helper.waitUntilReady(newHealthCenterButton);
		newHealthCenterButton.click();
		helper.waitUntilReady(element(by.css('[name="/data/health_center"]')));
		element(by.css('[name="/data/health_center/name"]')).sendKeys('Mavuvu Clinic');
		browser.actions()
			.sendKeys(protractor.Key.TAB).perform();
		browser.actions()
			.sendKeys(protractor.Key.TAB).perform();
		browser.actions()
			.sendKeys(protractor.Key.ENTER).perform();
		browser.actions()
			.sendKeys('Kiwi').perform();
		const contactName = element.all(by.css('.name')).get(1);
		helper.waitElementToBeVisisble(contactName);
		contactName.click();
		element(by.css('[name="/data/health_center/external_id"]')).sendKeys('1234457');
		element(by.css('[name="/data/health_center/notes"]')).sendKeys('some notes');
		const submitButton = element(by.css('.btn.submit.btn-primary'));
		submitButton.click();
		const center = element(by.tagName('h3'));
		helper.waitUntilReady(center);
		expect(center.getText()).toBe('Mavuvu Clinic');
	});
});