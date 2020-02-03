/**
 * Directive for boilerplate for showing content rows.
 */
angular.module('inboxDirectives').directive('mmContentRow', function() {
  'use strict';
  return {
    restrict: 'E',
    templateUrl: 'templates/directives/content_row_list_item.html',
    scope: {
      // string: (required) the _id of the doc
      id: '=',

      // string: (required) the name of the route to link to
      route: '=',

      // boolean: (optional) whether to mark this row read
      read: '=',

      // string: (optional) the id of the resource icon to render
      icon: '=',

      // date: (optional) the date to show on the row
      date: '=',

      // boolean: (optional) whether or not to mark this row as overdue
      overdue: '=',

      // string: (optional) the primary information for the row
      heading: '=',

      // string: (optional) the secondary information for the row
      summary: '=',

      // date: (optional) the date of birth
      dob: '=',

      // date: (optional) the date of death
      dod: '=',

      // string: (optional) warning information for the row
      warning: '=',

      // string: (optional) the date formatter to use, default: relativeDate
      dateFormat: '=',

      // boolean: (optional) whether or not to show the status bubble
      showStatus: '=',

      // boolean: (optional) whether to mark the row as valid
      valid: '=',

      // boolean: (optional) whether to mark the row as verified
      verified: '=',

      // array: (optional) the hierarchy for the row
      lineage: '=',

      // integer: (optional) the simprints tier of the contact match
      simprintsTier: '=',

      // boolean: (optional) whether to mark this row as a primary contact
      primaryContact: '=',

      // integer: (optional) how much tasks to show as pending for this contact
      taskCount: '=',

      // boolean: (optional) whether the contact is muted
      // html-minifier considers `muted` to be a boolean attribute, so it will strip its value
      muted: '=isMuted',

      // boolean: (optional) whether to display the "muted" text along with contact name
      displayMuted: '=',

      // object: (optional) aggregate status information
      aggregate: '=',

      // boolean: (optional) whether the line item is selected
      // html-minifier considers `selected` to be a boolean attribute, so it will strip its value
      selected: '=isSelected',

    }
  };
});
