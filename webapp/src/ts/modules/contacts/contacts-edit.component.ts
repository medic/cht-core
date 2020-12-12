import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { isEqual as _isEqual } from 'lodash-es';
import { ActivatedRoute, Router } from '@angular/router';

import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { EnketoService } from '@mm-services/enketo.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { DbService } from '@mm-services/db.service';
import { ContactSaveService } from '@mm-services/contact-save.service';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { ContactsActions } from '@mm-actions/contacts';


@Component({
  templateUrl: './contacts-edit.component.html'
})
export class ContactsEditComponent implements OnInit, OnDestroy, AfterViewInit {
  subscription = new Subscription();
  private globalActions;
  private contactsActions;

  constructor(
    private store:Store,
    private route:ActivatedRoute,
    private router:Router,
    private translateService:TranslateService,
    private lineageModelGeneratorService:LineageModelGeneratorService,
    private enketoService:EnketoService,
    private contactTypesService:ContactTypesService,
    private dbService:DbService,
    private contactSaveService:ContactSaveService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.contactsActions = new ContactsActions(store);
  }

  enketoStatus;
  enketoSaving;
  enketoError;
  loadingContent;
  contact;
  contactId;
  errorTranslationKey;
  contentError;
  cancelCallback;
  enketoEdited;

  private enketoContact;
  private routeSnapshot;

  ngOnInit() {
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
    ]) => {
      this.enketoError = enketoError;
      this.enketoSaving = enketoSaving;
      this.enketoEdited = enketoEdited;
      this.enketoStatus = enketoStatus;
      this.loadingContent = loadingContent;
    });
    this.subscription.add(storeSubscription);

    const routeSubscription = this.route.params.subscribe((params) => {
      if (_isEqual(this.routeSnapshot.params, params)) {
        // the 1st time we load the form, we must wait for the view to be initialized
        // if we don't skip, it will result in the form being loaded twice
        return;
      }
      this.routeSnapshot = this.route.snapshot;

      if (!this.routeSnapshot.params?.id) {
        this.globalActions.unsetSelected();
        this.globalActions.settingSelected();
      }
    });
    this.subscription.add(routeSubscription);

    this.globalActions.setLoadingContent(true);
    this.globalActions.setShowContent(true);
    this.globalActions.setCancelCallback(() => {
      if (this.routeSnapshot.query?.from === 'list') {
        this.router.navigate(['/contacts']);
      } else {
        const parentContactId = this.routeSnapshot.params.id || this.routeSnapshot.params.parent_id;
        this.router.navigate(['/contacts', parentContactId]);
      }
    });

    this.resetFormError();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    if (this.routeSnapshot.data.name !== 'contacts.add') {
      this.globalActions.setTitle();
      if (this.enketoContact?.formInstance) {
        this.enketoService.unload(this.enketoContact.formInstance);
      }
    }
  }

  ngAfterViewInit() {
    this
      .getContact()
      .then(contact => this.getForm(contact))
      .then(formId => this.renderForm(formId))
      .then(formInstance => this.setEnketoContact(formInstance))
      .then(() => {
        this.globalActions.setLoadingContent(false);
      })
      .catch((err) => {
        this.errorTranslationKey = err.translationKey || 'error.loading.form';
        this.globalActions.setLoadingContent(false);
        this.contentError = true;
        console.error('Error loading contact form.', err);
      });
  }

  private getFormInstanceData() {
    const type = this.contact?.contact_type || this.contact?.type;
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

  private getForm(contact) {
    let formId;
    let titleKey;
    const typeId = contact?.contact_type || contact?.type || this.routeSnapshot.params.type;
    return this.contactTypesService.get(typeId).then(type => {
      if (!type) {
        console.error(`Unknown contact type "${typeId}"`);
        return;
      }

      if (contact) { // editing
        this.contact = contact;
        this.contactId = contact._id;
        titleKey = type.edit_key;
        formId = type.edit_form || type.create_form;
      } else { // adding
        this.contact = {
          type: 'contact',
          contact_type: this.routeSnapshot.params.type,
          parent: this.routeSnapshot.params.parent_id
        };
        this.contactId = null;
        formId = type.create_form;
        titleKey = type.create_key;
      }

      this.subscription.add(
        this.store.select(Selectors.getTranslationsLoaded).subscribe(loaded => {
          if (loaded) {
            const title = this.translateService.instant(titleKey);
            this.globalActions.setTitle(title);
          }
        })
      );

      return formId;
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

  private renderForm(formId) {

    if (!formId) {
      // Disable next and prev buttons
      $('#contact-form')
        .find('.form-footer .btn')
        .filter('.previous-page, .next-page')
        .addClass('disabled');
      return;
    }
    this.globalActions.setEnketoEditedStatus(false);
    return this.dbService
      .get()
      .get(formId)
      .then(form => {
        const formInstanceData = this.getFormInstanceData();
        const markFormEdited = this.markFormEdited.bind(this);
        const resetFormError = this.resetFormError.bind(this);
        return this.enketoService.renderContactForm(
          '#contact-form',
          form,
          formInstanceData,
          markFormEdited,
          resetFormError
        );
      });
  }

  private setEnketoContact(formInstance) {
    this.enketoContact = {
      type: this.contact.contact_type || this.contact.type,
      formInstance: formInstance,
      docId: this.contactId,
    };
  }

  save() {
    if (this.enketoSaving) {
      console.debug('Attempted to call contacts-edit:$scope.save more than once');
      return;
    }

    const form = this.enketoContact.formInstance;
    const docId = this.enketoContact.docId;
    this.globalActions.setEnketoSavingStatus(true);
    this.globalActions.setEnketoError(null);

    return form
      .validate()
      .then((valid) => {
        if(!valid) {
          throw new Error('Validation failed.');
        }

        return this.contactSaveService
          .save(form, docId, this.enketoContact.type)
          .then((result) => {
            console.debug('saved report', result);

            this.globalActions.setEnketoSavingStatus(false);
            const snackBarContent = this.translateService.instant(docId ? 'contact.updated' : 'contact.created');
            this.globalActions.setSnackbarContent(snackBarContent);
            this.globalActions.setEnketoEditedStatus(false);

            this.router.navigate(['/contacts', result.docId]);
          })
          .catch((err) => {
            this.globalActions.setEnketoSavingStatus(false);
            console.error('Error submitting form data', err);
            this.globalActions.setEnketoError(this.translateService.instant('Error updating contact'));
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
