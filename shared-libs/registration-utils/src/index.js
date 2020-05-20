const uniq = require('lodash/uniq');

const formCodeMatches = (conf, form) => {
  return (new RegExp('^[^a-z]*' + conf + '[^a-z]*$', 'i')).test(form);
};

// Returns whether `doc` is a valid registration against a configuration
// This is done by checks roughly similar to the `registration` transition filter function
// Serves as a replacement for checking for `transitions` metadata within the doc itself
exports.isValidRegistration = (doc, settings) => {
  if (!doc ||
      (doc.errors && doc.errors.length) ||
      !settings ||
      !settings.registrations ||
      doc.type !== 'data_record' ||
      !doc.form) {
    return false;
  }

  // Registration transition should be configured for this form
  const registrationConfiguration = settings.registrations.find((conf) => {
    return conf &&
           conf.form &&
           formCodeMatches(conf.form, doc.form);
  });
  if (!registrationConfiguration) {
    return false;
  }

  if (doc.content_type === 'xml') {
    return true;
  }

  // SMS forms need to be configured
  const form = settings.forms && settings.forms[doc.form];
  if (!form) {
    return false;
  }

  // Require a known submitter or the form to be public.
  return Boolean(form.public_form || doc.contact);
};

exports._formCodeMatches = formCodeMatches;

const CONTACT_SUBJECT_PROPERTIES = ['_id', 'patient_id', 'place_id'];
const REPORT_SUBJECT_PROPERTIES = ['patient_id', 'patient_uuid', 'place_id', 'place_uuid'];

exports.getSubjectIds = (doc) => {
  const subjectIds = [];

  if (!doc) {
    return subjectIds;
  }

  if (doc.type === 'data_record') {
    REPORT_SUBJECT_PROPERTIES.forEach(prop => {
      if (doc[prop]) {
        subjectIds.push(doc[prop]);
      }
      if (doc.fields && doc.fields[prop]) {
        subjectIds.push(doc.fields[prop]);
      }
    });
  } else {
    CONTACT_SUBJECT_PROPERTIES.forEach(prop => {
      if (doc[prop]) {
        subjectIds.push(doc[prop]);
      }
    });
  }

  return uniq(subjectIds);
};

exports.getSubjectId = report => {
  if (!report) {
    return false;
  }
  for (const prop of REPORT_SUBJECT_PROPERTIES) {
    if (report[prop]) {
      return report[prop];
    }
    if (report.fields && report.fields[prop]) {
      return report.fields[prop];
    }
  }
};
