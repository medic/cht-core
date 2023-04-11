import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: '<mm-content-row>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content-row-list-item.component.html'
})
export class ContentRowListItemComponent {
  // string: (required) the _id of the doc
  @Input() id;
  // string: (optional) the name of the route to link to
  @Input() route;
  // string: (optional) the name of the tab to use as router link state
  @Input() tab;
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
}
