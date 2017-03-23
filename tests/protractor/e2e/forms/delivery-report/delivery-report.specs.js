var helper = require('../../helper');

var DeliveryReportForm = require('../login/delivry-report.po.js');

describe('Complete delivery report form : ', function () {

    var deliveryReportForm = new DeliveryReportForm();

    beforeAll(function () {
        //do the logic here

    });


    beforeEach(function () {
        // browser.get(browser.params.url);


    });

    afterEach(function () {

        browser.driver.sleep(1000);
        // browser.manage().deleteAllCookies();


    });

    it('should complete the patient page', function () {

        expect(helper.isTextDisplayed('What is the patient\'s name?')).toBeTruthy();

        //selelect patient
        deliveryReportForm.goNext();
        expect(helper.isTextDisplayed('Delivery Info')).toBeTruthy();

    });



    it('should complete the Delivery Info page', function () {


        expect(helper.isTextDisplayed('Delivery Info')).toBeTruthy();

        deliveryReportForm.goNext();


    });

    it('should complete the Note to the CHW page', function () {
        deliveryReportForm.deliveryInfoPage.selectOutcome('Live Birth');
        deliveryReportForm.deliveryInfoPage.selectLocation('Facility');
        deliveryReportForm.deliveryInfoPage.selectDeliveryDate('date');

        deliveryReportForm.goNext();

    });

    it('should view summary page before submit', function () {




    });

    it('should submit form', function () {




    });
    it('should be able to go to previous page', function () {




    });



});