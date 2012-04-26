var utils = require("./utils")
  , username = "root"
  , password = "password"
  , assert = require("assert")
  , Browser = require("zombie");

process.on('exit', function () {
    utils.removeTestDB(username, password);
});
  
utils.createTestDB(username, password, function() {
    utils.createDataRecord(username, password, function() {
        var browser = new Browser({ site: "http://localhost:5984" });
        
        browser.visit("/kujua-export-test/_design/kujua-export/_rewrite/data_records", function () {
            utils.login(browser, username, password, function() {
                browser.clickLink(".records a", function() {
                    browser.clickLink(".docs a", function() {
                        browser.clickLink(".records a", function() {
                            browser.clickLink(".extend", function() {
                                assert.equal(
                                    0, browser.query(".extended.hide").length,
                                    "SMS info should be extended"
                                );
                                process.exit(0);
                            });
                        });
                    });                
                });
            });
        });
    });
});