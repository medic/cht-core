const assert = require('chai').assert;
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const MAP_ARG_NAME = 'doc';

module.exports.loadView = (ddocName, viewName) => {
  const mapString = fs.readFileSync(path.join(
    __dirname,
    '../../../../../ddocs',
    ddocName,
    'views',
    viewName,
    '/map.js'), 'utf8');

  const mapScript = new vm.Script('(' + mapString + ')(' + MAP_ARG_NAME + ');');

  const emitted = [];
  const emittedValues = [];
  const context = new vm.createContext({
    emitted: emitted,
    emittedValues: emittedValues,
    emit: function(key, value) {
      emitted.push(key);
      emittedValues.push({ key: key, value: value });
    }
  });

  const mapFn = (doc, values = false) => {
    context[MAP_ARG_NAME] = doc;
    mapScript.runInContext(context);
    return values ? context.emittedValues : context.emitted;
  };

  mapFn.reset = () => {
    emitted.splice(0, emitted.length);
    emittedValues.splice(0, emittedValues.length);
  };

  return mapFn;
};

module.exports.assertIncludesPair = (array, pair) => {
  assert.ok(array.find((keyArray) => keyArray[0] === pair[0] && keyArray[1] === pair[1]));
};

module.exports.assertDoesNotIncludePair = (array, pair) => {
  assert.ok(!array.find((keyArray) => keyArray[0] === pair[0] && keyArray[1] === pair[1]));
};
