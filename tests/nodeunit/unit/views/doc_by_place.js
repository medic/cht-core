var fs = require('fs'),
    map = loadFunctionFromFile('../../../../ddocs/medic-client/views/doc_by_place/map.js');

function loadFunctionFromFile(path) {
  return eval('(' + // jshint ignore:line
      fs.readFileSync(__dirname + '/' + path, { encoding:'utf-8' }) +
      ')');
}

var emitted = [];
emit = function(e) {
  emitted.push(e);
};

exports.setUp = function(done) {
  emitted = [];
  done();
};

exports['migrating nothing should emit nothing'] = function(test) {
  map({ type:'irrelevant-type' });

  test.deepEqual(emitted, []);

  test.done();
};

exports['should return parent of a report, but not higher in the hierarchy'] = function(test) {
  map({
    type: 'data_record',
    _id: 'no-1',
    contact: {
      _id: 'expected-1',
      parent: { _id: 'no-3', },
    },
    parent: {
      _id: 'no-4',
      contact: { _id: 'no-5', },
      parent: { _id: 'no-6', },
    },
  });

  test.deepEqual(emitted, [ ['expected-1'] ]);

  test.done();
};
