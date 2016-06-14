var _ = require('underscore'),
    db = require('../db'),
    utils = require('./utils'),
    places = require('./places');

var getPerson = function(id, callback) {
  var error = function(msg, code) {
    return callback({
      code: code || 404,
      message: msg || 'Failed to find person.'
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

var isAPerson  = function(obj) {
  return obj.type === 'person';
};

var validatePerson  = function(obj, callback) {
  var err = function(msg, code) {
    return callback({
      code: code || 400,
      message: msg
    });
  };
  if (!_.isObject(obj)) {
    return err('Person must be an object.');
  }
  if (!isAPerson(obj)) {
    return err('Wrong type, this is not a person.');
  }
  if (_.isUndefined(obj.name)) {
    return err('Person is missing a "name" property.');
  }
  if (!_.isString(obj.name)) {
    return err('Property "name" must be a string.');
  }
  if (!_.isUndefined(obj.reported_date) && !utils.isDateStrValid(obj.reported_date)) {
    return err('Reported date is invalid: ' + obj.reported_date);
  }
  callback();
};

/*
 * Set type, validate and write to database. Optionally create place.
 *
 * Warning: not doing validation of the data against a form yet.  The form is
 * user defined in settings so being liberal with what gets saved to the
 * database. Ideally CouchDB would validate a given object against a form in
 * validate_doc_update. https://github.com/medic/medic-webapp/issues/2203
 */
var createPerson = function(data, callback) {
  data.type = 'person';
  var self = module.exports;
  self.validatePerson(data, function(err) {
    if (err) {
      return callback(err);
    }
    if (!data.reported_date) {
      data.reported_date = new Date().valueOf();
    } else {
      data.reported_date = utils.parseDate(data.reported_date).valueOf();
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
 * Return existing or newly created contact or error. Assumes stored records
 * are valid.
 */
var getOrCreatePerson = function(data, callback) {
  var self = module.exports;
  if (_.isString(data)) {
    // fetch
    self.getPerson(data, function(err, doc) {
      if (err) {
        return callback(err);
      }
      callback(null, doc);
    });
  } else if (_.isObject(data) && _.isUndefined(data._rev)) {
    // create and fetch
    self.createPerson(data, function(err, resp) {
      if (err) {
        return callback(err);
      }
      self.getPerson(resp.id, callback);
    });
  } else {
    callback('Person must be a new object or string identifier (UUID).');
  }
};

/*
 * Setting properties of module.exports rather than setting the entire object
 * at once avoids circular dependency loading issues.
 */
module.exports.createPerson = createPerson;
module.exports.getPerson = getPerson;
module.exports.getOrCreatePerson = getOrCreatePerson;
module.exports.validatePerson = validatePerson;
