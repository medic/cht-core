/**
 * This file contains all the views to be bundled up in the "medic" ddoc.
 * If you want a view to be bundled into the "medic-client" ddoc and therefore
 * be available on the client via pouch add it to: /ddocs/medic-client/views
 */

/*
 * Get contact based on referral id (refid) in a tasks_referral doc.
 */
exports.contacts_by_refid = {
  map: function (doc) {
    if (doc.type === 'clinic' ||
        doc.type === 'health_center' ||
        doc.type === 'district_hospital' ||
        doc.type === 'national_office') {
      var placeId = doc.place_id || doc.rc_code;
      if (placeId) {
        // need String because rewriter wraps everything in quotes
        // keep refid case-insenstive since data is usually coming from SMS
        emit(String(placeId).toUpperCase());
      }
    }
  }
};

// Mostly used for exporting records
exports.data_records = {
  map: function(doc) {
    if (doc.type === 'data_record') {
      var valid = !doc.errors || doc.errors.length === 0;
      var form = doc.form;

      emit([doc.reported_date]);

      if (form) {
        emit([valid, form, doc.reported_date]);
        emit([valid, '*', doc.reported_date]);
      }

      var parent = doc.contact;
      while(parent) {
        if (parent._id) {
          emit([parent._id, doc.reported_date]);
          if (form) {
            emit([valid, parent._id, form, doc.reported_date]);
            emit([valid, parent._id, '*', doc.reported_date]);
          }
        }
        parent = parent.parent;
      }
    }
  }
};

// Only used in ./scripts/delete_training_data_utils.js
exports.data_records_by_ancestor = {
  map: function(doc) {
    if (doc.type === 'data_record') {
      var contact = doc.contact;
      while (contact) {
        if (contact._id) {
          emit(contact._id);
        }
        contact = contact.parent;
      }
    }
  }
};

