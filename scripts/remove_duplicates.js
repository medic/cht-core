#!/usr/bin/env node

var util = require('util'),
    url = require('url'),
    http = require('http'),
    _ = require('underscore');

"use strict";

var duplicate_list_url = "_design/medic/_rewrite/duplicate_records/";
var usage = "\nUsage: ./remove_duplicates.js <MedicDB_url> <form_id> " +
    "\n Example: ./remove_duplicates.js http://admin:pass@localhost:5984/medic FORM_id \n";

var args = process.argv;


if (args.length != 4) {
    return console.error(usage);
}

var couchDB_url = args[2];
var form_id = args[3];

var medic_url = url.resolve(couchDB_url, 'medic');
var target_url = url.resolve(couchDB_url, 'medic/' + duplicate_list_url + form_id);

var options = url.parse(target_url);
var duplicate_values = [];

var duplicates_output = "";
var req = http.request(options, function (res) {

    res.setEncoding('utf-8');

    res.on('data', function (chunk) {
        duplicates_output += chunk.toString();
    });

    res.on('end', function () {
        duplicate_values = (JSON.parse(duplicates_output)).duplicates;

        duplicate_values.forEach(function (duplicate) {

            var del_url = url.resolve(couchDB_url, 'medic/' + duplicate.id + '?rev=' + duplicate.rev);
            var del_options = url.parse(del_url);

            _.extend(del_options, {method: 'DELETE'});

            var del_req = http.request(del_options, function (resp) {
                resp.setEncoding('utf-8');

                resp.on('data', function (chunk) {
                    console.log(chunk);
                });
            });

            del_req.on('error', function (e) {
                if (e) {
                    console.log(e.message);
                }
            });
            del_req.end();
        });
    });

});

req.on('error', function (e) {
    if (e) {
        throw e;
    }
});


req.end();