'use strict';

const COMMENT_REGEX = /\/\/.*/g;
const SIGNATURE_REGEX = /emit\(/g;
const INDEX_REGEX = /index\(/g;
const NEW_LINE_REGEX = /\\n/g;

const viewMapStrings = {};
const viewMapFns = {};

const nouveauViewMapStrings = {};
const nouveauViewMapFns = {};

const resetObj = obj => {
  for (const key of Object.keys(obj)) {
    delete obj[key];
  }
};

const reset = ddoc => {
  if (ddoc) {
    viewMapStrings[ddoc] = {};
    viewMapFns[ddoc] = {};
    nouveauViewMapStrings[ddoc] = {};
    nouveauViewMapFns[ddoc] = {};
    return;
  }

  resetObj(viewMapFns);
  resetObj(viewMapStrings);
  resetObj(nouveauViewMapFns);
  resetObj(nouveauViewMapStrings);
};

module.exports = {
  loadViewMaps: (ddoc, viewNames = [], nouveauViewNames = []) => {
    const ddocId = ddoc._id && ddoc._id.replaceAll('_design/', '');
    reset(ddocId);
    for (const view of viewNames) {
      viewMapStrings[ddocId][view] = ddoc.views?.[view]?.map || false;
    }
    for (const view of nouveauViewNames) {
      nouveauViewMapStrings[ddocId][view] = ddoc.nouveau?.[view]?.index || false;
    }
  },

  getViewMapFn: (ddocId, viewName) => {
    if (viewMapFns[ddocId] && viewMapFns[ddocId][viewName]) {
      return viewMapFns[ddocId][viewName];
    }

    let fnString = viewMapStrings[ddocId] && viewMapStrings[ddocId][viewName];
    if (!fnString) {
      throw new Error('Requested view ' + ddocId + '/' + viewName + ' was not found');
    }

    fnString = fnString
      .replaceAll(NEW_LINE_REGEX, '\n')
      .replaceAll(COMMENT_REGEX, '')
      .replaceAll(SIGNATURE_REGEX, 'this.emit(')
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

  getNouveauViewMapFn: (ddocId, viewName) => {
    if (nouveauViewMapFns[ddocId]?.[viewName]) {
      return nouveauViewMapFns[ddocId][viewName];
    }

    let fnString = nouveauViewMapStrings[ddocId]?.[viewName];
    if (!fnString) {
      throw new Error('Requested nouveau index ' + ddocId + '/' + viewName + ' was not found');
    }

    fnString = fnString
      .replaceAll(NEW_LINE_REGEX, '\n')
      .replaceAll(COMMENT_REGEX, '')
      .replaceAll(INDEX_REGEX, 'this.index(')
      .trim();

    const fn = new Function('return ' + fnString)();

    //support multiple hits
    const viewMapFn = (...args) => {
      const hits = {};
      const index = (type, key, value) => {
        if (hits[key]) {
          hits[key] = Array.isArray(hits[key]) ? hits[key] : [ hits[key] ];
          hits[key].push(value);
        } else {
          hits[key] = value;
        }
      };

      fn.apply({ index: index }, args);
      return hits;
    };
    nouveauViewMapFns[ddocId][viewName] = viewMapFn;
    return viewMapFn;
  },
};
