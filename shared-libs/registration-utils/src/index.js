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

  var registrationConfiguration = settings.registrations.find(function(conf) {
    return new RegExp('^\W*' + conf.form + '\\W*$','i').test(doc.form);
  });

  if (!registrationConfiguration) {
    return false;
  }

  var form = settings.forms && settings.forms[doc.form];
  if (doc.content_type === 'xml' ||
      (form && form.public_form) ||
      (form && doc.contact)) {
    return true;
  }

  return false;
};
