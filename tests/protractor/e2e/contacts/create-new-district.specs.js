var commonElements = require('../../page-objects/common/common.po.js');
var contactPage = require('../../page-objects/contacts/contacts.po.js');

var newPersonForm = $('[name="/data/contact"]');

describe('Add new district tests : ', function () {

    it('should open new place form', function () {
        commonElements.goToPeople();
        expect(commonElements.isAt('contacts-list'));
        expect(browser.getCurrentUrl()).toEqual(commonElements.getBaseUrl() + 'contacts/');
        contactPage.addNewDistrict('BedeDistrict', 'Bede');
        expect(newPersonForm.isPresent()).toBe(true);
        //
    });

    it('should complete new person form', function () {
       
        contactPage.completeNewPersonForm('Bede');
        //expect(6).toBeGreaterThan(2);

    });

});






