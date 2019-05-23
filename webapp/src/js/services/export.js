const ajaxDownload = require('../modules/ajax-download');
const KNOWN_TYPES = ['reports', 'contacts', 'messages', 'feedback'];

angular.module('inboxServices').factory('Export',
  function(
    $log
  ) {
    'ngInject';
    'use strict';
    return function(type, filters, options) {
      if (!KNOWN_TYPES.includes(type)) {
        return $log.error(new Error('Unknown download type: ' + type));
      }
      const params = '?' + $.param({ filters: filters, options: options });
      const url = '/api/v2/export/' + type + params;
      ajaxDownload.download(url);
    };
  }
);
