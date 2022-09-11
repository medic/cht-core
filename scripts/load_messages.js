#!/usr/bin/env node

const querystring = require('querystring');
const url = require('url');
const csv = require('csv');
const fs = require('fs');
const args = [];

process.argv.forEach(function(val, idx) {
  args[idx] = val;
});

const usage = `\nUsage: load_messages.js <path> <url>\n\n
path    CSV file with message data, columns are defined as follows:\n
            message   Raw message string\n
            from      Phone number of sender\n
            timestamp When message was received by gateway (optional).\n
                      This could be any format that is supported by the\n
                      moment.js library. If it fails to parse then default\n
                      will be creation time.\n
url     URL to medic database.\n\n
Examples:\n\n
node scripts/load_messages.js ~/data.csv http://admin:pass@localhost/medic\n\n
data.csv contents:\n\n
message,from,sent timestamp,locale\n
ANCR name Samantha,+3125551212 \n
ANCR LMP 10,+13125551212,1403965605868\n
ANCR jina Maria,+13125551212,"Apr 11, 2021 18:00 +0800",sw\n
"IMMR # mtoto Sandra Muragiri, III# mamaid 48892#dob 200",+13125551212,not a date,sw\n`;

if (!args[2] || !args[3]) {
  return console.error(usage);
}

const parser = csv.parse();
const input = fs.createReadStream(args[2]);
let first;

/*
 * Configure columns for parsing.
 *
 *   name - field name used for POST
 *   match - regex to match the header cell
 */
const columns = [
  {
    name: 'message',
    match: /message/i
  },
  {
    name: 'from',
    match: /(from|phone)/i,
  },
  {
    name: 'sent_timestamp',
    match: /timestamp/i,
  },
  {
    name: 'locale',
    match: /locale/i,
  },
];

parser.on('readable', function() {
  postMessage(parser.read());
});

parser.on('error', function(error){
  console.error(error.message);
});

input.pipe(parser);

const postMessage = (data) => {

  const body = {};

  // collect header data to match columns and field names and then skip.
  if (!first) {
    data.forEach(function(val, idx) {
      columns.forEach(function(v) {
        if (val.match(v.match)) {
          v.idx = idx;
        }
      });
    });
    first = true;
    return;
  }

  columns.forEach(function(val) {
    body[val.name] = data[val.idx];
  });

  const options = url.parse(args[3] + '/_design/medic/_rewrite/add');
  options.headers = options.headers ? options.headers : {};
  options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  options.method = 'POST';

  const http = options.protocol === 'https:' ? require('https') : require('http');

  const req = http.request(options, (res) => {
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      console.log(chunk);
    });
  });

  req.on('error', function(e) {
    if (e) {
      throw e;
    }
  });

  console.log(querystring.stringify(body));
  req.write(querystring.stringify(body));
  req.end();
};
