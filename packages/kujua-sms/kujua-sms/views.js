exports.data_records = {
    map: function(doc) {

        var getParentId = function(facility, type) {
            while (facility && facility.type !== type) {
                facility = facility.parent;
            }
            return facility && facility._id;
        };

        var clinicId,
            centerId,
            districtId,
            form = doc.form,
            valid;

        if (doc.type === 'data_record') {
            clinicId = getParentId(doc.contact, 'clinic');
            centerId = getParentId(doc.contact, 'health_center');
            districtId = getParentId(doc.contact, 'district_hospital');
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

        var getParent = function(facility, type) {
            while (facility && facility.type !== type) {
                facility = facility.parent;
            }
            return facility;
        };

        var dh;

        if (doc.type === 'data_record' &&
            doc.form &&
            (!doc.errors || doc.errors.length === 0)) {
            dh = getParent(doc.contact, 'district_hospital');
            if (dh) {
                emit([dh._id, doc.form, dh.name]);
            } else {
                emit([null, doc.form, null]);
            }
        }
    },
    reduce: '_count'
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
                emit([date.getFullYear(), date.getMonth(), doc.form]);
            }
        }
    },
    reduce: '_count'
};

exports.data_records_read_by_type = {
    map: function(doc) {
        var type,
            dh;

        var emitRead = function(doc, type, dh) {
            emit(['_total', type, dh]);
            if (doc.read) {
                doc.read.forEach(function(user) {
                    if (user) {
                        emit([user, type, dh]);
                    }
                });
            }
        };

        var getDistrictId = function(facility, type) {
            while (facility && facility.type !== 'district_hospital') {
                facility = facility.parent;
            }
            return facility && facility._id;
        };

        if (doc.type === 'data_record') {
            type = doc.form ? 'forms' : 'messages';
            dh = getDistrictId(doc.contact);
            if (dh) {
                emitRead(doc, type, dh);
            } else if (doc.tasks) {
                doc.tasks.forEach(function(task) {
                    dh = getDistrictId(task.messages[0].contact);
                    emitRead(doc, type, dh);
                });
            } else {
                emitRead(doc, type);
            }
        }
    },
    reduce: '_count'
};


exports.data_records_by_contact = {
    map: function(doc) {
        var getPosition = function(facility) {
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
        var emitContact = function(key, date, value) {
            if (key) {
                emit([key, date], value);
            }
        };

        var message,
            facility,
            contactName,
            key,
            position;
        if (doc.type === 'data_record' && !doc.form) {
            if (doc.kujua_message) {
                // outgoing
                doc.tasks.forEach(function(task) {
                    message = task.messages[0];
                    facility = message.contact;
                    key = (facility && facility._id) || message.to;
                    if (!facility) {
                        contactName = message.to;
                        position = undefined;
                    } else {
                        position = getPosition(facility.parent);
                        contactName = facility.name;
                    }
                    emitContact(key, doc.reported_date, {
                        date: doc.reported_date,
                        read: doc.read,
                        facility: facility,
                        message: message.message,
                        contact: {
                            name: contactName,
                            parent: position
                        }
                    });
                });
            } else if (doc.sms_message) {
                // incoming
                facility = doc.contact;
                message = doc.sms_message;
                position = facility && getPosition(facility.parent) || doc.from;
                contactName = (facility && facility.name) || doc.from;
                key = (facility && facility._id) || doc.from;
                emitContact(key, doc.reported_date, {
                    date: doc.reported_date,
                    read: doc.read,
                    facility: facility,
                    message: message.message,
                    contact: {
                        name: contactName,
                        parent: position
                    }
                });
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

        if (max.message) {
            var code = max.message.charCodeAt(99);
            if (0xD800 <= code && code <= 0xDBFF) {
              max.message = max.message.substr(0, 99);
            } else {
              max.message = max.message.substr(0, 100);
            }
        }

        return max;
    }
};

exports.data_records_by_district = {
    map: function(doc) {
        var getDistrict = function(facility) {
            while (facility && facility.type !== 'district_hospital') {
                facility = facility.parent;
            }
            return facility;
        };
        var dh;
        if (doc.type === 'data_record') {
            dh = getDistrict(doc.contact);
            if (dh) {
                emit([dh._id, dh.name], null);
            }
        }
    }
};

exports.facility_by_parent = {
    map: function (doc) {
        if (doc.type === 'clinic' ||
            doc.type === 'health_center' ||
            doc.type === 'district_hospital' ||
            doc.type === 'person') {
            emit([doc.parent._id, doc.name, doc.type], true);
        }
    }
};

/**
 * Used in the medic-data generate script
 */
exports.facility_by_phone = {
    map: function (doc) {
        if (doc.contact && doc.type) {
            if (doc.type === 'clinic') {
                emit([doc.contact.phone, 'clinic']);
            } else if (doc.type === 'health_center') {
                emit([doc.contact.phone, 'health_center']);
            } else if (doc.type === 'district_hospital') {
                emit([doc.contact.phone, 'district_hospital']);
            }
        }
    }
};

/*
 * Get clinic based on phone number
 */
exports.clinic_by_phone = {
    map: function(doc) {
        if (doc.type === 'clinic' && doc.contact && doc.contact.phone) {
            emit([doc.contact.phone]);
        }
    }
};

/*
 * Get person based on phone number
 * Used in the medic-data generate script
 */
exports.person_by_phone = {
    map: function (doc) {
        if (doc.type === 'person') {
            emit([doc.phone]);
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
            emit([String(doc.contact.rc_code).toUpperCase()]);
        }
    }
};

exports.tasks_messages = {
    map: function (doc) {
        var _emit = function(tasks) {
            tasks.forEach(function(task) {
                task.messages.forEach(function(msg) {
                    /*
                     * uuid, to and message properties are required for message
                     * to be processed/valid.
                     */
                    var when = task.due || task.timestamp || doc.reported_date;
                    if (msg.uuid && msg.to && msg.message) {
                        var val = {
                            message: msg.message,
                            to: msg.to,
                            id: msg.uuid,
                            state: task.state,
                            state_details: task.state_details,
                            state_history: task.state_history,
                            due: task.due,
                            timestamp: task.timestamp,
                            _record_id: doc._id,
                            _record_reported_date: doc.reported_date
                        };
                        // used for fetching a specific message based on uuid
                        emit(msg.uuid, val);
                        // used for querying latest tasks in a specific state
                        emit([task.state, when], val);
                    }
                });
            });
        };
        _emit(doc.tasks || []);
        _emit(doc.scheduled_tasks || []);
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
        if (doc.type == "data_record" &&
                doc.sms_message &&
                doc.sms_message.form) {
            emit([doc.sms_message.form,
                    doc.sms_message.from,
                    doc.sms_message.message], doc._rev);
        }
    },

    reduce: function(keys, values, rereduce){
        if (rereduce) {
            return sum(values);
        }
        return values.length;
    }
};

/*
 * Allow for quering of xml forms based on the doc id minus the prefix.
 */
exports.forms = {
    map: function(doc) {
        if (doc.type !== 'form' || !doc._attachments || !doc._attachments.xml) {
            return;
        }
        emit(doc.internalId);
    }
};

exports.help_pages = {
    map: function(doc) {
        if (doc.type === 'help' && doc._id.indexOf('help:') === 0) {
            emit(doc._id.substring(5), doc.title);
        }
    }
};
