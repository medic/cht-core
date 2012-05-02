#!/usr/bin/env node

var fs = require('fs')
  , _ = require('underscore')._
  , path = '../muvuku/forms/json'
  , result = {};

var collect = function(_result, total, idx) {
    _.extend(result, _result);
    if(idx + 1 === total) {
        console.log(JSON.stringify(result));
    }
};

var convertType = function(type, validateFn, choices) {
    if(type === "integer") {
        if(validateFn.is_boolean_list || choices) {
            return "choice";
        } else if(validateFn.is_numeric_year) {
            return "year";
        } else if(validateFn.is_numeric_month) {
            return "month";
        } else {
            return "number";
        }
    } else {
        return type;
    }
};

var convert = function(content) {
    var result = {};
    _.each(content, function(type) {
        result[type.meta.code] = {
            fields: []
        }
        
        _.each(type.fields, function(val, key) {
            var field = {
                key: key,
                label: val.labels.short.en || val.labels.short.fr,
                type: convertType(val.type, val.validate, val.choices)
            };
            if(val.validate.is_boolean_list) {
                field.choices = {
                    1: "False",
                    2: "True"
                };
            } else if(val.choices) {
                field.choices = {};
                _.each(val.choices, function(choice, idx) {
                    field.choices[idx + 1] = choice[1].en || choice[1].fr;
                });
            }
            result[type.meta.code].fields.push(field);
        });
    });
    return result;
};

fs.readdir(path, function(err, files) {
    if(err) { console.log(err); exit(1); }
    
    _.each(files, function(filename, idx) {
        fs.readFile(path + '/' + filename, function(err, content) {
            if(err) { console.log(err); exit(1); }
            collect(convert(JSON.parse(content)), files.length, idx);
        });
    });
});