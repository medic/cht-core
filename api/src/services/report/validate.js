const _ = require('underscore');

/*
 *  return array of errors or empty array.
 */
exports.validate = (def, form_data) => {
  const missing_fields = [];

  const _isDefined = obj => !_.isUndefined(obj) && !_.isNull(obj);

  _.each(def.fields, (field, k) => {
    const orig_key = k;
    let key = k.split('.');
    let data = form_data;

    while(key.length > 1) {
      data = data[key.shift()];
    }

    key = key[0];

    if (!!field.required) {
      if (
        !data ||
        !_isDefined(data[key]) ||
        (_.isArray(data[key]) && !_isDefined(data[key][0]))
      ) {
        missing_fields.push(orig_key);
      }
    }
  });

  if (!_.isEmpty(missing_fields)) {
    return [{code: 'sys.missing_fields', fields: missing_fields}];
  }

  if (def.validations) {

    const errors = [];

    for (let k of Object.keys(def.validations)) {
      if (typeof def.validations[k] !== 'string') {
        continue;
      }
      const ret = eval(`(${def.validations[k]})()`); // jshint ignore:line
      if (!ret) {
        continue;
      }
      // assume string/error message if not object
      if (!_.isObject(ret)) {
        errors.push({
          code: 'sys.form_invalid_custom',
          form: def.meta.code,
          message: ret
        });
      } else {
        errors.push(ret);
      }
    }

    if (errors.length) {
      return errors;
    }
  }

  return [];
};
