import { AfterViewInit, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { isEqual as _isEqual } from 'lodash-es';
import { ActivatedRoute, Router } from '@angular/router';

import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { DuplicatesFoundError, FormService, WebappEnketoFormContext } from '@mm-services/form.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { DbService } from '@mm-services/db.service';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { PerformanceService } from '@mm-services/performance.service';
import { TranslateService } from '@mm-services/translate.service';
import { FileReaderService } from '@mm-services/file-reader.service';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatAccordion } from '@angular/material/expansion';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';
import { TranslatePipe } from '@ngx-translate/core';
import { DuplicateContactsComponent } from '@mm-components/duplicate-contacts/duplicate-contacts.component';
import { DuplicateCheck } from '@mm-services/deduplicate.service';
import { Contact, Qualifier } from '@medic/cht-datasource';
import { TelemetryService } from '@mm-services/telemetry.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

@Component({
  templateUrl: './contacts-edit.component.html',
  imports: [NgIf, NgFor, MatAccordion, EnketoComponent, TranslatePipe, DuplicateContactsComponent, NgClass]
})
export class ContactsEditComponent implements OnInit, OnDestroy, AfterViewInit {
  constructor(
    private readonly store: Store,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly lineageModelGeneratorService: LineageModelGeneratorService,
    private readonly formService: FormService,
    private readonly contactTypesService: ContactTypesService,
    private readonly dbService: DbService,
    private readonly performanceService: PerformanceService,
    private readonly telemetryService: TelemetryService,
    readonly chtDatasourceService: CHTDatasourceService,
    private readonly translateService: TranslateService,
    private readonly ngZone: NgZone,
    private readonly fileReaderService: FileReaderService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.getContactFromDatasource = chtDatasourceService.bind(Contact.v1.get);
  }

  subscription = new Subscription();
  translationsLoadedSubscription;
  private globalActions;
  private xmlVersion;
  private readonly getContactFromDatasource: ReturnType<typeof Contact.v1.get>;

  enketoStatus;
  enketoSaving;
  enketoError;
  loadingContent;
  contact;
  contactId;
  errorTranslationKey;
  contentError = false;
  cancelCallback;
  enketoEdited;
  enketoContact;

  private routeSnapshot;
  private trackRender;
  private trackEditDuration;
  private trackSave;
  private trackMetadata = { action: '', form: '' };

  private duplicateCheck?: DuplicateCheck;
  duplicatesAcknowledged = false;

  duplicates: Contact.v1.Contact[] = [];
  duplicateMessage: string = '';

  toggleDuplicatesAcknowledged() {
    this.duplicatesAcknowledged = !this.duplicatesAcknowledged;
    if (this.duplicatesAcknowledged && this.duplicates.length) {
      this.globalActions.setEnketoError(null);
    }
  }

  ngOnInit() {
    this.trackRender = this.performanceService.track();
    this.subscribeToStore();
    this.subscribeToRoute();
  }

