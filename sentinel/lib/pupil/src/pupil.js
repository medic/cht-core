(function(undefined) {
    var tokens              = require('./tokens.js');
    var entities            = require('./entities.js');
    var validator_functions = null;

    var lexer               = require('./lexer.js').create(tokens);
    var parser              = require('./parser.js').create(tokens, entities);
    var validator           = null;

    var validation_result   = null;

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

            validation_result   = require('./validation_result.js');
        } else {
            tokens              = window.pupil.tokens;
            entities            = window.pupil.entities;
            validator_functions = window.pupil.validator_functions;

            lexer               = new window.pupil.lexer(tokens);
            parser              = new window.pupil.parser(tokens, entities);
            validator           = new window.pupil.validator(validator_functions, entities);

            validation_result   = window.pupil.validation_result;
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

        // Start by defaulting all given values' validation results to "passing"
        for (var index in values) {
            results[index] = true;
        }

        // And then run the rules
        for (var index in rules) {
            if (typeof values[index] === 'undefined' || values[index] === null) {
                values[index] = '';
            }

            var rule = rules[index],
                value = values[index],
                tokens, entities;

            if (ruleCache[rule]) {
                entities = ruleCache[rule];
            } else {
                tokens = lexer.tokenize(rule);
                entities = parser.parse(tokens);

                ruleCache[rule] = entities;
            }

            results[index] = validator.validate(entities, values, index);
        }

        return validation_result.create(results);
    };

    // Export the module
    if (typeof module !== 'undefined') {
        module.exports = {
            addFunction: addFunction,
            lexer: lexer,
            parser: parser,
            validate: validate
        };
    } else {
        window.pupil = window.pupil || {};
        window.pupil.addFunction = addFunction;
        window.pupil.validate    = validate;
    }
})();
