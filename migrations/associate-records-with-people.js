var async = require('async'),
    _ = require('underscore'),
    db = require('../db');

var getClinic = function(id, callback) {
  db.medic.get(id, function(err, clinic) {
    if (err) {
      if (err.statusCode === 404) {
        return callback();
      }
      return callback(err);
    }
    var contact = clinic.contact;
    if (!contact) {
      return callback();
    }
    if (!contact.parent) {
      clinic.contact = _.clone(clinic.contact);
      contact.parent = clinic;
    }
    callback(null, contact);
  });
};

var getContact = function(contactId, clinicId, callback) {
  if (!contactId) {
    return getClinic(clinicId, callback);
  }
  db.medic.get(contactId, function(err, contact) {
    if (err) {
      if (err.statusCode === 404) {
        return getClinic(clinicId, callback);
      }
      return callback(err);
    }
    callback(null, contact);
  });
};

var getContactForOutgoingMessages = function(message, callback) {
  var facility = message.facility;
  if (facility.type === 'person') {
    return callback(null, facility);
  }
  getContact(facility.contact._id, facility._id, callback);
};

var migrateOutgoingMessages = function(message, callback) {
  getContactForOutgoingMessages(message, function(err, contact) {
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
  var clinic = doc.related_entities && doc.related_entities.clinic;
  if (!clinic) {
    return callback();
  }
  var contactId = clinic.contact && clinic.contact._id;
  getContact(contactId, clinic._id, function(err, contact) {
    if (err) {
      return callback(err);
    }
    doc.contact = contact;
    delete doc.related_entities;
    callback(null, doc);
  });
};

var associate = function(id, callback) {
  db.medic.get(id, function(err, doc) {
    if (err) {
      if (err.statusCode === 404) {
        return callback();
      }
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
      var ids = _.uniq(_.pluck(result.rows, 'id'));
      async.eachSeries(ids, associate, callback);
    });
  }
};