const fs = require('fs'),
      path = require('path'),
      assert = require('chai').assert,
      handler = require('../../../../../api/src/controllers/changes');

var normaliseFunction = function(fn) {
  var COMMENT_REGEX = /\/\/.*/g;
  var WHITESPACE_REGEX = /\s+/g;
  var SIGNATURE_REGEX = /emit\(([^\(]*)\)/g;
  return fn.toString()
    .replace(COMMENT_REGEX, '')
    .replace(WHITESPACE_REGEX, ' ')
    .replace(SIGNATURE_REGEX, '[ $1 ]')
    .trim();
};

const getMapFunction = () => {
  return fs.readFileSync(path.join(__dirname, '../../../../src/ddocs/medic/views/docs_by_replication_key/map.js'), 'utf8');
};

describe('docs_by_replication_key view', () => {

  it.skip('the view implementation is identical to the handler', () => {
    var viewFn = normaliseFunction(getMapFunction());
    var handlerFn = normaliseFunction(handler._getReplicationKey);
    assert.equal(viewFn, handlerFn);
  });

});
