const moment = require('moment');
const phoneNumber = require('@medic/phone-number');
const config = require('../config');
const smsparser = require('./report/smsparser');
const validate = require('./report/validate');
const PublicError = require('../public-error');
const DATE_NUMBER_STRING = /(\d{13,})/;

// matches invisible characters that can mess up our parsing
// specifically: u200B, u200C, u200D, uFEFF
const ZERO_WIDTH_UNICODE_CHARACTERS = /[\u200B-\u200D\uFEFF]/g;

const empty = val => {
  return val === '' ||
         val === null ||
         val === undefined;
};

// Determine locale/language of a record based on a locale value:
//  - Set on the document
//  - Reported in a form field named `locale`
//  - Configured in the gateway and set on message post
//  - Configured in the settings
//  - Defaults to 'en'
const getLocale = record => {
  return record.locale ||
         (record.fields && record.fields.locale) ||
         (record.sms_message && record.sms_message.locale) ||
         config.get('locale') ||
         'en';
};

// Append error to data record if it doesn't already exist. we don't need
// redundant errors. Error objects should always have a code and message
// attributes.
//
// @param {Object} record - data record
// @param {String|Object} error - error object or code matching key in messages
const addError = (record, error) => {
  if (!record || !error) {
    return;
  }

  if (typeof error === 'string') {
    error = {
      code: error,
    };
  }

  if (!error.message) {
    error.message = config.translate(error.code, getLocale(record), error.ctx);
    delete error.ctx;
  }

  if (!record.errors) {
    record.errors = [];
  }

  record.errors.push(error);
};

// Try to parse sent_timestamp field and use it for reported_date.
// Particularly useful when re-importing data from gateway to
// maintain accurate reported_date field.
//
// return unix timestamp integer or undefined
const parseSentTimestamp = ts => {
  if (typeof ts === 'number') {
    return ts;
  }

  if (typeof ts === 'string') {
    if (ts.match(DATE_NUMBER_STRING)) {
      return Number(ts);
    } else {
      // see if moment can make sense of it
      return moment(ts).valueOf();
    }
  }
};

// @param {String} form - form code
// @param {Object} form_data - parsed form data
// @returns {String} - Reporting Unit ID value (case insensitive)
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

// @param {Object} formData - parsed form data
// @param {Object} options from initial POST
// @returns {Object} - data record
const getDataRecord = (formData, options) => {

  const form = options.form;
  const def = getForm(options.form);

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

  const ts = parseSentTimestamp(options.reported_date);
  if (ts) {
    record.reported_date = ts;
  }

  if (def) {
    if (def.facility_reference) {
      record.refid = getRefID(form, formData);
    }

    for (const k of Object.keys(def.fields)) {
      smsparser.merge(form, k.split('.'), record.fields, formData);
    }

    const errors = validate.validate(def, formData);
    errors.forEach(function(err) {
      addError(record, err);
    });
  }

  if (formData && formData._extra_fields) {
    addError(record, 'extra_fields');
  }

  if (typeof options.message === 'string' && !options.message.trim()) {
    addError(record, 'sys.empty');
  }

  if (!def) {
    if (config.get('forms_only_mode')) {
      addError(record, { code: 'sys.form_not_found', ctx: { form: options.form } });
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

  const rawMessage = data.message;
  let formCode = smsparser.getFormCode(data.message);
  let formDefinition = getForm(formCode);
  if (formCode && !formDefinition) {
    // try again, this time without invisible characters
    const cleaned = formCode.replace(ZERO_WIDTH_UNICODE_CHARACTERS, '');
    formDefinition = getForm(cleaned);
    if (formDefinition) {
      // update the message to use the correct form code
      data.message = data.message.replace(formCode, cleaned);
      formCode = cleaned;
    }
  }
  const content = {
    type: 'sms_message',
    message: data.message,
    form: formCode,
    reported_date: data.sent_timestamp,
    locale: data.locale || locale,
    from: data.from,
    gateway_ref: data.gateway_ref,
  };

  let formData;
  if (content.form && formDefinition) {
    formData = smsparser.parse(formDefinition, data);
  }
  content.message = rawMessage; // reset this to the original message now that parsing is complete
  return getDataRecord(formData, content);
};

const createRecordByJSON = data => {
  const required = ['form'];

  // check required fields are in _meta property
  if (empty(data._meta)) {
    throw new PublicError('Missing _meta property.');
  }

  for (const k of required) {
    if (empty(data._meta[k])) {
      throw new PublicError('Missing required field: ' + k);
    }
  }

  const options = data._meta;
  options.form = options.form.toUpperCase(); // normalise form names
  delete data._meta;

  const formDefinition = getForm(options.form);

  // require form definition
  if (!formDefinition) {
    throw new PublicError('Form not found: ' + options.form);
  }

  const correctedData = {};
  Object.keys(data).forEach(k => {
    if (formDefinition.fields[k]) {
      if (formDefinition.fields[k].type === 'date') {
        // Of the data types we support, date is the only one that can't be natively supported in
        // JSON. Convert it the same way smsparser does, into ms ts
        data[k] = moment(data[k]).valueOf();
      } else if (formDefinition.fields[k].type === 'boolean' && [1, 0].includes(data[k])) {
        // Since in SMS we convert 1 and 0 into true and false we're going to do it here as well for
        // consistency
        data[k] = !!data[k];
      }
    }

    correctedData[k.toLowerCase()] = data[k];
  });

  return getDataRecord(correctedData, options);
};

module.exports = {
  createRecordByJSON: createRecordByJSON,
  createByForm: createByForm
};
