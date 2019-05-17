const _ = require('underscore');

const _isDefined = obj => !_.isUndefined(obj) && !_.isNull(obj);

exports.validate = (def, formData) => {
  const errors = [];
  const missingFields = [];

  Object.keys(def.fields).forEach(k => {
    const field = def.fields[k];
    const value = formData[k];

    if (field.required && (!value || !_isDefined(value))) {
      missingFields.push(k);
    } else if (value) {
      // TODO: validate types
      // OR, do it elsewhere?
      // if (field.type === 'integer' && (typeof value !== 'number' || !Number.isInteger(value))) {
      //   errors.push({code: 'sys.incorrect_type', ctx: {expectedType: 'integer', key: k}});
      // } else if (field.type === 'string' && typeof value !== 'string') {
      //   errors.push({code: 'sys.incorrect_type', ctx: {expectedType: 'string', key: k}});
      // } else if (field.type === 'date' && typeof value !== 'number') {
      //   // Dates come in as strings probably and are converted into timestamps
      //   errors.push({code: 'sys.incorrect_type', ctx: {expectedType: 'date', key: k}});
      // } else if (field.type === 'complex' && value !== 'object') {
      //   errors.push({code: 'sys.incorrect_type', ctx: {expectedType: 'complex', key: k}});
      // }
    }
  });

  if (missingFields.length) {
    errors.push({code: 'sys.missing_fields', ctx: { fields: missingFields }});
  }

  return errors;
};
