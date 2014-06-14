#!/usr/bin/env node

var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    args = [],
    payload;

process.argv.forEach(function(val, idx, array) {
    args[idx] = val;
});

var usage = "\nUsage: load_forms.js <path> <url>\n\n"
    + "path    Path to a json forms file to upload.\n"
    + "url     URL to kujua database, no trailing slash.\n\n"
    + "Examples:\n\n"
    + "./scripts/load_forms.js ../json-forms/generic-anc.json http://admin:pass@localhost/kujua-lite\n";

if (!args[2] || !args[3]) {
    return console.error(usage);
}

fs.readFile(args[2], {encoding: "utf-8"}, function(err, data) {
    if (err) throw err;
    var forms = JSON.parse(data),
        settings = { forms: {} };

    forms.forEach(function(form, idx) {
        if (form.meta && form.meta.code) {
            settings.forms[form.meta.code] = form;
        }
    });

    var options = url.parse(args[3] + '/_design/kujua-lite/_rewrite/update_settings/kujua-lite');
    options.method = 'PUT';

    var req = http.request(options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        console.log(chunk);
      });
    });

    req.on('error', function(e) {
        if (e) throw e;
    });

    // write data to request body
    req.write(JSON.stringify(settings));
    req.end();
});

