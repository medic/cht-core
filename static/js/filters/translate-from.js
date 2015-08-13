var _ = require('underscore');

(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  var getLabel = function(labels, locale) {
    locale = locale || 'en';

    // first format: [ { content: 'Hello', locale: 'en' } ]
    if (_.isArray(labels)) {
      var label = _.findWhere(labels, { locale: locale });
      if (label) {
        return label.content;
      }
      if (labels.length) {
        return label[0].content;
      }
      return;
    }

    // second format: { en: 'Hello' }
    return labels[locale] ||_.values(labels)[0];
  };

  module.filter('translateFrom', ['$translate',
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
