var db = require('../db'),
    moment = require('moment'),
    config = require('../config'),
    date = require('../date'),
    _ = require('underscore'),
    mustache = require('mustache'),
    i18n = require('../i18n');

var addMessage = function(doc, options) {
    var options = options || {},
        phone = options.phone,
        message = options.message;
    doc.tasks = doc.tasks || [];

    var task = {
        messages: [],
        state: 'pending'
    };
    task.messages.push({to: phone, message: message});
    _.extend(task, _.omit(options, 'phone', 'message'));
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

var getMatchingRecordsByPatientID = function(options, callback) {
    // form code, patient id, clinic id should remain unique for a given
    // time frame

    var options = options || {},
        doc = options.doc;

    if (!doc) return callback('Missing doc option.');
    if (!doc.patient_id) return callback('Missing patient id on doc.');
    if (!doc.form) return callback('Missing form code on doc.');
    if (!options.time_key) return callback('Missing time key value in options.');
    if (!options.time_val) return callback('Missing time value in options.');

    var view = 'patient_ids_by_form_clinic_and_reported_date',
        q = {startkey:[], endkey:[]};

    q.startkey[0] = doc.form;
    q.startkey[1] = doc.patient_id;
    q.startkey[2] = doc.related_entities.clinic._id;
    q.startkey[3] = moment(date.getDate()).subtract(
        options.time_key, options.time_val
    ).valueOf();
    q.endkey[0] = q.startkey[0];
    q.endkey[1] = q.startkey[1];
    q.endkey[2] = q.startkey[2];
    q.endkey[3] = doc.reported_date;

    db.view('kujua-sentinel', view, q, function(err, data) {
        if (err) return callback(err);
        callback(null, data);
    });
};

var getMatchingRecordsBySerialNumber = function(options, callback) {
    // form code, serial number, clinic id should remain unique for a given
    // time frame
    var options = options || {},
        doc = options.doc;

    if (!doc) return callback('Missing doc option.');
    if (!doc.serial_number) return callback('Missing serial number on doc.');
    if (!doc.form) return callback('Missing form code on doc.');
    if (!options.time_key) return callback('Missing time key value in options.');
    if (!options.time_val) return callback('Missing time value in options.');

    var view = 'serial_numbers_by_form_clinic_and_reported_date',
        q = {startkey:[], endkey:[]};

    q.startkey[0] = doc.form;
    q.startkey[1] = doc.serial_number;
    q.startkey[2] = doc.related_entities.clinic._id;
    q.startkey[3] = moment(date.getDate()).subtract(
        options.time_key, options.time_val
    ).valueOf();

    q.endkey[0] = q.startkey[0];
    q.endkey[1] = q.startkey[1];
    q.endkey[2] = q.startkey[2];
    q.endkey[3] = doc.reported_date;

    db.view('kujua-sentinel', view, q, function(err, data) {
        if (err) return callback(err);
        callback(null, data);
    });
};

var handleDuplicates = function(options, callback) {

    // check for duplicate
    var fn = getMatchingRecordsBySerialNumber;
    if (options.patient_id) fn = getMatchingRecordsByPatientID;
    if (!options.time_key) options.time_key = 'months';
    if (!options.time_val) options.time_key = 12;

    var doc = options.doc;
    var id_val = options.serial_number || options.patient_id;

    var msg = "Duplicate record found; '{{id_val}}' already registered"
          + ' within ' + options.time_val + ' ' + options.time_key + '.';
    var resp_msg = "'{{id_val}}' is already registered. Please enter a new"
          + " serial number and submit registration form again.";
    msg = mustache.to_html(msg, { id_val: id_val });
    resp_msg = i18n(resp_msg, { id_val: id_val })

    fn(options, function(err, data) {
        if (data.rows && data.rows.length <= 1) return callback();
        addError(doc, { code: 'duplicate_record', message: msg });
        addMessage(doc, { phone: doc.from, message: resp_msg });
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
          phone = options.phone;
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
  addMessage: addMessage,
  addError: addError,
  getOHWRegistration: getOHWRegistration,
  getMatchingRecordsBySerialNumber: getMatchingRecordsBySerialNumber,
  getMatchingRecordsByPatientID: getMatchingRecordsByPatientID,
  handleDuplicates: handleDuplicates,
}
