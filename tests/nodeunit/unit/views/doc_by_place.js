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

exports['mapping nothing should emit nothing'] = function(test) {
  map({ type:'irrelevant-type' });

  test.deepEqual(emitted, []);

  test.done();
};

exports['should emit the report and parents with depth'] = function(test) {
  map({
    type: 'data_record',
    _id: 'a',
    contact: {
      _id: 'b',
      parent: { _id: 'c', },
    },
    parent: {
      _id: 'd',
      contact: { _id: 'e', },
      parent: { _id: 'f', },
    },
  });

  test.deepEqual(emitted, [
    ['b'],    // access allowed to users with facility_id=b and aren't depth restricted
    ['b', 1], // access allowed to users with facility_id=b and have depth <= 1
    ['c'],    // access allowed to users with facility_id=c and aren't depth restricted
    ['c', 2]  // access allowed to users with facility_id=c and have depth <= 2
  ]);

  test.done();
};

exports['should emit the person and parents with depth'] = function(test) {
  map({
    type: 'person',
    _id: 'a',
    parent: {
      _id: 'b',
      parent: {
        _id: 'c'
      }
    }
  });

  test.deepEqual(emitted, [
    ['a'],    // access allowed to users with facility_id=a and aren't depth restricted
    ['a', 0], // access allowed to users with facility_id=a and have depth=0
    ['b'],    // access allowed to users with facility_id=b and aren't depth restricted
    ['b', 1], // access allowed to users with facility_id=b and have depth<=1
    ['c'],    // access allowed to users with facility_id=c and aren't depth restricted
    ['c', 2]  // access allowed to users with facility_id=c and have depth<=2
  ]);

  test.done();
};
