var fs = require('fs')
  , _ = require('underscore')._
  , path = '../muvuku/forms/json'
  , result = {}
  , locales = ['en', 'fr'];

var collect = function(_result, total, idx) {
    _.extend(result, _result);
    if(idx + 1 === total) {
        console.log(JSON.stringify(result));
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

fs.readdir(path, function(err, files) {
    if(err) { console.log(err); process.exit(1); }
    
    _.each(files, function(filename, idx) {
        fs.readFile(path + '/' + filename, function(err, content) {
            if(err) { console.log(err); process.exit(1); }
            collect(convert(JSON.parse(content), locales), files.length, idx);
        });
    });
});