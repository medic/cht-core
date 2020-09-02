import {Component} from '@angular/core';
import {BsModalRef} from 'ngx-bootstrap/modal';

@Component({
  selector: 'reloading-modal',
  templateUrl: './reloading.component.html'
})
export class ReloadingComponent {
  constructor(public bsModalRef: BsModalRef) {}

  static id = 'reloadingModal';

  submit() {
    this.bsModalRef.hide();
    window.location.reload();
  }

  cancel() {
    this.bsModalRef.hide();
  }
}
