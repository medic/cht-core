/*
 * Get clinic based on phone number
 */
module.exports = {
    map: function (doc) {
        if (doc.type === 'clinic' && doc.contact && doc.contact.phone) {
            emit([doc.contact.phone], doc);
        }
    }
};
