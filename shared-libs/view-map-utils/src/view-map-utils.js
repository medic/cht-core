'use strict';

const COMMENT_REGEX = /\/\/.*/g;
const SIGNATURE_REGEX = /emit\(/g;
const NEW_LINE_REGEX = /\\n/g;

const viewMapStrings = {};
const viewMapFns = {};

const resetObj = obj => Object.keys(obj).forEach(key => delete obj[key]);

const reset = ddoc => {
  if (ddoc) {
    viewMapStrings[ddoc] = {};
    viewMapFns[ddoc] = {};
    return;
  }

  resetObj(viewMapFns);
  resetObj(viewMapStrings);
};

module.exports = {
  loadViewMaps: (ddoc, ...viewNames) => {
    const ddocId = ddoc._id && ddoc._id.replace('_design/', '');
    reset(ddocId);
    viewNames.forEach(view => {
      viewMapStrings[ddocId][view] = ddoc.views && ddoc.views[view] && ddoc.views[view].map || false;
    });
  },

  getViewMapFn: (ddocId, viewName) => {
    if (viewMapFns[ddocId] && viewMapFns[ddocId][viewName]) {
      return viewMapFns[ddocId][viewName];
    }

    let fnString = viewMapStrings[ddocId] && viewMapStrings[ddocId][viewName];
    if (!fnString) {
      throw new Error('Requested view '+ ddocId + '/' + viewName + ' was not found');
    }

    fnString = fnString
      .replace(NEW_LINE_REGEX, '\n')
      .replace(COMMENT_REGEX, '')
      .replace(SIGNATURE_REGEX, 'this.emit(')
      .trim();

    const fn = new Function('return ' + fnString)();

    //support multiple `emit`s
    const viewMapFn = (...args) => {
      const emitted = [];
      const emit = (key, value = null) => emitted.push({ key, value });

      fn.apply({ emit: emit }, args);
      return emitted;
    };
    viewMapFns[ddocId][viewName] = viewMapFn;
    return viewMapFn;
  },

  //used for testing
  _getViewMapStrings: () => viewMapStrings,
  _getViewMapFns: () => viewMapFns,
  _reset: reset,
};
