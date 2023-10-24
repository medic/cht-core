import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'mm-panel-header',
  templateUrl: './panel-header.component.html',
})
export class PanelHeaderComponent {
  @Input() headerTitle;
  @Input() hideCloseButton;
  @Output() onClose = new EventEmitter<boolean>();
}
