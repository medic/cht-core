var utils = require("./utils")
  , assert = require("assert")
  , Browser = require("zombie")
  , vows = require("vows")
  , Feature = require("vows-bdd/lib").Feature
  , username = "root"
  , password = "password";

Feature("Data Records", module)
    .scenario("Displaying data records")
    .given("a test DB", function() {
        utils.createTestDB(username, password, this.callback);
    })
    .and("a data record in the test DB", function() {
        utils.createDataRecord(username, password, this.callback);
    })
    .when("I go to the data records page", function() {
        var browser = new Browser({ site: "http://localhost:5984" });
        browser.visit("/kujua-export-test/_design/kujua-export/_rewrite/data_records", this.callback);
    })
    .and("I log in", function(browser) {
        utils.login(browser, username, password, this.callback);
    })
    .and("I go to the data records page", function(browser) {
        browser.clickLink(".records a", this.callback);
    })
    .and("I go to the docs page", function(browser) {
        browser.clickLink(".docs a", this.callback);
    })
    .and("I go to the data records page", function(browser) {
        browser.clickLink(".records a", this.callback);
    })
    .and("I extend the SMS information of the data record", function(browser) {
        browser.clickLink(".extend", this.callback);
    })
    .then("the SMS information should be extended", function(err, browser) {
        assert.equal(
            undefined, browser.query(".extended.hide"),
            "SMS info should be extended"
        );
    })
    .complete(function() {
        utils.removeTestDB(username, password, function() {
            process.exit();            
        });
    })
    .finish(module);