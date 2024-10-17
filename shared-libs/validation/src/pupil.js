const validator_functions = require('./validator_functions.js');
const validation_result = require('./validation_result.js');

const lexer = require('./lexer.js');
const parser = require('./parser.js');
const validator = require('./validator.js');

const ruleCache = {};

const addFunction = function(name, callable) {
  validator_functions[name.toLowerCase()] = callable;
};

const validate = function(rules, values) {
  const results = {};

  // Start by defaulting all given values' validation results to "passing"
  Object.keys(values).forEach((key) => {
    results[key] = true;
  });

  // And then run the rules
  Object.keys(rules).forEach((index) => {
    if (typeof values[index] === 'undefined' || values[index] === null) {
      values[index] = '';
    }

    const rule = rules[index];
    let tokens;
    let entities;

    if (ruleCache[rule]) {
      entities = ruleCache[rule];
    } else {
      tokens = lexer.tokenize(rule);
      entities = parser.parse(tokens);

      ruleCache[rule] = entities;
    }

    results[index] = validator.validate(entities, values, index);
  });

  return validation_result.create(results);
};


module.exports = {
  addFunction,
  lexer,
  parser,
  validate
};
