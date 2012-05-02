#!/usr/bin/env node

var fs = require('fs'),
    http = require('http'),
    querystring = require('querystring'),
    db_name = 'kujua-export',
    username = 'root',
    password = 'password',
    auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');

var request = function(verb, path, data, callback) {
    if(!callback) {
        callback = data;
    }
    
    var options = {
        host: 'endor.iriscouch.com',
        port: 80,
        path: '/kujua-export' + path,
        method: verb,
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': auth
        }
    };

    var r = http.request(options, function(res) {
        var resBody = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            resBody += chunk;
        });
        res.on('end', function() {
            var resJSON = JSON.parse(resBody);
            callback(resJSON);
        });
        res.on('error', function(err) {
            if (err) { console.log('response error.', err); }
        });
    });
    r.on('error', function(err) {
        if (err) { console.log('request error.', err); }
    });
    
    if(verb !== 'GET') {
        options.headers['Content-Length'] = data.length;
        r.write(data);
    }
    
    r.end();
}

request('GET', '/_all_docs?include_docs=true', function(result) {
    for(var i = 0; i < result.total_rows; i += 1) {
        var doc = result.rows[i].doc;
        if(doc.type && doc.type.match(/^data_record/)) {
            doc.type = 'data_record';
            request('PUT', '/' + doc._id, JSON.stringify(doc), function() {});
        }
    }
});