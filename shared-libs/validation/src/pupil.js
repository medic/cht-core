const lexer = require('./lexer.js');
const parser = require('./parser.js');
const validator = require('./validator.js');

const ruleCache = {};

const getEntities = (rule) => {
  if (!ruleCache[rule]) {
    const tokens = lexer.tokenize(rule);
    const entities = parser.parse(tokens);
    ruleCache[rule] = entities;
  }
  return ruleCache[rule];
};

const validate = async function(validations, values) {
  const results = [];

  for (const validation of validations) {
    const key = validation.property;
    if (typeof values[key] === 'undefined' || values[key] === null) {
      values[key] = '';
    }

    const rule = validation.rule;
    const entities = getEntities(rule);
    const valid = await validator.validate(entities, values, key);
    results.push({ valid, validation });
  }

  return results;
};


module.exports = {
  validate
};
