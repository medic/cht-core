/**
 * @module message-utils
 */
const _ = require('lodash/core');
const uuid = require('uuid');
const gsm = require('gsm');
const mustache = require('mustache');
const objectPath = require('object-path');
const moment = require('moment');
const toBikramSambatLetters = require('bikram-sambat').toBik_text;
const phoneNumber = require('@medic/phone-number');
const SMS_TRUNCATION_SUFFIX = '...';

const getParent = function(doc, type) {
  let facility = doc.parent ? doc : doc.contact;
  while (facility && facility.type !== type && facility.contact_type !== type) {
    facility = facility.parent;
  }
  // don't return falsey values, eg: ""
  return facility || undefined;
};

const getLinkedDoc = (doc, tag) => {
  let facility = doc.parent ? doc : doc.contact;
  while (facility) {
    if (facility.linked_docs && facility.linked_docs[tag]) {
      return facility.linked_docs[tag];
    }
    facility = facility.parent;
  }
};

const getClinic = function(doc) {
  return doc && getParent(doc, 'clinic');
};

const getHealthCenter = function(doc) {
  return doc && getParent(doc, 'health_center');
};

const getDistrict = function(doc) {
  return doc && getParent(doc, 'district_hospital');
};

const getClinicPhone = function(doc) {
  const clinic = getClinic(doc);
  return clinic && clinic.contact && clinic.contact.phone;
};

const getHealthCenterPhone = function(doc) {
  const healthCenter = getHealthCenter(doc);
  return healthCenter && healthCenter.contact && healthCenter.contact.phone;
};

const getDistrictPhone = function(doc) {
  const district = getDistrict(doc);
  return district && district.contact && district.contact.phone;
};

const getParentPhone = function(doc, type) {
  const parent = doc && getParent(doc, type);
  return parent && parent.contact && parent.contact.phone;
};

const getLinkedPhone = (doc, tag) => {
  const linkedContact = doc && getLinkedDoc(doc, tag);
  return linkedContact && linkedContact.phone;
};

const applyPhoneReplacement = function(config, phone) {
  const replacement = config.outgoing_phone_replace;
  if (!phone || !replacement || !replacement.match) {
    return phone;
  }
  const match = replacement.match;
  const replace = replacement.replace || '';
  if (phone.indexOf(match) === 0) {
    phone = replace + phone.substring(match.length);
  }
  return phone;
};

const applyPhoneFilters = function(config, phone) {
  const filters = config.outgoing_phone_filters;
  if (!phone || !filters) {
    return phone;
  }
  filters.forEach(function(filter) {
    // only supporting match and replace options for now
    if (filter && filter.match && filter.replace) {
      phone = phone.replace(new RegExp(filter.match), filter.replace);
    }
  });
  return phone;
};

const getRecipient = function(context, recipient) {
  if (!context) {
    return;
  }
  recipient = recipient && recipient.trim();
  const from = context.from || (context.contact && context.contact.phone);
  if (!recipient) {
    return from;
  }
  let phone;
  if (recipient === 'reporting_unit') {
    phone = from;
  } else if (recipient.startsWith('ancestor:')) {
    const type = recipient.split(':')[1];
    phone = getParentPhone(context.patient, type) ||
            getParentPhone(context, type);
  } else if (recipient.startsWith('link:')) {
    const tag = recipient.split(':')[1];
    phone = getLinkedPhone(context.patient, tag) ||
            getLinkedPhone(context.contact, tag) ||
            getParentPhone(context.patient, tag) ||
            getParentPhone(context.contact, tag);
  } else if (recipient === 'parent') {
    const patient = context.patient || context;
    const facility = patient.parent ? patient : patient.contact;
    phone = facility.parent &&
            facility.parent.parent &&
            facility.parent.parent.contact &&
            facility.parent.parent.contact.phone;
  } else if (recipient === 'grandparent') {
    const patient = context.patient || context;
    const facility = patient.parent ? patient : patient.contact;
    phone = facility.parent &&
            facility.parent.parent &&
            facility.parent.parent.parent &&
            facility.parent.parent.parent.contact &&
            facility.parent.parent.parent.contact.phone;
  } else if (recipient === 'clinic') {
    phone = getClinicPhone(context.patient) ||
            getClinicPhone(context) ||
            (context.contact && context.contact.phone);
  } else if (recipient === 'health_center') {
    phone = getHealthCenterPhone(context.patient) ||
            getHealthCenterPhone(context);
  } else if (recipient === 'district') {
    phone = getDistrictPhone(context.patient) ||
            getDistrictPhone(context);
  } else if (context.fields && context.fields[recipient]) {
    // Try to resolve a specified property/field name
    phone = context.fields[recipient];
  } else if (context[recipient]) {
    // Or directly on the context
    phone = context[recipient];
  } else if (recipient.indexOf('.') > -1) {
    // Or multiple layers by executing it as a statement
    phone = objectPath.get(context, recipient);
  } else if (phoneNumber.validate({}, recipient)) {
    // or a specific phone number
    phone = recipient;
  }
  return phone || from || recipient;
};

const getPhone = function(config, context, recipient) {
  let phone = getRecipient(context, recipient);
  phone = applyPhoneReplacement(config, phone);
  return applyPhoneFilters(config, phone);
};

const getLocale = function(config, doc) {
  return  doc.locale ||
          (doc.sms_message && doc.sms_message.locale) ||
          config.locale_outgoing ||
          config.locale ||
          'en';
};

const extractTemplateContext = function(doc) {
  const clinic = getClinic(doc);
  const healthCenter = getHealthCenter(doc);
  const district = getDistrict(doc);
  const internal = {
    clinic: clinic,
    health_center: healthCenter,
    district: district,
    // deprecated but kept for backwards compatibility
    parent: healthCenter,
    grandparent: district,
  };
  return _.defaults(internal, doc.fields, doc);
};

