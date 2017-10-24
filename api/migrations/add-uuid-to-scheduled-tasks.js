var db = require('../db'),
    async = require('async'),
    moment = require('moment'),
    uuidV4 = require('uuid/v4'),
    BATCH_SIZE = 100;

var updateMessage = function(message) {
  if (message.uuid) {
    // already has the required uuid
    return false;
  }
  message.uuid = uuidV4();
  return true;
};

var updateTask = function(task) {
  var updated = false;
  if (moment().isBefore(moment(task.due))) {
    task.messages.forEach(function(task) {
      if (updateMessage(task)) {
        updated = true;
      }
    });
  }
  return updated;
};

var update = function(row) {
  var updated = false;
  if (row.doc &&
      row.doc.type === 'data_record' &&
      row.doc.form &&
      row.doc.scheduled_tasks) {
    row.doc.scheduled_tasks.forEach(function(task) {
      if (updateTask(task)) {
        updated = true;
      }
    });
  }
  return updated;
};

var save = function(docs, callback) {
  if (!docs.length) {
    return callback();
  }
  db.medic.bulk({ docs: docs }, callback);
};

var runBatch = function(skip, callback) {
  var options = {
    include_docs: true,
    limit: BATCH_SIZE,
    skip: skip
  };
  db.medic.list(options, function(err, result) {
    if (err) {
      return callback(err);
    }
    console.log('        Processing ' + skip + ' to ' + (skip + BATCH_SIZE) + ' docs of ' + result.total_rows + ' total');
    var toSave = result.rows.filter(update).map(function(row) {
      return row.doc;
    });
    save(toSave, function(err) {
      var keepGoing = result.total_rows > (skip + BATCH_SIZE);
      callback(err, keepGoing);
    });
  });
};

module.exports = {
  name: 'add-uuid-to-scheduled-tasks',
  created: new Date(2017, 1, 5),
  run: function(callback) {
    db.getSettings(function(err, data) {
      if (err) {
        return callback(err);
      }
      var schedules = data.settings.schedules;
      if (!schedules ||
          !schedules.length ||
          (schedules.length === 1 && !schedules[0].name)) {
        return callback();
      }
      var currentSkip = 0;
      async.doWhilst(
        function(callback) {
          runBatch(currentSkip, callback);
        },
        function(more) {
          currentSkip += BATCH_SIZE;
          return more;
        },
        callback
      );
    });
  }
};
