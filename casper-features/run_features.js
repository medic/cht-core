var util = require('util');
var exec = require('child_process').exec;
var user = 'root';
var password = 'password';

var createTestDB = function(user, password, callback) {
    var url = "http://" + user + ":" + password + "@localhost:5984/kujua-export-test";
    exec("kanso push . " + url, function(error, stdout, stderr) {
        if (callback) {
            callback();
        }
    });
};

var removeTestDB = function(user, password, callback) {
    var url = "http://" + user + ":" + password + "@localhost:5984/kujua-export-test";
    exec("kanso deletedb " + url, function(error, stdout, stderr) {
        if (callback) {
            callback();
        }
    });
};

var createDataRecord = function(user, password, callback) {
    var url = "http://" + user + ":" + password + "@localhost:5984/kujua-export-test";
    exec("kanso upload casper-features/valid_data_record.json " + url, function(error, stdout, stderr) {
        if (callback) {
            callback();
        }
    });
};

createTestDB(user, password, function() {
    createDataRecord(user, password, function() {
        exec("casperjs casper-features/data_records.js", function(error, stdout, stderr) {
            util.puts(stdout);
            if(error) {
                util.puts(error);
                util.puts(stderr);                
            }
            removeTestDB(user, password);
        });
    });
});
