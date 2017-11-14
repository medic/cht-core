// NB: This code is identical to code in webapp
// TODO: move into a shared library as part of #4021
var _ = require('underscore'),
    uuid = require('uuid'),
    gsm = require('gsm'),
    mustache = require('mustache'),
    objectPath = require('object-path'),
    moment = require('moment'),
    toBikramSambatLetters = require('bikram-sambat').toBik_text,
    SMS_TRUNCATION_SUFFIX = '...';

var getParent = function(facility, type) {
  while (facility && facility.type !== type) {
    facility = facility.parent;
  }
  return facility;
};

var getClinic = function(doc) {
  return doc && getParent(doc.contact, 'clinic');
};

var getHealthCenter = function(doc) {
  return doc && getParent(doc.contact, 'health_center');
};

var getDistrict = function(doc) {
  return doc && getParent(doc.contact, 'district_hospital');
};

var getClinicPhone = function(doc) {
  var clinic = getClinic(doc);
  return (clinic && clinic.contact && clinic.contact.phone) ||
         (doc.contact && doc.contact.phone);
};

var getHealthCenterPhone = function(doc) {
  var healthCenter = getHealthCenter(doc);
  return healthCenter && healthCenter.contact && healthCenter.contact.phone;
};

var getDistrictPhone = function(doc) {
  var district = getDistrict(doc);
  return district && district.contact && district.contact.phone;
};

var applyPhoneReplacement = function(config, phone) {
  var replacement = config.outgoing_phone_replace;
  if (!phone || !replacement || !replacement.match) {
    return phone;
  }
  var match = replacement.match,
      replace = replacement.replace || '';
  if (phone.indexOf(match) === 0) {
    phone = replace + phone.substring(match.length);
  }
  return phone;
};

var applyPhoneFilters = function(config, phone) {
  var filters = config.outgoing_phone_filters;
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

var getRecipient = function(doc, recipient) {
  if (!doc) {
    return;
  }
  recipient = recipient && recipient.trim();
  var from = doc.from || (doc.contact && doc.contact.phone);
  if (!recipient) {
    return from;
  }
  var phone;
  if (recipient === 'reporting_unit') {
    phone = from;
  } else if (recipient === 'clinic') {
    phone = getClinicPhone(doc);
  } else if (recipient === 'parent') {
    phone = getHealthCenterPhone(doc);
  } else if (recipient === 'grandparent') {
    phone = getDistrictPhone(doc);
  } else if (doc.fields && doc.fields[recipient]) {
    // Try to resolve a specified property/field name
    phone = doc.fields[recipient];
  } else if (doc[recipient]) {
    // Or directly on the doc
    phone = doc[recipient];
  } else if (recipient.indexOf('.') > -1) {
    // Or multiple layers by executing it as a statement
    phone = objectPath.get(doc, recipient);
  }
  return phone || from || recipient;
};

var getPhone = function(config, doc, recipient) {
  var phone = getRecipient(doc, recipient);
  phone = applyPhoneReplacement(config, phone);
  return applyPhoneFilters(config, phone);
};

var getLocale = function(config, doc) {
  return  doc.locale ||
          (doc.sms_message && doc.sms_message.locale) ||
          config.locale_outgoing ||
          config.locale ||
          'en';
};

var extractTemplateContext = function(doc) {
  var clinic = getClinic(doc);
  var healthCenter = getHealthCenter(doc);
  var district = getDistrict(doc);
  var internal = {
    contact: clinic && clinic.contact,
    clinic: clinic,
    parent: healthCenter,
    health_center: healthCenter,
    grandparent: district,
    district: district
  };
  return _.defaults(internal, doc.fields, doc);
};

var extendedTemplateContext = function(doc, extras) {
  var templateContext = extractTemplateContext(doc);

  if (extras.templateContext) {
    _.defaults(templateContext, extras.templateContext);
  }

  if (extras.patient) {
    _.defaults(templateContext, extractTemplateContext(extras.patient));

    // Don't want to add this to extractTemplateContext as 'name' is too generic
    // and eTC gets called elsewhere
    templateContext.patient_name = templateContext.patient_name || extras.patient.name;
  }

  if (extras.registrations && extras.registrations.length) {
    _.defaults(templateContext, extractTemplateContext(extras.registrations[0]));
  }

  if (!extras.patient && extras.registrations && extras.registrations.length) {
    // If you're providing registrations to the template context you need to
    // provide the patient contact document as well. Patients can be
    // "registered" through the UI, only creating a patient and no registration report
    throw Error('Cannot provide registrations to template context without a patient');
  }

  return templateContext;
};

mustache.escape = function(value) {
  return value;
};

var formatDate = function(config, text, view, formatString) {
  var date = render(config, text, view);
  if (!isNaN(date)) {
    date = parseInt(date, 10);
  }
  return moment(date).format(formatString);
};

var render = function(config, template, view) {
  return mustache.render(template, _.extend(view, {
    bikram_sambat_date: function() {
      return function(text) {
        return toBikramSambatLetters(formatDate(config, text, view, 'YYYY-MM-DD'));
      };
    },
    date: function() {
      return function(text) {
        return formatDate(config, text, view, config.date_format);
      };
    },
    datetime: function() {
      return function(text) {
        return formatDate(config, text, view, config.reported_date_format);
      };
    }
  }));
};

var truncateMessage = function(parts, max) {
  var message = parts.slice(0, max).join('');
  return message.slice(0, -SMS_TRUNCATION_SUFFIX.length) + SMS_TRUNCATION_SUFFIX;
};

/**
 * @param config A object of the entire app config
 * @param translate A function which returns a localised string when given
 *        a key and locale
 * @param doc The couchdb document this message relates to
 * @param content An object with one of `translationKey` or a `messages`
 *        array for translation, or an already prepared `message` string.
 * @param recipient A string to determine who the message should be sent to.
 *        One of: 'reporting_unit', 'clinic', 'parent', 'grandparent',
 *        the name of a property in `fields` or on the doc, a path to a
 *        property on the doc.
 * @param extraContext (optional) An object with additional values to
 *        provide as a context for templating. Properties: `patient` (object),
 *        `registrations` (array), and `templateContext` (object) for any
 *        unstructured context additions.
 */
exports.generate = function(config, translate, doc, content, recipient, extraContext) {
  'use strict';

  var result = {
    uuid: uuid.v4(),
    to: getPhone(config, doc, recipient)
  };

  var message = exports.template(config, translate, doc, content, extraContext);
  var parsed = gsm(message);
  var max = config.multipart_sms_limit || 10;

  if (parsed.sms_count <= max) {
    // no need to truncate
    result.message = message;
  } else {
    // message too long - truncate
    result.message = truncateMessage(parsed.parts, max);
    result.original_message = message;
  }

  return [ result ];
};

exports.template = function(config, translate, doc, content, extraContext) {
  extraContext = extraContext || {};
  var locale = getLocale(config, doc);
  var template;
  if (content.translationKey) {
    template = translate(content.translationKey, locale);
  } else if (_.isArray(content.message)) {
    var message = _.findWhere(content.message, { locale: locale }) ||
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
  var context = extendedTemplateContext(doc, extraContext);
  return render(config, template, context);
};
