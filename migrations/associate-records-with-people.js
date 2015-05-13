var async = require('async'),
    _ = require('underscore'),
    db = require('../db');

var migrateOutgoingMessages = function(message, callback) {
  var contactId = message.facility.contact._id;
  db.medic.get(contactId, function(err, contact) {
    if (err) {
      return callback(err);
    }
    message.contact = contact;
    delete message.facility;
    callback();
  });
};

var migrateOutgoingTasks = function(task, callback) {
  async.each(task.messages, migrateOutgoingMessages, callback);
};

var migrateOutgoing = function(doc, callback) {
  var ignore = _.every(doc.tasks, function(task) {
    return _.every(task.messages, function(message) {
      return (message.contact && message.contact._id) || !message.facility;
    });
  });
  if (ignore) {
    return callback();
  }
  async.each(doc.tasks, migrateOutgoingTasks, function(err) {
    callback(err, doc);
  });
};

var migrateIncoming = function(doc, callback) {
  if (doc.contact) {
    // already migrated
    return callback();
  }
  var contactId = doc.related_entities &&
      doc.related_entities.clinic &&
      doc.related_entities.clinic.contact &&
      doc.related_entities.clinic.contact._id;
  if (!contactId) {
    // no resolved entity
    return callback();
  }
  db.medic.get(contactId, function(err, contact) {
    if (err) {
      return callback(err);
    }
    doc.contact = contact;
    delete doc.related_entities;
    callback(null, doc);
  });
};

var associate = function(row, callback) {
  db.medic.get(row.id, function(err, doc) {
    if (err) {
      return callback(err);
    }
    var migrationFn;
    if (doc.sms_message) {
      migrationFn = migrateIncoming;
    } else {
      migrationFn = migrateOutgoing;
    }
    migrationFn(doc, function(err, updated) {
      if (err) {
        return callback(err);
      }
      if (!updated) {
        return callback();
      }
      db.medic.insert(updated, callback);
    });
  });
};

module.exports = {
  name: 'associate-records-with-people',
  created: new Date(2015, 5, 13, 11, 41, 0, 0),
  run: function(callback) {
    db.medic.view('medic', 'data_records', { }, function(err, result) {
      if (err) {
        return callback(err);
      }
      async.each(result.rows, associate, callback);
    });
  }
};