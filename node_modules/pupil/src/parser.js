(function(undefined) {
    var createEntity = function(type) {
        return {
            type: type,

            // Used for "Block" type entities
            sub: [],

            // Used for "Func" (Function) type entities
            funcName: "",
            funcArgs: []
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

        var accept = {
            identifier: true,
            logicalOp: false,
            negator: true,
            funcArgs: false, // Separates function name from its arguments (':')
            argSeparator: false, // Separates arguments from each other (',')
            block: true
        };

        for (var i = 0; i < tokens.length; i++) {
            var thisToken = tokens[i];
            var entitiesToPush = [];
            var openNewBlock = false;
            var closeBlock = false;

            if (thisToken.name == Token.Identifier) {
                if ( ! accept.identifier) { throw new ParserException("Got an identifier, was not expecting one", i); }

                flushFunction = false;

                if (currentFunction) { // Arguments for an already created function
                    currentFunction.funcArgs.push(thisToken.data);

                    accept.identifier   = false;
                    accept.logicalOp    = true;
                    accept.funcArgs     = false;
                    accept.argSeparator = true;
                    accept.block        = true;
                    accept.negator      = false;
                } else { // A new function
                    currentFunction = createEntity(Entity.Func);
                    currentFunction.funcName = thisToken.data;

                    accept.identifier   = false;
                    accept.logicalOp    = true;
                    accept.funcArgs     = true;
                    accept.argSeparator = false;
                    accept.block        = false;
                    accept.negator      = false;
                }
            } else if (thisToken.name == Token.Colon) {
                if ( ! accept.funcArgs) { throw new ParserException("Got function arguments, was not expecting them", i); }

                flushFunction = false;

                accept.identifier   = true;
                accept.logicalOp    = false;
                accept.funcArgs     = false;
                accept.argSeparator = false;
                accept.block        = false;
                accept.negator      = false;
            } else if (thisToken.name == Token.Comma) {
                if ( ! accept.argSeparator) { throw new ParserException("Unexpected function argument separator", i); }

                flushFunction = false;

                accept.identifier   = true;
                accept.logicalOp    = false;
                accept.funcArgs     = false;
                accept.argSeparator = false;
                accept.block        = false;
                accept.negator      = false;
            } else if (thisToken.name == Token.LogicalAnd) {
                if ( ! accept.logicalOp) { throw new ParserException("Got a logical operator (AND), was not expecting one", i); }

                entitiesToPush.push(createEntity(Entity.LogicalAnd));
                flushFunction = true;

                accept.identifier   = true;
                accept.logicalOp    = false;
                accept.funcArgs     = false;
                accept.argSeparator = false;
                accept.block        = true;
                accept.negator      = true;
            } else if (thisToken.name == Token.LogicalOr) {
                if ( ! accept.logicalOp) { throw new ParserException("Got a logical operator (OR), was not expecting one", i); }

                entitiesToPush.push(createEntity(Entity.LogicalOr));
                flushFunction = true;

                accept.identifier   = true;
                accept.logicalOp    = false;
                accept.funcArgs     = false;
                accept.argSeparator = false;
                accept.block        = true;
                accept.negator      = true;
            } else if (thisToken.name == Token.LogicalNot) {
                if ( ! accept.negator) { throw new ParserException("Got a logical operator (NOT), was not expecting one", i); }

                entitiesToPush.push(createEntity(Entity.LogicalNot));
                flushFunction = true;

                accept.identifier   = true;
                accept.logicalOp    = false;
                accept.funcArgs     = false;
                accept.argSeparator = false;
                accept.block        = true;
                accept.negator      = false;
            } else if (thisToken.name == Token.BracketOpen) {
                if ( ! accept.block) { throw new ParserException("Got an opening bracket, was not expecting one", i); }

                openNewBlock = true;
                flushFunction = true;

                accept.identifier   = true;
                accept.logicalOp    = false;
                accept.funcArgs     = false;
                accept.argSeparator = false;
                accept.block        = true;
                accept.negator      = true;
            } else if (thisToken.name == Token.BracketClose) {
                closeBlock = true;
                flushFunction = true;

                accept.identifier   = false;
                accept.logicalOp    = true;
                accept.funcArgs     = false;
                accept.argSeparator = false;
                accept.block        = false;
                accept.negator      = false;
            }

            if (i == tokens.length - 1) {
                flushFunction = true;
            }

            if (flushFunction && currentFunction) {
                entitiesToPush.unshift(currentFunction);
                currentFunction = null;
            }

            if (entitiesToPush.length > 0) {
                for (var a = 0; a < entitiesToPush.length; a++) {
                    currentBlock.sub.push(entitiesToPush[a]);
                }
            }

            if (openNewBlock) {
                var newBlock = createEntity(Entity.Block);
                blockStack.push(newBlock);
                currentBlock.sub.push(newBlock);

                currentBlock = blockStack[blockStack.length - 1];
            }

            if (closeBlock) {
                if (blockStack.length === 1) { throw new ParserException("Can't close the root block.", i); }

                blockStack.pop();
                currentBlock = blockStack[blockStack.length - 1];
            }
        } // End token loop

        if (blockStack.length > 1) { throw new ParserException("All blocks weren't closed."); }

        return rootBlock;
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
})();