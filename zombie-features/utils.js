var util = require('util');
var exec = require('child_process').exec;

// var afterExec = function(error, stdout, stderr) {
//     if (error) { util.puts(stderr); }
//     if (callback) { callback(); }    
// };

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

exports.createDataRecord = function(user, password, callback) {
    var url = "http://" + user + ":" + password + "@localhost:5984/kujua-export-test";
    exec("kanso upload zombie-features/valid_data_record.json " + url, function(error, stdout, stderr) {
        if (error) { util.puts(stderr); }
        if (callback) { callback(); }    
    });
};