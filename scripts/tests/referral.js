#!/usr/bin/env node

var fs = require('fs'),
    http = require('http'),
    querystring = require('querystring');

console.log('smssync format, example data for referral form submission');
var data = {
    from: '+13128131320',
    message: '1!MSBR!2012#12#20#12345678901#1111#bbbbbbbbbbbbbbbbbbbb#22#33#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    sent_timestamp: '1-19-12 18:45',
    sent_to: '+15551212',
    message_id: '13579',
    foo: 'bar' // extra is ok
};
console.log(data);


console.log('http req options');
var options = {
    host: 'localhost',
    port: 5984,
    path: '/kujua/_design/kujua-export/_rewrite/add',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    }
};
console.log(options);

var run = function(options, data) {

    var qs = querystring.stringify(data);
    options.headers['Content-Length'] = qs.length;

    // setup http request
    var req = http.request(options, function(res) {
        var resBody = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            resBody += chunk;
        });
        res.on('end', function() {
            console.log('response body');
            console.log(resBody);
            var resJSON = JSON.parse(resBody);
            var callback = undefined;
            if(resJSON.payload && resJSON.payload.callback) {
                callback = resJSON.payload.callback;
                console.log('callback request options');
                console.log(callback.options);
                var req = http.request(callback.options, function(res) {
                    var resBody = '';
                    res.setEncoding('utf8');
                    res.on('data', function (chunk) {
                        resBody += chunk;
                    });
                    res.on('end', function() {
                        console.log('callback response body');
                        console.log(resBody);
                    });
                });
                console.log('callback request data');
                console.log(JSON.stringify(callback.data));
                req.write(JSON.stringify(callback.data));
                req.end();
            }
        });
    });

    console.log('request data');
    console.log(qs);
    req.write(qs);
    req.end();
};

run(options, data);
