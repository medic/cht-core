var dutils = require('duality/utils');

// deprecated, remove if not needed
exports.deleteDoc = function (doc, req) {
    doc._deleted = true;
    return [doc, dutils.redirect(req, req.form.next)];
};
