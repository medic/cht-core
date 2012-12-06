exports.update_clinics = function(doc) {
    var entities = doc.related_entities;

    return doc.form && entities && !entities.clinic;
};
