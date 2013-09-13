var _ = require('underscore'),
    pupil = require('pupil');

module.exports = {
    extractErrors: function(result, messages) {
        return _.reduce(result, function(memo, valid, key) {
            if (!valid) {
                memo.push(messages[key]);
            }
            return memo;
        }, []);
    },
    getMessages: function(validations) {
        return _.reduce(validations, function(memo, validation) {
            if (validation.property && validation.message) {
                memo[validation.property] = validation.message;
            }

            return memo;
        }, {});
    },
    getRules: function(validations) {
        return _.reduce(validations, function(memo, validation) {
            if (validation.property && validation.rule) {
                memo[validation.property] = validation.rule;
            }

            return memo;
        }, {});
    },
    validate: function(doc, validations) {
        var messages,
            result,
            rules;

        validations = validations || [];

        rules = module.exports.getRules(validations);
        messages = module.exports.getMessages(validations);

        try {
            result = pupil.validate(rules, doc);
        } catch(e) {
            result = ['There was an error running the validations: ' + e.message];
        }

        return module.exports.extractErrors(result, messages);
    }
};
