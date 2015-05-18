var getParent = function(facility, type) {
    while (facility && facility.type !== type) {
        facility = facility.parent;
    }
    return facility;
};

/*
 * return array of facilities related to record. always order array by highest
 * level positioned first.  e.g. [dh, hc, clinic]
 */
exports.getFacilitiesList = function(doc) {
    return [
        getParent(doc.contact, 'district_hospital'),
        getParent(doc.contact, 'health_center'),
        getParent(doc.contact, 'clinic')
    ];
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
