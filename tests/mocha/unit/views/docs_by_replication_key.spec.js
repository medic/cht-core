const assert = require('chai').assert;
const handler = require('../../../../api/handlers/changes');
const views = require('../../../../lib/views');

var normaliseFunction = function(fn) {
  var WHITESPACE_REGEX = /\s+/g;
  var SIGNATURE_REGEX = /emit\(([^\(]*)\)/g;
  return fn.toString()
    .replace(WHITESPACE_REGEX, ' ')
    .replace(SIGNATURE_REGEX, '[ $1 ]');
};

describe('docs_by_replication_key view', () => {

  it('the view implementation is identical to the handler', () => {
    var viewFn = normaliseFunction(views.docs_by_replication_key.map);
    var handlerFn = normaliseFunction(handler._getReplicationKey);
    assert.equal(viewFn, handlerFn);
  });

});
