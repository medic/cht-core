'use strict';

/**
 * Generically accepted pyxform yes/no (truthy) values.
 * Persisting the connection to the source of truth for these constants:
 * https://github.com/XLSForm/pyxform/blob/master/pyxform/constants.py
 */
const TRUTHY_VALUES = new Set([ 'yes', 'true', 'true()' ]);
const FALSY_VALUES = new Set([ 'no', 'false', 'false()' ]);

const parsePyxformBoolean = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (TRUTHY_VALUES.has(normalized)) {
    return true;
  }

  if (FALSY_VALUES.has(normalized)) {
    return false;
  }

  return null;
};

const isPyxformTruthy = (value) => parsePyxformBoolean(value) === true;

module.exports = {
  parsePyxformBoolean,
  isPyxformTruthy,
};
