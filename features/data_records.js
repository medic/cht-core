var casper = require('casper').create();
// var utils = require('./features/utils');

casper.start();

casper.thenOpen("http://localhost:5984/kujua-export-test/_design/kujua-export/_rewrite/", function() {
    this.click(".login");
});

casper.then(function() {
    this.fill("#login_form", {
        username: 'root',
        password: 'password'
    }, false);
    this.click('.modal-footer .btn.btn-primary');
    console.log('11');
});    

casper.then(function() {
    console.log('22');
    // this.debugHTML();
});

// utils.login(casper, 'root', 'password', function() {
//     casper.then(function() {
//         console.log('hh');
//         this.debugHTML();
//     });     
// });

casper.run(function() {
    this.test.renderResults(true);
});        


