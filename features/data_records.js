var utils = require("./utils")
  , callback = null
  , assert = require("assert")
  , vows = require("vows")
  , Feature = require("vows-bdd/lib").Feature
  , username = "root"
  , password = "password";

Feature("Data Records", module)
    .scenario("Filter data records")
    .given("I am logged in", function() {
        utils.loggedIn(username, password, this.callback);
    })
    .and("a PSMS and a MSBR data record the test DB", function(browser) {
        utils.createDataRecords(browser, username, password, this.callback);
    })
    .when("I go to the data records page", function(browser) {
        browser.clickLink(".records a", this.callback);
    })
    .and("I click on the form selector", function(browser) {
        browser.clickLink("Form", this.callback);
    })
    .and("I select MSBR as form", function(browser) {
        browser.clickLink("MSBR", this.callback);
    })
    .then("I should just see the MSBR data record but not the PSMS data record", function(err, browser) {
        var $ = browser.evaluate("window.jQuery");
        assert.equal(
            "Neal Young", $.trim($("td.contact-name").text()),
            "PSMS data record with Neal Young as contact should be visible"
        );
    })
    .complete()
    
    .scenario("Displaying data records")
    .given("I am logged in", function() {
        utils.loggedIn(username, password, this.callback);
    })
    .and("a data record in the test DB", function(browser) {
        utils.createDataRecords(browser, username, password, this.callback);
    })
    .when("I go to the data records page", function(browser) {
        browser.clickLink(".records a", this.callback);
    })
    .and("I go to the docs page", function(browser) {
        browser.clickLink(".docs a", this.callback);
    })
    .and("I go to the data records page", function(browser) {
        browser.clickLink(".records a", this.callback);
    })
    .and("I extend the SMS information of the data record", function(browser) {
        browser.clickLink(".extend:first", this.callback);
    })
    .then("the SMS information should be extended", function(err, browser) {
        var $ = browser.evaluate("window.jQuery");
        assert.ok(
            !$(".extended:first").hasClass('hide'),
            "SMS info should be extended"
        );
    })
    .complete(function() {
        utils.removeTestDB(username, password, function() {
            process.exit();            
        });
    })
    .finish(module);