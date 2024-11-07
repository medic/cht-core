const Entity = require('./entities.js');
const ValidatorFunctions = require('./validator_functions.js');

const validate = async (entities, values, valueKey) => {
  if (entities === null || typeof entities === 'undefined') {
    return true;
  }

  let validationResult = true;
  let logicalOperator = 1; // 1 = AND, 2 = OR
  let negateNext = false;

  // Loop through the entities
  for (const thisEntity of entities) {
    let tempResult = true;
    let useTempResult = false;

    if (thisEntity.type === Entity.LogicalAnd) {
      logicalOperator = 1;
    } else if (thisEntity.type === Entity.LogicalOr) {
      logicalOperator = 2;
    } else if (thisEntity.type === Entity.LogicalNot) {
      negateNext = true;
    } else if (thisEntity.type === Entity.Func) {
      let funcName = thisEntity.funcName.toLowerCase();
      const funcArgs = [];

      // Clone the function arguments so below we don't affect
      // the original arguments in the entity.
      for (const funcArg of thisEntity.funcArgs) {
        funcArgs.push(funcArg);
      }

      if (funcName.substr(0, 5) === 'other') {
        funcName = funcName.substr(5); // Remove the "other" from the start

        // Get the values array key of the "other" value
        const otherValueKey = funcArgs.shift();
        funcArgs.unshift(values[otherValueKey]);
      } else {
        funcArgs.unshift(values[valueKey]);
      }

      funcArgs.unshift(values);

      if (ValidatorFunctions[funcName]) {
        tempResult = await ValidatorFunctions[funcName].apply(this, funcArgs);
      }
      useTempResult = true;
    } else if (thisEntity.type === Entity.Block) {
      tempResult = await validate(thisEntity.sub, values, valueKey);
      useTempResult = true;
    } else if (thisEntity.type === Entity.Ternary) {
      const ternaryCondition = await validate(thisEntity.conditions, values, valueKey);

      if (ternaryCondition) {
        tempResult = await validate(thisEntity.ifThen, values, valueKey);
      } else {
        tempResult = await validate(thisEntity.ifElse, values, valueKey);
      }

      useTempResult = true;
    }

    if (useTempResult) {
      if (negateNext) {
        tempResult = !tempResult;
        negateNext = false;
      }

      if (logicalOperator === 1) {
        validationResult = validationResult && tempResult;
      } else {
        validationResult = validationResult || tempResult;
      }
    }
  }
  return validationResult;
};

module.exports = {
  validate
};
