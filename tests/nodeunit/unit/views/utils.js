const fs = require('fs'),
	path = require('path');

module.exports.loadMedicClientView = (viewName) => {
  const mapString = fs.readFileSync(path.join(
    __dirname,
    '../../../../ddocs/medic-client/views/',
    viewName,
    '/map.js'), 'utf8');

  var map;
  eval(mapString);

  // Override emit function for use in map function.
  const emitted = [];
  const emit = function(e) {
    emitted.push(e);
  };
  return { map: map, emitted: emitted };
};
