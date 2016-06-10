exports.facilities = {
  map: function (doc) {
    if (doc.type === 'clinic' ||
        doc.type === 'health_center' ||
        doc.type === 'district_hospital' ||
        doc.type === 'national_office' ||
        doc.type === 'person') {

      var phone = doc.phone || doc.contact && doc.contact.phone,
          rc_code = doc.contact && doc.contact.rc_code;
      emit(
        [doc.type],
        {
          name: doc.name,
          contact: doc.contact,
          rc_code: rc_code,
          phone: phone
        }
      );
    }
  }
};

exports.facilities_by_district = {
  map: function (doc) {
    var dh_id,
        contact = doc.contact;
    if (doc.type === 'person' && doc.parent && doc.parent.parent && doc.parent.parent.parent) {
      dh_id = doc.parent.parent.parent._id;
      contact = doc;
    } else if (doc.type === 'clinic' && doc.parent && doc.parent.parent) {
      dh_id = doc.parent.parent._id;
    } else if (doc.type === 'health_center' && doc.parent) {
      dh_id = doc.parent._id;
    } else if (doc.type === 'district_hospital') {
      dh_id = doc._id;
    }
    if (dh_id) {
      emit(
        [dh_id, doc.type],
        {
          name: doc.name,
          rc_code: contact && contact.rc_code,
          phone: contact && contact.phone
        }
      );
    }
  }
};

exports.facilities_by_contact = {
  map: function (doc) {
    if ((doc.type === 'clinic' || doc.type === 'health_center' || doc.type === 'district_hospital') &&
        doc.contact &&
        doc.contact._id) {
      emit([doc.contact._id], 1);
    }
  }
};

exports.reminders = {
  map: function(doc) {

    var getDistrictId = function(facility) {
      while (facility && facility.type !== 'district_hospital') {
        facility = facility.parent;
      }
      return facility && facility._id;
    };

    var phone,
        refid,
        tasks,
        dh_id = getDistrictId(doc.contact);

    if (doc.type === 'data_record' && doc.form && doc.week_number && doc.year) {
      phone = doc.contact && doc.contact.phone;
      refid = doc.contact && doc.contact.parent && doc.contact.parent.rc_code;
      if (phone || (refid && refid !== null)) {
        emit([dh_id, doc.year, doc.week_number, phone, refid], 'report received');
      }
    } else if (doc.type === 'weekly_reminder' && doc.related_form && doc.week && doc.year && doc.phone) {
      tasks = doc.tasks;
      state = tasks.length ? tasks[0].state : 'unknown';
      emit([dh_id, doc.year, doc.week, doc.phone, doc.refid], 'reminder ' + state);
    }
  },
  reduce: function(keys, values) {
    return values.reduce(function(memo, value) {
      if (memo === 'report received') {
        return memo;
      } else if (memo === 'reminder sent') {
        return memo;
      } else {
        return value;
      }
    }, 'unknown');
  }
};

exports.delivery_reports_by_district_and_code = {
  map: function(doc) {
    if (doc.type === 'data_record' &&
        doc.form === 'D' &&
        !(doc.errors && doc.errors.length) &&
        doc.fields.delivery_code) {
      var getDistrictId = function(facility) {
        while (facility && facility.type !== 'district_hospital') {
          facility = facility.parent;
        }
        return facility && facility._id;
      };
      var dh = getDistrictId(doc.contact),
          code = doc.fields.delivery_code.toUpperCase();
      emit([dh, code]);
      emit(['_admin', code]);
    }
  },
  reduce: '_count'
};

exports.delivery_reports_by_year_month_and_code = {
  map: function(doc) {
    if (doc.type === 'data_record' &&
        doc.form === 'D' &&
        !(doc.errors && doc.errors.length) &&
        doc.fields.delivery_code) {
      var date = new Date(doc.reported_date);
      var code = doc.fields.delivery_code.toUpperCase();
      emit([date.getFullYear(), date.getMonth(), code]);
    }
  },
  reduce: '_count'
};

