var helper = require('../../helper');
//var commonElements = require('../../page-objects/common/common.po.js');

describe('Navigation tests : ', function () {

    beforeAll(function () {

    });


    beforeEach(function () {
      

    });

    afterEach(function () {

    });

    it('should open Messages tab', function () {
        commonElements.goToMessages();
        expect(commonElements.isAt('message-list'));
        expect(browser.getCurrentUrl()).toEqual(commonElements.getBaseUrl() + 'messages/');
    });

    it('should open tasks tab', function () {

        commonElements.goToTasks();
        expect(commonElements.isAt('task-list'));
        expect(browser.getCurrentUrl()).toEqual(commonElements.getBaseUrl() + 'tasks/');
    });

    it('should open Reports or History tab', function () {

        commonElements.goToReports();
        expect(commonElements.isAt('reports-list'));
        expect(browser.getCurrentUrl()).toEqual(commonElements.getBaseUrl() + 'reports/');

    });

    it('should open Contacts or Peoples tab', function () {
        commonElements.goToPeople();
        expect(commonElements.isAt('contacts-list'));
        expect(browser.getCurrentUrl()).toEqual(commonElements.getBaseUrl() + 'contacts/');
    });

    it('should open Analytics or Targets tab', function () {

        commonElements.goToAnalytics();
        expect(browser.getCurrentUrl()).toEqual(commonElements.getBaseUrl() + 'analytics');

    });
    it('should open Configuration tab', function () {

        commonElements.goToConfiguration();
        expect(browser.getCurrentUrl()).toEqual(commonElements.getBaseUrl() + 'configuration');

    });

});


