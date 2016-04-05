var async = require('async'),
    _ = require('underscore'),
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
    return callback('Name property missing on place.');
  }
  if (!_.isString(place.name)) {
    return callback('Property "name" must be a string.');
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
var oldCreatePlaces = function(place, callback) {
  var series = [];
  if (_.isString(place.parent)) {
    series.push(function(cb) {
      getPlace(place.parent, function(err, doc) {
        if (err) {
          return cb(err);
        }
        console.log('getPlace doc', doc);
        place.parent = doc;
        cb();
      });
    });
  } else if (_.isObject(place.parent) && !place.parent._id) {
    // create parents
    series.push(function(cb) {
      createPlaces(place.parent, function(err, body) {
        if (err) {
          return cb(err);
        }
        console.log('createPlaces body', body);
        place.parent = body.id;
        cb();
      });
    });
  } else {
    series.push(function(cb) {
      createPlace(place, cb);
    });
  }
  async.series(series, function(err) {
    if (err) {
      return callback(err);
    }
    console.log('async.series place', place);
    callback(null, place);
  });
};
*/

var validateOrCreatePlace = function(place, response, callback) {
  if (_.isString(place)) {
    db.medic.get(place, function(err, doc) {
      if (err) {
        if (err.statusCode === 404) {
          err.message = 'Failed to find place.';
        }
        return callback(err);
      }
      if (!isAPlace(doc)) {
        return error400('Wrong type, this is not a place.', callback);
      }
      callback(null, doc);
    });
    return valdiatePlace(place, callback);
  } else if (!_.isObject(place)) {
    return error400('Place must be object or string.', callback);
  }
  if (!isAPlace(place)) {
    return error400('Wrong type, this is not a place.', callback);
  }
  response = response || {};
  db.medic.insert(place, function(err, body) {
    if (err) {
      return callback(err);
    }
    data.place = body.id;
    response.place = {
      id: body.id,
      rev: body.rev
    };
    callback(null, data, response);
  });
};

module.exports = {
  _getPlace: getPlace,
  _createPlace: createPlace,
  _validatePlace: validatePlace,
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
  createPlaces: function(place, callback) {
    var self = this;
    if (_.isString(place.parent)) {
      self._getPlace(place.parent, function(err, doc) {
        if (err) {
          return callback(err);
        }
        place.parent = doc;
        self.createPlaces(place, callback);
      });
    } else if (_.isObject(place.parent) && !place.parent._id) {
      self.createPlaces(place.parent, function(err, body) {
        if (err) {
          return callback(err);
        }
        place.parent = body.id;
        self.createPlaces(place, callback);
      });
    } else {
      // create place when all parents are resolved
      self._createPlace(place, callback);
    }
  }
};
