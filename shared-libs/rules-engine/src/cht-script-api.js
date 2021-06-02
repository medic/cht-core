/**
 * @module cht-script-api
 * Builds an api with access functions and utils for CHT scripts such as
 * targets, tasks, contact summary etc.
 */

const _ = require('lodash');


const buildApi = (dataSet, deprecatedDataSet) => {
  const generatedGets = generateGetFunctions(dataSet, deprecatedDataSet);

  const v1 = {
    // Add here explicit functions.
  };

  return {
    v1: Object.assign({}, v1, generatedGets)
  };
};


const generateGetFunctions = (dataSet, deprecatedDataSet) => {
  const gets = {};
  const action = 'get';

  Object
    .keys(dataSet)
    .forEach(subject => {
      const functionName = formatFunctionName(action, subject);
      
      gets[functionName] = () => {
        const deprecationMsg = getDeprecationMessage(action, subject, deprecatedDataSet);

        if (deprecationMsg) {
          // eslint-disable-next-line no-console
          console.warn(deprecationMsg);
        }

        return Object.assign({}, dataSet[subject]);
      };
    });

  return gets;
};

const getDeprecationMessage = (action, subject, deprecatedDataSet) => {
  const deprecation = deprecatedDataSet[subject];

  if (!deprecation) {
    return;
  }

  const deprecatedName = formatFunctionName(action, subject);
  const replacementName = formatFunctionName(action, deprecation.replacement);

  return `"${deprecatedName}" is deprecated.${deprecation.replacement? ` Please use "${replacementName}" instead.`:''}`;
};

const formatFunctionName = (action, subject) => {
  return _.camelCase(`${action} ${subject}`);
};

module.exports = {
  buildApi
};