  private subscribeToStore() {
    const storeSubscription = combineLatest(
      this.store.select(Selectors.getEnketoStatus),
      this.store.select(Selectors.getEnketoSavingStatus),
      this.store.select(Selectors.getEnketoEditedStatus),
      this.store.select(Selectors.getEnketoError),
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getCancelCallback),
    ).subscribe(([
      enketoStatus,
      enketoSaving,
      enketoEdited,
      enketoError,
      loadingContent,
      cancelCallback,
    ]) => {
      this.enketoError = enketoError;
      this.enketoSaving = enketoSaving;
      this.enketoEdited = enketoEdited;
      this.enketoStatus = enketoStatus;
      this.loadingContent = loadingContent;
      this.cancelCallback = cancelCallback;
    });
    this.subscription.add(storeSubscription);
  }

  private subscribeToRoute() {
    this.routeSnapshot = this.route.snapshot;
    this.resetState();

    const routeSubscription = this.route.params.subscribe((params) => {
      if (_isEqual(this.routeSnapshot.params, params)) {
        // the 1st time we load the form, we must wait for the view to be initialized
        // if we don't skip, it will result in the form being loaded twice
        return;
      }
      this.routeSnapshot = this.route.snapshot;

      this.resetState();
      this.resetFormError();
      this.initForm();
    });
    this.subscription.add(routeSubscription);

    const queryParamsSubscription = this.route.queryParams.subscribe(() => {
      this.routeSnapshot = this.route.snapshot;
      this.setCancelCallback();
    });
    this.subscription.add(queryParamsSubscription);
  }

  private resetState() {
    if (!this.routeSnapshot.params?.id) {
      this.globalActions.unsetSelected();
      this.globalActions.settingSelected();
    }

    this.globalActions.setLoadingContent(true);
    this.globalActions.setShowContent(true);
  }

  private setCancelCallback() {
    const cancelCallback = (router: Router, routeSnapshot) => {
      if (routeSnapshot.queryParams?.from === 'list') {
        router.navigate(['/contacts']);
      } else {
        const parentContactId = routeSnapshot.params.id || routeSnapshot.params.parent_id;
        router.navigate(['/contacts', parentContactId || '']);
      }
    };
    this.globalActions.setCancelCallback(cancelCallback.bind({}, this.router, this.routeSnapshot));
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.translationsLoadedSubscription?.unsubscribe();
    this.globalActions.setTitle();
    if (this.enketoContact?.formInstance) {
      this.formService.unload(this.enketoContact.formInstance);
    }
    this.globalActions.clearNavigation();
    this.globalActions.clearEnketoStatus();
  }

  ngAfterViewInit() {
    this.initForm();
  }

  private async initForm() {
    this.contentError = false;
    this.errorTranslationKey = false;

    try {
      const contact = await this.getContact();
      const contactTypeId = this.contactTypesService.getTypeId(contact) || this.routeSnapshot.params?.type;
      this.duplicateMessage = await this.getDeduplicationMessage(contactTypeId);
      const contactType = await this.contactTypesService.get(contactTypeId);
      if (!contactType) {
        throw new Error(`Unknown contact type "${contactTypeId}"`);
      }

      const formId = await this.getForm(contact, contactType);
      if (!formId) {
        throw new Error('Unknown form');
      }

      const titleKey = (contact ? contactType.edit_key : contactType.create_key) as string;
      this.setTitle(titleKey);
      const formInstance = await this.renderForm(formId, titleKey);
      this.setEnketoContact(formInstance);

      this.globalActions.setLoadingContent(false);
    } catch (error) {
      this.errorTranslationKey = error.translationKey || 'error.loading.form';
      this.globalActions.setLoadingContent(false);
      this.contentError = true;
      console.error('Error loading contact form.', error);
    }
  }

  private getFormInstanceData() {
    const type = this.contactTypesService.getTypeId(this.contact);
    if (!type) {
      return null;
    }

    return { [type]: this.contact };
  }

  private getContact() {
    const id = this.routeSnapshot.params.id;
    if (!id) {
      return Promise.resolve();
    }
    return this.lineageModelGeneratorService
      .contact(id, { merge: true })
      .then((result) => result.doc);
  }

  private async getDeduplicationMessage(entityType?: string) {
    if (entityType) {
      const typedKey = `duplicate_check.contact.${entityType}.duplication_message`;
      const typedMessage = await this.translateService.get(typedKey);
      if (typedMessage !== typedKey) {
        return typedMessage;
      }
    }

    return this.translateService.get('duplicate_check.contact.duplication_message');
  }

  private async getForm(contact, contactType) {
    let formId;
    if (contact) { // editing
      this.contact = contact;
      this.contactId = contact._id;
      formId = contactType.edit_form || contactType.create_form;
      this.trackMetadata.action = 'edit';
    } else { // adding
      this.trackMetadata.action = 'add';
      this.contact = {
        type: 'contact',
        contact_type: this.routeSnapshot.params?.type,
        parent: this.routeSnapshot.params?.parent_id || '',
      };
      this.contactId = null;
      formId = contactType.create_form;

      await this.validateParentForCreateForm();
    }

    return formId;
  }

  private async validateParentForCreateForm() {
    if (!this.contact.parent) {
      await this.ensureValidTopLevelType();
      return;
    }

    const parent = await this.getContactFromDatasource(Qualifier.byUuid(this.contact.parent));

    if (!parent){
      throw new Error(`Parent contact with UUID ${this.contact.parent} not found.`);
    }
  
    const parentType = this.contactTypesService.getTypeId(parent);
    if (!parentType) {
      throw new Error(`Parent type is undefined for parent UUID ${this.contact.parent}.`);
    }

    await this.ensureValidChildType(parentType);
  }

  private async ensureValidTopLevelType() {
    const topLevelTypes = await this.contactTypesService.getChildren();
    if (!topLevelTypes.some(({ id }) => id === this.contact.contact_type)) {
      throw new Error(`Cannot create a ${this.contact.contact_type} at the top level. It requires a parent.`);
    }
  }

  private async ensureValidChildType(parentType: string) {
    const validChildTypes = await this.contactTypesService.getChildren(parentType);
    if (!validChildTypes.some(({ id }) => id === this.contact.contact_type)) {
      throw new Error(`Cannot create a ${this.contact.contact_type} as a child of a ${parentType}.`);
    }
  }

  private setTitle(titleKey: string) {
    this.translationsLoadedSubscription?.unsubscribe();
    this.translationsLoadedSubscription = this.store
      .select(Selectors.getTranslationsLoaded)
      .subscribe((loaded) => {
        if (loaded) {
          this.translateService
            .get(titleKey)
            .then((title) => this.globalActions.setTitle(title));
        }
      });
  }

  private markFormEdited() {
    this.globalActions.setEnketoEditedStatus(true);
  }

  private resetFormError() {
    if (this.enketoError) {
      this.globalActions.setEnketoError(null);
    }
  }

  private async renderForm(formId: string, titleKey: string) {
    const formDoc = await this.dbService.get().get(formId);
    this.xmlVersion = formDoc.xmlVersion;
    this.duplicateCheck = formDoc.duplicate_check;

    this.globalActions.setEnketoEditedStatus(false);

    const formContext = new WebappEnketoFormContext('#contact-form', 'contact', formDoc, this.getFormInstanceData());
    formContext.editedListener = this.markFormEdited.bind(this);
    formContext.valuechangeListener = this.resetFormError.bind(this);
    formContext.titleKey = titleKey;
    const formInstance = await this.formService.render(formContext);

    this.trackMetadata.form = formId;
    this.trackRender?.stop({
      name: ['enketo', 'contacts', this.trackMetadata.form, this.trackMetadata.action, 'render'].join(':'),
      recordApdex: true,
    });
    this.trackEditDuration = this.performanceService.track();

    if (this.contactId) {
      await this.ngZone.runOutsideAngular(() => this.renderAttachmentPreviews(this.contactId));
    }

    return formInstance;
  }

  private getAttachment(docId: string, attachmentName: string): Promise<Blob | undefined> {
    return this.dbService
      .get()
      .getAttachment(docId, attachmentName)
      .catch(e => {
        if (e.status === 404) {
          console.error(`Could not find attachment [${attachmentName}] on doc [${docId}].`);
        } else {
          throw e;
        }
      });
  }

  private async renderAttachmentPreviews(contactId: string): Promise<void> {
    const doc = await this.dbService.get().get(contactId);
    if (!doc._attachments) {
      return;
    }

    const fileInputs = $('#contact-form input[type="file"]:not(.draw-widget__load)');

    await Promise.all(
      fileInputs.map(async (_idx, element) => {
        const $element = $(element);
        const $picker = $element
          .closest('.question')
          .find('.widget.file-picker');

        $picker
          .find('.file-feedback')
          .empty();

        // Currently only support rendering image previews when editing contacts
        if ($element.attr('accept') !== 'image/*') {
          return;
        }

        const fileName = $element.data('loaded-file-name');
        if (!fileName) {
          return;
        }

        const attachmentName = `user-file-${fileName}`;

        if (!doc._attachments[attachmentName]) {
          return;
        }

        const attachmentBlob = await this.getAttachment(contactId, attachmentName);
        if (!attachmentBlob) {
          return;
        }

        const base64 = await this.fileReaderService.base64(attachmentBlob);

        const $preview = $picker.find('.file-preview');
        $preview.empty();
        $preview.append('<img src="data:' + base64 + '">');
      })
    );
  }

  private setEnketoContact(formInstance) {
    this.enketoContact = {
      type: this.contactTypesService.getTypeId(this.contact),
      formInstance: formInstance,
      docId: this.contactId,
    };
  }

  save() {
    if (this.enketoSaving) {
      console.debug('Attempted to call contacts-edit:save more than once');
      return;
    }

    this.trackEditDuration?.stop({
      name: ['enketo', 'contacts', this.trackMetadata.form, this.trackMetadata.action, 'user_edit_time'].join(':'),
    });
    this.trackSave = this.performanceService.track();

    const form = this.enketoContact.formInstance;
    const docId = this.enketoContact.docId;
    this.globalActions.setEnketoSavingStatus(true);
    this.globalActions.setEnketoError(null);

    return Promise
      .resolve(form.validate())
      .then((valid) => {
        if (!valid) {
          throw new Error('Validation failed.');
        }

        // Updating fields before save. Ref: #6670.
        $('form.or').trigger('beforesave');

        if (this.duplicatesAcknowledged && this.duplicates.length) {
          this.telemetryService.record(
            ['enketo', 'contacts', this.enketoContact.type, 'duplicates_acknowledged'].join(':')
          );
        }

        return this.formService
          .saveContact(
            { docId, type: this.enketoContact.type }, 
            { form, xmlVersion: this.xmlVersion, duplicateCheck: this.duplicateCheck}, 
            this.duplicatesAcknowledged
          )
          .then((result) => {
            console.debug('saved contact', result);

            this.globalActions.setEnketoSavingStatus(false);
            this.globalActions.setEnketoEditedStatus(false);

            this.trackSave?.stop({
              name: ['enketo', 'contacts', this.trackMetadata.form, this.trackMetadata.action, 'save'].join(':'),
              recordApdex: true,
            });

            this.translateService
              .get(docId ? 'contact.updated' : 'contact.created')
              .then(snackBarContent => this.globalActions.setSnackbarContent(snackBarContent));

            this.router.navigate(['/contacts', result.docId]);
          })
          .catch((err) => {
            if (err instanceof DuplicatesFoundError) {
              this.duplicates = err.duplicates;
            } else {
              this.duplicates = [];
            }

            console.error('Error submitting form data', err);

            this.globalActions.setEnketoSavingStatus(false);
            return this.translateService
              .get('Error updating contact')
              .then(error => this.globalActions.setEnketoError(error));
          });
      })
      .catch(() => {
        // validation messages will be displayed for individual fields.
        // That's all we want, really.
        this.globalActions.setEnketoSavingStatus(false);
      });
  }

  navigationCancel() {
    this.globalActions.navigationCancel();
  }
}
