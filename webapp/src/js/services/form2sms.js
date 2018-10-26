/*jshint bitwise: false*/
var odkForm2sms = require('odk-xform-conmpact-record-representation-for-sms');

angular
  .module('inboxServices')
  .service('Form2Sms', function(
    $log,
    $parse,
    DB,
    GetReportContent
  ) {
    'use strict';
    'ngInject';

    return function(doc) {
      if(!doc) {
        return Promise.resolve();
      }

      return DB()
        .get('form:' + doc.form)
        .then(function(form) {
          if(form.xml2sms) {
            return $parse(form.xml2sms)({ bitfield:bitfield.bind(doc), doc:doc, spaced:spaced, text:text.bind(doc) });
          }
          $log.debug('No xml2sms defined on form doc.  Checking for standard odk tags in form submission...');

          return GetReportContent(doc)
            .then(odkForm2sms);
        })
        .catch(function(err) {
          $log.error('Form2Sms failed: ' + err);
          return err;
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
