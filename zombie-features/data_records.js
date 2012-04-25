var utils = require('./utils')
  , username = 'root'
  , password = 'password'
  , assert = require("assert")
  , Browser = require("zombie");

utils.createTestDB(username, password, function() {
    utils.createDataRecord(username, password, function() {
        var browser = new Browser();
        browser.visit("http://localhost:5984/kujua-export-test/_design/kujua-export/_rewrite/data_records", function () {
            browser.clickLink(".login", function(e, browser, status) {
                browser.
                    fill("username", username).
                    fill("password", password).
                    clickLink(".modal-footer .btn.btn-primary", function() {
                        utils.removeTestDB(username, password);
                    });
            });
        });
    });
});