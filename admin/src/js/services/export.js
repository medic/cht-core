const ajaxDownload = require('../modules/ajax-download');

const KNOWN_EXPORTS = [
  'contacts',
  'dhis',
  'feedback',
  'messages',
  'reports',
];

angular.module('inboxServices').factory('Export',
  function(
    $log
  ) {
    'ngInject';
    'use strict';
    return function(type, filters, options) {
      if (!KNOWN_EXPORTS.includes(type)) {
        return $log.error(new Error('Unknown download type: ' + type));
      }
      const params = '?' + $.param({ filters, options });
      const url = '/api/v2/export/' + type + params;
      ajaxDownload.download(url);
    };
  });
