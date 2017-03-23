//var helper = require('../../helper'),
   // faker = require('faker');

var AnalyticsPage = function() {

    
    this.pageTitle = 'Medic Mobile';
    this.noMessageErrorField = $('[ng-show="!error && !loading && !reports.length"]');
    
    this.rightHandPane= $('[ng-show="!selected.reports[0] && !loadingContent"]');
    
    //functions to interact with our page
    
 

};

module.exports = AnalyticsPage;
