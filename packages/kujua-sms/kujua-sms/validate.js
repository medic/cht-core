var _ = require('underscore')._;

exports.validate = function(form_definition, form_data) {
    var missing_fields = [], orig_key, key, data;

    _.each(form_definition.fields, function(field) {
        orig_key = field.key;
        key = field.key.split('.');
        data = form_data;

        while(key.length > 1) {
            data = data[key.shift()];
        }

        key = key[0];

        if(
            ((_.isUndefined(data[key]) || _.isNull(data[key])) && !!field.required) ||
            ((!_.isUndefined(data[key]) && !_.isNull(data[key])) && !!field.required &&
            _.isArray(data[key]) && (_.isUndefined(data[key][0]) || _.isNull(data[key][0])))
        ) {
            missing_fields.push(orig_key);
        }
    });

    if (!_.isEmpty(missing_fields)) {
        return [{code: 'missing_fields', fields: missing_fields}];
    }

    return [];
};
