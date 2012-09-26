/*
 * Get clinic based on reference id
 */
module.exports = {
    map: function (doc) {
        if (doc.type === 'clinic' && doc.contact && doc.contact.rc_code) {
            // need String because rewriter wraps everything in quotes
            emit([String(doc.contact.rc_code)], doc);
        }
    }
};
