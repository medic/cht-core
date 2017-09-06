/**
 * Directive for boilerplate for showing content rows.
 */
angular.module('inboxDirectives').directive('mmContentRow', function() {
  'use strict';
  return {
    restrict: 'E',
    templateUrl: 'templates/partials/content_row_list_item.html',
    scope: {
      // object: (required) the _id of the doc
      _id: '=',

      // string: (required) the name of the route to link to
      route: '=',

      // boolean: (optional) whether to make this row selected
      selected: '=',

      // string: (optional) the id of the resource icon to render
      icon: '=',

      // date: (optional) the date to show on the row
      date: '=',

      // string: (optional) the primary information for the row
      heading: '=',

      // string: (optional) the secondary information for the row
      summary: '=',

      // boolean: (optional) whether to mark the row as valid
      valid: '=',

      // boolean: (optional) whether to mark the row as verified
      verified: '=',

      // array: (optional) the hierarchy for the row
      lineage: '='
    }
  };
});
