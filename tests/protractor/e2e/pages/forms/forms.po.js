var helper = require('../../helper'),

var FormsPage = function() {


    this.url = '/configuration/forms';

    this.importButton = element(by.className('btn btn-default choose'));
       this.downloadButton =element(by.xpath('//span[contains(text(), "Download")]'));
        this.goToMedicReporterButton =element(by.xpath('//span[contains(text(), "Go  To Medic Reporter")]'));
        this.installedForms=element.all(by.repeater('form in forms'))
    
    //functions to interact with our page
    
    this.import = function() {

        helper.waitUntilReady(this.importButton)
       
        this.import.click()

    }

     this.download = function() {

        helper.waitUntilReady(this.downloadButton)
       
        this.downloadButton.click()

    }


      this.goToMedicReporter = function() {

        helper.waitUntilReady(this.goToMedicReporterButton)
       
        this.goToMedicReporterButton.click()

    }

}

module.exports = FormsPage;