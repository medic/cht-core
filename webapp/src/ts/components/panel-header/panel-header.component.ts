import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'mm-panel-header',
    templateUrl: './panel-header.component.html',
    standalone: true,
    imports: [
        NgIf,
        MatIcon,
        TranslatePipe,
    ],
})
export class PanelHeaderComponent {
  @Input() headerTitle;
  @Input() hideCloseButton;
  @Output() onClose = new EventEmitter<boolean>();
}
