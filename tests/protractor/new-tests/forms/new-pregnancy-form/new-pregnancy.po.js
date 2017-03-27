//var helper = require('../../helper'),


var NewPregnancyForm = function () {
    //common buttons
    this.nextButton = element(by.css('.btn btn-primary next-page'));
    this.previousButton = element(by.css('.btn btn-default previous-page'));
    this.submitButton=element(by.css('.btn submit btn-primary'));

    this.patientPage = {
        pageTitle: element(by.css('span[data-itext-id=/delivery/inputs:label]')),
        selectPatientNameDropDown: element(by.id('select2-/delivery/inputs/contact/_id-wg-container'))


    };

    this.lastMenstrualPeriodPage = {
        yesRadioButton: element(by.css('')),
        noRadioButton: element(by.css('')),
               //
        lastCycleDatePicker: element(by.css('')),
        resetButton: element(by.css('')),
        estimatedDeliveryDate:element(by.css(''))


    };

    this.riskFactorPage = {
        firstPregnancyCheckBox: element(by.css('')),
        moreThanFourChildrenCheckBox: element(by.css('')),
        lastBabyYearBeforeCheckBox: element(by.css('')),
        previousMiscarriagesCheckBox: element(by.css('')),
       
        conditionsCheckBox: element(by.css('')),
        hivPositiveCheckBox: element(by.css(''))
       
     
    };

    this.dangerSignsPage={
       
    };


       this.noteToCHWPage = {
       
        textArea:element(by.name('/pregnancy/group_note/chw_note'))
    };

     this.summaryPage={
        pregnancyDetailLabel: element(by.css('')),
        
        id: element(by.css('')),
     
        followUpMessage: element(by.css('')),



    };




    //functions to interact with our page
this.goNext=function(){
    this.nextButton.click();
};

this.goBack=function(){
    this.previousButton.click();
};

this.submit=function(){
    this.submitButton.click();
};

};

module.exports = NewPregnancyForm;
