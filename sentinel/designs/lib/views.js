exports.due_tasks = {
    map: function(doc) {
        var tasks = doc.scheduled_tasks || [];

        tasks.forEach(function(task, index) {
            if (task.due) {
                emit(task.due, index);
            }
        });
    }
};

/*
 * Get clinic based on phone number
 */
exports.clinic_by_phone = {
    map: function(doc) {
        if (doc.type === 'clinic' && doc.contact && doc.contact.phone) {
            emit([doc.contact.phone], null);
        }
    }
};

/*
 * Get clinic based on reference id
 */
exports.clinic_by_refid = {
    map: function (doc) {
        if (doc.type === 'clinic' && doc.contact && doc.contact.rc_code) {
            // need String because rewriter wraps everything in quotes
            emit([String(doc.contact.rc_code)], null);
        }
    }
};

exports.weekly_reminders = {
  map: function(doc) {
    var phone,
        refid;

    if (doc.form && doc.week_number && doc.year) {
      phone = doc.related_entities && doc.related_entities.clinic && doc.related_entities.clinic.contact &&
        doc.related_entities.clinic.contact.phone;
      if (phone) {
        emit([doc.form, doc.year, doc.week_number, phone], {
          received: true
        });
      }
    } else if (doc.type === 'weekly_reminder' && doc.related_form && doc.week && doc.year) {
      emit([doc.related_form, doc.year, doc.week, doc.phone], {
        sent: doc.day
      });
    }
  },
  reduce: function(keys, values) {
    var result = {
      received: false,
      sent: []
    };

    values.forEach(function(value) {
      if (value.sent) {
        result.sent.push(value.sent);
      }
      result.received = result.received || !!value.received;
    });
    return result;
  }
}

exports.ohw_registered_patients = {
    map: function(doc) {
        var ids = doc.patient_identifiers || [];

        if (doc.form === 'ORPT') {
            ids.forEach(function(id) {
                emit(id, null);
            });
        }
    }
};
