const tokens = require('./tokens.js');

const tokenize = (str) => {
  const chars = str.split('');
  const resultTokens = [];
  let i;

  const Token = tokens; // A shorthand

  const pushToken = (name, data) => {
    resultTokens.push({
      name: name,
      data: data || null
    });
  };

  const whiteSpaceRegex = /^\s+$/;

  // If we're "building" an identifier, store it here until we flush it
  let tempIdentifier = '';

  // Keep building the identifier?
  let appendToTempIdentifier = false;

  // When a char is escaped, treat it as an identifier even if it would
  // otherwise be resolved to a different token
  let treatNextAsIdentifier = false;

  // The token or tokens to push at the end of the loop
  // after e.g. flushing the identifier
  let tokensToPush = [];

  // Sometimes we'll completely ignore a char, such as with escape symbols
  let ignoreThisChar = false;

  // Are we in a string?
  let inString = false;
  let stringStartChar = null;

  // Loop through the chars
  for (i = 0; i < chars.length; i++) {
    const thisChar = chars[i];
    const nextChar = chars[i + 1];

    // If we should start or end a string at the end of this loop
    let startString = false;
    let endString = false;

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
    } else if (thisChar === '"' || thisChar === '\'') {
      startString = true;

    // Escape the next char; ignore this one (because it's an escaping symbol)
    // and don't flush the identifier (as the next char will be added to it).
    } else if (thisChar === '\\') {
      treatNextAsIdentifier = true;
      ignoreThisChar = true;

    // General tokens
    } else if (thisChar === ',') {
      tokensToPush.push([Token.Comma]);
    } else if (thisChar === ':') {
      tokensToPush.push([Token.Colon]);
    } else if (thisChar === '?') {
      tokensToPush.push([Token.QuestionMark]);
    } else if (thisChar === '&' && nextChar === '&') {
      tokensToPush.push([Token.LogicalAnd]);
      i++;
    } else if (thisChar === '|' && nextChar === '|') {
      tokensToPush.push([Token.LogicalOr]);
      i++;
    } else if (thisChar === '!') {
      tokensToPush.push([Token.LogicalNot]);
    } else if (thisChar === '(') {
      tokensToPush.push([Token.BracketOpen]);
    } else if (thisChar === ')') {
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
    if (i === chars.length - 1) {
      appendToTempIdentifier = false;
    }

    // Flushing the identifier means pushing an identifier
    // token with the current "tempIdentifier" as the data
    // and then emptying the temporary identifier.
    // 
    // The identifier can be pushed as a string, a number or an identifier.
    if (!appendToTempIdentifier && !ignoreThisChar && tempIdentifier !== '') {
      if (inString) {
        tokensToPush.unshift([Token.String, tempIdentifier]);
      } else if ( ! isNaN(parseFloat(tempIdentifier, 10)) && isFinite(tempIdentifier)) {
        tokensToPush.unshift([Token.Number, tempIdentifier]);
      } else {
        tokensToPush.unshift([Token.Identifier, tempIdentifier]);
      }

      tempIdentifier = '';
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
      for (const token of tokensToPush) {
        pushToken(token[0], token[1]);
      }
    }
  } // End the char loop

  return resultTokens;
};

module.exports = {
  tokenize
};
