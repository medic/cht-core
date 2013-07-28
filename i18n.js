var async = require('async'),
    db = require('./db'),
    config = require('./config'),
    mustache = require('mustache'),
    _ = require('underscore'),
    values = {},
    queue;

// turn translations array into object with keys
if (config && config.translations) {
    _.each(config.translations, function(t) {
        if (t.key) {
            values[t.key] = t.value;
        }
    });
}

//
// queue adds keys to the translationsDoc if they're not present, one at a time
// with a FIX_ME property
//
queue = async.queue(function(key, callback) {

    db.getDoc('_design/kujua-lite', function(err, doc) {
        var existing;

        if (err) {
            console.log(JSON.stringify(err));
        } else {
            existing = _.find(doc.keys, function(value) {
                return value.key === key;
            });
            if (existing) {
                callback();
            } else {
                doc.keys.push({
                    value: key,
                    key: key,
                    FIX_ME: true
                });
                db.saveDoc(doc, callback);
            }
        }
    });
}, 1);

module.exports = function(key, context) {
    var s;

    context = context || {};

    if (key in values) {
        s = values[key];
    } else {
        s = key;
        values[key] = key;
        // disabled queue for time being.  not sure how useful this feature is,
        // and I'm not sure we want to make changes to ddoc.app_settings from
        // sentinel.
        // queue.push(key);
    }

    return mustache.to_html(s, context);
};