exports.data_records_by_year_month_form_facility = {
  map: function(doc) {
    if (doc.type === 'data_record' &&
        !(doc.errors && doc.errors.length) &&
        doc.contact &&
        doc.contact.parent) {
      var date = new Date(doc.reported_date);
      emit([date.getFullYear(), date.getMonth(), doc.form, doc.contact.parent._id]);
    }
  },
  reduce: '_count'
};

exports.visits_by_district_and_patient = {
  map: function(doc) {
    if (doc.type === 'data_record' &&
        doc.form === 'V' &&
        !(doc.errors && doc.errors.length)) {

      var getDistrictId = function(facility) {
        while (facility && facility.type !== 'district_hospital') {
          facility = facility.parent;
        }
        return facility && facility._id;
      };

      var dh = getDistrictId(doc.contact);
      emit([dh, doc.fields.patient_id]);
      emit(['_admin', doc.fields.patient_id]);
    }
  },
  reduce: '_count'
};

exports.feedback = {
  map: function(doc) {
    if (doc.type === 'feedback') {
      emit([new Date(doc.meta.time).valueOf()], 1);
    }
  }
};

exports.reports_by_date = {
  map: function(doc) {
    if (doc.type === 'data_record' && doc.form) {
      emit([doc.reported_date], doc.reported_date);
    }
  }
};

exports.reports_by_form = {
  map: function(doc) {
    if (doc.type === 'data_record' && doc.form) {
      emit([doc.form], doc.reported_date);
    }
  }
};

exports.reports_by_validity = {
  map: function(doc) {
    if (doc.type === 'data_record' && doc.form) {
      emit([!doc.errors || doc.errors.length === 0], doc.reported_date);
    }
  }
};

exports.reports_by_verification = {
  map: function(doc) {
    if (doc.type === 'data_record' && doc.form) {
      emit([doc.verified === true], doc.reported_date);
    }
  }
};

exports.reports_by_place = {
  map: function(doc) {
    if (doc.type === 'data_record' && doc.form) {
      var place = doc.contact && doc.contact.parent;
      while (place) {
        if (place._id) {
          emit([ place._id ], doc.reported_date);
        }
        place = place.parent;
      }
    }
  }
};

exports.reports_by_subject = {
  map: function(doc) {
    if (doc.type === 'data_record' && doc.form) {
      var patient = doc.patient_id || doc.fields.patient_id;
      if (patient) {
        emit([ patient ], doc.reported_date);
      }
      var place = doc.place_id || doc.fields.place_id;
      if (place) {
        emit([ place ], doc.reported_date);
      }
    }
  }
};

exports.reports_by_freetext = {
  map: function(doc) {

    var skip = [ '_id', '_rev', 'type', 'refid' ];

    var emitField = function(key, value, reportedDate) {
      if (!key || !value) {
        return;
      }
      key = key.toLowerCase();
      if (skip.indexOf(key) !== -1 || /_date$/.test(key)) {
        return;
      }
      if (typeof value === 'string') {
        value = value.toLowerCase();
        value.split(/\s+/).forEach(function(word) {
          emit([ word ], reportedDate);
        });
      }
      if (typeof value === 'number' || typeof value === 'string') {
        emit([ key + ':' + value ], reportedDate);
      }
    };

    if (doc.type === 'data_record' && doc.form) {
      for (var key in doc) {
        emitField(key, doc[key], doc.reported_date);
      }
      for (var key in doc.fields) {
        emitField(key, doc.fields[key], doc.reported_date);
      }
      if (doc.contact && doc.contact._id) {
        emit([ 'contact:' + doc.contact._id ], doc.reported_date);
      }
    }
  }
};

exports.contacts_by_name = {
  map: function(doc) {
    var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
    var idx = types.indexOf(doc.type);
    if (idx !== -1) {
      var name = doc.name && doc.name.toLowerCase();
      var order = idx + ' ' + name;
      emit([ order ], name);
    }
  }
};

exports.contacts_by_type = {
  map: function(doc) {
    var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
    var idx = types.indexOf(doc.type);
    if (idx !== -1) {
      var order = idx + ' ' + (doc.name && doc.name.toLowerCase());
      emit([ doc.type ], order);
    }
  }
};

