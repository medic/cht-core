exports.data_records = {
    map: function(doc) {
        var objectpath = require('views/lib/objectpath'),
            clinicId,
            centerId,
            districtId,
            form = doc.form,
            valid;

        if (doc.type === 'data_record') {
            clinicId = objectpath.get(doc, 'related_entities.clinic._id');
            centerId = objectpath.get(doc, 'related_entities.clinic.parent._id');
            districtId = objectpath.get(doc, 'related_entities.clinic.parent.parent._id');
            valid = !doc.errors || doc.errors.length === 0;

            emit([doc.reported_date], 1);
            emit([valid, doc.reported_date], 1);

            if (form) {
                emit([form, doc.reported_date], 1);
                emit([valid, form, doc.reported_date], 1);

                emit(['*', doc.reported_date], 1);
                emit([valid, '*', doc.reported_date], 1);
            } else {
                emit(['null_form', doc.reported_date], 1);
                emit([valid, 'null_form', doc.reported_date], 1);
            }

            if (clinicId) {
                emit([clinicId, doc.reported_date], 1);
                emit([valid, clinicId, doc.reported_date], 1);

                if (form) {
                    emit([clinicId, form, doc.reported_date], 1);
                    emit([valid, clinicId, form, doc.reported_date], 1);

                    emit([clinicId, '*', doc.reported_date], 1);
                    emit([valid, clinicId, '*', doc.reported_date], 1);
                } else {
                    emit([clinicId, 'null_form', doc.reported_date], 1);
                    emit([valid, clinicId, 'null_form', doc.reported_date], 1);
                }
            }
            if (centerId) {
                emit([centerId, doc.reported_date], 1);
                emit([valid, centerId, doc.reported_date], 1);

                if (form) {
                    emit([centerId, form, doc.reported_date], 1);
                    emit([valid, centerId, form, doc.reported_date], 1);

                    emit([centerId, '*', doc.reported_date], 1);
                    emit([valid, centerId, '*', doc.reported_date], 1);
                } else {
                    emit([centerId, 'null_form', doc.reported_date], 1);
                    emit([valid, centerId, 'null_form', doc.reported_date], 1);
                }
            }
            if (districtId) {
                emit([districtId, doc.reported_date], 1);
                emit([valid, districtId, doc.reported_date], 1);

                if (form) {
                    emit([districtId, form, doc.reported_date], 1);
                    emit([valid, districtId, form, doc.reported_date], 1);

                    emit([districtId, '*', doc.reported_date], 1);
                    emit([valid, districtId, '*', doc.reported_date], 1);
                } else {
                    emit([districtId, 'null_form', doc.reported_date], 1);
                    emit([valid, districtId, 'null_form', doc.reported_date], 1);
                }
            }
            if (clinicId && districtId) {
                emit([districtId, clinicId, doc.reported_date], 1);
                emit([valid, districtId, clinicId, doc.reported_date], 1);

                if (form) {
                    emit([districtId, clinicId, form, doc.reported_date], 1);
                    emit([valid, districtId, clinicId, form, doc.reported_date], 1);

                    emit([districtId, clinicId, '*', doc.reported_date], 1);
                    emit([valid, districtId, clinicId, '*', doc.reported_date], 1);
                } else {
                    emit([districtId, clinicId, 'null_form', doc.reported_date], 1);
                    emit([valid, districtId, clinicId, 'null_form', doc.reported_date], 1);
                }
            }
            if (centerId && districtId) {
                emit([districtId, centerId, doc.reported_date], 1);
                emit([valid, districtId, centerId, doc.reported_date], 1);

                if (form) {
                    emit([districtId, centerId, form, doc.reported_date], 1);
                    emit([valid, districtId, centerId, form, doc.reported_date], 1);

                    emit([districtId, centerId, '*', doc.reported_date], 1);
                    emit([valid, districtId, centerId, '*', doc.reported_date], 1);
                } else {
                    emit([districtId, centerId, 'null_form', doc.reported_date], 1);
                    emit([valid, districtId, centerId, 'null_form', doc.reported_date], 1);
                }
            }
        }
    }
};


