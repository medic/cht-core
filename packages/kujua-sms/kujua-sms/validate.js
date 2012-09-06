var _ = require('underscore')._;

exports.validate = function(def, form_data) {
    var missing_fields = [], orig_key, key, data;

    _.each(def.fields, function(field, k) {
        orig_key = k;
        key = k.split('.');
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

    if (def.validations) {

        var errors = [];

        for (var k in def.validations) {
            if (typeof def.validations[k] !== 'string')
                continue;
            var ret = eval('('+def.validations[k]+')()');
            // assume string/error message if not object
            if (ret && !_.isObject(ret)) {
                errors.push({
                    code: 'form_invalid',
                    form: def.meta.code,
                    message: ret
                });
            } else if (ret) {
                errors.push(ret);
            }
        };

        if (errors.length !== 0) {
            return errors;
        }
    }

    return [];
};
