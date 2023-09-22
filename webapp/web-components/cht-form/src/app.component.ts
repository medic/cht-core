import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EnketoFormContext, EnketoService } from '@mm-services/enketo.service';
import * as medicXpathExtensions from '../../../src/js/enketo/medic-xpath-extensions';
import moment from 'moment';
import { toBik_text } from 'bikram-sambat';
import { TranslateService } from '@mm-services/translate.service';

@Component({
  selector: 'cht-form',
  templateUrl: './app.component.html',
})
export class AppComponent {
  editing = false;
  status = {
    saving: false,
    error: null
  };

  @Input() formId?: string;
  @Input() formXml?: string;
  private _formModel?: string;
  private _formHtml?: string;

  @Output() onCancel: EventEmitter<any> = new EventEmitter();
  @Output() onSubmit: EventEmitter<Object[]> = new EventEmitter();

  constructor(
    private enketoService: EnketoService,
    private translateService:TranslateService,
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

  async cancelForm() {
    this.tearDownForm();
    this.onCancel.emit();
  }

  async submitForm() {
    this.status.saving = true;

    try {
      const currentForm = this.enketoService.getCurrentForm();
      const formDoc = {
        xml: this.formXml,
        doc: {}
      };
      const contact = {
        phone: '1234567890',
      };

      const submittedDocs = await this.enketoService.completeNewReport(this.formId, currentForm, formDoc, contact);
      this.tearDownForm();
      this.onSubmit.emit(submittedDocs);
    } catch (e) {
      console.error('Error submitting form data: ', e);
      this.status.error = await this.translateService.get('error.report.save');
    } finally {
      this.status.saving = false;
    }
  }

  private async renderForm() {
    if (!this._formHtml || !this._formModel) {
      return;
    }

    const editedListener = () => this.editing = true;
    const valuechangeListener = () => this.status.error = null;

    const formContext: EnketoFormContext = {
      selector: `#${this.formId}`,
      formDoc: { _id: this.formId },
      instanceData: null,
      editedListener,
      valuechangeListener,
      // isFormInModal,
      // userContact,
    };
    const formDetails = this.getFormDetails();
    const userSettings = {
      contact_id: 'user_contact_id',
      language: 'en',
    };
    const contactSummary = null;

    this.unloadForm();
    await this.enketoService.renderForm(formContext, formDetails, userSettings, contactSummary);
  }

  private unloadForm() {
    const currentForm = this.enketoService.getCurrentForm();
    if (currentForm) {
      this.enketoService.unload(currentForm);
    }
  }

  private getFormDetails() {
    const $html = $(this._formHtml!);
    const hasContactSummary = $(this._formModel!).find('> instance[id="contact-summary"]').length === 1;
    return {
      html: $html,
      model: this._formModel,
      // title: form.title,
      hasContactSummary: hasContactSummary
    };
  }

  private tearDownForm() {
    this.unloadForm();
    this.formXml = undefined;
    this.formHtml = undefined;
    this.formModel = undefined;
  }
}
