import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { isEqual as _isEqual } from 'lodash-es';
import { ActivatedRoute, Router } from '@angular/router';

import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { EnketoFormContext, EnketoService } from '@mm-services/enketo.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { DbService } from '@mm-services/db.service';
import { ContactSaveService } from '@mm-services/contact-save.service';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { ContactsActions } from '@mm-actions/contacts';
import { TranslateService } from '@mm-services/translate.service';


@Component({
  templateUrl: './contacts-edit.component.html'
})
export class ContactsEditComponent implements OnInit, OnDestroy, AfterViewInit {
  constructor(
    private store:Store,
    private route:ActivatedRoute,
    private router:Router,
    private lineageModelGeneratorService:LineageModelGeneratorService,
    private enketoService:EnketoService,
    private contactTypesService:ContactTypesService,
    private dbService:DbService,
    private contactSaveService:ContactSaveService,
    private translateService:TranslateService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.contactsActions = new ContactsActions(store);
  }

  subscription = new Subscription();
  translationsLoadedSubscription;
  private globalActions;
  private contactsActions;
  private xmlVersion;

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

  ngOnInit() {
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
    const cancelCallback = (router:Router, routeSnapshot) => {
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
      this.enketoService.unload(this.enketoContact.formInstance);
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
      const contactType = await this.contactTypesService.get(contactTypeId);
      if (!contactType) {
        throw new Error(`Unknown contact type "${contactTypeId}"`);
      }

      const formId = this.getForm(contact, contactType);
      if (!formId) {
        throw new Error('Unknown form');
      }

      const titleKey = contact ? contactType.edit_key : contactType.create_key;
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
      return {};
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

  private getForm(contact, contactType) {
    let formId;
    if (contact) { // editing
      this.contact = contact;
      this.contactId = contact._id;
      formId = contactType.edit_form || contactType.create_form;
    } else { // adding
      this.contact = {
        type: 'contact',
        contact_type: this.routeSnapshot.params?.type,
        parent: this.routeSnapshot.params?.parent_id || '',
      };
      this.contactId = null;
      formId = contactType.create_form;
    }

    return formId;
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
    const instanceData = this.getFormInstanceData();
    const markFormEdited = this.markFormEdited.bind(this);
    const resetFormError = this.resetFormError.bind(this);
    const formContext: EnketoFormContext = {
      selector: '#contact-form',
      formDoc,
      instanceData,
      editedListener: markFormEdited,
      valuechangeListener: resetFormError,
      titleKey,
    };

    this.globalActions.setEnketoEditedStatus(false);

    return this.enketoService.renderContactForm(formContext);
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

    const form = this.enketoContact.formInstance;
    const docId = this.enketoContact.docId;
    this.globalActions.setEnketoSavingStatus(true);
    this.globalActions.setEnketoError(null);

    return Promise
      .resolve(form.validate())
      .then((valid) => {
        if(!valid) {
          throw new Error('Validation failed.');
        }

        // Updating fields before save. Ref: #6670.
        $('form.or').trigger('beforesave');

        return this.contactSaveService
          .save(form, docId, this.enketoContact.type, this.xmlVersion)
          .then((result) => {
            console.debug('saved contact', result);

            this.globalActions.setEnketoSavingStatus(false);
            this.globalActions.setEnketoEditedStatus(false);

            this.translateService
              .get(docId ? 'contact.updated' : 'contact.created')
              .then(snackBarContent => this.globalActions.setSnackbarContent(snackBarContent));

            this.router.navigate(['/contacts', result.docId]);
          })
          .catch((err) => {
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
