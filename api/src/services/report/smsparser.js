/**
 * @module smsparser
 */
const config = require('../../config');
const mpParser = require('./mp-parser');
const javarosaParser = require('./javarosa-parser');
const textformsParser = require('./textforms-parser');
const logger = require('../../logger');
const moment = require('moment');
const bs = require('bikram-sambat');
const phoneNumberParser = require('@medic/phone-number');

const MUVUKU_REGEX = /^\s*([A-Za-z]?\d)!.+!.+/;
// matches invisible characters that can mess up our parsing
// specifically: u200B, u200C, u200D, uFEFF
const ZERO_WIDTH_UNICODE_CHARACTERS = /[\u200B-\u200D\uFEFF]/g;

// Devanagari
const T_TABLE = {
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9',
};

// TODO ensure everything in here is still needed
const digitReplacer = c => T_TABLE[c];
const standardiseDigits = original => {
  return original && original.toString().replace(/[०-९]/g, digitReplacer);
};

const isMuvukuFormat = (exports.isMuvukuFormat = msg => {
  return typeof msg === 'string' && MUVUKU_REGEX.test(msg);
});

// Escape regex characters, helps to prevent injection issues when accepting
// user input.
const regexEscape = s => {
  if (typeof s !== 'string') {
    return s;
  }
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

const stripInvisibleCharacters = s => {
  if (typeof s !== 'string') {
    return s;
  }
  return s.replace(ZERO_WIDTH_UNICODE_CHARACTERS, '');
};

// Remove the form code from the beginning of the message since it does
// not belong to the TextForms format but is just a convention to
// identify the message.
const stripFormCode = (code, msg) => {
  if (typeof code !== 'string') {
    return msg;
  }
  return msg.replace(
    new RegExp(`^\\s*${regexEscape(code)}[\\s!\\-,:#]*`, 'i'),
    ''
  );
};

// Get parser based on code, the first part of a Muvuku header, which helps us
// know how to parse the data.
const getParser = (exports.getParser = (def, doc) => {
  const code = def && def.meta && def.meta.code;
  let msg = doc.message;
  if (typeof msg !== 'string') {
    return;
  }
  const match = msg.match(MUVUKU_REGEX);
  if (match && match[1]) {
    switch (match[1].toUpperCase()) {
    case '1':
      return mpParser.parse;
    case 'J1':
      return javarosaParser.parse;
    default:
      return;
    }
  }
  msg = stripFormCode(code, msg);
  if (textformsParser.isCompact(def, msg, doc.locale)) {
    return textformsParser.parseCompact;
  } else {
    return textformsParser.parse;
  }
});

// Uses the keys to create a deep key on the obj.
// Assigns the val to the key in the obj.
// If key already exists, only assign value.
//
// @param {Object} obj - object in which value is assigned to key
// @param {Array} keys - keys in dot notation (e.g. ['some','thing','else'])
// @param {String} val - value to be assigned to the generated key
const createDeepKey = (obj, keys, val) => {
  if (keys.length === 0) {
    return;
  }

  const key = keys.shift();
  if (keys.length === 0) {
    obj[key] = val;
    return;
  }

  if (!obj[key]) {
    obj[key] = {};
  }
  createDeepKey(obj[key], keys, val);
};

const parseNum = raw => {
  if (raw === void 0) {
    return;
  }
  const std = standardiseDigits(raw);
  if (!isFinite(std) || std === '') {
    return null;
  }
  return Number(std);
};

const bsToEpoch = (bsYear, bsMonth, bsDay) => {
  try {
    const gregDate = bs.toGreg_text(bsYear, bsMonth, bsDay);
    return moment(gregDate).valueOf();
  } catch (exception) {
    logger.error('The provided date could not be converted: %o.', exception);
    return null;//should be caught by validation in registration
  }
};

const getFieldByType = (def, type) => {
  if (!def || !def.fields) {
    return;
  }
  return Object
    .keys(def.fields)
    .find(k => def.fields[k] && def.fields[k].type === type);
};

const lower = str => (str && str.toLowerCase ? str.toLowerCase() : str);

const fieldParsers = {
  integer: (raw, field) => {
    // store list value since it has more meaning.
    // TODO we don't have locale data inside this function so calling
    // translate does not resolve locale.
    const cleaned = stripInvisibleCharacters(String(raw));
    if (field.list) {
      const item = field.list.find(item => String(item[0]) === cleaned);
      if (!item) {
        logger.warn(
          `Option not available for ${JSON.stringify(raw)} in list.`
        );
        return null;
      }
      return config.translate(item[1]);
    }
    return parseNum(cleaned);
  },
  string: (raw, field, key) => {
    if (field.list) {
      const cleaned = stripInvisibleCharacters(raw);
      for (const i of field.list) {
        const item = field.list[i];
        if (item[0] === cleaned) {
          return item[1];
        }
      }
      logger.warn(`Option not available for ${raw} in list.`);
    } else if (key === 'patient_id' || key === 'place_id') {
      // special handling for string IDs which must be [0-9]
      return stripInvisibleCharacters(raw);
    }
    return raw;
  },
  date: (raw) => {
    // YYYY-MM-DD assume muvuku format for now
    // store in milliseconds since Epoch
    return moment(stripInvisibleCharacters(raw)).valueOf();
  },
  bsDate: (raw) => {
    const cleaned = stripInvisibleCharacters(raw);
    const separator = cleaned[cleaned.search(/[^0-9]/)];//non-numeric character
    const dateParts = cleaned.split(separator);
    return bsToEpoch(...dateParts);
  },
  boolean: (raw) => {
    const val = parseNum(stripInvisibleCharacters(raw));
    if (val === 1) {
      return true;
    }
    if (val === 0) {
      return false;
    }
    // if we can't parse a number then return null
    return null;
  },
  month: (raw) => {
    // keep months integers, not their list value.
    return parseNum(stripInvisibleCharacters(raw));
  },
  phone_number: (raw) => {
    const formattedAndValidatedPhone = phoneNumberParser.format(config.getAll(), raw);
    if (formattedAndValidatedPhone) {
      return formattedAndValidatedPhone;
    } else {
      logger.error(`The provided phone number ${raw} is invalid`);
      return null;
    }
  }
};

//selects parser by field type and parses and validates the given data.
exports.parseField = (field, raw, key) => {
  const parser = fieldParsers[field.type];
  if (!parser) {
    logger.warn(`Unknown field type: ${field.type}`);
    return raw;
  }
  if (raw === undefined) {
    return;
  }
  if (raw === '') {
    return null;
  }
  return parser(raw, field, key);
};

/**
 * @param {Object} def - form definition
 * @param {Object} doc - sms_message document
 * @returns {Object} - A parsed object of the sms message or an empty
 * object if parsing fails. Currently supports textforms and muvuku formatted
 * messages.
 */
exports.parse = (def, doc) => {
  let msgData;
  const formData = {};
  let addOmittedFields = false;
  const aggregateBSDateField = getFieldByType(def, 'bsAggreDate');
  if (!def || !doc || !doc.message || !def.fields) {
    return {};
  }

  const parser = getParser(def, doc);

  if (!parser) {
    logger.error('Failed to find message parser.');
    return {};
  }

  if (isMuvukuFormat(doc.message)) {
    msgData = parser(def, doc);
    addOmittedFields = true;
  } else {
    const code = def && def.meta && def.meta.code;
    const msg = stripFormCode(code, doc.message || doc);
    if (textformsParser.isCompact(def, msg, doc.locale)) {
      msgData = parser(def, msg);
    } else {
      msgData = parser(msg);
      // replace tiny labels with field keys for textforms
      for (const j of Object.keys(def.fields)) {
        const label = lower(
          config.translate(def.fields[j].labels.tiny, doc.locale)
        );
        if (j !== label && msgData[label]) {
          msgData[j] = msgData[label];
          msgData[label] = undefined;
        }
      }
    }
  }

  // parse field types and resolve dot notation keys
  for (const k of Object.keys(def.fields)) {
    if (msgData[k] || addOmittedFields) {
      const value = exports.parseField(def.fields[k], msgData[k], k);
      createDeepKey(formData, k.split('.'), value);
    }
  }

  if (aggregateBSDateField) {
    let bsYear;
    let bsMonth = 1;
    let bsDay = 1;
    for (const k of Object.keys(def.fields)) {
      switch (def.fields[k].type) {
      case 'bsYear':
        bsYear = msgData[k];
        break;
      case 'bsMonth':
        bsMonth = msgData[k];
        break;
      case 'bsDay':
        bsDay = msgData[k];
        break;
      }
    }

    if (bsYear) {
      formData[aggregateBSDateField] = bsToEpoch(bsYear, bsMonth, bsDay);
    } else {
      logger.error('Can not aggregate bsAggreDate without bsYear');
    }
  }

  // pass along some system generated fields
  if (msgData._extra_fields === true) {
    formData._extra_fields = true;
  }

  return formData;
};

/**
 * @param {Object} def - forms form definition
 * @param {Object} doc - sms_message document
 * @returns {Array} - An array of values from the raw sms message
 */
exports.parseArray = (def, doc) => {
  const parser = getParser(def, doc);
  const obj = parser(def, doc);

  if (!def || !def.fields) {
    return [];
  }

  // collect field keys into array
  const arr = Object.keys(def.fields).map(k => obj[k]);

  // The fields sent_timestamp and from are set by the gateway, so they are
  // not included in the raw sms message and added manually.
  arr.unshift(doc.from);
  arr.unshift(doc.sent_timestamp);

  return arr;
};

/**
 * Determine form code through message headers, currently supporting muvuku and
 * textforms message formats.
 *
 * @param {String} msg - sms message
 * @returns {String} uppercased form code or undefined if we can't parse it
 */
exports.getFormCode = msg => {
  if (typeof msg !== 'string') {
    return;
  }

  // muvuku
  if (msg.split('!').length >= 3) {
    return msg.split('!')[1].toUpperCase();
  }
  // textforms
  const match = msg.match(/^\s*([^\s!\-,:#]+)[\s!\-,:#]*.*/);
  if (match !== null && match.length === 2) {
    return match[1].toUpperCase();
  }
};

/**
 * Merge fields from the form definition with the form data received through
 * the SMS into a data record. Always use the key property on the form
 * definition to define the data record.
 *
 * @param {String} form         - form id
 * @param {Array}  key          - key of the field separated by '.'
 * @param {Object} data_record  - record into which the data is merged
 * @param {Object} formData     - data from the SMS
 *                                to be merged into the data record
 */
exports.merge = (form, key, data_record, formData) => {
  // support creating subobjects on the record if form defines key with dot
  // notation.
  if (key.length > 1) {
    const tmp = key.shift();
    if (formData[tmp]) {
      if (!data_record[tmp]) {
        data_record[tmp] = {};
      }
      exports.merge(form, key, data_record[tmp], formData[tmp]);
    }
  } else {
    data_record[key[0]] = formData[key[0]];
  }
};
