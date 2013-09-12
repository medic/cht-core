(function(undefined) {
    var Lexer = function(tokens) {
        this.tokens = tokens;
    };

    Lexer.prototype.tokenize = function(str) {
        str = str.replace(/([^\\])\s+/g, '$1');

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

        // If we're "building" an identifier, store it here until we flush it
        var tempIdentifier = "";

        // When a char is escaped, treat it as an identifier even if it would
        // otherwise be resolved to a different token
        var treatNextAsIdentifier = false;

        // Whether we should flush the identifier we're building
        var flushIdentifier = true;

        // The token or tokens to push after e.g. flushing the identifier
        var tokensToPush = [];

        // Sometimes we'll completely ignore a char, such as with escape symbols
        var ignoreThisChar = false;

        // Loop through the chars
        for (i = 0; i < chars.length; i++) {
            var thisChar = chars[i],
                nextChar = chars[i + 1];

            flushIdentifier = true;
            tokensToPush = [];
            ignoreThisChar = false;

            // This char was escaped;
            // skip the tokens, go straight to the identifier part
            if (treatNextAsIdentifier) {
                treatNextAsIdentifier = false;
            }

            // Escape the next char; ignore this one (because it's an escaping symbol)
            // and don't flush the identifier (as the next char will be added to it).
            else if (thisChar == '\\') {
                treatNextAsIdentifier = true;
                ignoreThisChar = true;
                flushIdentifier = false;
            }

            // General tokens
            else if (thisChar == ',') {
                tokensToPush.push([Token.Comma]);
            } else if (thisChar == ':') {
                tokensToPush.push([Token.Colon]);
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
            }

            // If there is no token to push and we're not ignoring
            // this char, assume we're continuing (or starting) an
            // identifier.
            if (tokensToPush.length === 0 && ! ignoreThisChar) {
                tempIdentifier += thisChar;
                flushIdentifier = false;
            }

            // Make sure we flush the identifier if we still have one
            // going when the string ends.
            if (i == chars.length - 1) {
                flushIdentifier = true;
            }

            // Flushing the identifier means pushing an identifier
            // token with the current "tempIdentifier" as the data
            // and then emptying the temporary identifier.
            if (flushIdentifier && tempIdentifier !== "") {
                tokensToPush.unshift([Token.Identifier, tempIdentifier]);
                tempIdentifier = "";
            }

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
})();