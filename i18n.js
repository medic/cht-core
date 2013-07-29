var async = require('async'),
    config = require('./config'),
    mustache = require('mustache'),
    _ = require('underscore'),
    values = {};

// turn translations array into object with keys
if (config && config.translations) {
    _.each(config.translations, function(t) {
        if (t.key) {
            values[t.key] = t.value;
        }
    });
}

module.exports = function(key, context) {
    var s;

    context = context || {};

    if (key in values) {
        s = values[key];
    } else {
        s = key;
        values[key] = key;
    }

    return mustache.to_html(s, context);
};

