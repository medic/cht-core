/**
 * TranslateFrom service takes the translation map as an argument when
 * translating. It's useful for the configurable parts of the app, where we
 * can't hard-code translations.
 *
 * Examples of use :
 * translateFrom([
 *  { locale: 'en', content: 'thanks' },
 *  { locale: 'en_nz', content: 'chur' }
 * ]);
 *
 * // Legacy format
 * translateFrom({en: 'hello', fr: 'bonjour'});
 *
 * // With scope arg
 * var patient = { _id: 'abc', patient: { name: 'Estelle' } };
 * translateFrom([ { locale: 'en', content: 'Go visit {{patient.name}}' }], patient);  // 'Go visit Estelle'
 */
var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var getLabel = function(labels, locale) {
    locale = locale || 'en';

    // first format: [ { content: 'Hello', locale: 'en' } ]
    if (_.isArray(labels)) {
      var label = _.findWhere(labels, { locale: locale });
      if (label) {
        return label.content;
      }
      if (labels.length) {
        return labels[0].content;
      }
      return;
    }

    // second format: { en: 'Hello' }
    if (_.isObject(labels)) {
      return labels[locale] || _.values(labels)[0];
    }

    // we've tried everything, just return the input
    return labels;
  };

  inboxServices.factory('TranslateFrom', ['$translate',
    function($translate) {
      return function(labels, scope) {
        if (!labels) {
          return;
        }
        var label = getLabel(labels, $translate.use());
        if (!scope || !label || label.indexOf('{{') === -1) {
          return label;
        }
        return _.template(label)(scope);
      };
    }
  ]);

}());
