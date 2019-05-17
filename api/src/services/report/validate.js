const _ = require('underscore');

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

    if (field.required) {
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

  return [];
};
