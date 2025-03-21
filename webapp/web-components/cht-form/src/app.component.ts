import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { EnketoFormContext, EnketoService } from '@mm-services/enketo.service';
import * as medicXpathExtensions from '../../../src/js/enketo/medic-xpath-extensions';
import moment from 'moment';
import { toBik_text } from 'bikram-sambat';
import { TranslateService } from '@mm-services/translate.service';
import { ContactSaveService } from '@mm-services/contact-save.service';
import { NgIf, DOCUMENT } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { CHTDatasourceService as CHTDatasourceServiceStub } from './stubs/cht-datasource.service';

@Component({
  selector: 'cht-form',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [NgIf, TranslatePipe],
})
export class AppComponent {
  private readonly DEFAULT_FORM_ID = 'cht-form-id';
  private readonly DEFAULT_USER = { contact_id: 'default_user', language: 'en' } as const;
  private readonly DEFAULT_STATUS = {
    saving: false as boolean,
    error: null as string | null,
  } as const;

  private readonly HARDCODED_TYPES = [
    'district_hospital',
    'health_center',
    'clinic',
    'person'
  ];

  private readonly chtDataSourceService: CHTDatasourceServiceStub;

  private _formId = this.DEFAULT_FORM_ID;
  private _formXml?: string;
  private _formModel?: string;
  private _formHtml?: string;
  private _contactSummary?: Record<string, any>;
  private _contactType?: string;
  private _content: Record<string, any> | null = null;
  private _user: typeof this.DEFAULT_USER & Record<string, any> = this.DEFAULT_USER;

  private currentRender?: Promise<void>;
  private reRenderForm = false;

  @Input() editing = false;
  @Input() status = { ...this.DEFAULT_STATUS };

  @Output() onRender: EventEmitter<void> = new EventEmitter();
  @Output() onCancel: EventEmitter<void> = new EventEmitter();
  @Output() onSubmit: EventEmitter<Object[]> = new EventEmitter();

  constructor(
    chtDatasourceService: CHTDatasourceService,
    private readonly contactSaveService: ContactSaveService,
    private readonly enketoService: EnketoService,
    private readonly translateService: TranslateService,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {
    this.chtDataSourceService = chtDatasourceService as unknown as CHTDatasourceServiceStub;
    const zscoreUtil = {};
    medicXpathExtensions.init(zscoreUtil, toBik_text, moment, this.chtDataSourceService.getSync());
  }

  @Input() set formId(value: string) {
    if (!value?.trim().length) {
      throw new Error('The Form Id must be populated.');
    }
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

  @Input() set contactType(value: string | undefined) {
    this._contactType = value;
    this.queueRenderForm();
  }

  @Input() set content(value: Record<string, any> | null) {
    this._content = value;
    if (this._content?.contact && !this._content.source) {
      this._content.source = 'contact';
    }
    this.queueRenderForm();
  }

  @Input() set user(user: typeof this.DEFAULT_USER & Record<string, any>) {
    if (!user) {
      throw new Error('The user must be populated.');
    }
    this._user = { ...this.DEFAULT_USER, ...user };
    this.queueRenderForm();
  }

  @Input() set extensionLibs(value: Record<string, any> | undefined) {
    if (!value) {
      this.chtDataSourceService.clearExtensionLibs();
      this.queueRenderForm();
      return;
    }

    Object
      .keys(value)
      .forEach(key => this.chtDataSourceService.addExtensionLib(key, value[key]));
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
      const submittedDocs = await this.getDocsFromForm();
      this.onSubmit.emit(submittedDocs);
    } catch (e) {
      console.error('Error submitting form data: ', e);
      this.status.error = await this.translateService.get('error.report.save');
    } finally {
      this.status.saving = false;
    }
  }

  private async getDocsFromForm() {
    const currentForm = this.enketoService.getCurrentForm();
    if (this._contactType) {
      const typeFields = this.HARDCODED_TYPES.includes(this._contactType)
        ? { type: this._contactType }
        : { type: 'contact', contact_type: this._contactType };
      const { preparedDocs } = await this.contactSaveService.save(currentForm, null, typeFields, null);
      return preparedDocs;
    }

    const formDoc = {
      xml: this._formXml,
      doc: {}
    };
    return this.enketoService.completeNewReport(this._formId, currentForm, formDoc, this._content?.contact);
  }

  private queueRenderForm() {
    if (this.currentRender) {
      this.reRenderForm = true;
      return;
    }
    this.currentRender = this
      .renderForm()
      .catch(e => console.error('Error rendering form: ', e))
      .finally(() => {
        this.currentRender = undefined;
        if (this.reRenderForm) {
          this.reRenderForm = false;
          this.queueRenderForm();
        }
      });
  }

  private async renderForm() {
    this.unloadForm();
    if (!this._formHtml || !this._formModel || !this._formXml) {
      return;
    }

    const selector = `#${this._formId}`;
    // Can have a race condition where the formId is set here but the Angular attribute data binding has not updated
    // the DOM yet (the formId is used as the id of the .enketo element)
    if (!$(selector).length) {
      return this.waitForSelector(selector)
        .then(() => this.renderForm());
    }

    const editedListener = () => this.editing = true;
    const valuechangeListener = () => this.status.error = null;
    const formDoc = { _id: this._formId };
    const type = this._contactType ? 'contact': 'report';
    const formContext = new EnketoFormContext(selector, type, formDoc, this._content);
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
      $(`#${this._formId} .container.pages`).empty();
    }
  }

  private async waitForSelector(selector: string) {
    return new Promise(resolve => {
      const observer = new MutationObserver(() => {
        if ($(selector).length) {
          observer.disconnect();
          return resolve(true);
        }
      });
      observer.observe($('.body').get(0)!, {
        subtree: true,
        attributeFilter: ['id'],
      });
    });
  }

  private getFormDetails() {
    const $html = $(this._formHtml!);
    const hasContactSummary = $(this._formModel!)
      .find('> instance[id="contact-summary"]')
      .length === 1;
    return {
      html: $html,
      model: this._formModel,
      hasContactSummary: hasContactSummary
    };
  }

  private tearDownForm() {
    this.unloadForm();

    this.editing = false;
    this.status = { ...this.DEFAULT_STATUS };
    this.currentRender = undefined;
    this.reRenderForm = false;

    // The web component framework does some kind of "lazy setting" where it will not call a setter with the same value
    // twice. So, we cannot just reset the internal state of the "inputs" here. We need to call "through the front door"
    //  so the context knows that the values have changed instead of just directly resetting the state of this class.
    const myForm = this.document
      .getElementById(this._formId)
      ?.closest('cht-form');
    const component = myForm || this;
    // @ts-expect-error it does exist
    component.formXml = undefined;
    // @ts-expect-error it does exist
    component.formHtml = undefined;
    // @ts-expect-error it does exist
    component.formModel = undefined;
    // @ts-expect-error it does exist
    component.contactSummary = undefined;
    // @ts-expect-error it does exist
    component.contactType = undefined;
    // @ts-expect-error it does exist
    component.content = null;
    // @ts-expect-error it does exist
    component.formId = this.DEFAULT_FORM_ID;
    // @ts-expect-error it does exist
    component.user = this.DEFAULT_USER;
    // @ts-expect-error it does exist
    component.extensionLibs = undefined;
  }
}
