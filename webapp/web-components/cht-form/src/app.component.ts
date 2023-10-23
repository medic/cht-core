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
  private readonly DEFAULT_FORM_ID = 'cht-form-id';
  private readonly DEFAULT_USER = { contact_id: 'default_user', language: 'en' } as const;
  private readonly DEFAULT_STATUS = {
    saving: false as boolean,
    error: null as string | null,
  } as const;

  private _formId = this.DEFAULT_FORM_ID;
  private _formXml?: string;
  private _formModel?: string;
  private _formHtml?: string;
  private _contactSummary?: Record<string, any>;
  private _content: Record<string, any> | null = null;
  private _user: Record<string, any> = this.DEFAULT_USER;
  private currentRender = Promise.resolve();

  editing = false;
  status = { ...this.DEFAULT_STATUS };

  @Output() onRender: EventEmitter<Object> = new EventEmitter();
  @Output() onCancel: EventEmitter<void> = new EventEmitter();
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
    if (!value || !value.trim().length) {
      throw new Error('The Form Id must be populated.');
    }
    this._formId = value;
    this.queueRenderForm();
  }

  @Input() set formHtml(value: string) {
    if (!value || !value.trim().length) {
      throw new Error('The Form HTML must be populated.');
    }
    this._formHtml = value;
    this.queueRenderForm();
  }

  @Input() set formModel(value: string) {
    if (!value || !value.trim().length) {
      throw new Error('The Form Model must be populated.');
    }
    this._formModel = value;
    this.queueRenderForm();
  }

  @Input() set formXml(value: string) {
    if (!value || !value.trim().length) {
      throw new Error('The Form XML must be populated.');
    }
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
      throw new Error('The user must be populated.');
    }
    this._user = { ...this.DEFAULT_USER, ...user };
    this.queueRenderForm();
  }

  get formId(): string {
    return this._formId;
  }

  cancelForm(): void {
    this.tearDownForm();
    this.onCancel.emit();
  }

  async submitForm(): Promise<void> {
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
    this.onRender.emit();
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
    this._formXml = undefined;
    this._formHtml = undefined;
    this._formModel = undefined;
    this._contactSummary = undefined;
    this._content = null;
    this._formId = this.DEFAULT_FORM_ID;
    this._user = this.DEFAULT_USER;
    this.editing = false;
    this.status = { ...this.DEFAULT_STATUS };
  }
}
