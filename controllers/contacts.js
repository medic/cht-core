var _ = require('underscore'),
    db = require('../db'),
    places = require('./places');

var getContact = function(id, callback) {
  var error = function(msg, code) {
    return callback({
      code: code || 404,
      message: msg || 'Failed to find contact.'
    });
  };
  db.medic.get(id, function(err, doc) {
    if (err) {
      if (err.statusCode === 404) {
        return error();
      }
      return callback(err);
    }
    if (doc.type !== 'person') {
      return error();
    }
    callback(null, doc);
  });
};

var isAContact = function(obj) {
  return obj.type === 'person';
};

var validateContact = function(obj, callback) {
  var err = function(msg, code) {
    return callback({
      code: code || 400,
      message: msg
    });
  };
  if (!_.isObject(obj)) {
    return err('Contact must be an object.');
  }
  if (!isAContact(obj)) {
    return err('Wrong type, this is not a contact.');
  }
  if (_.isUndefined(obj.name)) {
    return err('Contact is missing a "name" property.');
  }
  if (!_.isString(obj.name)) {
    return err('Property "name" must be a string.');
  }
  callback();
};

/*
 * Set contact type, validate and write to database. Optionally create place.
 *
 * Warning: not doing validation of the contact data against a form yet.  The
 * form is user defined in settings so being liberal with what gets saved to
 * the database. Ideally CouchDB would validate a given object against a form
 * in validate_doc_update. https://github.com/medic/medic-webapp/issues/2203
 */
var createContact = function(data, callback) {
  data.type = 'person';
  var self = module.exports;
  self.validateContact(data, function(err) {
    if (err) {
      return callback(err);
    }
    if (data.place) {
      places.getOrCreatePlace(data.place, function(err, place) {
        if (err) {
          return callback(err);
        }
        data.parent = place;
        delete data.place;
        db.medic.insert(data, callback);
      });
    } else {
      db.medic.insert(data, callback);
    }
  });
};

/*
 * Return existing or newly created contact or error. Assumes stored contacts
 * are valid.
 */
var getOrCreateContact = function(data, callback) {
  var self = module.exports;
  if (_.isString(data)) {
    // fetch
    self.getContact(data, function(err, doc) {
      if (err) {
        return callback(err);
      }
      callback(null, doc);
    });
  } else if (_.isObject(data) && _.isUndefined(data._id)) {
    // create and fetch
    self.createContact(data, function(err, resp) {
      if (err) {
        return callback(err);
      }
      self.getContact(resp.id, callback);
    });
  } else {
    callback('Contact must be a new object or string identifier (UUID).');
  }
};

module.exports = {
  createContact: createContact,
  getContact: getContact,
  getOrCreateContact: getOrCreateContact,
  validateContact: validateContact
};