// only emit valid records with a form
exports.data_records_valid_by_district_and_form = {
     map: function(doc) {
        var objectpath = require('views/lib/objectpath'),
            dh;

        if (doc.type === 'data_record' && doc.form) {
            dh = objectpath.get(doc, 'related_entities.clinic.parent.parent') || objectpath.get(doc, 'related_entities.health_center.parent');

            if (!doc.errors || doc.errors.length === 0) {
                if (dh) {
                    emit([dh._id, doc.form, dh.name], 1);
                } else {
                    emit([null, doc.form, null], 1);
                }
            }
        }
    },
    reduce: function(key, counts) {
        return sum(counts);
    }
};

exports.usage_stats_by_year_month = {
     map: function(doc) {
        if (doc.type === 'usage_stats') {
            emit([doc.year, doc.month], 1);
        }
    }
};

exports.data_records_valid_by_year_month_and_form = {
     map: function(doc) {
        if (doc.type === 'data_record' && doc.form) {
            if (!doc.errors || doc.errors.length === 0) {
                var date = new Date(doc.reported_date);
                emit([date.getFullYear(), date.getMonth(), doc.form], 1);
            }
        }
    },
    reduce: function(key, counts) {
        return sum(counts);
    }
};

exports.data_records_read_by_type = {
    map: function(doc) {
        var objectpath = require('views/lib/objectpath'),
            type,
            dh;

        var emitRead = function(doc, type, dh) {
            emit(['_total', type, dh], 1);
            if (doc.read) {
                doc.read.forEach(function(user) {
                    if (user) {
                        emit([user, type, dh], 1);
                    }
                });
            }
        };

        if (doc.type === 'data_record') {
            type = doc.form ? 'forms' : 'messages';
            dh = objectpath.get(doc, 'related_entities.clinic.parent.parent._id');
            if (dh) {
                emitRead(doc, type, dh);
            } else if (doc.tasks) {
                doc.tasks.forEach(function(task) {
                    dh = objectpath.get(task.messages[0], 'facility.parent.parent._id');
                    emitRead(doc, type, dh);
                });
            } else {
                emitRead(doc, type);
            }
        }
    },
    reduce: function(key, counts) {
        return sum(counts);
    }
};


exports.data_records_by_contact = {
    map: function(doc) {
        var getName = function(facility) {
            if (facility) {
                var nameParts = [];
                while (facility) {
                    if (facility.name) {
                        nameParts.push(facility.name);
                    }
                    facility = facility.parent;
                }
                if (nameParts.length) {
                    return nameParts;
                }
            }
        };
        var emitContact = function(districtId, key, date, value) {
            if (key) {
                emit([districtId || 'none', key, date], value);
                emit(['admin', key, date], value);
            }
        };

        var objectpath = require('views/lib/objectpath'),
            districtId,
            message,
            facility,
            contact,
            key,
            name;
        if (doc.type === 'data_record') {
            if (!doc.form) {
                if (doc.kujua_message) {
                    doc.tasks.forEach(function(task) {
                        message = task.messages[0];
                        facility = message.facility;
                        districtId = objectpath.get(facility, 'parent.parent._id');
                        key = (facility && facility._id) || message.to;
                        name = getName(facility) || message.to;
                        contact = objectpath.get(facility, 'contact.name');
                        emitContact(districtId, key, doc.reported_date, {
                            date: doc.reported_date,
                            read: doc.read,
                            contact: contact,
                            facility: facility,
                            name: name,
                            message: message.message
                        });
                    });
                } else if (doc.sms_message) {
                    districtId = objectpath.get(doc, 'related_entities.clinic.parent.parent._id');
                    message = doc.sms_message;
                    facility = objectpath.get(doc, 'related_entities.clinic');
                    name = getName(facility) || doc.from;
                    contact = objectpath.get(facility, 'contact.name');
                    key = (facility && facility._id) || doc.from;
                    emitContact(districtId, key, doc.reported_date, {
                        date: doc.reported_date,
                        read: doc.read,
                        contact: contact,
                        facility: facility,
                        name: name,
                        message: message.message
                    });
                }
            }
        }
    },
    reduce: function(key, values) {
        var max = { date: 0 };
        var read;
        values.forEach(function(value) {
            if (!read || !value.read) {
                read = value.read || [];
            } else {
                read = read.filter(function(user) {
                    return value.read.indexOf(user) !== -1;
                });
            }
            if (value.date > max.date) {
                max = value;
            }
        });
        max.read = read;

        // needed to reduce object size
        max.facility = undefined;

        var code = max.message.charCodeAt(99);
        if (0xD800 <= code && code <= 0xDBFF) {
          max.message = max.message.substr(0, 99);
        } else {
          max.message = max.message.substr(0, 100);
        }

        return max;
    }
};