exports.data_records_by_year_month_form_place = {
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

exports.delivery_reports_by_district_and_code = {
  map: function(doc) {
    if (doc.type === 'data_record' &&
        doc.form === 'D' &&
        !(doc.errors && doc.errors.length) &&
        doc.fields &&
        doc.fields.delivery_code) {
      var place = doc.contact;
      var placeId;
      while (place) {
        placeId = place._id;
        place = place.parent;
      }
      var code = doc.fields.delivery_code.toUpperCase();
      if (placeId) {
        emit([placeId, code]);
      }
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
        doc.fields &&
        doc.fields.delivery_code) {
      var date = new Date(doc.reported_date);
      var code = doc.fields.delivery_code.toUpperCase();
      emit([date.getFullYear(), date.getMonth(), code]);
    }
  },
  reduce: '_count'
};

exports.due_tasks = {
  map: function(doc) {
    if (Array.isArray(doc.scheduled_tasks)) {
      doc.scheduled_tasks.forEach(function(task) {
        if (task.due && task.state === 'scheduled') {
          emit(task.due, task);
        }
      });
    }
  }
};

exports.duplicate_form_submissions = {
  map: function(doc) {
    if (doc.type === 'data_record' &&
        doc.sms_message &&
        doc.sms_message.form) {
      emit([doc.sms_message.form,
          doc.sms_message.from,
          doc.sms_message.message], doc._rev);
    }
  },
  reduce: '_count'
};

// Only used by /scripts/delete_clinics_for_place.js
exports.places_by_type_parent_id_name = {
  map: function (doc) {
    if (doc.type === 'clinic' ||
        doc.type === 'health_center' ||
        doc.type === 'district_hospital' ||
        doc.type === 'national_office') {
      var pid = doc.parent ? doc.parent._id : null;
      emit([doc.type, pid, doc.name], {name: doc.name});
    }
  }
};

exports.contacts_by_depth = {
  map: function(doc) {
    if (['person', 'clinic', 'health_center', 'district_hospital'].indexOf(doc.type) !== -1) {
      var value = doc.patient_id || doc.place_id;
      var parent = doc;
      var depth = 0;
      while (parent) {
        if (parent._id) {
          emit([parent._id], value);
          emit([parent._id, depth], value);
        }
        depth++;
        parent = parent.parent;
      }
    }
  }
};

// WARNING: If updating this function also update the getReplicationKey function in api/handlers/changes.js
exports.docs_by_replication_key = {
  map: function(doc) {
    if (doc._id === 'resources' ||
        doc._id === 'appcache' ||
        doc._id === 'zscore-charts' ||
        doc.type === 'form' ||
        doc.type === 'translations') {
      return emit('_all', {});
    }
    switch (doc.type) {
      case 'data_record':
        var subject;
        var submitter;
        if (doc.form) {
          // report
          subject = (doc.patient_id || (doc.fields && doc.fields.patient_id)) ||
                    (doc.place_id || (doc.fields && doc.fields.place_id)) ||
                    (doc.contact && doc.contact._id);
          submitter = doc.contact && doc.contact._id;
        } else if (doc.sms_message) {
          // incoming message
          subject = doc.contact && doc.contact._id;
        } else if (doc.kujua_message) {
          // outgoing message
          subject = doc.tasks &&
                    doc.tasks[0] &&
                    doc.tasks[0].messages &&
                    doc.tasks[0].messages[0] &&
                    doc.tasks[0].messages[0].contact &&
                    doc.tasks[0].messages[0].contact._id;
        }
        if (subject) {
          return emit(subject, { submitter: submitter });
        }
        return emit('_unassigned', {});
      case 'clinic':
      case 'district_hospital':
      case 'health_center':
      case 'person':
        return emit(doc._id, {});
    }
  }
};

// NB: This returns *registrations* for patients. If patients are created by
//     means other then sending in a registration report (eg created in the UI)
//     they will not show up in this view.
//
//     For a view with all patients by their shortcode, use:
//        medic/patient_by_patient_shortcode_id
//
exports.registered_patients = {
  map: function(doc) {
    var patientId = doc.patient_id || (doc.fields && doc.fields.patient_id);
    if (doc.form &&
        (!doc.errors || doc.errors.length === 0) &&
        patientId &&
        doc.transitions &&
        doc.transitions.registration &&
        doc.transitions.registration.ok) {
      emit(String(patientId));
    }
  }
};

exports.reports_by_form_and_clinic = {
  map: function(doc) {
    if (doc.type === 'data_record' &&
        doc.form &&
        doc.contact &&
        doc.contact.parent) {
      emit([doc.form, doc.contact.parent._id]);
    }
  }
};

exports.reports_by_form_year_month_clinic_id_reported_date = {
  map: function (doc) {
    if (doc.type === 'data_record' &&
        doc.contact &&
        doc.contact.parent &&
        doc.year &&
        doc.fields &&
        doc.fields.year &&
        (doc.fields.month || doc.fields.month_num) &&
        doc.form &&
        doc.reported_date) {
      emit([
        doc.form,
        doc.fields.year,
        doc.fields.month || doc.fields.month_num,
        doc.contact.parent._id,
        doc.reported_date
      ]);
    }
  }
};

exports.reports_by_form_year_week_clinic_id_reported_date = {
  map: function (doc) {
    if (doc.type === 'data_record' &&
        doc.contact &&
        doc.contact.parent &&
        doc.fields &&
        doc.fields.year &&
        (doc.fields.week || doc.fields.week_number) &&
        doc.form &&
        doc.reported_date) {
      emit([
        doc.form,
        doc.fields.year,
        doc.fields.week || doc.fields.week_number,
        doc.contact.parent._id,
        doc.reported_date
      ]);
    }
  }
};

exports.sent_reminders = {
  map: function(doc) {
    if (Array.isArray(doc.tasks)) {
      doc.tasks.forEach(function(task) {
        if (task.code && task.ts) {
          emit([task.code, task.ts]);
        }
      });
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
          if (msg.uuid && msg.to && msg.message) {
            var sendingDueDate = task.due || task.timestamp || // for scheduled_message
                doc.reported_date; // for immediate reply to form submission
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
              _record_reported_date: doc.reported_date,
              sending_due_date: sendingDueDate
            };
            // used for fetching a specific message based on uuid
            emit(msg.uuid, val);
            // used for querying latest tasks in a specific state
            emit(task.state, val);
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
    /*
     * Required fields for message to be processed:
     *  task `state` value must be 'pending'
     *  message needs the `to` and `message` properties
     */
    function hasPending(tasks) {
      return tasks && tasks.some(function(task) {
        if (task && task.state === 'pending') {
          return task.messages && task.messages.some(function(msg) {
            if (msg && msg.to && msg.message) {
              return true;
            }
          });
        }
      });
    }

    // check tasks
    var pending = hasPending(doc.tasks);

    // if still not pending check scheduled_tasks too.  also, only process
    // scheduled tasks if doc has no errors.
    if (!pending && (!doc.errors || doc.errors.length === 0)) {
      pending = hasPending(doc.scheduled_tasks);
    }

    if (pending) {
      emit([doc.reported_date, doc.refid]);
    }
  }
};

exports.usage_stats_by_year_month = {
  map: function(doc) {
    if (doc.type === 'usage_stats') {
      emit([doc.year, doc.month], 1);
    }
  }
};

exports.visits_by_district_and_patient = {
  map: function(doc) {
    if (doc.type === 'data_record' &&
        doc.form === 'V' &&
        !(doc.errors && doc.errors.length) &&
        doc.fields) {

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

exports.patient_by_patient_shortcode_id = {
  map: function(doc) {
    if (doc.type === 'person' &&
        doc.patient_id) {
      emit(doc.patient_id);
    }
  }
};

exports.places_by_contact = {
  map: function(doc) {
    if ((doc.type === 'clinic' || doc.type === 'health_center' || doc.type === 'district_hospital') &&
        doc.contact &&
        doc.contact._id) {
      emit(doc.contact._id);
    }
  }
};
