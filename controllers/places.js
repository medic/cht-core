var _ = require('underscore'),
    async = require('async');

var people = require('./people'),
    utils = require('./utils'),
    db = require('../db');

var PLACE_EDITABLE_FIELDS = ['name', 'parent', 'contact'];

var getPlace = function(id, callback) {
  db.medic.get(id, function(err, doc) {
    if (err) {
      if (err.statusCode === 404) {
        err.message  = 'Failed to find place.';
      }
      return callback(err);
    }
    if (!isAPlace(doc)) {
      return callback({
        code: 404,
        message: 'Failed to find place.'
      });
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
 * database if parent exists because the entire child-parent structure create
 * might be requested in one API call. Just checking `type` field values and
 * some required fields.
 */
var validatePlace = function(place, callback) {
  var err = function(msg, code) {
    return callback({
      code: code || 400,
      message: msg
    });
  };
  if (!_.isObject(place)) {
    return err('Place must be an object.');
  }
  if (!isAPlace(place)) {
    return err('Wrong type, this is not a place.');
  }
  if (_.isUndefined(place.name)) {
    return err('Place is missing a "name" property.');
  }
  if (!_.isUndefined(place.reported_date) && !utils.isDateStrValid(place.reported_date)) {
    return err('Reported date is invalid: ' + place.reported_date);
  }
  if (!_.isString(place.name)) {
    return err('Property "name" must be a string.');
  }
  if (['clinic', 'health_center'].indexOf(place.type) !== -1) {
    if (_.isUndefined(place.parent)) {
      return err('Place is missing a "parent" property.');
    }
    if (place.type === 'clinic' && place.parent.type !== 'health_center') {
      return err('Clinics should have "health_center" parent type.');
    }
    if (place.type === 'health_center' && place.parent.type !== 'district_hospital') {
      return err('Health Centers should have "district_hospital" parent type.');
    }
  }
  if (place.contact) {
    if (!_.isString(place.contact) && !_.isObject(place.contact)) {
      return err('Property "contact" must be an object or string.');
    }
  }
  if (place.parent) {
    // validate parents
    return validatePlace(place.parent, callback);
  }
  return callback();
};

var createPlace = function(place, callback) {
  var self = module.exports;
  self._validatePlace(place, function(err) {
    if (err) {
      return callback(err);
    }
    if (!place.reported_date) {
      place.reported_date = new Date().valueOf();
    } else {
      place.reported_date = utils.parseDate(place.reported_date).valueOf();
    }
    if (place.contact) {
      // also validates contact if creating
      people.getOrCreatePerson(place.contact, function(err, doc) {
        if (err) {
          return callback(err);
        }
        place.contact = doc;
        db.medic.insert(place, callback);
      });
    } else {
      db.medic.insert(place, callback);
    }
  });
};

/*
 * Create a place and related/parent places.  Only creates the place once all
 * parents have been created and embedded.  Replaces references to places
 * (UUIDs) with objects by fetching from the database.  Replace objects with
 * real places after validating and creating them.
 *
 * Return the id and rev of newly created place.
 */
var createPlaces = function(place, callback) {
  var self = module.exports;
  if (_.isString(place.parent)) {
    self.getPlace(place.parent, function(err, doc) {
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

/*
 * Given a valid place, update editable fields.
 */
var updateFields = function(place, data) {
  var ignore = [];
  _.forEach(PLACE_EDITABLE_FIELDS , function(key) {
    if (!_.isUndefined(data[key]) && ignore.indexOf(key) === -1) {
      place[key] = data[key];
    }
  });
  return place;
};

var updatePlace = function(id, data, callback) {
  var self = module.exports,
      props = PLACE_EDITABLE_FIELDS,
      response = {},
      series = [],
      place;
  if (!_.some(props, function(k) { return !_.isUndefined(data[k]); })) {
    return callback({
      code: 400,
      message: 'One of the following fields are required: ' + props.join(', ')
    });
  }
  self.getPlace(id, function(err, doc) {
    if (err) {
      return callback(err);
    }
    place = self._updateFields(doc, data);
    if (data.contact) {
      series.push(function(cb) {
        people.getOrCreatePerson(data.contact, function(err, doc) {
          if (err) {
            return cb(err);
          }
          place.contact = doc;
          cb();
        });
      });
    }
    if (data.parent) {
      series.push(function(cb) {
        self.getOrCreatePlace(data.parent, function(err, doc) {
          if (err) {
            return cb(err);
          }
          place.parent = doc;
          cb();
        });
      });
    }
    series.push(function(cb) {
      self._validatePlace(place, function(err) {
        if (err) {
          return cb(err);
        }
        db.medic.insert(place, function(err, resp) {
          if (err) {
            return cb(err);
          }
          response.id = resp.id;
          response.rev = resp.rev;
          cb();
        });
      });
    });
    async.series(series, function(err) {
      callback(err, response);
    });
  });
};

/*
 * Return existing or newly created place or error. Assumes stored places are
 * valid.
 */
var getOrCreatePlace = function(place, callback) {
  var self = module.exports;
  if (_.isString(place)) {
    // fetch place
    self.getPlace(place, function(err, doc) {
      if (err) {
        return callback(err);
      }
      callback(null, doc);
    });
  } else if (_.isObject(place) && _.isUndefined(place._rev)) {
    // create and return place
    self._createPlaces(place, function(err, resp) {
      if (err) {
        return callback(err);
      }
      self.getPlace(resp.id, callback);
    });
  } else {
    callback({
      code:400,
      message: 'Place must be a new object or string identifier (UUID).'
    });
  }
};

module.exports._createPlace = createPlace;
module.exports._createPlaces = createPlaces;
module.exports._updateFields = updateFields;
module.exports._validatePlace = validatePlace;
module.exports.createPlace = createPlaces;
module.exports.getPlace = getPlace;
module.exports.updatePlace = updatePlace;
module.exports.getOrCreatePlace = getOrCreatePlace;
