import { Component, Input } from '@angular/core';
import { NgIf, NgStyle, NgClass } from '@angular/common';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { LocalizeNumberPipe } from '@mm-pipes/number.pipe';

@Component({
  selector: 'mm-analytics-targets-progress',
  templateUrl: './analytics-targets-progress.component.html',
  imports: [
    NgIf,
    NgStyle,
    NgClass,
    TranslateDirective,
    TranslatePipe,
    LocalizeNumberPipe,
  ],
})
export class AnalyticsTargetsProgressComponent {
  @Input() target;
  @Input() value;
  @Input() aggregate;

  constructor() { }
}