exports.contacts_by_place = {
  map: function(doc) {
    var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
    var idx = types.indexOf(doc.type);
    if (idx !== -1) {
      var place = doc.parent;
      var order = idx + ' ' + (doc.name && doc.name.toLowerCase());
      while (place) {
        if (place._id) {
          emit([ place._id ], order);
        }
        place = place.parent;
      }
    }
  }
};

exports.doc_by_type = {
  map: function(doc) {
    emit([ doc.type ]);
  }
};

exports.contacts_by_freetext = {
  map: function(doc) {

    var skip = [ '_id', '_rev', 'type', 'refid' ];

    var emitField = function(key, value, order) {
      if (!key || !value) {
        return;
      }
      key = key.toLowerCase();
      if (skip.indexOf(key) !== -1 || /_date$/.test(key)) {
        return;
      }
      if (key === 'parent' && typeof value === 'object' && value.hasOwnProperty('name')) {
        value = value.name;
      }
      if (typeof value === 'string') {
        value = value.toLowerCase();
        value.split(/\s+/).forEach(function(word) {
          emit([ word ], order);
        });
      }
      if (typeof value === 'number' || typeof value === 'string') {
        emit([ key + ':' + value ], order);
      }
    };

    var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
    var idx = types.indexOf(doc.type);
    if (idx !== -1) {
      var order = idx + ' ' + (doc.name && doc.name.toLowerCase());
      for (var key in doc) {
        emitField(key, doc[key], order);
      }
      var clinic = doc.type === 'person' ? doc.parent : doc;
      if (clinic && clinic._id) {
        emit([ 'clinic:' + clinic._id ], order);
      }
    }
  }
};

exports.doc_summaries_by_id = {
  map: function(doc) {

    var getPlaceHierarchy = function(contact) {
      var place = contact.parent;
      var parts = [];
      while (place) {
        if (place.name) {
          parts.push(place.name);
        }
        place = place.parent;
      }
      return parts;
    };

    if (doc.type === 'data_record' && doc.form) { // report
      var from = (doc.contact && doc.contact.name) ||
                 doc.from ||
                 doc.sent_by;
      emit([ doc._id ], {
        _rev: doc._rev,
        from: from,
        phone: doc.contact && doc.contact.phone,
        form: doc.form,
        read: doc.read,
        valid: !doc.errors || !doc.errors.length,
        verified: doc.verified,
        reported_date: doc.reported_date,
        place: getPlaceHierarchy(doc.contact)
      });
    } else if (doc.type === 'clinic' ||
        doc.type === 'district_hospital' ||
        doc.type === 'health_center' ||
        doc.type === 'person') { // contact
      var place = doc.parent;
      var parts = [];
      while (place) {
        if (place.name) {
          parts.push(place.name);
        }
        place = place.parent;
      }
      var phone = doc.contact && doc.contact.phone;
      var name = doc.name || phone;
      emit([ doc._id ], {
        _rev: doc._rev,
        name: name,
        phone: phone,
        type: doc.type,
        place: getPlaceHierarchy(doc)
      });
    }
  }
};

exports.doc_by_place = {
  map: function(doc) {

    var emitPlace = function(place) {
      if (!place) {
        emit([ '_unassigned' ]);
        return;
      }
      while (place) {
        if (place._id) {
          emit([ place._id ]);
        }
        place = place.parent;
      }
      return;
    };

    if (doc._id === 'resources') {
      emit([ '_all' ]);
      return;
    }

    switch (doc.type) {
      case 'data_record':
        var place;
        if (doc.kujua_message === true) {
          // outgoing message
          place = doc.tasks &&
                  doc.tasks[0] &&
                  doc.tasks[0].messages &&
                  doc.tasks[0].messages[0] &&
                  doc.tasks[0].messages[0].contact
        } else {
          // incoming message
          place = doc.contact;
        }
        emitPlace(place);
        return;
      case 'form':
        emit([ '_all' ]);
        return;
      case 'clinic':
      case 'district_hospital':
      case 'health_center':
      case 'person':
        emitPlace(doc);
        return;
    }
  }
};
