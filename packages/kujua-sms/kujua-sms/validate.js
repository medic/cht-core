var smsforms = require('views/lib/smsforms'),
    utils = require('./utils'),
    _ = require('underscore')._;

exports.validate = function(form, form_data) {
    var errors = [];
    
    if(form === "CNPW") {
        var keys = utils.getFormKeys(form);
        var labels = utils.getLabels(keys, form, 'en');
        
        for(var i = 0; i < keys.length; i += 1) {
            if(_.isUndefined(form_data[keys[i]])) {
                errors.push('Missing field: ' + labels[i]);
            }
        }
    }
    
    return errors;
};