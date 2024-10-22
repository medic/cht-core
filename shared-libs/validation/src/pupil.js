const validation_result = require('./validation_result.js');
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

const validate = async function(rules, values) {
  const results = {};

  // Start by defaulting all given values' validation results to "passing"
  Object.keys(values).forEach((key) => {
    results[key] = true;
  });

  // And then run the rules
  const keys = Object.keys(rules);
  for (const key of keys) {
    if (typeof values[key] === 'undefined' || values[key] === null) {
      values[key] = '';
    }

    const rule = rules[key];
    const entities = getEntities(rule);
    results[key] = await validator.validate(entities, values, key);
  }

  return validation_result.create(results);
};


module.exports = {
  lexer, // TODO probably don't need to export
  parser, // TODO probably don't need to export
  validate
};
