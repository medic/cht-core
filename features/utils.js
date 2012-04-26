var util = require('util')
  , exec = require('child_process').exec
  , browser = null
  , Browser = require("zombie");

exports.createTestDB = function(user, password, callback) {
    var url = "http://" + user + ":" + password + "@localhost:5984/kujua-export-test";
    exec("kanso push . " + url, function(error, stdout, stderr) {
        if (error) { util.puts(stderr); }
        if (callback) { callback(); }    
    });
};

exports.removeTestDB = function(user, password, callback) {
    var url = "http://" + user + ":" + password + "@localhost:5984/kujua-export-test";
    exec("kanso deletedb " + url, function(error, stdout, stderr) {
        if (error) { util.puts(stderr); }
        if (callback) { callback(); }    
    });
};

exports.createDataRecords = function(browser, user, password, callback) {
    var url = "http://" + user + ":" + password + "@localhost:5984/kujua-export-test";
    exec("kanso upload features/valid_data_records.json " + url, function(error, stdout, stderr) {
        if (error) { util.puts(stderr); }
        if (callback) { callback(null, browser); }
    });
};

exports.login = function(_browser, username, password, callback) {
    _browser.clickLink(".login", function() {
        _browser.
            fill("username", username).
            fill("password", password).
            clickLink(".modal-footer .btn.btn-primary", callback);
    });
};

exports.loggedIn = function(username, password, callback) {
    if(browser) {
        var _browser = browser.fork();
        _browser.visit("/kujua-export-test/_design/kujua-export/_rewrite/data_records", callback);
    } else {
        exports.createTestDB(username, password, function() {
            var _browser = new Browser({ site: "http://localhost:5984" });
            _browser.visit("/kujua-export-test/_design/kujua-export/_rewrite/data_records", function(err, _browser) {
                exports.login(_browser, username, password, function(err, _browser) {
                    browser = _browser;
                    _browser = browser.fork();
                    _browser.visit("/kujua-export-test/_design/kujua-export/_rewrite/data_records", callback);
                });
            });
        });        
    }
};