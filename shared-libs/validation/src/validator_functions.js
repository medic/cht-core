const logger = require('@medic/logger');
const validationUtils = require('./validation_utils');

const re = {
  alpha: /^[a-zA-Z]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i
};

const ValidatorFunctions = {
  equals: (allValues, value, equalsTo) => value === equalsTo,

  iequals: (allValues, value, equalsTo) => value.toLowerCase() === equalsTo.toLowerCase(),

  sequals: (allValues, value, equalsTo) => value === equalsTo,

  siequals: (allValues, value, equalsTo) => value.toLowerCase() === equalsTo.toLowerCase(),

  lenmin: (allValues, value, min) => value.length >= min,

  lenmax: (allValues, value, max) => value.length <= max,

  lenequals: (allValues, value, equalsTo) => value.toString().length === parseInt(equalsTo, 10),

  min: (allValues, value, min) => parseFloat(value, 10) >= min,

  max: (allValues, value, max) => parseFloat(value, 10) <= max,

  between: (allValues, value, min, max) => {
    const numVal = parseFloat(value, 10);
    return ((numVal >= min) && (numVal <= max));
  },

  in: (allValues, value) => {
    const args = Array.prototype.slice.call(arguments);
    args.shift();
    args.shift();
    for (const arg of args) {  
      if (arg === value) {
        return true;
      }
    }
    return false;
  },

  required: (allValues, value) => !!value,

  optional: () => true,

  numeric: (allValues, value) => {
    // http://stackoverflow.com/a/1830844/316944
    return !isNaN(parseFloat(value)) && isFinite(value);
  },

  alpha: (allValues, value) => re.alpha.test(value),

  alphanumeric: (allValues, value) => re.alphanumeric.test(value),

  email: (allValues, value) => {
    // We used to use this regex: http://stackoverflow.com/a/2855946/316944
    // But it's probably a bit overkill.
    return re.email.test(value);
  },

  regex: (allValues, value, regex, flags) => {
    flags = flags || '';
    return (new RegExp(regex, flags)).test(value);
  },

  integer: (allValues, value) => parseInt(value, 10) === value,

  equalsto: (allValues, value, equalsToKey) => value === allValues[equalsToKey],

  exists: async (allValues, value, formName, fieldName) => {
    try {
      return await validationUtils.exists(allValues, [fieldName], { additionalFilter: `form:${formName}` });
    } catch (e) {
      logger.error('Error running "exists" validation: %o', e);
    }
  },

  unique: async (allValues, value, ...fieldNames) => {
    try {
      const exists = await validationUtils.exists(allValues, fieldNames);
      return !exists;
    } catch (e) {
      logger.error('Error running "unique" validation: %o', e);
    }
  },

  uniquewithin: async (allValues, value, ...fields) => {
    const duration = fields.pop();
    try {
      const exists = await validationUtils.exists(allValues, fields, { duration });
      return !exists;
    } catch (e) {
      logger.error('Error running "uniqueWithin" validation: %o', e);
    }
  },

  isafter: (allValues, value, duration) => {
    return validationUtils.compareDate(allValues, value, duration, true);
  },

  isbefore: (allValues, value, duration) => {
    return validationUtils.compareDate(allValues, value, duration, false);
  },

  isisoweek: (allValues, value, weekFieldName, yearFieldName) => {
    return validationUtils.isISOWeek(allValues, weekFieldName, yearFieldName);
  },

  validphone: (allValues, value, phoneFieldName) => {
    return validationUtils.validPhone(allValues[phoneFieldName]);
  },

  uniquephone: async (allValues, value, phoneFieldName) => {
    return await validationUtils.uniquePhone(allValues[phoneFieldName]);
  }

};

module.exports = ValidatorFunctions;
