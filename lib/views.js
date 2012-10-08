exports.facilities = {
    map: function (doc) {
        if (doc.type === 'clinic' ||
            doc.type === 'health_center' ||
            doc.type === 'district_hospital' ||
            doc.type === 'national_office') {

            emit(
                [doc.type, doc.name],
                {type: doc.type, name: doc.name, _rev: doc._rev});
        }
    }
};

exports.facilities_by_district = {
    map: function (doc) {
        if (doc.type === 'clinic' && doc.parent && doc.parent.parent) {
            emit(
                [doc.parent.parent._id, doc.type, doc.name],
                {type: doc.type, name: doc.name, _rev: doc._rev}
            );
        }
        else if (doc.type === 'health_center' && doc.parent) {
            emit(
                [doc.parent._id, doc.type, doc.name],
                {type: doc.type, name: doc.name, _rev: doc._rev}
            );
        } else if (doc.type === 'district_hospital') {
            emit(
                [doc._id, doc.type, doc.name],
                {type: doc.type, name: doc.name, _rev: doc._rev}
            );
        }
    }
};

exports.reminders = {
  map: function(doc) {
    var phone,
        refid,
        tasks,
        dh_id = doc.related_entities && doc.related_entities.clinic && doc.related_entities.clinic.parent &&
          doc.related_entities.clinic.parent.parent && doc.related_entities.clinic.parent.parent._id;

    if (doc.type === 'data_record' && doc.form && doc.week_number && doc.year) {
        phone = doc.related_entities && doc.related_entities.clinic && doc.related_entities.clinic.contact &&
          doc.related_entities.clinic.contact.phone;
        refid = doc.related_entities && doc.related_entities.clinic && doc.related_entities.clinic.contact &&
          doc.related_entities.clinic.contact.rc_code;
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
