const _ = require('lodash');
const db = require('./libs/db');
const config = require('./libs/config');
const utils = require('./libs/utils');
const places = require('./places');
const lineage = require('./libs/lineage');
const contactTypeUtils = require('@medic/contact-types-utils');

const getPerson = id => {
  return lineage.fetchHydratedDoc(id)
    .catch(err => {
      if (err.status === 404) {
        throw { code: 404, message: 'Failed to find person.' };
      }
      throw err;
    })
    .then(doc => {
      if (!isAPerson(doc)) {
        throw { code: 404, message: 'Failed to find person.' };
      }
      return doc;
    });
};

const isAPerson = person => contactTypeUtils.isPerson(config.get(), person);

const getDefaultPersonType = () => {
  const type = contactTypeUtils.getTypeById(config.get(), 'person');
  return type && type.id;
};

const validatePerson = obj => {
  if (!_.isObject(obj)) {
    return 'Person must be an object.';
  }
  if (!isAPerson(obj)) {
    return 'Wrong type, this is not a person.';
  }
  if (_.isUndefined(obj.name)) {
    return 'Person is missing a "name" property.';
  }
  if (!_.isString(obj.name)) {
    return 'Property "name" must be a string.';
  }
  if (!_.isUndefined(obj.reported_date) && !utils.isDateStrValid(obj.reported_date)) {
    return 'Reported date is invalid: ' + obj.reported_date;
  }
};

/*
 * Set type, validate and write to database. Optionally create place.
 * `place` field should be an id string, or a new place object. Can't be an existing place object.
 *
 * Warning: not doing validation of the data against a form yet.  The form is
 * user defined in settings so being liberal with what gets saved to the
 * database. Ideally CouchDB would validate a given object against a form in
 * validate_doc_update. https://github.com/medic/medic/issues/2203
 */
const createPerson = data => {
  if (!data.type) {
    const defaultType = getDefaultPersonType();
    if (defaultType) {
      data.type = defaultType;
    }
    // else validation will fail below
  }
  const self = module.exports;
  const error = self._validatePerson(data);
  if (error) {
    return Promise.reject({ code: 400, message: error });
  }
  const date = data.reported_date ? utils.parseDate(data.reported_date) : new Date();
  data.reported_date = date.valueOf();
  return Promise.resolve()
    .then(() => {
      if (data.place) {
        return places.getOrCreatePlace(data.place).then(place => {
          data.parent = lineage.minifyLineage(place);
          delete data.place;
        });
      }
    })
    .then(() => db.medic.post(data));
};

/*
 * Return existing or newly created contact or error. Assumes stored records
 * are valid.
 */
const getOrCreatePerson = data => {
  const self = module.exports;
  if (_.isString(data)) {
    // fetch
    return self._getPerson(data);
  } else if (_.isObject(data) && _.isUndefined(data._rev)) {
    // create and fetch
    return self.createPerson(data)
      .then(resp => self._getPerson(resp.id));
  }
  return Promise.reject({ code: 400, message: 'Person must be a new object or string identifier (UUID).' });
};

/*
 * Setting properties of module.exports rather than setting the entire object
 * at once avoids circular dependency loading issues.
 */
module.exports.createPerson = createPerson;
module.exports.getOrCreatePerson = getOrCreatePerson;
module.exports.isAPerson = isAPerson;

module.exports._getPerson = getPerson;
module.exports._validatePerson = validatePerson;
module.exports._getDefaultPersonType = getDefaultPersonType;
