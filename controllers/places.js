var _ = require('underscore'),
    db = require('../db');

var getPlace = function(id, callback) {
  db.medic.get(id, function(err, doc) {
    if (err) {
      if (err.statusCode === 404) {
        err.message  = 'Failed to find place.';
      }
      return callback(err);
    }
    callback(null, doc);
  });
};

var isAPlace = function(place) {
  return [
    'national_office',
    'district_hospital',
    'health_center',
    'clinic'
  ].indexOf(place.type) !== -1;
};

/*
 * Validate the basic data structure for a place.  Not checking against the
 * database if parent exists because the entire child-parent structure might be
 * created in one request. Just checking `type` field values and some required
 * fields.
 */
var validatePlace = function(place, callback) {
  if (!_.isObject(place)) {
    return callback('Place must be an object.');
  }
  if (!isAPlace(place)) {
    return callback('Wrong type, this is not a place.');
  }
  if (_.isUndefined(place.name)) {
    return callback('Place is missing a "name" property.');
  }
  if (!_.isString(place.name)) {
    return callback('Property "name" must be a string.');
  }
  if (['clinic', 'health_center'].indexOf(place.type) !== -1) {
    if (_.isUndefined(place.parent)) {
      return callback('Place is missing a "parent" property.');
    }
  }
  if (place.parent) {
    // validate parents also
    return validatePlace(place.parent, callback);
  }
  return callback();
};

var createPlace = function(place, callback) {
  validatePlace(place, function(err) {
    if (err) {
      return callback(err);
    }
    db.medic.insert(place, callback);
  });
};

/*
 * Create a place and related/parent places.  Only creates the place once all
 * parents have been created and embedded.  Replaces references to places
 * (UUIDs) with objects by fetching from the database.  Replace objects with
 * real places after validating and creating them.
 *
 * Return the id and rev of newly created place.
 *
 * Examples:
 *
 * {
 *   "name": "CHP Area One",
 *   "type": "health_center",
 *   "parent": "1d83f2b4a27eceb40df9e9f9ad06d137"
 * }
 *
 * {
 *   "name": "CHP Area One",
 *   "type": "health_center",
 *   "parent": {
 *     "name": "CHP Branch One",
 *     "type": "district_hospital"
 *   }
 * }
 */
var createPlaces = function(place, callback) {
  var self = module.exports;
  if (_.isString(place.parent)) {
    self._getPlace(place.parent, function(err, doc) {
      if (err) {
        return callback(err);
      }
      place.parent = doc;
      self._createPlace(place, callback);
    });
  } else if (_.isObject(place.parent) && !place.parent._id) {
    self._createPlaces(place.parent, function(err, body) {
      if (err) {
        return callback(err);
      }
      place.parent = body.id;
      self._createPlaces(place, callback);
    });
  } else {
    // create place when all parents are resolved
    self._createPlace(place, callback);
  }
};

module.exports = {
  _getPlace: getPlace,
  _createPlace: createPlace,
  _createPlaces: createPlaces,
  _validatePlace: validatePlace,
  /*
   * Return existing or newly created place or error. Assumes stored places
   * are valid.
   */
  getOrCreatePlace: function(place, callback) {
    var self = module.exports;
    if (_.isString(place)) {
      // fetch place
      self._getPlace(place, function(err, doc) {
        if (err) {
          return callback(err);
        }
        callback(null, doc);
      });
    } else if (_.isObject(place) && _.isUndefined(place._id)) {
      // create and return place
      self._createPlaces(place, function(err, resp) {
        if (err) {
          return callback(err);
        }
        self._getPlace(resp.id, callback);
      });
    } else {
      callback('Place must be a new object or string identifier (UUID).');
    }
  }
};
