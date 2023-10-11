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

  private _formId: string = 'cht-form-id';
  private _formXml?: string;
  private _formModel?: string;
  private _formHtml?: string;
  private _contactSummary?: Record<string, any>;
  private _content: Record<string, any> | null;
  private _user: Record<string, any> = {
    contact_id: 'default_user',
    language: 'en',
  };

  private currentRender: Promise<void> = Promise.resolve();

  @Output() onCancel: EventEmitter<undefined> = new EventEmitter();
  @Output() onSubmit: EventEmitter<Object[]> = new EventEmitter();

  constructor(
    private enketoService: EnketoService,
    private translateService: TranslateService,
  ) {
    const zscoreUtil = {};
    const api = {};
    medicXpathExtensions.init(zscoreUtil, toBik_text, moment, api);
  }

  @Input() set formId(value: string) {
    this._formId = value;
    this.queueRenderForm();
  }

  @Input() set formHtml(value: string | undefined) {
    this._formHtml = value;
    this.queueRenderForm();
  }

  @Input() set formModel(value: string | undefined) {
    this._formModel = value;
    this.queueRenderForm();
  }

  @Input() set formXml(value: string | undefined) {
    this._formXml = value;
    this.queueRenderForm();
  }

  @Input() set contactSummary(value: Record<string, any> | undefined) {
    this._contactSummary = value ? { context: value } : undefined;
    this.queueRenderForm();
  }

  @Input() set content(value: Record<string, any> | null) {
    this._content = value;
    if (this._content?.contact && !this._content.source) {
      this._content.source = 'contact';
    }

    this.queueRenderForm();
  }

  @Input() set user(user: Record<string, any>) {
    if (!user) {
      throw new Error('User data must be provided.');
    }
    this._user = { ...user, language: user.language || 'en' };
    this.queueRenderForm();
  }

  get formId() {
    return this._formId;
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
        xml: this._formXml,
        doc: {}
      };
      const contact = null;  // Only used for setting `from` and `contact` fields on docs
      const submittedDocs = await this.enketoService.completeNewReport(this._formId, currentForm, formDoc, contact);
      this.tearDownForm();
      this.onSubmit.emit(submittedDocs);
    } catch (e) {
      console.error('Error submitting form data: ', e);
      this.status.error = await this.translateService.get('error.report.save');
    } finally {
      this.status.saving = false;
    }
  }

  private queueRenderForm() {
    // Ensure that only one render is happening at a time
    this.currentRender = this.currentRender.then(() => this.renderForm());
  }

  private async renderForm() {
    this.unloadForm();
    if (!this._formHtml || !this._formModel || !this._formXml) {
      return;
    }

    const editedListener = () => this.editing = true;
    const valuechangeListener = () => this.status.error = null;
    const selector = `#${this._formId}`;
    const formDoc = { _id: this._formId };
    const formContext = new EnketoFormContext(selector, 'report', formDoc, this._content);
    formContext.editedListener = editedListener;
    formContext.valuechangeListener = valuechangeListener;
    formContext.contactSummary = this._contactSummary;
    const formDetails = this.getFormDetails();

    await this.enketoService.renderForm(formContext, formDetails, this._user);
  }

  private unloadForm() {
    const currentForm = this.enketoService.getCurrentForm();
    if (currentForm) {
      this.enketoService.unload(currentForm);
    }
  }

  private getFormDetails() {
    const $html = $(this._formHtml!);
    const hasContactSummary = $(this._formModel!)
      .find('> instance[id="contact-summary"]')
      .length === 1;
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
