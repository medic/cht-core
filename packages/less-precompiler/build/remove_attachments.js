module.exports = {
    after: 'attachments',
    run: function (root, path, settings, doc, callback) {
        if (settings.less && settings.less.remove_from_attachments) {
            for (var k in (doc._attachments || {})) {
                if (/\.less$/.test(k)) {
                    delete doc._attachments[k];
                }
            }
        }
        callback(null, doc);
    }
};
