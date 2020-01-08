'use strict';

let viewMapStrings = {};
let viewMapFns = {};

//ensure V8 optimization
const argumentsToArray = function () {
  const args = [];
  for (let i = this && this.skip || 0; i < arguments.length; i++) {
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
    const ddocId = ddoc._id && ddoc._id.replace('_design/', '');
    module.exports.reset(ddocId);
    const viewNames = argumentsToArray.apply({ skip: 1 }, arguments);
    viewNames.forEach(function(view) {
      viewMapStrings[ddocId][view] = ddoc.views && ddoc.views[view] && ddoc.views[view].map || false;
    });
  },

  getViewMapFn: function (ddocId, viewName) {
    const COMMENT_REGEX = /\/\/.*/g;
    const SIGNATURE_REGEX = /emit\(/g;
    const NEW_LINE_REGEX = /\\n/g;

    if (viewMapFns[ddocId] && viewMapFns[ddocId][viewName]) {
      return viewMapFns[ddocId][viewName];
    }

    let fnString = module.exports.getViewMapString(ddocId, viewName);
    if (!fnString) {
      throw new Error('Requested view '+ ddocId + '/' + viewName + ' was not found');
    }

    fnString = fnString
      .replace(NEW_LINE_REGEX, '\n')
      .replace(COMMENT_REGEX, '')
      .replace(SIGNATURE_REGEX, 'this.emit(')
      .trim();

    const fn = new Function('return ' + fnString)(); // jshint ignore:line

    //support multiple `emit`s
    const viewMapFn = function() {
      const emitted = [];
      const emit = function() {
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
