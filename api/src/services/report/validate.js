const exists = function(value) {
  return value !== undefined && value !== null;
};

exports.validate = (def, formData) => {
  const errors = [];
  const missingFields = [];

  Object.keys(def.fields).forEach(k => {
    const field = def.fields[k];
    const value = formData[k];

    if (field.required && !exists(value)) {
      missingFields.push(k);
    } else if (exists(value) && !field.list) {
      // list is an undocumented but currently used feature of SMS parsing, where it converts
      // integers into a translated string. Validation runs after parsing for SMS, so a field with a
      // list parameter would fail validation.

      if (field.type === 'integer' && (typeof value !== 'number' || !Number.isInteger(value))) {
        errors.push({code: 'sys.incorrect_type', ctx: {expectedType: 'integer', key: k}});
      } else if (field.type === 'string' && typeof value !== 'string') {
        errors.push({code: 'sys.incorrect_type', ctx: {expectedType: 'string', key: k}});
      } else if (field.type === 'boolean' && typeof value !== 'boolean') {
        errors.push({code: 'sys.incorrect_type', ctx: {expectedType: 'boolean', key: k}});
      } else if (field.type === 'complex' && typeof value !== 'object') {
        errors.push({code: 'sys.incorrect_type', ctx: {expectedType: 'complex', key: k}});
      }
    }
  });

  if (missingFields.length) {
    errors.push({code: 'sys.missing_fields', ctx: { fields: missingFields }});
  }

  return errors;
};
