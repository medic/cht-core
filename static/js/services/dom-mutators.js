var moment = require('moment');

/**
 * Contains all dom-mutating functions.
 */
angular.module('inboxServices').factory('DomMutators',
  function(FormatDate, RenderDate) {
    'use strict';
    'ngInject';

    /**
     * Is responsible for updating the relative time in the
     * time-ago-auto-update directive.
     * @note is handled outside the directive to increase performance on
     * multiple time-ago-auto-update directives rendered on
     * the same page.
     */
    function updateRelativeTime() {
      var elements = document.querySelectorAll('time-ago-auto-update span');

      elements.forEach(function(element) {
        element.textContent = RenderDate.getRelativeDateString(
          moment(Number(element.dataset.date)),
          { FormatDate: FormatDate }
        );
      });
    }

    return {
      updateRelativeTime: updateRelativeTime,
    };
});
