angular
  .module('inboxServices')
  .service('Form2Sms', function(
    $log,
    $parse,
    DB
  ) {
    'use strict';
    'ngInject';

    return function(doc) {
      $log.error('Welcome to Form2Sms', Array.prototype.slice.call(arguments));
      return DB()
        .get('form:' + doc.form)
        .then(function(form) {
          $log.error('Form2Sms', doc, form);

          //#if DEBUG
          // here we try out some different ways we could define the converter
          // via the project configuration.
          switch(doc.form) {
            case 'patient_assessment':
              form.xml2sms = 'spaced("PA", text("patient_name"), text("patient_id"), bitfield("accompany_to_cscom", "fast_breathing", "needs_signoff", "refer_to_cscom"))';
              break;
            case 'patient_assessment_over_5':
              form.xml2sms = '"what"';
              break;
          }
          //#endif DEBUG

          if(!form.xml2sms) return;

          return $parse(form.xml2sms)({ bitfield:bitfield.bind(doc), doc:doc, spaced:spaced, text:text.bind(doc) });
        })
        .catch(function(err) {
          $log.error('Form2Sms failed: ' + err);
        });
    };
  });

function spaced() {
  return Array.prototype.slice.call(arguments).join(' ');
}

function bitfield() {
  var that = this;
  var fieldNames = Array.prototype.slice.call(arguments);
  var intVal = fieldNames.reduce(function(acc, fieldName) {
    var bool = that.fields[fieldName] === 'true';
    return (acc << 1) | (bool ? 1 : 0);
  }, 0);
  return intVal.toString(16);
}

function text(fieldName) {
  return (this.fields[fieldName] || fieldName + '.notfound').toString();
}
