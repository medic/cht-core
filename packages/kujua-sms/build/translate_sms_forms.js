var fs = require('fs')
  , jsonforms_path = 'json-forms'
  , async = require('async')
  , modules = require('kanso-utils/modules')
  , _ = require('underscore')._
  , result = {};

module.exports = {
    before: 'modules',
    run: function (root, path, settings, doc, callback) {
        if (doc['kujua-sms']) {
            var files = doc['kujua-sms'].json_forms;

            async.reduce(files, {}, function(result, filename, cb) {
                fs.readFile(jsonforms_path + '/' + filename, function(err, content) {
                    if(err) { return cb(err); }

                    var translation = convert(JSON.parse(content));
                    _.extend(result, translation);
                    cb(null, result);
                });
            },
            function (err, result) {
                if (err) {
                    return callback(err);
                }
                var code = doc.views.lib.jsonforms;
                for (var k in result) {
                    code += '\n\nexports["' + k.replace('"', '\\"') + '"] = ' +
                        JSON.stringify(result[k]) + ';';
                }
                delete doc.views.lib.jsonforms;
                modules.add(doc, 'views/lib/jsonforms', code);
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

    if(form === 'VPD') {
        return '/:form/data_record/merge/:from/:week';
    }

    if(form === 'PSMM') {
        return '/:form/data_record/merge/:monthly_year/:monthly_month/:facility_id';
    }

    return '';
};

// given a range of numbers return one in between
var randNum = function(from, to) {
    from = from === undefined ? 10000000000: from;
    to = to === undefined ? 99999999999: to;
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
        return randNum(2012, 2050);

    // month
    if (field.validate && field.validate.is_numeric_month)
        return randNum(1,12);

    if (field.type === 'boolean')
        return randNum(0,1);

    if (field.type === 'date') {
        var d = new Date();
        d.setTime(d.getTime()*Math.random());

        return 'YYYY-MM-DD'
            .replace('YYYY', randNum(2012, 2050))
            .replace('MM', ("0" + randNum(1,12)).slice(-2))
            .replace('DD', ("0" + d.getDate()).slice(-2));
    }

    if (field.type === 'string') {
        // try to generate max length, if string has no length use 3.
        var c = randChar(chars),
            len = field.length ? field.length[1] : 3,
            ret = '';

        for (var x = 0; x < len; x++) {
            ret += c;
        }

        return ret;
    }

    if (field.type === 'integer') {
        // try to generate max length
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

// take json-forms field object and return bool
var hasTextformsSupport = function(field) {
    var tiny = field.labels.tiny;
    return typeof tiny === 'string' || typeof tiny === 'object';
};

var convert = function(content) {

    var result = {};

    _.each(content, function(type) {
        var r = result[type.meta.code] = type;
        r.data_record_merge = getUpdatePath(type.meta.code);
        r.examples = {
            data: {
                muvuku: [],
                textforms: []
            },
            messages: {
                muvuku: [],
                textforms: []
            }
        };

        if (!type.fields) {
            throw new Error(
                'Form have fields: ' + JSON.stringify(type));
        }

        _.each(type.fields, function(val, key) {
            // check for some required attributes
            if (!val.labels) {
                throw new Error(
                    'Field must have labels: ' + JSON.stringify(val));
            } else if (typeof val.labels === 'object')  {
                if (!val.labels.short) {
                    throw new Error(
                        'Labels missing `short`: ' + JSON.stringify(val));
                };
            }

            // add muvuku example data
            var example_data = generateFieldData(val);
            r.examples.data.muvuku.push(example_data);

            // if tiny labels then add textforms data as well
            if (hasTextformsSupport(val)) {
                var tiny = val.labels.tiny;
                // textforms include the label with the data values. tiny can
                // be a locale object or string.
                if (typeof tiny === 'string') {
                    r.examples.data.textforms.push(tiny + ' ' + example_data);
                } else if (typeof tiny === 'object') {
                    // we only need to grab first locale for example messages
                    for (var k in tiny) {
                        var v = tiny[k];
                        r.examples.data.textforms.push(v + ' ' + example_data);
                        break;
                    }
                }
            };
        });

        // combine muvuku example data into message
        if (r.examples.data.muvuku) {
            r.examples.messages.muvuku =
                '1!'+type.meta.code+'!'
                + r.examples.data.muvuku.join('#');
        }

        // combine textforms example data into message
        if (r.examples.data.textforms.length > 0) {
            r.examples.messages.textforms =
                type.meta.code + ' '
                + r.examples.data.textforms.join('#');
        }

    });
    return result;
};
