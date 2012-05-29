var fs = require('fs')
  , muvuku_path = '../muvuku/forms/json'
  , async = require('async')
  , modules = require('kanso-utils/modules')
  , _ = require('underscore')._
  , result = {}
  , locales = ['en', 'fr'];

module.exports = {
    before: 'modules',
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
                delete doc.views.lib.smsforms;
                modules.add(doc, 'views/lib/smsforms', code);
                callback(null, doc);
            });
        } else {
            callback(null, doc);
        }
    }
};

var convert = function(content, locales) {
    var result = {};
    _.each(content, function(type) {
        result[type.meta.code] = {
            fields: []
        };
        
        if(type.meta.label) {
            result[type.meta.code].title = type.meta.label;
        }
        
        _.each(type.fields, function(val, key) {
            var field = {
                key: key,
                label: val.labels.short,
                type: val.type
            };
            if (val.list) {
                field.list = val.list;
            }
            if (val.required) {
                field.required = true;
            }
            // turn boolean into select form
            if (val.type === 'boolean') {
                field.type = 'select';
                field.list = [[0,{en: 'False'}],[1,{en: 'True'}]];
            }
            result[type.meta.code].fields.push(field);
        });
    });
    return result;
};
