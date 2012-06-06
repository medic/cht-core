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

// some forms update existing records instead of always creating new ones.  In
// that case they need to define an update URL and a view needs to be setup
// based on the fields to query for an existing record.
var getUpdatePath = function(form) {

    if(form === 'CNPW') {
        return '/:form/data_record/merge/:from/:week_number';
    }

    if(form === 'PSMM') {
        return '/:form/data_record/merge/:monthly_year/:monthly_month/:clinic_id';
    }

    return '';
};

// given a range of numbers return one in between
var randNum = function(from, to) {
    from = from || 10000000000;
    to = to || 99999999999;
    return Math.floor(Math.random() * (to - from + 1) + from);
}

// given a string return random character from the string
var randChar = function(str) {
    return str[Math.floor(Math.random() * str.length)];
};

// generate example muvuku message based on JSON form def
var generateFieldData = function(field) {

    var chars = "abcdefghiklmnopqrstuvwxyz",
        ints = "123456789";

    if (field.list)
        return field.list[Math.floor(Math.random()*field.list.length)][0];

    // year
    if (field.validate && field.validate.is_numeric_year)
        return randNum(2012, 2100);

    // month
    if (field.validate && field.validate.is_numeric_month)
        return randNum(1,12);

    if (field.type === 'boolean')
        return randNum(0,1);

    if (field.type === 'date') {
        var d = new Date();
        d.setTime(d.getTime()*Math.random());
        return d.toJSON();
    }

    if (field.type === 'string') {
        // always generate max length, if string has no length use 3.
        var c = randChar(chars),
            len = field.length ? field.length : 3,
            ret = '';

        for (var x = 0; x < len; x++) {
            ret += c;
        }

        return ret;
    }

    if (field.type === 'integer') {
        // TODO always generate max length
        if (field.range)
            return randNum(field.range[0], field.range[1]);

        if (field.length) {
            var i = randChar(ints),
                ret = '';
            for (var x = 0; x < field.length[1]; x++) {
                ret += i;
            }
            return Number(ret);
        }

        // integer field has no length, generate random 3 digit number
        return randNum(100,999);
    }

};

var convert = function(content, locales) {
    var result = {};
    _.each(content, function(type) {
        result[type.meta.code] = {
            fields: [],
            examples: {
                data: {
                    muvuku: [],
                    textforms: []
                },
                messages: {
                    muvuku: '',
                    textforms: ''
                }
            }
        };

        if(type.meta.label) {
            result[type.meta.code].title = type.meta.label;
        }

        result[type.meta.code].data_record_merge = getUpdatePath(type.meta.code);

        _.each(type.fields, function(val, key) {
            if (!val.labels) {
                throw new Error(
                    'Field must have labels: ' + JSON.stringify(val));
            }
            var field = {
                key: key,
                labels: val.labels,
                type: val.type
            };
            if (val.required) {
                field.required = true;
            }
            if (val.list) {
                field.type = 'select';
                field.list = val.list;
            }
            // map months
            if (val.validate && val.validate.is_numeric_month) {
                field.type = 'month';
                field.list = undefined;
            }
            // map years
            if (val.validate && val.validate.is_numeric_year) {
                field.type = 'year';
                field.list = undefined;
            }
            // turn boolean into select form
            if (val.type === 'boolean') {
                field.type = 'select';
                field.list = [[0,{en: 'False'}],[1,{en: 'True'}]];
            }
            field.example_data = generateFieldData(val);
            result[type.meta.code].fields.push(field);
            result[type.meta.code].examples.data.muvuku.push(field.example_data);
        });

        // example data from muvuku
        result[type.meta.code].examples.messages.muvuku =
            '1!'+type.meta.code+'!'
            + result[type.meta.code].examples.data.muvuku.join('#');

    });
    return result;
};
