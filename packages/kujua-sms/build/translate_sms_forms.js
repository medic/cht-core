var fs = require('fs')
  , muvuku_path = '../muvuku/forms/json'
  , _ = require('underscore')._
  , result = {}
  , locales = ['en', 'fr'];

module.exports = {
    after: 'modules',
    run: function (root, path, settings, doc, callback) {
        console.log(doc);
        if (doc['kujua-sms']) {
            var files = doc['kujua-sms'].sms_forms;

            _.each(files, function(filename, idx) {
                fs.readFile(muvuku_path + '/' + filename, function(err, content) {
                    if(err) { return callback(err); }

                    var translation = convert(JSON.parse(content), locales);
                    collect(translation, files.length, idx, callback, doc);
                });
            });
        } else {
            callback(null, doc);
        }
    }
};
      
var collect = function(_result, total, idx, callback, doc) {
    _.extend(doc._modules['views/lib/smsforms'], _result);
    
    if(idx + 1 === total) {
        // console.log(doc._module_paths.views.lib);
        // delete doc['kujua-sms'];
        callback(null, doc);
    }
};

var localizedString = function(strings, locales) {
    var string = '';
    
    _.each(locales, function(locale) {
        if(!_.isUndefined(strings[locale])) {
            string = strings[locale];
        }
    });
    
    return string;
};

var convert = function(content, locales) {
    var result = {};
    _.each(content, function(type) {
        result[type.meta.code] = {
            fields: []
        };
        
        if(type.meta.title) {
            result[type.meta.code].title = type.meta.title;
        }
        
        _.each(type.fields, function(val, key) {
            var field = {
                key: key,
                label: localizedString(val.labels.short, locales),
                type: val.type
            };
            if(val.choices) {
                field.choices = {};
                _.each(val.choices, function(choice, idx) {
                    field.choices[idx + 1] = localizedString(choice[1], locales);
                });
            }
            if(val.required) {
                field.required = true;
            }
            result[type.meta.code].fields.push(field);
        });
    });
    return result;
};