'use strict';

var viewMapStrings = {},
    viewMapFns = {};

//ensure V8 optimization
var argumentsToArray = function () {
  var args = [];
  for (var i = this && this.skip || 0; i < arguments.length; i++) {
    args.push(arguments[i]);
  }
  return args;
};

module.exports = {
  reset: function (ddoc) {
    if (ddoc) {
      viewMapStrings[ddoc] = {};
      viewMapFns[ddoc] = {};
      return;
    }

    viewMapStrings = {};
    viewMapFns = {};
  },

  loadViewMaps: function (ddoc) {
    var ddocId = ddoc._id && ddoc._id.replace('_design/', '');
    module.exports.reset(ddocId);
    var viewNames = argumentsToArray.apply({ skip: 1 }, arguments);
    viewNames.forEach(function(view) {
      viewMapStrings[ddocId][view] = ddoc.views && ddoc.views[view] && ddoc.views[view].map || false;
    });
  },

  getViewMapFn: function (ddocId, viewName) {
    var COMMENT_REGEX = /\/\/.*/g,
        SIGNATURE_REGEX = /emit\(/g,
        NEW_LINE_REGEX = /\\n/g;

    if (viewMapFns[ddocId] && viewMapFns[ddocId][viewName]) {
      return viewMapFns[ddocId][viewName];
    }

    var fnString = module.exports.getViewMapString(ddocId, viewName);
    if (!fnString) {
      throw new Error('Requested view '+ ddocId + '/' + viewName + ' was not found');
    }

    fnString = fnString
      .replace(NEW_LINE_REGEX, '\n')
      .replace(COMMENT_REGEX, '')
      .replace(SIGNATURE_REGEX, 'this.emit(')
      .trim();

    var fn = new Function('return ' + fnString)(); // jshint ignore:line

    //support multiple `emit`s
    var viewMapFn = function() {
      var emitted = [];
      var emit = function() {
        return emitted.push(argumentsToArray.apply(null, arguments));
      };
      fn.apply({ emit: emit }, arguments);
      return emitted;
    };
    viewMapFns[ddocId][viewName] = viewMapFn;
    return viewMapFn;
  },

  getViewMapString: function (ddocId, viewName) {
    return viewMapStrings[ddocId] && viewMapStrings[ddocId][viewName];
  },

  //used for testing
  _getViewMapStrings: function() {
    return viewMapStrings;
  },
  _getViewMapFns: function() {
    return viewMapFns;
  }
};
