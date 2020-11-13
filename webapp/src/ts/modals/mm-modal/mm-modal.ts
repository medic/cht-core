/**
 * Directive for boilerplate for modal dialog boxes.
 *
 * Usage:
 * <mm-modal [attributes]>[modal body]</mm-modal>
 */
import { Component, Injectable, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'mm-modal',
  templateUrl: './mm-modal.component.html'
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
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

@Injectable({
  providedIn: 'root'
})
export abstract class MmModalAbstract {
  readonly modalClosePromise;
  constructor(
    public bsModalRef:BsModalRef,
  ) {
    const modalClosePromise:any = {};
    modalClosePromise.promise = new Promise((resolve, reject) => {
      modalClosePromise.resolve = resolve;
      modalClosePromise.reject = reject;
    });
    this.modalClosePromise = modalClosePromise;
  }

  abstract id;

  status = {
    processing:false,
    error: false,
    severity: false,
  };

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

  setError(err?, message?, severity?) {
    console.error('Error submitting modal', err);
    this.status.processing = false;
    this.status.error = message;
    this.status.severity = severity;
  }

  close() {
    this.modalAccept();
  }

  cancel() {
    this.modalReject();
  }

  modalAccept() {
    this.modalClosePromise?.resolve && this.modalClosePromise.resolve();
    this.bsModalRef.hide();
  }

  modalReject() {
    this.modalClosePromise?.reject && this.modalClosePromise.reject();
    this.bsModalRef.hide();
  }
}


@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private readonly config = {
    keyboard: true,
    show: true,
    animated: true,
  }

  private modalRefs = {};

  constructor(private modalService:BsModalService) {
  }

  private getModalClosePromise(modalRef) {
    return modalRef?.content?.modalClosePromise?.promise;
  }

  show(template, config?) {
    const modalId = template.id;
    if (this.modalRefs[modalId]) {
      // no duplicate modals
      return this.getModalClosePromise(this.modalRefs[modalId]) || Promise.resolve();
    }

    config = Object.assign({}, this.config, config);
    const ref:BsModalRef = this.modalService.show(template, config);

    this.modalRefs[modalId] = ref;
    ref.onHidden.subscribe(() => delete this.modalRefs[modalId]);

    return this.getModalClosePromise(ref);
  }
}
