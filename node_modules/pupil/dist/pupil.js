(function(undefined) {
	var entities = {};

	var addEntity = function(name) {
		entities[name] = {
			name: name,
			toString: function() {
				return name;
			}
		};
	};

	addEntity('Block');
	addEntity('Func');
	addEntity('Ternary');
	addEntity('LogicalAnd');
	addEntity('LogicalOr');
	addEntity('LogicalNot');

    // Export the module
    if (typeof module !== 'undefined') {
        module.exports = entities;
    } else {
        window.pupil = window.pupil || {};
        window.pupil.entities = entities;
    }
})();;(function(undefined) {
    var Lexer = function(tokens) {
        this.tokens = tokens;
    };

    Lexer.prototype.tokenize = function(str) {
        var chars = str.split(""),
            resultTokens = [],
            i;

        var Token = this.tokens; // A shorthand

        var pushToken = function(name, data) {
            resultTokens.push({
                name: name,
                data: data || null
            });
        };

        var whiteSpaceRegex = new RegExp('^\\s+$');

        // If we're "building" an identifier, store it here until we flush it
        var tempIdentifier = "";

        // Keep building the identifier?
        var appendToTempIdentifier = false;

        // When a char is escaped, treat it as an identifier even if it would
        // otherwise be resolved to a different token
        var treatNextAsIdentifier = false;

        // The token or tokens to push at the end of the loop
        // after e.g. flushing the identifier
        var tokensToPush = [];

        // Sometimes we'll completely ignore a char, such as with escape symbols
        var ignoreThisChar = false;

        // Are we in a string?
        var inString = false;
        var stringStartChar = null;

        // Loop through the chars
        for (i = 0; i < chars.length; i++) {
            var thisChar = chars[i],
                nextChar = chars[i + 1];

            // If we should start or end a string at the end of this loop
            var startString = false;
            var endString = false;

            // Reset some variables for this loop
            appendToTempIdentifier = false;
            tokensToPush = [];
            ignoreThisChar = false;

            // This char was escaped, append it to an identifier.
            if (treatNextAsIdentifier) {
                treatNextAsIdentifier = false;
                appendToTempIdentifier = true;
            
            // String end
            } else if (thisChar === stringStartChar) {
                endString = true;

            // Strings
            } else if (inString) {
                appendToTempIdentifier = true;

            // String start
            } else if (thisChar === '"' || thisChar === "'") {
                startString = true;

            // Escape the next char; ignore this one (because it's an escaping symbol)
            // and don't flush the identifier (as the next char will be added to it).
            } else if (thisChar == '\\') {
                treatNextAsIdentifier = true;
                ignoreThisChar = true;
            }

            // General tokens
            else if (thisChar == ',') {
                tokensToPush.push([Token.Comma]);
            } else if (thisChar == ':') {
                tokensToPush.push([Token.Colon]);
            } else if (thisChar == '?') {
                tokensToPush.push([Token.QuestionMark]);
            } else if (thisChar == '&' && nextChar == '&') {
                tokensToPush.push([Token.LogicalAnd]);
                i++;
            } else if (thisChar == '|' && nextChar == '|') {
                tokensToPush.push([Token.LogicalOr]);
                i++;
            } else if (thisChar == '!') {
                tokensToPush.push([Token.LogicalNot]);
            } else if (thisChar == '(') {
                tokensToPush.push([Token.BracketOpen]);
            } else if (thisChar == ')') {
                tokensToPush.push([Token.BracketClose]);

            // Ignore whitespace unless we're in a string
            } else if (whiteSpaceRegex.test(thisChar)) {
                ignoreThisChar = true;

            // Otherwise it's an identifier part
            } else {
                appendToTempIdentifier = true;
            }

            // Should we build the identifier with this char?
            if (appendToTempIdentifier) {
                tempIdentifier += thisChar;
            }

            // Make sure we flush the identifier if we still have one
            // going when the string ends.
            if (i == chars.length - 1) {
                appendToTempIdentifier = false;
            }

            // Flushing the identifier means pushing an identifier
            // token with the current "tempIdentifier" as the data
            // and then emptying the temporary identifier.
            // 
            // The identifier can be pushed as a string, a number or an identifier.
            if ( ! appendToTempIdentifier && ! ignoreThisChar && tempIdentifier !== "") {
                if (inString) {
                    tokensToPush.unshift([Token.String, tempIdentifier]);
                } else if ( ! isNaN(parseFloat(tempIdentifier, 10)) && isFinite(tempIdentifier)) {
                    tokensToPush.unshift([Token.Number, tempIdentifier]);
                } else {
                    tokensToPush.unshift([Token.Identifier, tempIdentifier]);
                }

                tempIdentifier = "";
            }

            if (startString) {
                inString = true;
                stringStartChar = thisChar;
            }

            if (endString) {
                inString = false;
                stringStartChar = null;
            }

            // Push outstanding tokens
            if (tokensToPush.length > 0) {
                for (var a = 0; a < tokensToPush.length; a++) {
                    pushToken(tokensToPush[a][0], tokensToPush[a][1]);
                }
            }
        } // End the char loop

        return resultTokens;
    };

    // Export the module
    if (typeof module !== 'undefined') {
        module.exports = {
            create: function(tokens) {
                return new Lexer(tokens);
            }
        };
    } else {
        window.pupil = window.pupil || {};
        window.pupil.lexer = Lexer;
    }
})();;(function(undefined) {
    var createEntity = function(type) {
        return {
            type: type,

            // Used for "Block" type entities
            sub: [],

            // Used for "Func" (Function) type entities
            funcName: "",
            funcArgs: [],

            // Used for "Ternary" type entities
            conditions: [],
            ifThen: null,
            ifElse: null
        };
    };

    var ParserException = function(message, pos) {
        this.message = message;
        this.pos = pos;
    };

    var Parser = function(tokens, entities) {
        this.tokens = tokens;
        this.entities = entities;
    };

    Parser.prototype.parse = function(tokens) {
        // A couple shorthands
        var Token = this.tokens;
        var Entity = this.entities;

        var rootBlock = createEntity(Entity.Block);
        var blockStack = [rootBlock];

        var currentBlock = blockStack[blockStack.length - 1];
        var currentFunction = null, flushFunction = true;

        var inString = false;

        var accept = {
            'identifier': 0,
            'string': 0,
            'number': 0,
            'logicalOp': 0,
            'negator': 0,
            'funcArgsStart': 0, // Starts a function's arguments after its name ('(')
            'funcArgsEnd': 0,   // Ends a function's arguments (')')
            'argSeparator': 0,  // Separates arguments from each other (',')
            'blockStart': 0,
            'blockEnd': 0,
            'ternaryThen': 0,
            'ternaryElse': 0
        };

        var expectOneOf = function(oneOf) {
            // First reset the tokens we'll accept
            for (var index in accept) {
                accept[index] = 0;
            }

            // And accept the tokens listed as our argument array
            for (var i = 0; i < oneOf.length; i++) {
                if (typeof accept[oneOf[i]] !== 'undefined') {
                    accept[oneOf[i]] = 1;
                }
            }
        };

        expectOneOf(['identifier', 'negator', 'blockStart']);

        for (var i = 0; i < tokens.length; i++) {
            var thisToken = tokens[i];
            var entitiesToPush = [];
            var openBlock = false;
            var closeBlock = false;
            var closeTernary = false;

            // Arguments for an already created function
            if (thisToken.name == Token.String || thisToken.name == Token.Number) {
                if ( ! accept.string) { throw new ParserException("Unexpected string", i); }
                if ( ! accept.number) { throw new ParserException("Unexpected number", i); }

                flushFunction = false;
                
                // String arguments
                if (thisToken.name == Token.String) {
                    currentFunction.funcArgs.push(thisToken.data.toString());

                // Number arguments
                } else {
                    currentFunction.funcArgs.push(parseFloat(thisToken.data, 10));
                }

                expectOneOf(['argSeparator', 'funcArgsEnd']);

            // A new function
            } else if (thisToken.name == Token.Identifier) {
                if ( ! accept.identifier) { throw new ParserException("Unexpected identifier", i); }

                flushFunction = false;

                currentFunction = createEntity(Entity.Func);
                currentFunction.funcName = thisToken.data;

                expectOneOf(['logicalOp', 'funcArgsStart', 'blockEnd', 'ternaryThen', 'ternaryElse']);

            // Ternary "then"/start
            } else if (thisToken.name == Token.QuestionMark) {
                if ( ! accept.ternaryThen) { throw new ParserException("Unexpected ternary 'then'"); }

                // Start a new block that's a ternary
                var newTernary = createEntity(Entity.Ternary);
                newTernary.conditions = currentBlock.sub;

                // Make sure the ternary's conditions aren't evaluated outside the ternary
                currentBlock.sub = [newTernary];

                // Change the current block to the new ternary
                blockStack.push(newTernary);
                currentBlock = blockStack[blockStack.length - 1];

                expectOneOf(['identifier', 'blockStart', 'negator']);

            // Ternary "else"
            } else if (thisToken.name == Token.Colon) {
                if ( ! accept.ternaryElse) { throw new ParserException("Unexpected ternary 'else'"); }

                currentBlock.ifThen = currentBlock.sub;
                currentBlock.sub = [];

                expectOneOf(['identifier', 'blockStart', 'negator']);

            // Function argument separator
            } else if (thisToken.name == Token.Comma) {
                if ( ! accept.argSeparator) { throw new ParserException("Unexpected function argument separator", i); }

                flushFunction = false;

                expectOneOf(['string', 'number', 'funcArgsEnd']);

            // Logical AND
            } else if (thisToken.name == Token.LogicalAnd) {
                if ( ! accept.logicalOp) { throw new ParserException("Unexpected logical AND", i); }

                entitiesToPush.push(createEntity(Entity.LogicalAnd));
                flushFunction = true;

                expectOneOf(['identifier', 'negator', 'blockStart']);

            // Logical OR
            } else if (thisToken.name == Token.LogicalOr) {
                if ( ! accept.logicalOp) { throw new ParserException("Unexpected logical OR", i); }

                entitiesToPush.push(createEntity(Entity.LogicalOr));
                flushFunction = true;

                expectOneOf(['identifier', 'blockStart', 'negator']);

            // Logical NOT (negator)
            } else if (thisToken.name == Token.LogicalNot) {
                if ( ! accept.negator) { throw new ParserException("Unexpected logical NOT", i); }

                entitiesToPush.push(createEntity(Entity.LogicalNot));

                expectOneOf(['identifier', 'blockStart']);

            // Bracket open: function arguments start or a block start
            } else if (thisToken.name == Token.BracketOpen) {
                // Start arguments for a function
                if (currentFunction && accept.funcArgsStart) {
                    flushFunction = false;

                    expectOneOf(['string', 'number', 'funcArgsEnd']);
                // Or open a block
                } else if (accept.blockStart) {
                    openBlock = true;
                    flushFunction = true;

                    expectOneOf(['identifier', 'blockStart', 'blockEnd', 'negator']);
                } else {
                    throw new ParserException("Unexpected opening bracket", i);
                }

            // Bracket close: function arguments end or a block end
            } else if (thisToken.name == Token.BracketClose) {
                // End arguments for a function
                if (currentFunction && accept.funcArgsEnd) {
                    flushFunction = true;

                    expectOneOf(['logicalOp', 'blockEnd', 'ternaryThen', 'ternaryElse']);
                // Or close a block
                } else if (accept.blockEnd) {
                    closeBlock = true;
                    flushFunction = true;

                    flushTernaryElse = true;
                    flushTernary = true;

                    expectOneOf(['logicalOp', 'blockEnd', 'ternaryThen', 'ternaryElse']);
                } else {
                    throw new ParserException("Unexpected closing bracket", i);
                }
            }

            if (i == tokens.length - 1) {
                // Make sure to flush the function if we're still gathering one's
                // arguments when we've handled all of the tokens.
                flushFunction = true;

                // Also, if we have an outstanding ternary, close it
                closeTernary = true;
            }

            // If we've finished gathering a function's name and arguments,
            // "flush" it to the current block's entities
            if (flushFunction && currentFunction) {
                entitiesToPush.unshift(currentFunction);
                currentFunction = null;
            }

            if (entitiesToPush.length > 0) {
                for (var a = 0; a < entitiesToPush.length; a++) {
                    currentBlock.sub.push(entitiesToPush[a]);
                }
            }

            if (openBlock) {
                var newBlock = createEntity(Entity.Block);
                blockStack.push(newBlock);
                currentBlock.sub.push(newBlock);

                currentBlock = blockStack[blockStack.length - 1];
            }

            // Close ternaries along with blocks when blocks would normally be
            // closed as there is not a symbol for closing ternaries specifically.
            // Flush the outstanding sub-entities to the ternary's "then" or "else" properties.
            if ((closeTernary || closeBlock) && currentBlock.type == Entity.Ternary) {

                if (currentBlock.ifThen !== null) {
                    currentBlock.ifElse = currentBlock.sub;
                } else {
                    currentBlock.ifThen = currentBlock.sub;
                }

                currentBlock.sub = [];

                blockStack.pop();
                currentBlock = blockStack[blockStack.length - 1];
            }

            if (closeBlock) {
                if (blockStack.length === 1) { throw new ParserException("Can't close the root block.", i); }

                blockStack.pop();
                currentBlock = blockStack[blockStack.length - 1];
            }
        } // End token loop

        if (blockStack.length > 1) { throw new ParserException("All blocks weren't closed."); }

        return [rootBlock];
    };

    // Export the module
    if (typeof module !== 'undefined') {
        module.exports = {
            create: function(tokens, entities) {
                return new Parser(tokens, entities);
            }
        };
    } else {
        window.pupil = window.pupil || {};
        window.pupil.parser = Parser;
    }
})();;(function(undefined) {
    var tokens              = null;
    var entities            = null;
    var validator_functions = null;

    var lexer               = null;
    var parser              = null;
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
            validate: validate
        };
    } else {
        window.pupil = window.pupil || {};
        window.pupil.addFunction = addFunction;
        window.pupil.validate    = validate;
    }
})();;(function(undefined) {
	var tokens = {};

	var addToken = function(name) {
		tokens[name] = {
			name: name,
			toString: function() {
				return name;
			}
		};
	};

	addToken('Identifier');
	addToken('Comma');
	addToken('Colon');
	addToken('QuestionMark');
	addToken('String');
	addToken('Number');
	addToken('LogicalAnd');
	addToken('LogicalOr');
	addToken('LogicalNot');
	addToken('BracketOpen');
	addToken('BracketClose');

    // Export the module
    if (typeof module !== 'undefined') {
        module.exports = tokens;
    } else {
        window.pupil = window.pupil || {};
        window.pupil.tokens = tokens;
    }
})();;(function(undefined) {
	var ValidationResult = function(results) {
		this.results = results;
	};

	ValidationResult.prototype.isValid = function() {
		for (var index in this.results) {
			if ( ! this.results[index]) {
				return false;
			}
		}

		return true;
	};

	ValidationResult.prototype.hasErrors = function() {
		return ! this.isValid();
	};

	ValidationResult.prototype.errors = function() {
		var errors = [];

		for (var index in this.results) {
			if ( ! this.results[index]) {
				errors.push(index);
			}
		}

		return errors;
	};

	ValidationResult.prototype.fields = function() {
		return this.results;
	};

	// Export the module
	var exportedModule = {
		create: function(results) {
            return new ValidationResult(results);
        }
	};

    if (typeof module !== 'undefined') {
        module.exports = exportedModule;
    } else {
        window.pupil = window.pupil || {};
        window.pupil.validation_result = exportedModule;
    }
})();;(function(undefined) {
    var Validator = function(validatorFunctions, entities) {
        this.validatorFunctions = validatorFunctions;
        this.entities = entities;
    };

    Validator.prototype.validate = function(entities, values, valueKey) {
        if (entities === null || typeof entities === 'undefined') {
            return true;
        }

        // A couple shorthands
        var ValidatorFunctions = this.validatorFunctions;
        var Entity = this.entities;

        var validationResult = true;
        var logicalOperator = 1; // 1 = AND, 2 = OR
        var negateNext = false;

        // Loop through the entities
        for (var i = 0; i < entities.length; i++) {
            var thisEntity = entities[i];
            var tempResult = true;
            var useTempResult = false;

            if (thisEntity.type == Entity.LogicalAnd) {
                logicalOperator = 1;
            } else if (thisEntity.type == Entity.LogicalOr) {
                logicalOperator = 2;
            } else if (thisEntity.type == Entity.LogicalNot) {
                negateNext = true;
            } else if (thisEntity.type == Entity.Func) {
                var funcName = thisEntity.funcName.toLowerCase(),
                    funcArgs = [];

                // Clone the function arguments so below we don't affect
                // the original arguments in the entity.
                for (var a = 0; a < thisEntity.funcArgs.length; a++) {
                    funcArgs.push(thisEntity.funcArgs[a]);
                }

                if (funcName.substr(0, 5) == 'other') {
                    funcName = funcName.substr(5); // Remove the "other" from the start

                    // Get the values array key of the "other" value
                    var otherValueKey = funcArgs.shift();
                    funcArgs.unshift(values[otherValueKey]);
                } else {
                    funcArgs.unshift(values[valueKey]);
                }

                funcArgs.unshift(values);

                tempResult = ValidatorFunctions[funcName].apply(this, funcArgs);
                useTempResult = true;
            } else if (thisEntity.type == Entity.Block) {
                tempResult = this.validate(thisEntity.sub, values, valueKey);
                useTempResult = true;
            } else if (thisEntity.type == Entity.Ternary) {
                var ternaryCondition = this.validate(thisEntity.conditions, values, valueKey);

                if (ternaryCondition) {
                    tempResult = this.validate(thisEntity.ifThen, values, valueKey);
                } else {
                    tempResult = this.validate(thisEntity.ifElse, values, valueKey);
                }

                useTempResult = true;
            }

            if (useTempResult) {
                if (negateNext) {
                    tempResult = ! tempResult;
                    negateNext = false;
                }

                if (logicalOperator == 1) {
                    validationResult = validationResult && tempResult;
                } else {
                    validationResult = validationResult || tempResult;
                }

                useTempResult = false;
            }
        }

        return validationResult;
    };

    // Export the module
    if (typeof module !== 'undefined') {
        module.exports = {
            create: function(validatorFunctions, entities) {
                return new Validator(validatorFunctions, entities);
            }
        };
    } else {
        window.pupil = window.pupil || {};
        window.pupil.validator = Validator;
    }
})();;(function(undefined) {
    var ValidatorFunctions = {};

    var re = {
        alpha: new RegExp('^[a-zA-Z]+$'),
        alphanumeric: new RegExp('^[a-zA-Z0-9]+$'),
        email: new RegExp('^.*?@.*?\\..+$')
    };

    ValidatorFunctions = {
        "equals": function(allValues, value, equalsTo) {
            return value == equalsTo;
        },

        "iequals": function(allValues, value, equalsTo) {
            return value.toLowerCase() == equalsTo.toLowerCase();
        },

        "sequals": function(allValues, value, equalsTo) {
            return value === equalsTo;
        },

        "siequals": function(allValues, value, equalsTo) {
            return value.toLowerCase() === equalsTo.toLowerCase();
        },

        "lenmin": function(allValues, value, min) {
            return value.length >= min;
        },

        "lenmax": function(allValues, value, max) {
            return value.length <= max;
        },

        "lenequals": function(allValues, value, equalsTo) {
            return value.toString().length == parseInt(equalsTo, 10);
        },

        "min": function(allValues, value, min) {
            return parseFloat(value, 10) >= min;
        },

        "max": function(allValues, value, max) {
            return parseFloat(value, 10) <= max;
        },

        "between": function(allValues, value, min, max) {
            var numVal = parseFloat(value, 10);
            return ((numVal >= min) && (numVal <= max));
        },

        "in": function(allValues, value) {
            var args = Array.prototype.slice.call(arguments);
            args.shift();
            args.shift();

            var inList = args;
            for (var i = 0; i < inList.length; i++) {
                if (inList[i] == value) return true;
            }

            return false;
        },

        "required": function(allValues, value) {
            return !!value;
        },

        "optional": function(allValues, value) {
            return true;
        },

        "numeric": function(allValues, value) {
            // http://stackoverflow.com/a/1830844/316944
            return ! isNaN(parseFloat(value)) && isFinite(value);
        },

        "alpha": function(allValues, value) {
            return re.alpha.test(value);
        },

        "alphanumeric": function(allValues, value) {
            return re.alphanumeric.test(value);
        },

        "email": function(allValues, value) {
            // We used to use this regex: http://stackoverflow.com/a/2855946/316944
            // But it's probably a bit overkill.
            return re.email.test(value);
        },

        "regex": function(allValues, value, regex, flags) {
            flags = flags || "";
            return (new RegExp(regex, flags)).test(value);
        },

        "integer": function(allValues, value) {
            return parseInt(value, 10) == value;
        },

        "equalsto": function(allValues, value, equalsToKey) {
            return value == allValues[equalsToKey];
        }
    };

    // Export the module
    if (typeof module !== 'undefined') {
        module.exports = ValidatorFunctions;
    } else {
        window.pupil = window.pupil || {};
        window.pupil.validator_functions = ValidatorFunctions;
    }
})();