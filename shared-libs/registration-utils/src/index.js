// returns the only continuous alphanumeric + dash + underscore sequence in lower case
var normalizeFormCode = function(formCode) {
  var match = formCode.match(/^[^\w-]*([\w-]+)[^\w-]*$/);
  return match && match.length && match[1].toLowerCase();
};

// Returns whether `doc` is a valid registration against a configuration
// This is done by checks roughly similar to the `registration` transition filter function
// Serves as a replacement for checking for `transitions` metadata within the doc itself
exports.isValidRegistration = function(doc, settings) {
  if (!doc ||
      (doc.errors && doc.errors.length) ||
      !settings ||
      !settings.registrations ||
      doc.type !== 'data_record' ||
      !doc.form) {
    return false;
  }

  var formCode = normalizeFormCode(doc.form);
  if (!formCode) {
    return false;
  }

  // Registration transition should be configured for this form
  var registrationConfiguration = settings.registrations.find(function(conf) {
    return conf && conf.form && String(conf.form).toLowerCase() === formCode;
  });
  if (!registrationConfiguration) {
    return false;
  }

  if (doc.content_type === 'xml') {
    return true;
  }

  // SMS forms need to be configured
  var form = settings.forms && settings.forms[doc.form];
  if (!form) {
    return false;
  }

  // Require a known submitter or the form to be public.
  return Boolean(form.public_form || doc.contact);
};

exports._normalizeFormCode = normalizeFormCode;

var SUBJECT_PROPERTIES = ['_id', 'patient_id', 'place_id'];
exports.getSubjectIds = function(contact) {
  var subjectIds = [];

  if (!contact) {
    return subjectIds;
  }

  SUBJECT_PROPERTIES.forEach(function(prop) {
    if (contact[prop]) {
      subjectIds.push(contact[prop]);
    }
  });

  return subjectIds;
};

exports.getPatientId = function(report) {
  return report && (
    report.patient_id ||
    report.place_id ||
    (report.fields && (report.fields.patient_id || report.fields.place_id || report.fields.patient_uuid))
  );
};
