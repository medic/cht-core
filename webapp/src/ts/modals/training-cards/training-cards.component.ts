import { AfterViewInit, Component, NgZone } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { EnketoService } from '@mm-services/enketo.service';

@Component({
  selector: 'training-cards-modal',
  templateUrl: './training-cards.component.html'
})
export class TrainingCardsComponent extends MmModalAbstract implements AfterViewInit {
  constructor(
    bsModalRef: BsModalRef,
    private ngZone: NgZone,
    private xmlFormsService: XmlFormsService,
    private enketoService: EnketoService,
  ) {
    super(bsModalRef);
  }

  static id = 'training-cards-modal';
  form;

  submit() {
    this.close();
    window.location.reload();
  }

  ngAfterViewInit() {
    this.loadForm();
  }

  private loadForm() {
    return this.ngZone.runOutsideAngular(() => this._loadForm());
  }

  private _loadForm() {
    // TODO should I set a loading content spinner here? -- this.globalActions.setLoadingContent
    this.xmlFormsService
      .get('pnc_danger_sign_follow_up_baby')
      .then(form => {
        // TODO: should I set form as edited? -- this.globalActions.setEnketoEditedStatus
        // TODO: because this is a modal, what happens if I load something in the modal but in the background there's
        // TODO: already another form ie report
        console.warn('hey look what I found: ', form);
        return this.ngZone.run(() => this.renderForm(form));
      })
      .catch(error => {
        // TODO: show error.
        console.error('Error fetching form.', error);
      });
  }

  private renderForm(form) {
    return this.enketoService
      .render(
        'training-cards-form',
        form,
        null,
        this.markFormEdited.bind(this),
        this.resetFormError.bind(this),
      )
      .then(form => {
        this.form = form;
        // TODO: do we need this -> this.globalActions.setLoadingContent(false);
      })
      .then(() => {
        /* TODO
        this.telemetryData.postRender = Date.now();
        this.telemetryData.action = model.doc ? 'edit' : 'add';
        this.telemetryData.form = model.formInternalId;

        this.telemetryService.record(
          `enketo:reports:${this.telemetryData.form}:${this.telemetryData.action}:render`,
          this.telemetryData.postRender - this.telemetryData.preRender);
         */
      })
      .catch(error => {
        // TODO: show error.
        console.error('Error loading form.', error);
      });
  }

  private markFormEdited() {
    // TODO: Do we need this -> this.globalActions.setEnketoEditedStatus(true);
  }

  private resetFormError() {
    // TODO: Do we need this ->
    /*if (this.enketoError) {
      this.globalActions.setEnketoError(null);
    }*/
  }
}
