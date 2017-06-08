const fs = require('fs'),
	path = require('path'),
  vm = require('vm');

const MAP_ARG_NAME = 'doc';

module.exports.loadMedicClientView = (viewName) => {
  const mapString = fs.readFileSync(path.join(
    __dirname,
    '../../../../ddocs/medic-client/views/',
    viewName,
    '/map.js'), 'utf8');

  const mapScript = new vm.Script('(' + mapString + ')(' + MAP_ARG_NAME + ');');

  const emitted = [];
  const context = new vm.createContext({
    emitted: emitted,
    emit: function(e) {
      emitted.push(e);
    }
  });

  return (doc) => {
    context[MAP_ARG_NAME] = doc;
    mapScript.runInContext(context);
    return context.emitted;
  };
};

module.exports.assertIncludesPair = (test, array, pair) => {
  test.ok(array.find((keyArray) => keyArray[0] === pair[0] && keyArray[1] === pair[1]));
};

module.exports.assertDoesNotIncludePair = (test, array, pair) => {
  test.ok(!array.find((keyArray) => keyArray[0] === pair[0] && keyArray[1] === pair[1]));
};
