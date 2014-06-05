
exports.contacts = {
    index: function(doc) {
        if (~['clinic', 'health_center', 'district_hospital'].indexOf(doc.type)) {
            var ret = new Document(),
                district,
                facility,
                contact = doc.contact;

            ret.add(doc.name);

            if (contact && contact.phone) {
                ret.add(contact.phone);
            }

            if (contact && contact.name) {
                ret.add(contact.name);
            }

            if (contact && contact.rc_code) {
                ret.add(contact.rc_code);
            }

            if (doc.type === 'district_hospital') {
                ret.add(doc._id, {
                    field: 'district'
                });
            } else if (doc.type === 'health_center') {
                district = doc.parent;

                if (district && district._id) {
                    ret.add(district._id, {
                        field: 'district'
                    });
                }
            } else if (doc.type === 'clinic') {
                facility = doc.parent;
                if (facility && facility._id) {
                    ret.add(facility._id, {
                        field: 'facility'
                    });

                    district = facility.parent;
                    if (district) {
                        ret.add(district._id, {
                            field: 'district'
                        });
                    }
                }
            }

            return ret;
        } else {
            return null;
        }
    }
};

exports.data_records = {
    index: function(doc) {
        if (doc.type === 'data_record') {
            var ret = new Document();

            // defaults
            if (doc.patient_id) {
                ret.add(doc.patient_id);
            }
            if (doc.patient_name) {
                ret.add(doc.patient_name);
            }
            if (doc.caregiver_name) {
                ret.add(doc.caregiver_name);
            }
            if (doc.caregiver_phone) {
                ret.add(doc.caregiver_phone);
            }

            var skip = ['type', 'form', '_rev', 'refid', 'id'],
                date;

            // index form fields and _id
            for (var key in doc) {
                if (skip.indexOf(key) !== -1) {
                    continue;
                }
                // if field key ends in _date, try to parse as date.
                if (/_date$/.test(key)) {
                    date = new Date(doc[key]);
                    if (date) {
                        //log.info('adding date '+key);
                        ret.add(date, {
                            field: key,
                            type: "date"
                        });
                    } else {
                        log.info('failed to parse date '+key+' on '+doc._id);
                    }
                } else if (typeof doc[key] === 'string' ||
                           typeof doc[key] === 'number') {
                    if (key === '_id') {
                        ret.add(doc[key], {
                            field: 'uuid'
                        });
                    } else {
                        ret.add(doc[key], {
                            field: key
                        });
                    }
                }
            }

            // district is needed to verify search is authorized
            if (doc.related_entities.clinic &&
                doc.related_entities.clinic.parent &&
                doc.related_entities.clinic.parent.parent &&
                doc.related_entities.clinic.parent.parent._id) {
                    ret.add(
                        doc.related_entities.clinic.parent.parent._id, {
                        field: 'district'
                    });
            }
            return ret;
        } else {
            return null;
        }
    }
};
