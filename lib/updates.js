var dutils = require('duality/utils');

// remove if not needed
exports.deprecated_deleteDoc = function (doc, req) {
    doc._deleted = true;
    return [doc, dutils.redirect(req, req.form.next)];
};
