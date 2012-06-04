var utils = require('./utils'),
    _ = require('underscore')._;

exports.validate = function(form_definition, form_data) {
    var errors = [], key, data;
    
    _.each(form_definition.fields, function(field) {
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
            errors.push("Missing field: " + utils.getLabel(field.labels);
        }
    });
    
    return errors;
};
