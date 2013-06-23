var _ = require('underscore'),
    uuid = require('uuid'),
    moment = require('moment'),
    mustache = require('mustache'),
    config = require('../config'),
    i18n = require('../i18n'),
    date = require('../date'),
    db = require('../db');

var getClinicID = function(doc) {
  return doc &&
    doc.related_entities &&
    doc.related_entities.clinic &&
    doc.related_entities.clinic._id;
};

/*
 *
 * Apply phone number filters defined in configuration file.
 *
 * Example:
 *
 * "outgoing_phone_filters": [
 *      {
 *          "match": "\\+997",
 *          "replace": ""
 *      }
 * ]
 */
var applyPhoneFilters = function(phone)  {
    if (!phone) return phone;
    var filters = config.get('outgoing_phone_filters') || [];
    _.each(filters, function(filter) {
        // only supporting match and replace options for now
        if (!filter || typeof filter.match === undefined) return;
        if (typeof filter.replace === undefined) return;
        var regex = RegExp(filter.match),
            replace = filter.replace;
        if (phone.match(regex))
            phone = phone.replace(regex, replace);
    });
    return phone;
}

var addMessage = function(doc, options) {
    var options = options || {},
        phone = applyPhoneFilters(options.phone),
        message = options.message;

    doc.tasks = doc.tasks || [];

    var task = {
        messages: [],
        state: 'pending'
    };

    message.uuid = uuid();
    task.messages.push({to: phone, message: message});

    _.extend(task, _.omit(options, 'phone', 'message', 'uuid'));
    doc.tasks.push(task);
};

var addError = function(doc, options) {
    if (!doc || !options || !options.message) return;
    // set default code
    if (!options.code) options.code = 'invalid_report';

    var error = {code: options.code, message: options.message};

    for (var i in doc.errors) {
        var e = doc.errors[i];
        // already exists on the record
        if (error.code === e.code) return;
    }

    doc.errors ? doc.errors.push(error) : doc.errors = [error];
};

var getOHWRegistration = function(patient_id, callback) {
    var q = {
        key: patient_id,
        include_docs: true,
        limit: 1
    };
    db.view('kujua-sentinel', 'ohw_registered_patients', q, function(err, data) {
        if (err)
            return callback(err);
        var row = _.first(data.rows),
            registration = row && row.doc;
        callback(null, registration);
    });
};

var getOHWMatchingRecords = function(options, callback) {

    var options = options || {},
        doc = options.doc,
        patient_id = options.patient_id,
        serial_number = options.serial_number,
        time_val = options.time_val,
        time_key = options.time_key,
        clinic_id = getClinicID(doc);

    if (!doc
        || (!patient_id && !serial_number)
        || !doc.form)
        return callback('Missing required argument for match query.');

    var view = 'patient_ids_by_form_clinic_and_reported_date',
        q = {startkey:[], endkey:[], include_docs:true};

    if (serial_number)
        view = 'serial_numbers_by_form_clinic_and_reported_date';

    q.startkey[0] = doc.form;
    q.startkey[1] = patient_id || serial_number;
    q.startkey[2] = clinic_id;

    q.endkey[0] = q.startkey[0];
    q.endkey[1] = q.startkey[1];
    q.endkey[2] = q.startkey[2];

    // filtering view by time is optional
    if (time_key && time_val) {
        q.startkey[3] = moment(date.getDate()).subtract(
                time_key, time_val
        ).valueOf();
        q.endkey[3] = doc.reported_date;
    } else {
        q.endkey[3] = {};
    }

    db.view('kujua-sentinel', view, q, function(err, data) {
        if (err) return callback(err);
        if (options.filter)
            return callback(null, _.filter(data.rows, options.filter));
        callback(null, data.rows);
    });
};

var checkOHWDuplicates = function(options, callback) {

    //if (!options.time_key) options.time_key = 'months';
    //if (!options.time_val) options.time_key = 12;

    var doc = options.doc,
        id_val = options.serial_number || options.patient_id;

    var msg = "Duplicate record found; '{{id_val}}' was already reported";

    if (options.time_val && options.time_key)
          msg += ' within ' + options.time_val + ' ' + options.time_key;

    msg = mustache.to_html(msg, { id_val: id_val });

    getOHWMatchingRecords(options, function(err, data) {
        if (data && data.length <= 1) return callback();
        addError(doc, { code: 'duplicate_record', message: msg });
        callback(msg);
    });
};

