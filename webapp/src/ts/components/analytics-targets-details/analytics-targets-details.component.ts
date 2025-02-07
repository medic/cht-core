import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { LocalizeNumberPipe } from '@mm-pipes/number.pipe';

@Component({
  selector: 'mm-analytics-targets-details',
  templateUrl: './analytics-targets-details.component.html',
  standalone: true,
  imports: [NgIf, TranslateDirective, TranslatePipe, LocalizeNumberPipe]
})
export class AnalyticsTargetsDetailsComponent {
  @Input() target;
  @Input() value;

  constructor() { }
}
