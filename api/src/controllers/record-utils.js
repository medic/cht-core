const _ = require('underscore'),
      moment = require('moment'),
      phoneNumber = require('phone-number'),
      config = require('../config'),
      smsparser = require('../services/report/smsparser'),
      validate = require('../services/report/validate'),
      PublicError = require('../public-error'),
      DATE_NUMBER_STRING = /(\d{13,})/;

const empty = val => {
  return val === '' ||
         val === null ||
         val === undefined;
};

/**
 * Determine locale/language of a record based on a locale value:
 *  - Set on the document
 *  - Reported in a form field named `locale`
 *  - Configured in the gateway and set on message post
 *  - Configured in the settings
 *  - Defaults to 'en'
 */
const getLocale = record => {
  return record.locale ||
         (record.fields && record.fields.locale) ||
         (record.sms_message && record.sms_message.locale) ||
         config.get('locale') ||
         'en';
};

/*
 * Append error to data record if it doesn't already exist. we don't need
 * redundant errors. Error objects should always have a code and message
 * attributes.
 *
 * @param {Object} record - data record
 * @param {String|Object} error - error object or code matching key in messages
 *
 * @returns undefined
 */
const addError = (record, error) => {
  if (!record || !error) {
    return;
  }

  if (_.isString(error)) {
    error = {
      code: error,
      message: ''
    };
  }

  if (!!_.findWhere(record.errors, { code: error.code })) {
    return;
  }

  const form = record.form && record.sms_message && record.sms_message.form;

  if (!error.message) {
    error.message = config.translate(error.code, getLocale(record));
  }

  // replace placeholder strings
  error.message = error.message
    .replace('{{fields}}', error.fields && error.fields.join(', '))
    .replace('{{form}}', form);

  if (!record.errors) {
    record.errors = [];
  }
  record.errors.push(error);
};

/*
 * Try to parse sent_timestamp field and use it for reported_date.
 * Particularly useful when re-importing data from gateway to
 * maintain accurate reported_date field.
 *
 * return unix timestamp integer or undefined
 */
const parseSentTimestamp = str => {
  if (typeof str === 'number') {
    str = String(str);
  } else if (typeof str !== 'string') {
    return;
  }

  const match = str.match(DATE_NUMBER_STRING);
  if (match) {
    const ret = new Date(Number(match[1]));
    return ret.valueOf();
  }

  // otherwise leave it up to moment lib
  return moment(str).valueOf();
};

/**
 * @param {String} form - form code
 * @param {Object} form_data - parsed form data
 * @returns {String} - Reporting Unit ID value (case insensitive)
 */
const getRefID = (form, form_data) => {
  const forms = config.get('forms');
  const def = forms && forms[form];
  if (!def || !def.facility_reference) {
    return;
  }
  const val = form_data && form_data[def.facility_reference];
  if (val && typeof val.toUpperCase === 'function') {
    return val.toUpperCase();
  }
  return val;
};

/**
 * @param {Object} formData - parsed form data
 * @param {Object} options from initial POST
 * @returns {Object} - data record
 * @api private
 */
const getDataRecord = (formData, options) => {

  const form = options.form,
        def = getForm(options.form);

  const record = {
    type: 'data_record',
    from: phoneNumber.normalize(config.get(), options.from) || options.from,
    form: form,
    errors: [],
    tasks: [],
    fields: {},
    reported_date: new Date().valueOf(),
    // keep POST data part of record
    sms_message: options
  };

  // try to parse timestamp from gateway
  const ts = parseSentTimestamp(options.sent_timestamp);
  if (ts) {
    record.reported_date = ts;
  }

  if (def) {
    if (def.facility_reference) {
      record.refid = getRefID(form, formData);
    }
    for (let k of Object.keys(def.fields)) {
      smsparser.merge(form, k.split('.'), record.fields, formData);
    }
    var errors = validate.validate(def, formData);
    errors.forEach(function(err) {
      addError(record, err);
    });
  }

  if (formData && formData._extra_fields) {
    addError(record, 'extra_fields');
  }

  if (!def || !def.public_form) {
    addError(record, 'sys.facility_not_found');
  }

  if (typeof options.message === 'string' && !options.message.trim()) {
    addError(record, 'sys.empty');
  }

  if (!def) {
    if (config.get('forms_only_mode')) {
      addError(record, 'sys.form_not_found');
    } else {
      // if form is undefined we treat as a regular message
      record.form = undefined;
    }
  }

  return record;
};

const getForm = code => {
  const forms = config.get('forms');
  return forms && forms[code];
};

const createByForm = (data, { locale }={}) => {
  // We're OK with from being empty - sometimes weird things happen with SMS
  if (data.from === undefined) {
    throw new PublicError('Missing required value: from');
  }

  // We're OK with message being empty, but the field should exist
  if (data.message === undefined) {
    throw new PublicError('Missing required field: message');
  }

  const content = {
    type: 'sms_message',
    message: data.message,
    form: smsparser.getFormCode(data.message),
    sent_timestamp: data.sent_timestamp,
    locale: data.locale || locale,
    from: data.from,
    gateway_ref: data.gateway_ref,
  };
  const formDefinition = getForm(content.form);
  let formData;
  if (content.form && formDefinition) {
    formData = smsparser.parse(formDefinition, data);
  }
  return getDataRecord(formData, content);
};

const createRecordByJSON = data => {
  const required = ['from', 'form'],
        optional = ['reported_date', 'locale'];
  // check required fields are in _meta property
  if (empty(data._meta)) {
    throw new PublicError('Missing _meta property.');
  }
  for (let k of required) {
    if (empty(data._meta[k])) {
      throw new PublicError('Missing required field: ' + k);
    }
  }
  // filter out any unwanted fields
  data._meta = _.pick(data._meta, required.concat(optional));
  // no need to pass the content type as nano.request defaults to json.
  // request({ body: data }, callback);

  const options = {
    locale: data._meta.locale,
    sent_timestamp: data._meta.reported_date,
    form: smsparser.getFormCode(data._meta.form),
    from: data._meta.from
  };

  const formDefinition = getForm(options.form);

  // require form definition
  if (!formDefinition) {
    throw new PublicError('Form not found: ' + options.form);
  }

  const formData = {};

  // For now only save string and number fields, ignore the others.
  // Lowercase all property names.
  for (var k in data) {
    if (['string', 'number'].indexOf(typeof data[k]) >= 0) {
      formData[k.toLowerCase()] = data[k];
    }
  }  

  return getDataRecord(formData, options);
};

module.exports = {
  createRecordByJSON: createRecordByJSON,
  createByForm: createByForm
};
