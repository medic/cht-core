import { Component, Input } from '@angular/core';

@Component({
  selector: 'mm-analytics-targets-progress',
  templateUrl: './analytics-targets-progress.component.html',
})
export class AnalyticsTargetsProgressComponent {
  @Input() target;
  @Input() value;
  @Input() aggregate;

  constructor() { }
}
