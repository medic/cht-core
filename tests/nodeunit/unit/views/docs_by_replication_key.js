var views = require('../../../../lib/views'),
    handler = require('../../../../api/handlers/changes');

var normaliseFunction = function(fn) {
  var WHITESPACE_REGEX = /\s+/g;
  var SIGNATURE_REGEX = /emit\(([^\(]*)\)/g;
  return fn.toString()
    .replace(WHITESPACE_REGEX, ' ')
    .replace(SIGNATURE_REGEX, '[ $1 ]');
};

exports['the view implementation is identical to the handler'] = function(test) {
  var viewFn = normaliseFunction(views.docs_by_replication_key.map);
  var handlerFn = normaliseFunction(handler._getReplicationKey);
  test.equals(viewFn, handlerFn);
  test.done();
};
