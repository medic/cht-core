import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { LocalizeNumberPipe } from '@mm-pipes/number.pipe';

@Component({
  selector: 'mm-multiselect-bar',
  templateUrl: './multiselect-bar.component.html',
  imports: [NgIf, TranslateDirective, TranslatePipe, LocalizeNumberPipe]
})
export class MultiselectBarComponent {
  @Input() display = 'desktop';
  @Input() selectedCount = 0;
  @Input() areAllReportsSelected = false;
  @Output() deleteItems: EventEmitter<any> = new EventEmitter();
  @Output() deselectItems: EventEmitter<any> = new EventEmitter();
  @Output() selectItems: EventEmitter<any> = new EventEmitter();

  constructor() { }
}
