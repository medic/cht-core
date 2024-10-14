const Token = require('./tokens.js');
const Entity = require('./entities.js');

const createEntity = (type) => {
  return {
    type,

    // Used for "Block" type entities
    sub: [],

    // Used for "Func" (Function) type entities
    funcName: '',
    funcArgs: [],

    // Used for "Ternary" type entities
    conditions: [],
    ifThen: null,
    ifElse: null
  };
};

const ParserException = function(message, pos) {
  this.message = message;
  this.pos = pos;
};

const parse = (tokens) => {

  const rootBlock = createEntity(Entity.Block);
  const blockStack = [rootBlock];

  let currentBlock = blockStack[blockStack.length - 1];
  let currentFunction = null;
  let flushFunction = true;

  const accept = {
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

  const expectOneOf = function(oneOf) {
    // First reset the tokens we'll accept
    Object.keys(accept).forEach((key) => {
      accept[key] = 0;
    });

    // And accept the tokens listed as our argument array
    for (const token of oneOf) {
      if (typeof accept[token] !== 'undefined') {
        accept[token] = 1;
      }
    }
  };

  expectOneOf(['identifier', 'negator', 'blockStart']);

// NOSONAR_BEGIN
  for (let i = 0; i < tokens.length; i++) {
    const thisToken = tokens[i];
    const entitiesToPush = [];
    let openBlock = false;
    let closeBlock = false;
    let closeTernary = false;

    // Arguments for an already created function
    if (thisToken.name === Token.String || thisToken.name === Token.Number) {
      if (!accept.string) {
        throw new ParserException('Unexpected string', i);
      }
      if (!accept.number) {
        throw new ParserException('Unexpected number', i);
      }

      flushFunction = false;
      
      // String arguments
      if (thisToken.name === Token.String) {
        currentFunction.funcArgs.push(thisToken.data.toString());

      // Number arguments
      } else {
        currentFunction.funcArgs.push(parseFloat(thisToken.data, 10));
      }

      expectOneOf(['argSeparator', 'funcArgsEnd']);

    // A new function
    } else if (thisToken.name === Token.Identifier) {
      if (!accept.identifier) {
        throw new ParserException('Unexpected identifier', i);
      }

      flushFunction = false;

      currentFunction = createEntity(Entity.Func);
      currentFunction.funcName = thisToken.data;

      expectOneOf(['logicalOp', 'funcArgsStart', 'blockEnd', 'ternaryThen', 'ternaryElse']);

    // Ternary "then"/start
    } else if (thisToken.name === Token.QuestionMark) {
      if (!accept.ternaryThen) {
        throw new ParserException('Unexpected ternary \'then\'');
      }

      // Start a new block that's a ternary
      const newTernary = createEntity(Entity.Ternary);
      newTernary.conditions = currentBlock.sub;

      // Make sure the ternary's conditions aren't evaluated outside the ternary
      currentBlock.sub = [newTernary];

      // Change the current block to the new ternary
      blockStack.push(newTernary);
      currentBlock = blockStack[blockStack.length - 1];

      expectOneOf(['identifier', 'blockStart', 'negator']);

    // Ternary "else"
    } else if (thisToken.name === Token.Colon) {
      if (!accept.ternaryElse) {
        throw new ParserException('Unexpected ternary \'else\'');
      }

      currentBlock.ifThen = currentBlock.sub;
      currentBlock.sub = [];

      expectOneOf(['identifier', 'blockStart', 'negator']);

    // Function argument separator
    } else if (thisToken.name === Token.Comma) {
      if (!accept.argSeparator) {
        throw new ParserException('Unexpected function argument separator', i);
      }

      flushFunction = false;

      expectOneOf(['string', 'number', 'funcArgsEnd']);

    // Logical AND
    } else if (thisToken.name === Token.LogicalAnd) {
      if (!accept.logicalOp) {
        throw new ParserException('Unexpected logical AND', i);
      }

      entitiesToPush.push(createEntity(Entity.LogicalAnd));
      flushFunction = true;

      expectOneOf(['identifier', 'negator', 'blockStart']);

    // Logical OR
    } else if (thisToken.name === Token.LogicalOr) {
      if (!accept.logicalOp) {
        throw new ParserException('Unexpected logical OR', i);
      }

      entitiesToPush.push(createEntity(Entity.LogicalOr));
      flushFunction = true;

      expectOneOf(['identifier', 'blockStart', 'negator']);

    // Logical NOT (negator)
    } else if (thisToken.name === Token.LogicalNot) {
      if (!accept.negator) {
        throw new ParserException('Unexpected logical NOT', i);
      }

      entitiesToPush.push(createEntity(Entity.LogicalNot));

      expectOneOf(['identifier', 'blockStart']);

    // Bracket open: function arguments start or a block start
    } else if (thisToken.name === Token.BracketOpen) {
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
        throw new ParserException('Unexpected opening bracket', i);
      }

    // Bracket close: function arguments end or a block end
    } else if (thisToken.name === Token.BracketClose) {
      // End arguments for a function
      if (currentFunction && accept.funcArgsEnd) {
        flushFunction = true;

        expectOneOf(['logicalOp', 'blockEnd', 'ternaryThen', 'ternaryElse']);
      // Or close a block
      } else if (accept.blockEnd) {
        closeBlock = true;
        flushFunction = true;

        expectOneOf(['logicalOp', 'blockEnd', 'ternaryThen', 'ternaryElse']);
      } else {
        throw new ParserException('Unexpected closing bracket', i);
      }
    }

    if (i === tokens.length - 1) {
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
      for (const entity of entitiesToPush) {
        currentBlock.sub.push(entity);
      }
    }

    if (openBlock) {
      const newBlock = createEntity(Entity.Block);
      blockStack.push(newBlock);
      currentBlock.sub.push(newBlock);

      currentBlock = blockStack[blockStack.length - 1];
    }

    // Close ternaries along with blocks when blocks would normally be
    // closed as there is not a symbol for closing ternaries specifically.
    // Flush the outstanding sub-entities to the ternary's "then" or "else" properties.
    if ((closeTernary || closeBlock) && currentBlock.type === Entity.Ternary) {

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
      if (blockStack.length === 1) {
        throw new ParserException('Can\'t close the root block.', i);
      }

      blockStack.pop();
      currentBlock = blockStack[blockStack.length - 1];
    }
  } // End token loop
// NOSONAR_END

  if (blockStack.length > 1) {
    throw new ParserException('All blocks weren\'t closed.');
  }

  return [rootBlock];
};


module.exports = {
  parse
};
