var views = require('../../../ddocs/compiled.json'),
    handler = require('../../../api/handlers/changes');

var normaliseFunction = function(fn) {
  var WHITESPACE_REGEX = /\s+/g;
  var SIGNATURE_REGEX = /.*function[^\)]*\)/;
  return fn.toString()
    .replace(WHITESPACE_REGEX, ' ')
    .replace(SIGNATURE_REGEX, '');
};

exports['the view implementation is identical to the handler'] = function(test) {
  var viewFn = normaliseFunction(views.docs[0].views.doc_by_place.map);
  var handlerFn = normaliseFunction(handler._extractKeysFromDoc);
  test.equals(viewFn, handlerFn);
  test.done();
};
