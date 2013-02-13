var db = require('../db'),
    moment = require('moment'),
    config = require('../config'),
    _ = require('underscore');

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

  getOHWRegistration: function(patient_id, callback) {
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
  addMessage: function(doc, options) {
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
  },
  addError: function(doc, options) {
      if (!doc || !options || !options.message) return;
      // set default code
      if (!options.code) options.code = 'not_found';

      var error = {code: options.code, message: options.message};

      for (var i in doc.errors) {
          var e = doc.errors[i];
          // already exists on the record
          if (error.code === e.code) return;
      }

      doc.errors ? doc.errors.push(error) : doc.errors = [error];
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
  }
}
