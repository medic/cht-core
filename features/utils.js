var util = require('util')
  , exec = require('child_process').exec
  , Browser = require("zombie");

exports.createTestDB = function(user, password, callback) {
    var url = "http://" + user + ":" + password + "@localhost:5984/kujua-base-test";
    exec("kanso push . " + url, function(error, stdout, stderr) {
        if (error) { util.puts(stderr); }
        if (callback) { callback(); }    
    });
};

exports.removeTestDB = function(user, password, callback) {
    var url = "http://" + user + ":" + password + "@localhost:5984/kujua-base-test";
    exec("kanso deletedb " + url, function(error, stdout, stderr) {
        if (error) { util.puts(stderr); }
        if (callback) { callback(); }    
    });
};

exports.createDataRecords = function(browser, user, password, callback) {
    var url = "http://" + user + ":" + password + "@localhost:5984/kujua-base-test";
    exec("kanso upload features/valid_data_records.json " + url, function(error, stdout, stderr) {
        if (error) { util.puts(stderr); }
        if (callback) { callback(null, browser); }
    });
};

exports.login = function(browser, username, password, callback) {
    browser.clickLink(".login", function() {
        browser.
            fill("username", username).
            fill("password", password).
            clickLink(".modal-footer .btn.btn-primary", callback);
    });
};

exports.loggedIn = function(username, password, callback) {
    exports.removeTestDB(username, password, function() {
        exports.createTestDB(username, password, function() {
            var browser = new Browser({ site: "http://localhost:5984", debug: false });
            browser.visit("/kujua-base-test/_design/kujua-base/_rewrite/data_records", function() {
                exports.login(browser, username, password, callback);
            });
        });
    });
};
