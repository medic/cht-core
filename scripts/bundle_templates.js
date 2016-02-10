var fs = require('fs');

module.exports = {
    before: 'modules/attachment',
    run: function (root, path, settings, doc, callback) {
        fs.readFile('templates/inbox.html', function (err, content) {
            if (err) {
                return callback(err);
            }
            doc.inbox_template = content.toString();
            callback(null, doc);
        });
    }
};
