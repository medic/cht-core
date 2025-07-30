import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'mm-panel-header',
  templateUrl: './panel-header.component.html',
  imports: [
    MatIcon,
    TranslatePipe
],
})
export class PanelHeaderComponent {
  @Input() headerTitle;
  @Input() hideCloseButton;
  @Output() onClose = new EventEmitter<boolean>();
}
