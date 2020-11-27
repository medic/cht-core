import { Component, Input } from '@angular/core';

@Component({
  selector: 'mm-analytics-targets-details',
  templateUrl: './analytics-targets-details.component.html'
})
export class AnalyticsTargetsDetailsComponent {
  @Input() target;
  @Input() value;

  constructor() { }
}
