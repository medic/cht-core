var fs = require('fs')
  , muvuku_path = '../muvuku/forms/json'
  , async = require('async')
  , _ = require('underscore')._
  , result = {}
  , locales = ['en', 'fr'];

module.exports = {
    after: 'modules',
    run: function (root, path, settings, doc, callback) {
        if (doc['kujua-sms']) {
            var files = doc['kujua-sms'].sms_forms;

            async.reduce(files, {}, function(result, filename, cb) {
                fs.readFile(muvuku_path + '/' + filename, function(err, content) {
                    if(err) { return cb(err); }

                    var translation = convert(JSON.parse(content), locales);
                    _.extend(result, translation);
                    cb(null, result);
                });
            },
            function (err, result) {
                if (err) {
                    return callback(err);
                }
                var code = doc.views.lib.smsforms;
                for (var k in result) {
                    code += '\n\nexports["' + k.replace('"', '\\"') + '"] = ' +
                        JSON.stringify(result[k]) + ';';
                }
                doc.views.lib.smsforms = code;
                callback(null, doc);
            });
        } else {
            callback(null, doc);
        }
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
