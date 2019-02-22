(function(undefined) {
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
})();