module.exports = {
  getClinicPhone: function(doc) {
      return doc &&
        doc.related_entities &&
        doc.related_entities.clinic &&
        doc.related_entities.clinic.contact &&
        doc.related_entities.clinic.contact.phone;
  },
  getClinicName: function(doc) {
      return doc &&
        doc.related_entities &&
        doc.related_entities.clinic &&
        doc.related_entities.clinic.name || 'health volunteer';
  },
  getClinicContactName: function(doc) {
      return doc &&
        doc.related_entities &&
        doc.related_entities.clinic &&
        doc.related_entities.clinic.contact &&
        doc.related_entities.clinic.contact.name || 'health volunteer';
  },
  getParentPhone: function(doc) {
      return doc.related_entities &&
        doc.related_entities.clinic &&
        doc.related_entities.clinic.parent &&
        doc.related_entities.clinic.parent.contact &&
        doc.related_entities.clinic.parent.contact.phone;
  },
  getGrandparentPhone: function(doc) {
      return doc.related_entities &&
        doc.related_entities.clinic &&
        doc.related_entities.clinic.parent &&
        doc.related_entities.clinic.parent.parent &&
        doc.related_entities.clinic.parent.parent.contact &&
        doc.related_entities.clinic.parent.parent.contact.phone;
  },
  filterScheduledMessages: function(doc, type) {
      var scheduled_tasks = doc && doc.scheduled_tasks;
      return _.filter(scheduled_tasks, function(task) {
          return task.type === type;
      });
  },
  findScheduledMessage: function(doc, type) {
      var scheduled_tasks = doc && doc.scheduled_tasks;
      return _.find(scheduled_tasks, function(task) {
          return task.type === type;
      });
  },
  updateScheduledMessage: function(doc, options) {
      if (!options || !options.message || !options.type)
          return;
      var msg = _.find(doc.scheduled_tasks, function(task) {
          return task.type === options.type;
      });
      if (msg && msg.messages)
          _.first(msg.messages).message = options.message;
  },
  addScheduledMessage: function(doc, options) {
      var options = options || {},
          due = options.due,
          message = options.message,
          phone = applyPhoneFilters(options.phone);
      doc.scheduled_tasks = doc.scheduled_tasks || [];
      if (due instanceof Date)
          due = due.getTime();
      delete options.message;
      delete options.due;
      delete options.phone;

      var task = {
          due: due,
          messages: [{
              to: phone,
              message: message
          }],
          state: doc.muted ? 'muted' : 'scheduled'
      };
      _.extend(task, options);
      doc.scheduled_tasks.push(task);
  },
  obsoleteScheduledMessages: function(doc, type, reported_date, before) {
      var changed = false,
          group;

      if (!doc || !doc.scheduled_tasks || !reported_date || !type)
          return changed;

      // setup window to look for tasks based on before value
      if (!before) {
           before = moment(reported_date).add(
               'days', config.get('ohw_obsolete_reminders_days') || 21
           ).valueOf();
      }

      // find group
      // scheduled_tasks should be sorted by due date
      for (var i in doc.scheduled_tasks) {
          var task = doc.scheduled_tasks[i];
          if (!task) continue; // in case of null task
          if (type === task.type
                  && task.state === 'scheduled'
                  && task.due >= reported_date
                  && task.due <= before) {
              group = task.group;
              break;
          }
      };

      // clear tasks types that were due before reported date, also clear if
      // the same type and group.
      for (var i in doc.scheduled_tasks) {
          var task = doc.scheduled_tasks[i];
          if (!task) continue; // in case of null task
          if (type === task.type && task.due <= reported_date) {
              task.state = 'cleared';
              changed = true;
          }
          if (type === task.type && task.group === group) {
              task.state = 'cleared';
              changed = true;
          }
      };

      return changed;

  },
  clearScheduledMessages: function(doc, types) {
      types = _.isArray(types) ? types : [types];
      return _.filter(doc.scheduled_tasks || [], function(task) {
          if (_.contains(types, task.type))
              task.state = 'cleared'
          return task;
      });
  },
  unmuteScheduledMessages: function(doc) {
      doc.scheduled_tasks = doc.scheduled_tasks || [];
      doc.scheduled_tasks = _.filter(doc.scheduled_tasks, function(task) {
          if (task.state === 'muted')
              task.state = 'scheduled'
          return new Date(task.due) > Date.now();
      });
  },
  muteScheduledMessages: function(doc) {
      doc.scheduled_tasks = doc.scheduled_tasks || [];
      doc.scheduled_tasks = _.filter(doc.scheduled_tasks, function(task) {
          task.state = 'muted';
          return task;
      });
  },
  getClinicID: getClinicID,
  addMessage: addMessage,
  addError: addError,
  getOHWRegistration: getOHWRegistration,
  getOHWMatchingRecords: getOHWMatchingRecords,
  checkOHWDuplicates: checkOHWDuplicates
}
