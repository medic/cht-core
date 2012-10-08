/*
 * Get facility based on parent id
 */
module.exports = {
    map: function (doc) {
        if (doc.type === 'clinic'
            || doc.type === 'health_center'
            || doc.type === 'district_hospital') {
            emit([doc.parent._id, doc.name, doc.type], true);
        }
    }
};