const extendedTemplateContext = function(doc, extras) {
  const templateContext = {
    patient: extras.patient,
    place: extras.place,
  };

  if (extras.templateContext) {
    _.defaults(templateContext, extras.templateContext);
  }

  if (extras.patient) {
    _.defaults(templateContext, extractTemplateContext(extras.patient));

    // Don't want to add this to extractTemplateContext as 'name' is too generic
    // and eTC gets called elsewhere
    templateContext.patient_name = templateContext.patient_name || extras.patient.name;
  }

  if (extras.place) {
    _.defaults(templateContext, extractTemplateContext(extras.place));
  }

  _.defaults(templateContext, extractTemplateContext(doc));

  if (extras.registrations && extras.registrations.length) {
    _.defaults(templateContext, extractTemplateContext(extras.registrations[0]));
  }

  if (extras.placeRegistrations && extras.placeRegistrations.length) {
    _.defaults(templateContext, extractTemplateContext(extras.placeRegistrations[0]));
  }

  return templateContext;
};

mustache.escape = function(value) {
  return value;
};

const formatDate = function(config, text, view, formatString, locale) {
  let date = render(config, text, view);
  if (!isNaN(date)) {
    date = parseInt(date, 10);
  }
  locale = locale || moment().locale();
  return moment(date).locale(locale).format(formatString);
};

const render = function(config, template, view, locale) {
  return mustache.render(template, Object.assign(view, {
    bikram_sambat_date: function() {
      return function(text) {
        return toBikramSambatLetters(formatDate(config, text, view, 'YYYY-MM-DD'));
      };
    },
    date: function() {
      return function(text) {
        return formatDate(config, text, view, config.date_format, locale);
      };
    },
    datetime: function() {
      return function(text) {
        return formatDate(config, text, view, config.reported_date_format, locale);
      };
    }
  }));
};

const truncateMessage = function(parts, max) {
  const message = parts.slice(0, max).join('');
  return message.slice(0, -SMS_TRUNCATION_SUFFIX.length) + SMS_TRUNCATION_SUFFIX;
};

/**
 * @param {Object} config A object of the entire app config
 * @param {Function} translate A function which returns a localised string when given
 *        a key and locale
 * @param {Object} doc The couchdb document this message relates to
 * @param {Object} content An object with one of `translationKey` or a `messages`
 *        array for translation, or an already prepared `message` string.
 * @param {String} recipient A string to determine who the message should be sent to.
 *        One of: 'reporting_unit', 'clinic', 'parent', 'grandparent',
 *        the name of a property in `fields` or on the doc, a path to a
 *        property on the doc.
 * @param {Object} [extraContext={}] An object with additional values to
 *        provide as a context for templating. Properties: `patient` (object),
 *        `registrations` (array), `place` (object), `placeRegistrations` (array),
 *        and `templateContext` (object) for any unstructured context additions.
 * @returns {Object} The generated message object.
 */
exports.generate = function(config, translate, doc, content, recipient, extraContext) {
  'use strict';

  const context = extendedTemplateContext(doc, extraContext || {});

  const result = {
    uuid: uuid.v4(),
    to: getPhone(config, context, recipient)
  };

  const message = exports.template(config, translate, doc, content, extraContext);
  if (!message || (content.translationKey && message === content.translationKey)) {
    result.error = 'messages.errors.message.empty';
    return [ result ];
  }

  const parsed = gsm(message);
  const max = config.multipart_sms_limit || 10;

  if (parsed.sms_count <= max) {
    // no need to truncate
    result.message = message;
  } else {
    // message too long - truncate
    result.message = truncateMessage(parsed.parts, max);
    result.original_message = message;
  }

  const isMissingPatient = extraContext &&
                         !extraContext.patient &&
                         extraContext.registrations &&
                         extraContext.registrations.length;
  if (isMissingPatient) {
    result.error = 'messages.errors.patient.missing';
  }

  const isMissingPlace = extraContext &&
                         !extraContext.place &&
                         extraContext.placeRegistrations &&
                         extraContext.placeRegistrations.length;
  if (isMissingPlace) {
    result.error = 'messages.errors.place.missing';
  }

  return [ result ];
};

/**
 * @param {Object} config A object of the entire app config
 * @param {Function} translate A function which returns a localised string when given
 *        a key and locale
 * @param {Object} doc The couchdb document this message relates to
 * @param {Object} content An object with one of `translationKey` or a `messages`
 *        array for translation, or an already prepared `message` string.
 * @param {Object} [extraContext={}] An object with additional values to
 *        provide as a context for templating. Properties: `patient` (object),
 *        `registrations` (array), and `templateContext` (object) for any
 *        unstructured context additions.
 * @returns {String} The message.
 */
exports.template = function(config, translate, doc, content, extraContext) {
  extraContext = extraContext || {};
  const locale = getLocale(config, doc);
  let template;
  if (content.translationKey) {
    template = translate(content.translationKey, locale);
  } else if (_.isArray(content.message)) {
    const message = _.find(content.message, { locale: locale }) ||
                  content.message[0];
    if (message) {
      template = message.content && message.content.trim();
    }
  } else {
    // depecated - already generated message
    template = content.message;
  }
  if (!template) {
    return '';
  }
  const context = extendedTemplateContext(doc, extraContext);
  return render(config, template, context, locale);
};

/**
 * @param {Object[]} The messages of the doc.
 * @returns {Boolean} True if the message has errors.
 */
exports.hasError = function(messages) {
  return messages && messages[0] && messages[0].error;
};

exports._getRecipient = getRecipient;
exports._extendedTemplateContext = extendedTemplateContext;
