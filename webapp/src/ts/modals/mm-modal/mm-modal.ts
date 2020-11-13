/**
 * Component for boilerplate for modal dialog boxes.
 *
 * Usage:
 * <mm-modal [attributes]>[modal body]</mm-modal>
 */
import { Component, Injectable, Input, Output, EventEmitter, HostListener, OnInit } from '@angular/core';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { Selectors } from '@mm-selectors/index';
import { Store } from '@ngrx/store';
import { v4 as uuid } from 'uuid';
import { take } from 'rxjs/operators';

@Component({
  selector: 'mm-modal',
  templateUrl: './mm-modal.component.html'
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class MmModal implements OnInit {

  @Input() minimalTabs = false;
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

  constructor(private store: Store) {
  }

  ngOnInit() {
    this.store
      .select(Selectors.getMinimalTabs)
      .subscribe(minimalTabs => {
        this.minimalTabs = minimalTabs;
      });
  }

  @HostListener('window:keydown.enter') onEnterHandler() {
    this.onSubmit.emit();
  }
}

@Injectable({
  providedIn: 'root'
})
export class MmModalAbstract {
  readonly modalClosePromise;
  static id;

  constructor(
    public bsModalRef:BsModalRef,
  ) {
    // attach a promise to the BsModalRef (we can access this promise from BsModalRef.content.modalClosePromise)
    // this promise is resolved when the user "submits" or accepts the modal
    // this promise is rejected when the user "cancels" or dismisses the modal (any action that hides the modal that is
    // not clicking the submit button)
    // this resembles how the $uibModal used to work: https://angular-ui.github.io/bootstrap/#!#modal in angularJS
    // where we returned the `result` property in the Modal service.
    this.modalClosePromise = {};
    this.modalClosePromise.promise = new Promise((resolve, reject) => {
      this.modalClosePromise.resolve = resolve;
      this.modalClosePromise.reject = reject;
    });
  }

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
    return modalRef?.content?.modalClosePromise?.promise || Promise.resolve();
  }

  show(template, config?) {
    const modalId = template.id || uuid();
    if (this.modalRefs[modalId]) {
      // no duplicate modals
      return this.getModalClosePromise(this.modalRefs[modalId]);
    }

    config = Object.assign({}, this.config, config);
    const bsModalRef:BsModalRef = this.modalService.show(template, config);

    this.modalRefs[modalId] = bsModalRef;
    bsModalRef.onHidden
      .pipe(take(1)) // so we don't need to unsubscribe
      .subscribe(() => delete this.modalRefs[modalId]);

    return this.getModalClosePromise(bsModalRef);
  }
}
