var helper = require('../../helper');

//var url = '/configuration/forms';

var importButton = element(by.className('btn btn-default choose'));
var downloadButton = element(by.xpath('//span[contains(text(), "Download")]'));
var goToMedicReporterButton = element(by.xpath('//span[contains(text(), "Go  To Medic Reporter")]'));
//var installedForms=element.all(by.repeater('form in forms'));

//functions to interact with our page


module.exports = {
     importData : function () {

        helper.waitUntilReady(this.importButton);

        importButton.click();

    },

     download : function () {

        helper.waitUntilReady(this.downloadButton);

        downloadButton.click();

    },


     goToMedicReporter :function () {

        helper.waitUntilReady(this.goToMedicReporterButton);

        goToMedicReporterButton.click();

    }
};

