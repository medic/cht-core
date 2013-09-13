(function(undefined) {
    var tokens              = null;
    var entities            = null;
    var validator_functions = null;

    var lexer               = null;
    var parser              = null;
    var validator           = null;

    var hasInitialized      = false;

    var ruleCache = {};

    var initialize = function() {
        if (typeof module !== 'undefined') {
            tokens              = require('./tokens.js');
            entities            = require('./entities.js');
            validator_functions = require('./validator_functions.js');

            lexer               = require('./lexer.js').create(tokens);
            parser              = require('./parser.js').create(tokens, entities);
            validator           = require('./validator.js').create(validator_functions, entities);
        } else {
            tokens              = window.pupil.tokens;
            entities            = window.pupil.entities;
            validator_functions = window.pupil.validator_functions;

            lexer               = new window.pupil.lexer(tokens);
            parser              = new window.pupil.parser(tokens, entities);
            validator           = new window.pupil.validator(validator_functions, entities);
        }

        hasInitialized = true;
    };

    var addFunction = function(name, callable) {
        if ( ! hasInitialized) {
            initialize();
        }

        validator_functions[name.toLowerCase()] = callable;
    };

    var validate = function(rules, values) {
        if ( ! hasInitialized) {
            initialize();
        }
        
        var results = {};

        for (var index in values) {
            var rule = rules[index],
                tokens, entities;

            if ( ! rule) {
                results[index] = true;
                continue;
            }

            if (ruleCache[rule]) {
                entities = ruleCache[rule];
            } else {
                tokens = lexer.tokenize(rule);
                entities = parser.parse(tokens);

                ruleCache[rule] = entities;
            }

            results[index] = validator.validate(entities.sub, values, index);
        }

        return results;
    };

    // Export the module
    if (typeof module !== 'undefined') {
        module.exports = {
            addFunction: addFunction,
            validate: validate
        };
    } else {
        window.pupil = window.pupil || {};
        window.pupil.addFunction = addFunction;
        window.pupil.validate    = validate;
    }
})();