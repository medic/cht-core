const tokens = {};

const addToken = (name) => {
  tokens[name] = {
    name,
    toString: () => name
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

module.exports = tokens;
