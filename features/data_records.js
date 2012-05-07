var utils = require("./utils")
  , callback = null
  , assert = require("assert")
  , vows = require("vows")
  , Feature = require("vows-bdd/lib").Feature
  , username = "root"
  , password = "password";

Feature("Data Records", module)
    .scenario("Filter data records by district")
    .given("I am logged in", function() {
        utils.loggedIn(username, password, this.callback);
    })
    .and("data records from district A and B in the test DB", function(browser) {
        utils.createDataRecords(browser, username, password, this.callback);
    })
    .when("I go to the data records page", function(browser) {
        browser.clickLink(".records a", this.callback);
    })
    .and("I click on the district selector", function(browser) {
        browser.clickLink("District", this.callback);
    })
    .and("I select B as district", function(browser) {
        browser.clickLink("B", this.callback);
    })
    .then("I should just see the B data record but not the A data record", function(err, browser) {
        var $ = browser.evaluate("window.jQuery");
        assert.equal(
            "Neal Young", $.trim($("td.contact-name").text()),
            "Data record from district B with Neal Young as contact should be visible"
        );
    })
    .complete()

    .scenario("Filter data records by form")
    .given("I am logged in", function() {
        utils.loggedIn(username, password, this.callback);
    })
    .and("a PSMS and a MSBR data record in the test DB", function(browser) {
        utils.createDataRecords(browser, username, password, this.callback);
    })
    .when("I go to the data records page", function(browser) {
        browser.clickLink(".records a", this.callback);
    })
    .and("I click on the form selector", function(browser) {
        browser.clickLink("Form", this.callback);
    })
    .and("I select PSMS as form", function(browser) {
        browser.clickLink("PSMS", this.callback);
    })
    .then("I should just see the PSMS data record but not the MSBR data record", function(err, browser) {
        var $ = browser.evaluate("window.jQuery");
        assert.equal(
            "Sam Jones", $.trim($("td.contact-name").text()),
            "PSMS data record with Sam Jones as contact should be visible"
        );
    })
    .complete()
    
    .scenario("Displaying data records")
    .given("I am logged in", function() {
        utils.loggedIn(username, password, this.callback);
    })
    .and("a PSMS and a MSBR data record the test DB", function(browser) {
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