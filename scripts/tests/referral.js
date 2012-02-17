#!/usr/bin/env node

var fs = require('fs'),
    http = require('http'),
    querystring = require('querystring'),
    jsDump = require('jsDump'),
    debug = true,
    db_name = 'kujua-export';

var log = function(o) {
    if (debug) {
        console.log('##########################################################');
        console.log(o);
    }
};

// http request that does a callback request
var req = function(options) {
    var r = http.request(options, function(res) {
        log('http.request options:');
        log(options);
        var resBody = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            resBody += chunk;
        });
        res.on('end', function() {
            log('response body');
            log(jsDump.parse(JSON.parse(resBody)));
            var resJSON = JSON.parse(resBody);
            var callback = resJSON.callback;
            if(callback && callback.options) {
                var req2 = req(callback.options);
                if (callback.data) {
                    log('callback request data');
                    log(JSON.stringify(callback.data));
                    req2.write(JSON.stringify(callback.data));
                }
                req2.end();
            } else {
                log('done with task creation. do tasks...');
                tasksCreated === false ? doTasks() : allDone();
            }
        });
        res.on('error', function(err) {
            if (err) {
                console.log('response error.')
                console.log(err);
            }
        });
    });
    r.on('error', function(err) {
        if (err) {
            console.log('request error.');
            console.log(err);
        }
    });
    return r;
};

var tasksCreated = false;

var allDone = function() {
    console.log('Done!');
};

var doTasks = function() {
    tasksCreated = true;
    var options = {
        host: 'localhost',
        port: 5984,
        path: '/' + db_name + '/_design/kujua-export/_rewrite/tasks_referral/pending',
        method: 'GET'
    };
    var r = req(options);
    r.end();
};

var run = function(options, data) {
    var qs = querystring.stringify(data);
    options.headers['Content-Length'] = qs.length;
    // smsform message is received
    var r = req(options);
    log('request data');
    log(qs);
    r.write(qs);
    // TODO request new tasks/referrals to be sent out
};

var rand = function(from, to) {
    from = from || 10000000000;
    to = to || 99999999999;
    return Math.floor(Math.random() * (to - from + 1) + from);
}

// random ref_rc for better test data
var ref_rc = rand();

var options = {
    host: 'localhost',
    port: 5984,
    path: '/' + db_name + '/_design/kujua-export/_rewrite/add',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    }
};

/*
 * MSBR (from clinic)
 */
log('smssync format example referral form from clinic:');
var data = {
    from: '+13125551212', // clinic.contact.phone
    message: '1!MSBR!2012#1#24#' + ref_rc +
             '#1111#bbbbbbbbbbbbbbbbbbbb#22#8#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    sent_timestamp: '1-19-12 18:45',
    sent_to: '+15551212',
    message_id: '13579',
    foo: 'bar' // extra is ok
};
log(data);

run(options, data);

// Using settimeout since referral needs to be created with the refid first.

/*
 * MSBC (from health center)
 */
setTimeout(function(){
    log('MSBC smssync format example counter referral to clinic:');
    var data = {
        from: '+17084449999', // health_center.contact.phone
        message: '1!MSBC!2012#1#16#' + ref_rc +
                 '#5#abcdefghijklmnopqrst#31#bcdefghijklmnopqrstu#cdefghijklmnopqrstuv#5#defghijklmnopqrstuvw#efghijklmnopqrstuvwxyzabcdefghijklm',
        sent_timestamp: '1-25-12 18:45',
        sent_to: '+12223333333',
        message_id: '13579',
        foo: 'bar' // extra is ok
    };
    log(data);
    tasksCreated=false;
    run(options, data);
}, 1000);

/*
 * MSBB (from health center)
 */
setTimeout(function(){
    log('MSBB smssync format example counter referral to hospital:');
    var data = {
        from: '+17084449999', // health_center.contact.phone
        message: '1!MSBB!2012#1#24#' + ref_rc +
                 '#1111#bbbbbbbbbbbbbbbbbbbb#22#16#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        sent_timestamp: '1-25-12 18:45',
        sent_to: '+12223333333',
        message_id: '13579',
        foo: 'bar' // extra is ok
    };
    log(data);
    tasksCreated=false;
    run(options, data);
}, 2000);

/*
 * MSBC (from hospital)
 */
setTimeout(function(){
    log('MSBC smssync format example counter referral to clinic:');
    var data = {
        from: '+14151112222', // hospital.contact.phone
        message: '1!MSBC!2012#1#16#' + ref_rc +
                 '#5#abcdefghijklmnopqrst#31#bcdefghijklmnopqrstu#cdefghijklmnopqrstuv#5#defghijklmnopqrstuvw#efghijklmnopqrstuvwxyzabcdefghijklm',
        sent_timestamp: '1-25-12 18:45',
        sent_to: '+12223333333',
        message_id: '13579',
        foo: 'bar' // extra is ok
    };
    log(data);
    tasksCreated=false;
    run(options, data);
}, 3000);

