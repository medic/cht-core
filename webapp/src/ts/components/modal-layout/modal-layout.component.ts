import { Component, Input, Output, EventEmitter, HostListener, Attribute } from '@angular/core';

@Component({
  selector: 'mm-modal-layout',
  templateUrl: './modal-layout.component.html'
})
export class ModalLayoutComponent {
  @Attribute('id') id;
  @Input() processing: boolean;
  @Input() error: string;
  @Input() titleKey: string;
  @Input() submitKey: string;
  @Input() submittingKey: string;
  @Input() isFlatButton: boolean; // Best used for modals with forms
  @Input() cancelKey: string;
  @Input() hideFooter: boolean;
  @Input() hideCancelButton: boolean;
  @Input() hasEnketoForm: boolean;
  @Output() onCancel: EventEmitter<any> = new EventEmitter();
  @Output() onSubmit: EventEmitter<any> = new EventEmitter();

  constructor() { }

  @HostListener('window:keydown.enter')
  onEnterHandler() {
    this.submit();
  }

  cancel() {
    if (this.processing) {
      return;
    }
    this.onCancel.emit();
  }

  submit() {
    if (this.processing) {
      return;
    }
    this.onSubmit.emit();
  }
}
