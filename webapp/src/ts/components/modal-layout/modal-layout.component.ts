import { Component, Input, Output, EventEmitter, HostListener, Attribute } from '@angular/core';

@Component({
  selector: 'mm-modal-layout',
  templateUrl: './modal-layout.component.html'
})
export class ModalLayoutComponent {
  @Attribute('id') id;
  @Input() processing;
  @Input() error;
  @Input() titleKey;
  @Input() submitKey;
  @Input() submittingKey;
  @Input() cancelKey;
  @Input() hideFooter;
  @Input() hasEnketoForm;
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
