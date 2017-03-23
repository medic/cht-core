//var helper = require('../../helper'),


var DeliveryReportForm = function () {
    //common buttons
    this.nextButton = element(by.css('.btn btn-primary next-page'));
    this.previousButton = element(by.css('.btn btn-default previous-page'));
      this.submitButton=element(by.css('.btn submit btn-primary'));

    this.patientPage = {
        pageTitle: element(by.css('span[data-itext-id=/delivery/inputs:label]')),
        selectPatientNameDropDown: element(by.id('select2-/delivery/inputs/contact/_id-wg-container'))



    };

    this.deliveryInfoPage = {
        liveBirthRadioButton: element(by.css('')),
        stillBirthRadioButton: element(by.css('')),
        miscariageRadioButton: element(by.css('')),
        facilityRadioButton: element(by.css('')),
        homeWithSkilledBirthRadioButton: element(by.css('')),
        homeWithNoSkilledRadioButton: element(by.css('')),
        //
        deliveryDatePicker: element(by.css('')),
        resetButton: element(by.css(''))


    };

    this.noteToCHWPage = {
        goodNewsRadioButton: element(by.css('')),
        homeSBARadioButton: element(by.css('')),
        homeNoSBARadioButton: element(by.css('')),
        facilityStillBirthRadioButton: element(by.css('')),
       
        homeSBAStillBirthRadioButton: element(by.css('')),
        homeNoSBAStillBirthRadioButton: element(by.css('')),
        miscariageRadioButton: element(by.css('')),
        CHWWasSeenRadioButton: element(by.css('')),

        textArea:element(by.name('/delivery/group_note/g_chw_sms'))
    };

    this.summaryPage={
        deliveryDetailLabel: element(by.css('')),
        followUpMessageLabel: element(by.css('')),
        CHWName: element(by.css('')),
        id: element(by.css('')),
        outcome: element(by.css('')),
        deliveryAt: element(by.css('')),
        followUpMessage: element(by.css(''))
    };




    this.submit=function(){
    this.submitButton.click();
};

   // this.DeliveryReportPage


    //functions to interact with our page
this.goNext=function(){
    this.nextButton.click();
};

this.goBack=function(){
    this.previousButton.click();
};


};

module.exports = DeliveryReportForm;
