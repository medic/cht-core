var path = 'json-forms';
    
module.exports = function (root, dir, settings, doc, callback) {
    if (!doc['kujua-sms']) {
        doc['kujua-sms'] = {};
    }
    
    if (!doc['kujua-sms'].sms_forms) {
        doc['kujua-sms'].sms_forms = [];
    }
    
    fs.readdir(path, function(err, files) {
        if(err) { return callback(err); }

        doc['kujua-sms'].sms_forms = files.filter(function (f) {
            return /.*\.json$/.test(f);
        });
        callback(null, doc);
    });
};
