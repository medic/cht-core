/**
 * Directives for reusable inlined SVG icons
 */

angular.module('inboxDirectives').directive('mmReportVerifyIcon', function() {
  'use strict';
  return {
    scope: {
      valid: '='
    },
    templateUrl: 'templates/directives/report-verify-icon.html'
  };
});
