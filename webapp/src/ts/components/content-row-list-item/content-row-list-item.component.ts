import { Component, Input } from '@angular/core';

@Component({
  selector: '<mm-content-row>',
  templateUrl: './content-row-list-item.component.html'
})
export class ContentRowListItemComponent {
  // string: (required) the _id of the doc
  @Input() id;
  // string: (required) the name of the route to link to
  @Input() route;
  // boolean: (optional) whether to mark this row read
  @Input() read;
  // string: (optional) the id of the resource icon to render
  @Input() icon;
  // date: (optional) the date to show on the row
  @Input() date;
  // boolean: (optional) whether or not to mark this row as overdue
  @Input() overdue;
  // string: (optional) the primary information for the row
  @Input() heading;
  // string: (optional) the secondary information for the row
  @Input() summary;
  // date: (optional) the date of birth
  @Input() dob;
  // date: (optional) the date of death
  @Input() dod;
  // string: (optional) warning information for the row
  @Input() warning;
  // string: (optional) the date formatter to use, default: relativeDate
  @Input() dateFormat;
  // boolean: (optional) whether or not to show the status bubble
  @Input() showStatus;
  // boolean: (optional) whether to mark the row as valid
  @Input() valid;
  // boolean: (optional) whether to mark the row as verified
  @Input() verified;
  // array: (optional) the hierarchy for the row
  @Input() lineage;
  // integer: (optional) the simprints tier of the contact match
  @Input() simprintsTier;
  // boolean: (optional) whether to mark this row as a primary contact
  @Input() primaryContact;
  // integer: (optional) how much tasks to show as pending for this contact
  @Input() taskCount;
  // boolean: (optional) whether the contact is muted
  @Input() muted;
  // boolean: (optional) whether to display the "muted" text along with contact name
  @Input() displayMuted;
  // object: (optional) aggregate status information
  @Input() aggregate;
  // boolean: (optional) whether the line item is selected
  @Input() selected;

  @Input() unread;
  @Input() primary;
  @Input() visits;
  @Input() statusIcon;

  constructor() {}
}

/*

/!**
 * Directive for boilerplate for showing content rows.
 *!/
angular.module('inboxDirectives').directive('mmContentRow', function() {
  'use strict';
  return {
    restrict: 'E',
    templateUrl: 'templates/directives/content_row_list_item.html',
    scope: {

      id: '=',


      route: '=',


      read: '=',


      icon: '=',


      date: '=',


      overdue: '=',


      heading: '=',


      summary: '=',


      dob: '=',


      dod: '=',


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
*/
