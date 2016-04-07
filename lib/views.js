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
}

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
      emit([dh, code], 1);
      emit(['_admin', code], 1);
    }
  },
  reduce: function(key, counts) {
    return sum(counts);
  }
};

exports.delivery_reports_by_year_month_and_code = {
  map: function(doc) {
    if (doc.type === 'data_record' &&
        doc.form === 'D' &&
        !(doc.errors && doc.errors.length) &&
        doc.fields.delivery_code) {
      var date = new Date(doc.reported_date);
      var code = doc.fields.delivery_code.toUpperCase();
      emit([date.getFullYear(), date.getMonth(), code], 1);
    }
  },
  reduce: function(key, counts) {
    return sum(counts);
  }
};

exports.data_records_by_year_month_form_facility = {
  map: function(doc) {
    if (doc.type === 'data_record' &&
        !(doc.errors && doc.errors.length) &&
        doc.contact &&
        doc.contact.parent) {
      var date = new Date(doc.reported_date);
      emit([date.getFullYear(), date.getMonth(), doc.form, doc.contact.parent._id], 1);
    }
  },
  reduce: function(key, counts) {
    return sum(counts);
  }
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
      emit([dh, doc.fields.patient_id], 1);
      emit(['_admin', doc.fields.patient_id], 1);
    }
  },
  reduce: function(key, counts) {
    return sum(counts);
  }
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
    if (doc.type === 'clinic' ||
        doc.type === 'district_hospital' ||
        doc.type === 'health_center' ||
        doc.type === 'person') {
      var name = doc.name && doc.name.toLowerCase();
      var order = types.indexOf(doc.type) + ' ' + name;
      emit([ order ], name);
    }
  }
};

exports.contacts_by_type = {
  map: function(doc) {
    if (doc.type === 'clinic' ||
        doc.type === 'district_hospital' ||
        doc.type === 'health_center' ||
        doc.type === 'person') {
      emit([ doc.type ], doc.name && doc.name.toLowerCase());
    }
  }
};

exports.contacts_by_place = {
  map: function(doc) {
    if (doc.type === 'clinic' ||
        doc.type === 'district_hospital' ||
        doc.type === 'health_center' ||
        doc.type === 'person') {
      var place = doc.parent;
      while (place) {
        if (place._id) {
          emit([ place._id ], doc.name && doc.name.toLowerCase());
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

exports.contacts_by_type_and_freetext = {
  map: function(doc) {
    var skip = [ '_id', '_rev', 'type', 'refid' ];

    var emitField = function(key, value, type, name) {
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
          emit([ type, word ], name);
        });
      }
      if (typeof value === 'number' || typeof value === 'string') {
        emit([ type, key + ':' + value ], name);
      }
    };

    if (doc.type === 'clinic' ||
        doc.type === 'district_hospital' ||
        doc.type === 'health_center' ||
        doc.type === 'person') {
      var name = doc.name && doc.name.toLowerCase();
      for (var key in doc) {
        emitField(key, doc[key], doc.type, name);
      }
      // var clinic = doc.type === 'person' ? doc.parent : doc;
      // if (clinic && clinic._id) {
      //   emit([ 'clinic:' + clinic._id ], name);
      // }
    }
  }
}

exports.contacts_by_freetext = {
  map: function(doc) {

    var skip = [ '_id', '_rev', 'type', 'refid' ];

    var emitField = function(key, value, name) {
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
          emit([ word ], name);
        });
      }
      if (typeof value === 'number' || typeof value === 'string') {
        emit([ key + ':' + value ], name);
      }
    };

    if (doc.type === 'clinic' ||
        doc.type === 'district_hospital' ||
        doc.type === 'health_center' ||
        doc.type === 'person') {
      var name = doc.name && doc.name.toLowerCase();
      for (var key in doc) {
        emitField(key, doc[key], name);
      }
      var clinic = doc.type === 'person' ? doc.parent : doc;
      if (clinic && clinic._id) {
        emit([ 'clinic:' + clinic._id ], name);
      }
    }
  }
};
