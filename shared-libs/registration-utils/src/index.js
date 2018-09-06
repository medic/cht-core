exports.isValidRegistration = function(doc, config) {
  if (!doc || (doc.errors && doc.errors.length)) {
    return false;
  }

  if (!config || !config.registrations) {
    return false;
  }

  if (doc.type !== 'data_record' || !doc.form) {
    return false;
  }

  var registrationConfiguration = config.registrations.find(function(conf) {
    return new RegExp('^\W*' + conf.form + '\\W*$','i').test(doc.form);
  });

  if (!registrationConfiguration) {
    return false;
  }

  var form = config.forms && config.forms[doc.form];
  if (doc.content_type === 'xml' ||
      (form && form.public_form) ||
      (form && doc.contact)) {
    return true;
  }

  return false;
};
