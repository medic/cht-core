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