exports.data_records_by_district = {
    map: function(doc) {
        var objectpath = require('views/lib/objectpath'),
            dh;

        if (doc.type === 'data_record') {
            dh = objectpath.get(doc, 'related_entities.clinic.parent.parent');

            if (dh && dh.type === 'district_hospital') {
                emit([dh._id, dh.name], null);
            }
        }
    },

    reduce: function(key, doc) {
        return true;
    }
};

/*
 * Get facility based on phone number
 */

exports.facility_by_phone = {
    map: function (doc) {
        if (doc.contact && doc.type) {
            if (doc.type === 'clinic') {
                emit([doc.contact.phone, 'clinic'], doc);
            } else if (doc.type === 'health_center') {
                emit([doc.contact.phone, 'health_center'], doc);
            } else if (doc.type === 'district_hospital') {
                emit([doc.contact.phone, 'district_hospital'], doc);
            }
        }
    }
};

exports.facility_by_parent = {
    map: function (doc) {
        if (doc.type === 'clinic' || doc.type === 'health_center' || doc.type === 'district_hospital') {
            emit([doc.parent._id, doc.name, doc.type], true);
        }
    }
};

/*
 * Get clinic based on phone number
 */
exports.clinic_by_phone = {
    map: function (doc) {
        if (doc.type === 'clinic' && doc.contact) {
            emit([doc.contact.phone], doc);
        }
    }
};

/*
 * Get clinic based on health center phone number
 */
exports.clinic_by_parent_phone = {
    map: function (doc) {
        var objectpath = require('views/lib/objectpath'),
            phone = objectpath.get(doc, 'parent.contact.phone');

        if (doc.type === 'clinic' && phone) {
            emit([phone], doc);
        }
    }
};

/*
 * Get clinic based on referral id (refid) in a tasks_referral doc.
 */
exports.clinic_by_refid = {
    map: function (doc) {
        if (doc.type === 'clinic' && doc.contact && doc.contact.rc_code) {
            // need String because rewriter wraps everything in quotes
            // keep refid case-insenstive since data is usually coming from SMS
            emit([String(doc.contact.rc_code).toUpperCase()], doc);
        }
    }
};

exports.tasks_pending = {
    map: function (doc) {
        var has_pending,
            tasks = doc.tasks || [],
            scheduled_tasks = doc.scheduled_tasks || [];

        /*
         * Required fields for message to be processed:
         *  task `state` value must be 'pending'
         *  message needs the `to` and `message` properties
         */
        function hasPending(tasks) {
            var has = false,
                tasks = tasks || [];
            tasks.forEach(function(task) {
                if (task && task.state === 'pending') {
                    task.messages.forEach(function(msg) {
                        if (msg && msg.to && msg.message) {
                            has = true;
                        }
                    });
                }
            });
            return has;
        }

        // check tasks
        has_pending = hasPending(doc.tasks);

        // if still not pending check scheduled_tasks too.  also, only process
        // scheduled tasks if doc has no errors.
        if (!has_pending && (!doc.errors || doc.errors.length === 0)) {
            has_pending = hasPending(doc.scheduled_tasks);
        }

        if (has_pending) {
            emit([doc.reported_date, doc.refid]);
        }
    }
};


exports.duplicate_form_submissions = {
    map: function(doc) {
        if(doc.type == "data_record" && doc.sms_message.form){
            emit([doc.sms_message.form, doc.sms_message.from, doc.sms_message.message], doc._rev);
        }
    },

    reduce: function(keys, values, rereduce){
        if (rereduce){
            return sum(values);
        }
        else{
            return values.length;
        }
    }
};
