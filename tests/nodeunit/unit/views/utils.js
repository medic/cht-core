const fs = require('fs'),
	path = require('path');

module.exports.loadMedicClientView = (viewName) => {
  const mapString = fs.readFileSync(path.join(
    __dirname,
    '../../../../ddocs/medic-client/views/',
    viewName,
    '/map.js'), 'utf8');

  var map;
  eval(mapString); // jshint ignore:line

  // Override emit function for use in map function.
  const emitted = [];
  const emit = function(e) { // jshint ignore:line
    emitted.push(e);
  };
  return { map: map, emitted: emitted };
};
