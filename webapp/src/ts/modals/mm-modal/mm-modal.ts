/**
 * Directive for boilerplate for modal dialog boxes.
 *
 * Usage:
 * <mm-modal [attributes]>[modal body]</mm-modal>
 */
import {Component, Injectable, Input, Output, EventEmitter, HostListener} from '@angular/core';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'mm-modal',
  templateUrl: './mm-modal.component.html'
})
export class MmModal {
  @Input() status;
  @Input() id;
  @Input() titleKey;
  @Input() submitKey;
  @Input() submittingKey;
  @Input() cancelKey;
  @Output() onCancel: EventEmitter<any> = new EventEmitter();
  @Output() onSubmit: EventEmitter<any> = new EventEmitter();
  @Input() disableSubmit;
  @Input() danger;

  constructor() {
  }

  @HostListener('window:keydown.enter') onEnterHandler() {
    this.onSubmit.emit();
  }
}

Injectable({
  providedIn: 'root'
})
export class MmModalAbstract {
  status = {
    processing:false,
    error: false,
    severity: false,
  }

  setProcessing() {
    this.status.processing = true;
    this.status.error = false;
    this.status.severity = false;
  }

  setFinished() {
    this.status.processing = false;
    this.status.error = false;
    this.status.severity = false;
  }

  setError(err, message, severity?) {
    console.error('Error submitting modal', err);
    this.status.processing = false;
    this.status.error = message;
    this.status.severity = severity;
  }
}


@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private readonly config = {
    keyboard: true,
    show: true,
    animated: false,
  }

  private modalRefs = {};

  constructor(private modalService:BsModalService) {

  }

  show(template, config?, onHide?) {
    const modalId = template.id;
    if (this.modalRefs[modalId]) {
      return;
    }
    config = Object.assign(this.config, config);
    const ref:BsModalRef = this.modalService.show(template, config);
    this.modalRefs[modalId] = ref;
    if (onHide) {
      ref.onHide.subscribe(() => onHide());
    }

    ref.onHidden.subscribe(() => delete this.modalRefs[modalId]);
  }
}
