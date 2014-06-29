#!/usr/bin/env node

var querystring = require('querystring'),
    http = require('http'),
    url = require('url'),
    csv = require('csv'),
    fs = require('fs'),
    args = [];

process.argv.forEach(function(val, idx, array) {
    args[idx] = val;
});

var usage = "\nUsage: load_messages.js <path> <url>\n\n"
    + "path    CSV file with message data, columns are defined as follows:\n"
    + "            message   Raw message string\n"
    + "            from      Phone number of sender\n"
    + "            timestamp When message was received by gateway (optional).\n"
    + "                      This could be any format that is supported by the\n"
    + "                      moment.js library or used by SMSSync (currently ms\n"
    + "                      since epoch). If it fails to parse then default\n"
    + "                      will be creation time.\n"
    + "url     URL to medic database.\n\n"
    + "Examples:\n\n"
    + "node scripts/load_messages.js ~/data.csv http://admin:pass@localhost/medic\n\n"
    + "data.csv contents:\n\n"
    + "message,from,sent timestamp\n"
    + "ANCR jina Sam,+3125551212 \n"
    + "ANCR LMP 10,+13125551212,1403965605868\n"
    + "ANCR jina Maria,+13125551212,\"Apr 11, 2021 18:00 +0800\"\n"
    + "\"IMMR # mtoto Sandra Muragiri, III# mamaid 48892#dob 200\",+13125551212,not a date\n";

if (!args[2] || !args[3]) {
    return console.error(usage);
}

var parser = csv.parse(),
    input = fs.createReadStream(args[2]),
    first;

parser.on('readable', function() {
    postMessage(parser.read());
});

parser.on('error', function(error){
      console.error(error.message);
});

input.pipe(parser);

function postMessage(data) {

    // skip header row
    if (!first) {
        first = true;
        return;
    }
    var body = {
        message: data[0],
        from: data[1]
    };

    if (data.length > 2) {
        body.sent_timestamp = data[2];
    }

    var options = url.parse(args[3] + '/_design/medic/_rewrite/add');
    options.headers = options.headers ? options.headers : {};
    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.method = 'POST';

    var req = http.request(options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        console.log(chunk);
      });
    });

    req.on('error', function(e) {
        if (e) throw e;
    });

    console.log(querystring.stringify(body));
    req.write(querystring.stringify(body));
    req.end();
}
