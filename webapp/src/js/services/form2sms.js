/*jshint bitwise: false*/
const odkForm2sms = require('odk-xform-conmpact-record-representation-for-sms');

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
        return Promise.reject(new Error('No doc provided.'));
      }

      return DB()
        .get(`form:${doc.form}`)
        .then(form => {
          if(form.xml2sms) {
            return $parse(form.xml2sms)({ bitfield:bitfield.bind(doc), doc:doc.fields, concat, spaced, match });
          } else {
            $log.debug('No xml2sms defined on form doc.  Checking for standard odk tags in form submission...');

            return GetReportContent(doc)
              .then(odkForm2sms);
          }
        })
        .catch(function(err) {
          $log.error('Form2Sms failed: ' + err);
          throw err;
        });
    };
  });

const concat = (...args) => args.join('');
const spaced = (...args) => args.join(' ');

function bitfield() {
  const vals = Array.prototype.slice.call(arguments);
  const intVal = vals.reduce((acc, val) => {
    const bool = val === 'true';
    return (acc << 1) | (bool ? 1 : 0);
  }, 0);
  return intVal.toString(16);
}

function match(val, matchers) {
  const matchMap = {};
  matchers
    .split(',')
    .map(it => it.trim())
    .forEach(it => {
      const [ k, v ] = it.split(':');
      matchMap[k] = v;
    });
  return matchMap[val] || '';
}
