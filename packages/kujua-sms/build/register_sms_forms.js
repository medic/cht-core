var path = 'json-forms';

module.exports = function (root, dir, settings, doc, callback) {
    if (!doc['kujua-sms']) {
        doc['kujua-sms'] = {};
    }

    if (!doc['kujua-sms'].json_forms) {
        doc['kujua-sms'].json_forms = [];
    }

    fs.readdir(path, function(err, files) {
        if(err) { return callback(err); }

        doc['kujua-sms'].json_forms = files.filter(function (f) {
            return /.*\.json$/.test(f);
        });
        callback(null, doc);
    });
};
