import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'mm-panel-header',
  templateUrl: './panel-header.component.html',
})
export class PanelHeaderComponent {
  @Input() headerTitle;
  @Output() onClose = new EventEmitter<boolean>();
}
