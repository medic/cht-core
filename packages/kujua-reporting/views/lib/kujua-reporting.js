/*
 * return array of facilities related to record. always order array by highest
 * level positioned first.  e.g. [dh, hc, clinic]
 */
exports.getFacilitiesList = function(doc) {

    var dh = {},
        hc = {},
        cl = {};

    if (!doc.related_entities) {
        return [dh, hc, cl];
    };

    // support records reported by clinic
    if (doc.related_entities.clinic) {
        dh = doc.related_entities.clinic.parent.parent;
        hc = doc.related_entities.clinic.parent;
        cl = doc.related_entities.clinic;
        return [dh, hc, cl];
    }

    // support records reported by health center
    if (doc.related_entities.health_center) {
        dh = doc.related_entities.health_center.parent;
        hc = doc.related_entities.health_center;
        return [dh, hc, cl];
    }

};

/**
 * Return name of reporter.  Takes list of facility objects and a phone number
 * and returns contact name or undefined.
 *
 * @name getReporterName(facilities, phone)
 * @param {Array} facilities
 * @param {String} phone
 * @api private
 */
exports.getReporterName = function(facilities, phone) {

    if (!phone || facilities.length === 0)
        return;

    for (var i in facilities) {
        var f = facilities[i];
        //if (f.contact && f.contact.phone === phone)
        return f.contact ? f.contact.name : undefined;
    };

};
