import { AfterViewInit, Component, EventEmitter, Input, Output } from '@angular/core';
import { EnketoFormContext, EnketoService } from '@mm-services/enketo.service';
import undoDeathForm from './undo_death_report.json';
import * as medicXpathExtensions from '../../../src/js/enketo/medic-xpath-extensions';
import moment from 'moment';
import { toBik_text } from 'bikram-sambat';

@Component({
  selector: 'cht-form',
  templateUrl: './app.component.html',
})
export class AppComponent {
  // This is necessary because we need it to reference the container element
  @Input() formId;
  // string: (optional) data to include in the data-editing attribute
  @Input() editing;
  // object: object with 'saving', and 'error' properties to update form status
  @Input() status;
  // function: to be called when cancelling out of the form
  @Output() onCancel: EventEmitter<any> = new EventEmitter();
  // function: to be called when submitting the form
  @Output() onSubmit: EventEmitter<any> = new EventEmitter();

  private _formModel: string;
  private _formHtml : string;

  constructor(
    private _enketoService: EnketoService,
  ) {
    const zscoreUtil = { };
    const api = { };
    medicXpathExtensions.init(zscoreUtil, toBik_text, moment, api);
  }

  @Input() set formHtml(value) {
    this._formHtml = value;
    this.renderForm();
  }

  @Input() set formModel(value) {
    this._formModel = value;
    this.renderForm();
  }

  private transformXml(form) {
      const $html = $(this._formHtml);
      const hasContactSummary = $(this._formModel).find('> instance[id="contact-summary"]').length === 1;
      return {
        html: $html,
        model: this._formModel,
        title: form.title,
        hasContactSummary: hasContactSummary
      };
  }

  private async renderForm() {
    if (!this._formHtml || !this._formModel) {
      return;
    }

    // This is the form document (form:undo_death_report)
    const form = undoDeathForm;
    const reportContent = null;
    const editedListener = () => {};
    const valuechangeListener = () => {};

    const formContext: EnketoFormContext = {
      selector: `#${this.formId}`,
      formDoc: form,
      instanceData: null,
      editedListener,
      valuechangeListener,
      // isFormInModal,
      // userContact,
    };
    const doc = this.transformXml({ title: 'Undo death report' });
    const userSettings = {
      contact_id: 'user_contact_id',
      language: 'en',
    };
    const contactSummary = null;

    await this._enketoService.renderForm(formContext, doc, userSettings, contactSummary);
  }

  // TODO Need to figure out the save process
}
