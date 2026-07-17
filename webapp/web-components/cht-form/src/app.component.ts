import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { EnketoForm, EnketoFormContext, EnketoService } from '@mm-services/enketo.service';
import * as medicXpathExtensions from '../../../src/js/enketo/medic-xpath-extensions';
import moment from 'moment';
import { toBik_text } from 'bikram-sambat';
import { TranslateService } from '@mm-services/translate.service';
import { NgIf, DOCUMENT } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { CHTDatasourceService as CHTDatasourceServiceStub } from './stubs/cht-datasource.service';
import { CONTACT_TYPES } from '@medic/constants';
import { FormConfig } from '@mm-services/form/form-config';

const DEFAULT_FORM_ID = 'cht-form-id';

@Component({
  selector: 'cht-form',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [NgIf, TranslatePipe],
})
export class AppComponent {
  private readonly DEFAULT_USER = { contact_id: 'default_user', language: 'en' } as const;

  private readonly HARDCODED_TYPES = [
    CONTACT_TYPES.DISTRICT_HOSPITAL,
    CONTACT_TYPES.HEALTH_CENTER,
    'clinic',
    'person'
  ];

  private readonly chtDataSourceService: CHTDatasourceServiceStub;

  private formContext = new ChtFormEnketoFormContext();
  private _user: typeof this.DEFAULT_USER & Record<string, any> = this.DEFAULT_USER;

  private enketoForm?: EnketoForm;
  private currentRender?: Promise<void>;
  private reRenderForm = false;

  @Output() onRender: EventEmitter<void> = new EventEmitter();
  @Output() onCancel: EventEmitter<void> = new EventEmitter();
  @Output() onSubmit: EventEmitter<Object[]> = new EventEmitter();

  constructor(
    chtDatasourceService: CHTDatasourceService,
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
    this.formContext.formId = value;
    this.queueRenderForm();
  }

  @Input() set formHtml(value: string | undefined) {
    this.formContext.formHtml = value;
    this.queueRenderForm();
  }

  @Input() set formModel(value: string | undefined) {
    this.formContext.formModel = value;
    this.queueRenderForm();
  }

  @Input() set formXml(value: string | undefined) {
    this.formContext.formXml = value;
    this.queueRenderForm();
  }

  @Input() set contactSummary(value: Record<string, any> | undefined) {
    this.formContext.contactSummary = value ? { id: 'contact-summary', context: value } : undefined;
    this.queueRenderForm();
  }

  @Input() set contactType(value: string | undefined) {
    this.formContext.contactType = value;
    this.queueRenderForm();
  }

  @Input() set content(value: Record<string, any> | undefined) {
    if (value?.contact && !value.source) {
      value.source = 'contact';
    }
    this.formContext.content = value;
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

  @Input() get editing() {
    return this.formContext.editing;
  }


  @Input() get status() {
    return this.formContext.status;
  }

  get formId(): string {
    return this.formContext.formId;
  }

  cancelForm(): void {
    this.tearDownForm();
    this.onCancel.emit();
  }

  async submitForm(): Promise<void> {
    this.formContext.status.saving = true;

    try {
      const submittedDocs = await this.getDocsFromForm();
      this.onSubmit.emit(submittedDocs);
    } catch (e) {
      console.error('Error submitting form data: ', e);
      this.formContext.status.error = await this.translateService.get('error.report.save');
    } finally {
      this.formContext.status.saving = false;
    }
  }

  private async getDocsFromForm() {
    const { contactType } = this.formContext;
    if (contactType) {
      const typeFields = this.HARDCODED_TYPES.includes(contactType)
        ? { type: contactType }
        : { type: 'contact', contact_type: contactType };
      const { preparedDocs } = await this.enketoService.saveContact(this.enketoForm!, typeFields);
      return preparedDocs;
    }
    return this.enketoService.saveReport(
      this.enketoForm!,
      { contact: this.formContext.content?.contact }
    );
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
    if (!this.formContext.formHtml || !this.formContext.formModel || !this.formContext.formXml) {
      return;
    }

    // Can have a race condition where the formId is set here but the Angular attribute data binding has not updated
    // the DOM yet (the formId is used as the id of the .enketo element)
    if (!$(this.formContext.selector).length) {
      return this.waitForSelector(this.formContext.selector)
        .then(() => this.renderForm());
    }

    this.enketoForm = await this.enketoService.renderForm(this.formContext, this._user);
    this.onRender.emit();
  }

  private unloadForm() {
    if (this.enketoForm) {
      this.enketoService.unload(this.enketoForm);
      this.enketoForm = undefined;
      $(`${this.formContext.selector} .container.pages`).empty();
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

  private tearDownForm() {
    this.unloadForm();
    this.formContext = new ChtFormEnketoFormContext();
    this.currentRender = undefined;
    this.reRenderForm = false;

    // The web component framework does some kind of "lazy setting" where it will not call a setter with the same value
    // twice. So, we cannot just reset the internal state of the "inputs" here. We need to call "through the front door"
    //  so the context knows that the values have changed instead of just directly resetting the state of this class.
    const myForm = this.document
      .getElementById(this.formContext.formId)
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
    component.content = undefined;
    // @ts-expect-error it does exist
    component.formId = DEFAULT_FORM_ID;
    // @ts-expect-error it does exist
    component.user = this.DEFAULT_USER;
    // @ts-expect-error it does exist
    component.extensionLibs = undefined;
  }
}

class ChtFormEnketoFormContext implements EnketoFormContext {
  readonly editedListener = () => this.editing = true;
  readonly valuechangeListener = () => this.status.error = null;
  contactSummary?: { id: string, context: Record<string, any> };
  readonly status = {
    saving: false,
    error: null as string | null
  };

  formId = DEFAULT_FORM_ID;
  formXml?: string;
  formHtml?: string;
  formModel?: string;
  contactType?: string;
  content?: Record<string, any>;
  editing = false;

  get formConfig() {
    return new FormConfig(
      { _id: this.formId },
      this.type,
      this.formXml || 'xml',
      this.formHtml || '',
      this.formModel || ''
    );
  }

  get instanceData() {
    return this.content;
  }

  get selector() {
    return `#${this.formId}`;
  }

  get type() {
    return this.contactType ? 'contact': 'report';
  }
}
