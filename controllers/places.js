const _ = require('underscore'),
      async = require('async'),
      people = require('./people'),
      utils = require('./utils'),
      db = require('../db'),
      PLACE_EDITABLE_FIELDS = ['name', 'parent', 'contact', 'place_id'],
      PLACE_TYPES = ['national_office', 'district_hospital', 'health_center', 'clinic'];

const minify = contact => {
  if (!contact) {
    return contact;
  }
  const result = { _id: contact._id };
  let minified = result;
  while(contact.parent) {
    minified.parent = { _id: contact.parent._id };
    minified = minified.parent;
    contact = contact.parent;
  }
  return result;
};

const getPlace = (id, callback) => {
  db.medic.get(id, (err, doc) => {
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

const isAPlace = place => PLACE_TYPES.indexOf(place.type) !== -1;

/*
 * Validate the basic data structure for a place.  Not checking against the
 * database if parent exists because the entire child-parent structure create
 * might be requested in one API call. Just checking `type` field values and
 * some required fields.
 */
const validatePlace = (place, callback) => {
  const err = (msg, code) => {
    return callback({
      code: code || 400,
      message: msg
    });
  };
  if (!_.isObject(place)) {
    return err('Place must be an object.');
  }
  let placeId = '';
  if (place._id) {
    placeId = place._id;
  }
  if (!isAPlace(place)) {
    return err(`Wrong type, object ${placeId} is not a place.`);
  }
  if (_.isUndefined(place.name)) {
    return err(`Place ${placeId} is missing a "name" property.`);
  }
  if (!_.isUndefined(place.reported_date) && !utils.isDateStrValid(place.reported_date)) {
    return err(`Reported date on place ${placeId} is invalid: ${place.reported_date}`);
  }
  if (!_.isString(place.name)) {
    return err(`Property "name" on place ${placeId} must be a string.`);
  }
  if (['clinic', 'health_center'].indexOf(place.type) !== -1) {
    if (!place.parent) {
      return err(`Place ${placeId} is missing a "parent" property.`);
    }
    if (place.type === 'clinic' && place.parent.type !== 'health_center') {
      return err(`Clinic ${placeId} should have "health_center" parent type.`);
    }
    if (place.type === 'health_center' && place.parent.type !== 'district_hospital') {
      return err(`Health Center ${placeId} should have "district_hospital" parent type.`);
    }
  }
  if (place.contact) {
    if (!_.isString(place.contact) && !_.isObject(place.contact)) {
      return err(`Property "contact" on place ${placeId} must be an object or string.`);
    }
  }
  if (place.parent && !_.isEmpty(place.parent)) {
    // validate parents
    return validatePlace(place.parent, callback);
  }
  return callback();
};

const createPlace = (place, callback) => {
  const self = module.exports;
  self._validatePlace(place, err => {
    if (err) {
      return callback(err);
    }
    if (!place.reported_date) {
      place.reported_date = new Date().valueOf();
    } else {
      place.reported_date = utils.parseDate(place.reported_date).valueOf();
    }
    if (place.parent) {
      place.parent = minify(place.parent);
    }
    if (place.contact) {
      // also validates contact if creating
      people.getOrCreatePerson(place.contact, (err, doc) => {
        if (err) {
          return callback(err);
        }
        place.contact = minify(doc);
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
const createPlaces = (place, callback) => {
  const self = module.exports;
  if (_.isString(place.parent)) {
    self.getPlace(place.parent, (err, doc) => {
      if (err) {
        return callback(err);
      }
      place.parent = doc;
      self._createPlace(place, callback);
    });
  } else if (_.isObject(place.parent) && !place.parent._id) {
    self._createPlaces(place.parent, (err, body) => {
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
const updateFields = (place, data) => {
  const ignore = [];
  PLACE_EDITABLE_FIELDS.forEach(key => {
    if (!_.isUndefined(data[key]) && ignore.indexOf(key) === -1) {
      place[key] = data[key];
    }
  });
  return place;
};

const updatePlace = (id, data, callback) => {
  const self = module.exports,
        response = {},
        series = [];
  let place;
  if (!_.some(PLACE_EDITABLE_FIELDS, k => {
    return !_.isNull(data[k]) && !_.isUndefined(data[k]);
  })) {
    return callback({
      code: 400,
      message: 'One of the following fields are required: ' + PLACE_EDITABLE_FIELDS.join(', ')
    });
  }
  self.getPlace(id, (err, doc) => {
    if (err) {
      return callback(err);
    }
    place = self._updateFields(doc, data);
    if (data.contact) {
      series.push(cb => {
        people.getOrCreatePerson(data.contact, (err, doc) => {
          if (err) {
            return cb(err);
          }
          place.contact = minify(doc);
          cb();
        });
      });
    }
    if (data.parent) {
      series.push(cb => {
        self.getOrCreatePlace(data.parent, (err, doc) => {
          if (err) {
            return cb(err);
          }
          place.parent = minify(doc);
          cb();
        });
      });
    }
    series.push(cb => {
      self._validatePlace(place, err => {
        if (err) {
          return cb(err);
        }
        db.medic.insert(place, (err, resp) => {
          if (err) {
            return cb(err);
          }
          response.id = resp.id;
          response.rev = resp.rev;
          cb();
        });
      });
    });
    async.series(series, err => {
      callback(err, response);
    });
  });
};

/*
 * Return existing or newly created place or error. Assumes stored places are
 * valid.
 * `place` should be an id string, or a new place object. Can't be an existing place object.
 */
const getOrCreatePlace = (place, callback) => {
  const self = module.exports;
  if (_.isString(place)) {
    // fetch place
    self.getPlace(place, (err, doc) => {
      if (err) {
        return callback(err);
      }
      callback(null, doc);
    });
  } else if (_.isObject(place) && !place._rev) {
    // create and return place
    self._createPlaces(place, (err, resp) => {
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
module.exports.minify = minify;
