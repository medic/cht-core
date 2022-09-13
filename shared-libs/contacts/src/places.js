const _ = require('lodash');
const config = require('./libs/config');
const people = require('./people');
const utils = require('./libs/utils');
const db = require('./libs/db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const contactTypesUtils = require('@medic/contact-types-utils');
const PLACE_EDITABLE_FIELDS = ['name', 'parent', 'contact', 'place_id'];

const getPlace = id => {
  return lineage.fetchHydratedDoc(id)
    .then(doc => {
      if (!isAPlace(doc)) {
        return Promise.reject({ status: 404 });
      }
      return doc;
    })
    .catch(err => {
      if (err.status === 404) {
        err.message  = 'Failed to find place.';
      }
      throw err;
    });
};

const isAPlace = place => place && contactTypesUtils.isPlace(config.get(), place);
const getContactType = place => place && contactTypesUtils.getContactType(config.get(), place);

/*
 * Validate the basic data structure for a place.  Not checking against the
 * database if parent exists because the entire child-parent structure create
 * might be requested in one API call. Just checking `type` field values and
 * some required fields.
 *
 * NB: non-hydrated places may not be valid. You may wish to use
 *     fetchHydratedDoc().
 */
const validatePlace = place => {
  const err = (msg, code) => {
    return Promise.reject({
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
  const type = getContactType(place);
  if (contactTypesUtils.hasParents(type)) {
    if (!place.parent) {
      return err(`Place ${placeId} is missing a "parent" property.`);
    }
    const parentType = getContactType(place.parent);
    if (!contactTypesUtils.isParentOf(parentType, type)) {
      return err(`${type.id} "${placeId}" should have one of the following parent types: "${type.parents}".`);
    }
  }
  if (place.contact) {
    if (!_.isString(place.contact) && !_.isObject(place.contact)) {
      return err(`Property "contact" on place ${placeId} must be an object or string.`);
    }
  }
  if (place.parent && !_.isEmpty(place.parent)) {
    // validate parents
    return validatePlace(place.parent);
  }
  return Promise.resolve();
};

const createPlace = place => {
  const self = module.exports;
  return self._validatePlace(place)
    .then(() => {
      const date = place.reported_date ? utils.parseDate(place.reported_date) : new Date();
      place.reported_date = date.valueOf();
      if (place.parent) {
        place.parent = lineage.minifyLineage(place.parent);
      }
      if (place.contact) {
        // also validates contact if creating
        return people.getOrCreatePerson(place.contact).then(person => {
          place.contact = lineage.minifyLineage(person);
        });
      }
    })
    .then(() => db.medic.post(place));
};

/*
 * Create a place and related/parent places.  Only creates the place once all
 * parents have been created and embedded.  Replaces references to places
 * (UUIDs) with objects by fetching from the database.  Replace objects with
 * real places after validating and creating them.
 *
 * Return the id and rev of newly created place.
 */
const createPlaces = place => {
  const self = module.exports;
  if (_.isString(place.parent)) {
    return self.getPlace(place.parent)
      .then(doc => {
        place.parent = doc;
        return self._createPlace(place);
      });
  } else if (_.isObject(place.parent) && !place.parent._id) {
    return self._createPlaces(place.parent)
      .then(body => {
        place.parent = body.id;
        return self._createPlaces(place);
      });
  } else {
    // create place when all parents are resolved
    return self._createPlace(place);
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

const updatePlace = (id, data) => {
  if (!_.some(PLACE_EDITABLE_FIELDS, k => !_.isNull(data[k]) && !_.isUndefined(data[k]))) {
    return Promise.reject({
      code: 400,
      message: 'One of the following fields are required: ' + PLACE_EDITABLE_FIELDS.join(', ')
    });
  }
  const self = module.exports;
  let place;
  return self.getPlace(id)
    .then(doc => {
      place = self._updateFields(doc, data);
    })
    .then(() => {
      if (data.contact) {
        return people.getOrCreatePerson(data.contact).then(contact => {
          place.contact = contact;
        });
      }
    })
    .then(() => {
      if (data.parent) {
        return self.getOrCreatePlace(data.parent).then(parent => {
          place.parent = parent;
        });
      }
    })
    .then(() => self._validatePlace(place))
    .then(() => {
      place.contact = lineage.minifyLineage(place.contact);
      place.parent = lineage.minifyLineage(place.parent);
      return db.medic.post(place);
    })
    .then(response => ({ id: response.id, rev: response.rev }));
};

/*
 * Return existing or newly created place or error. Assumes stored places are
 * valid.
 * `place` should be an id string, or a new place object. Can't be an existing place object.
 */
const getOrCreatePlace = place => {
  const self = module.exports;
  if (_.isString(place)) {
    // fetch place
    return self.getPlace(place);
  } else if (_.isObject(place) && !place._rev) {
    // create and return place
    return self._createPlaces(place)
      .then(resp => self.getPlace(resp.id));
  } else {
    return Promise.reject({
      code:400,
      message: 'Place must be a new object or string identifier (UUID).'
    });
  }
};

module.exports = {
  _createPlace: createPlace,
  _createPlaces: createPlaces,
  _lineage: lineage,
  _updateFields: updateFields,
  _validatePlace: validatePlace,
  createPlace: createPlaces,
  getPlace: getPlace,
  updatePlace: updatePlace,
  getOrCreatePlace: getOrCreatePlace,
};
