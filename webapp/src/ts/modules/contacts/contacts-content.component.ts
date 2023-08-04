import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import * as moment from 'moment';
import { groupBy as _groupBy } from 'lodash-es';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ContactsActions } from '@mm-actions/contacts';
import { ChangesService } from '@mm-services/changes.service';
import { ContactChangeFilterService } from '@mm-services/contact-change-filter.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { ContactsMutedComponent } from '@mm-modals/contacts-muted/contacts-muted.component';
import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';
import { ModalService } from '@mm-services/modal.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { SettingsService } from '@mm-services/settings.service';
import { SessionService } from '@mm-services/session.service';
import { TranslateService } from '@mm-services/translate.service';
import { MutingTransition } from '@mm-services/transitions/muting.transition';
import { ContactMutedService } from '@mm-services/contact-muted.service';
import { FastAction, FastActionButtonService } from '@mm-services/fast-action-button.service';

@Component({
  selector: 'contacts-content',
  templateUrl: './contacts-content.component.html'
})
export class ContactsContentComponent implements OnInit, OnDestroy {
  subscription: Subscription = new Subscription();
  private subscriptionSelectedContactForms;
  private subscriptionAllContactForms;
  private globalActions;
  private contactsActions;

  private isOnlineOnly;
  loadingContent;
  selectedContact;
  contactsLoadingSummary;
  forms;
  loadingSelectedContactReports;
  reportsTimeWindowMonths;
  tasksTimeWindowWeeks;
  userSettings;
  private settings;
  private childTypesBySelectedContact = [];
  private filters;
  canDeleteContact = false; // this disables the "Delete" button until children load
  fastActionList: FastAction[];
  relevantReportForms;
  childContactTypes;
  filteredTasks = [];
  filteredReports = [];

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router,
    private changesService: ChangesService,
    private contactChangeFilterService: ContactChangeFilterService,
    private translateService: TranslateService,
    private translateFromService: TranslateFromService,
    private xmlFormsService: XmlFormsService,
    private modalService: ModalService,
    private contactTypesService: ContactTypesService,
    private settingsService: SettingsService,
    private userSettingsService: UserSettingsService,
    private responsiveService: ResponsiveService,
    private fastActionButtonService: FastActionButtonService,
    private sessionService: SessionService,
    private mutingTransition: MutingTransition,
    private contactMutedService: ContactMutedService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.contactsActions = new ContactsActions(store);
  }

  ngOnInit() {
    this.isOnlineOnly = this.sessionService.isOnlineOnly();

    this.subscribeToStore();
    this.subscribeToRoute();
    this.subscribeToChanges();
    this.getUserFacility();
    this.resetTaskAndReportsFilter();
  }

  private resetTaskAndReportsFilter() {
    this.filterReports(3);
    this.filterTasks(1);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.contactsActions.clearSelection();
    this.globalActions.setRightActionBar({});
  }

  private getUserFacility() {
    this.store.select(Selectors.getUserFacilityId)
      .pipe(first(id => id !== null))
      .subscribe((userFacilityId) => {
        const shouldDisplayHomePlace = userFacilityId &&
          !this.filters?.search &&
          !this.route.snapshot.params.id &&
          !this.responsiveService.isMobile();

        if (shouldDisplayHomePlace) {
          this.contactsActions.selectContact(userFacilityId);
        }
      });
  }

  private subscribeToStore() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getSelectedContact),
      this.store.select(Selectors.getForms),
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getLoadingSelectedContactReports),
      this.store.select(Selectors.getContactsLoadingSummary),
      this.store.select(Selectors.getFilters),
    ).subscribe(([
      selectedContact,
      forms,
      loadingContent,
      loadingSelectedContactReports,
      contactsLoadingSummary,
      filters,
    ]) => {
      if (this.selectedContact?._id !== selectedContact?._id) {
        // reset view when selected contact changes
        this.resetTaskAndReportsFilter();
      }
      this.selectedContact = selectedContact;
      this.loadingContent = loadingContent;
      this.forms = forms;
      this.loadingSelectedContactReports = loadingSelectedContactReports;
      this.contactsLoadingSummary = contactsLoadingSummary;
      this.filters = filters;
    });
    this.subscription.add(reduxSubscription);

    const childrenSubscription = this.store
      .select(Selectors.getSelectedContactChildren)
      .subscribe((selectedContactChildren) => {
        const canDelete = !!selectedContactChildren?.every(group => !group.contacts?.length);

        if (this.canDeleteContact === canDelete) {
          return;
        }

        this.canDeleteContact = canDelete;
        this.globalActions.updateRightActionBar({ canDelete: this.canDeleteContact });
      });
    this.subscription.add(childrenSubscription);

    const contactDocSubscription = this.store
      .select(Selectors.getSelectedContactDoc)
      .subscribe(async (contactDoc) => {
        if (!contactDoc) {
          return;
        }
        await this.setChildTypesBySelectedContact();
        await this.setSettings();
        await Promise.all([ this.setRightActionBar(), this.updateFastActions() ]);
        this.subscribeToAllContactXmlForms();
        this.subscribeToSelectedContactXmlForms();
      });
    this.subscription.add(contactDocSubscription);

    const contactSummarySubscription = this.store
      .select(Selectors.getSelectedContactSummary)
      .subscribe((summary) => {
        if (!summary || !this.selectedContact?.doc) {
          return;
        }

        this.subscribeToSelectedContactXmlForms();
      });
    this.subscription.add(contactSummarySubscription);

    const contactReportsSubscription = this.store
      .select(Selectors.getSelectedContactReports)
      .subscribe((reports) => {
        this.filterReports(this.reportsTimeWindowMonths, reports);
      });
    this.subscription.add(contactReportsSubscription);

    const contactTasksSubscription = this.store
      .select(Selectors.getSelectedContactTasks)
      .subscribe((tasks) => {
        this.filterTasks(this.tasksTimeWindowWeeks, tasks);
      });
    this.subscription.add(contactTasksSubscription);
  }

  private subscribeToRoute() {
    const routeSubscription =  this.route.params.subscribe((params) => {
      if (params.id) {
        this.contactsActions.selectContact(this.route.snapshot.params.id);
        this.globalActions.clearNavigation();
        return;
      }
      this.contactsActions.clearSelection();
      this.globalActions.unsetSelected();
    });
    this.subscription.add(routeSubscription);
  }

  private subscribeToChanges() {
    const changesSubscription = this.changesService.subscribe({
      key: 'contacts-content',
      filter: (change) => {
        return this.contactChangeFilterService.matchContact(change, this.selectedContact) ||
               this.contactChangeFilterService.isRelevantContact(change, this.selectedContact) ||
               this.contactChangeFilterService.isRelevantReport(change, this.selectedContact);
      },
      callback: (change) => {
        const matchedContact = this.contactChangeFilterService.matchContact(change, this.selectedContact);
        const contactDeleted = this.contactChangeFilterService.isDeleted(change);
        if (matchedContact && contactDeleted) {
          const parentId = this.selectedContact.doc.parent && this.selectedContact.doc.parent._id;
          return this.router.navigate(['/contacts', parentId]);
        }
        return this.contactsActions.selectContact(this.selectedContact._id, { silent: true });
      }
    });
    this.subscription.add(changesSubscription);
  }

  filterReports(months?, reports?) {
    this.reportsTimeWindowMonths = months;
    const reportStartDate = months ? moment().subtract(months, 'months') : null;

    const allReports = reports || this.selectedContact?.reports || [];
    this.filteredReports = allReports
      .filter((report) => !reportStartDate || reportStartDate.isBefore(report.reported_date));
  }

  filterTasks(weeks?, tasks?) {
    this.tasksTimeWindowWeeks = weeks;
    const taskEndDate = weeks ? moment().add(weeks, 'weeks').format('YYYY-MM-DD') : null;
    const allTasks = tasks || this.selectedContact?.tasks || [];
    this.filteredTasks = allTasks.filter((task) => !taskEndDate || task.dueDate <= taskEndDate);
  }

  private async setRightActionBar() {
    await this.setUserSettings();

    this.globalActions.setRightActionBar({
      relevantForms: [], // This disables the "New Action" button until forms load
      sendTo: this.selectedContact?.type?.person ? this.selectedContact?.doc : '',
      canDelete: this.canDeleteContact,
      canEdit: this.isOnlineOnly || this.userSettings?.facility_id !== this.selectedContact?.doc?._id,
      openContactMutedModal: (form) => this.openContactMutedModal(form),
      openSendMessageModal: (sendTo) => this.openSendMessageModal(sendTo),
    });
  }

  private async updateFastActions() {
    this.fastActionList = await this.fastActionButtonService.getContactRightSideActions({
      xmlReportForms: this.relevantReportForms,
      childContactTypes: this.childContactTypes,
      parentFacilityId: this.selectedContact.doc?._id,
      communicationContext: {
        sendTo: this.selectedContact?.type?.person && this.selectedContact?.doc,
        callbackOpenSendMessage: (sendTo) => this.openSendMessageModal(sendTo),
      },
      callbackContactReportModal: (form) => this.openContactMutedModal(form),
    });
  }

  private addPermissionToContactType(allowedChildTypes = []) {
    return allowedChildTypes.map(childType => ({
      ...childType,
      permission: childType.type?.person ? 'can_create_people' : 'can_create_places',
    }));
  }

  private setUserSettings() {
    if (this.userSettings) {
      return;
    }
    return this.userSettingsService
      .get()
      .then(userSettings => this.userSettings = userSettings)
      .catch(error => console.error('Error fetching user settings', error));
  }

  private setSettings() {
    if (this.settings) {
      return;
    }
    return this.settingsService
      .get()
      .then(settings => this.settings = settings)
      .catch(error => console.error('Error fetching settings', error));
  }

  private async setChildTypesBySelectedContact() {
    if (!this.selectedContact) {
      this.childTypesBySelectedContact = [];
      return;
    }

    if (!this.selectedContact.type) {
      const type = this.contactTypesService.getTypeId(this.selectedContact.doc);
      console.error(`Unknown contact type "${type}" for contact "${this.selectedContact.doc?._id}"`);
      this.childTypesBySelectedContact = [];
      return;
    }

    return this.contactTypesService
      .getChildren(this.selectedContact.type.id)
      .then(childTypes => this.childTypesBySelectedContact = childTypes)
      .catch(error => console.error('Error fetching contact child types', error));
  }

  private subscribeToAllContactXmlForms() {
    if (this.subscriptionAllContactForms) {
      this.subscriptionAllContactForms.unsubscribe();
    }

    this.subscriptionAllContactForms = this.xmlFormsService.subscribe(
      'SelectedContactChildrenForms',
      { contactForms: true },
      (error, forms) => {
        if (error) {
          console.error('Error fetching allowed contact forms', error);
          return;
        }

        const allowedChildTypes = this.filterAllowedChildType(forms, this.childTypesBySelectedContact);
        this.childContactTypes = this.addPermissionToContactType(allowedChildTypes);
        this.updateFastActions();
        this.globalActions.updateRightActionBar({
          childTypes: this.getModelsFromChildTypes(allowedChildTypes)
        });
      }
    );
    this.subscription.add(this.subscriptionAllContactForms);
  }

  private subscribeToSelectedContactXmlForms() {
    if (!this.selectedContact || !this.selectedContact.summary || !this.selectedContact.doc) {
      return;
    }

    if (this.subscriptionSelectedContactForms) {
      this.subscriptionSelectedContactForms.unsubscribe();
    }

    this.subscriptionSelectedContactForms = this.xmlFormsService.subscribe(
      'SelectedContactReportForms',
      {
        doc: this.selectedContact.doc,
        contactSummary: this.selectedContact.summary.context,
        reportForms: true,
      },
      (error, forms) => {
        if (error) {
          console.error('Error fetching relevant forms', error);
          return;
        }

        if (!forms) {
          return;
        }

        this.relevantReportForms = forms
          .map(xForm => {
            const isUnmuteForm = this.mutingTransition.isUnmuteForm(xForm.internalId, this.settings);
            const isMuted = this.contactMutedService.getMuted(this.selectedContact.doc);
            return {
              id: xForm._id,
              code: xForm.internalId,
              title: xForm.title,
              titleKey: xForm.translation_key,
              icon: xForm.icon,
              showUnmuteModal: isMuted && !isUnmuteForm,
            };
          });

        this.updateFastActions();

        const oldActionsBarForms = this.relevantReportForms
          .map(form => {
            const title = form.titleKey ?
              this.translateService.instant(form.titleKey) : this.translateFromService.get(form.title);
            return { ...form, title };
          })
          .sort((a, b) => a.title?.localeCompare(b.title));

        this.globalActions.updateRightActionBar({ relevantForms: oldActionsBarForms });
      }
    );
    this.subscription.add(this.subscriptionSelectedContactForms);
  }

  private filterAllowedChildType(forms, childTypes) {
    if (!childTypes) {
      return;
    }

    return childTypes
      .filter(contactType => forms?.find(form => form._id === contactType.create_form))
      .sort((a, b) => a.id?.localeCompare(b.id));
  }

  private getModelsFromChildTypes(childTypes) {
    const grouped = _groupBy(childTypes, type => type.person ? 'persons' : 'places');
    const models = [];

    if (grouped.places) {
      models.push({
        menu_key: 'Add place',
        menu_icon: 'fa-building',
        permission: 'can_create_places',
        types: grouped.places
      });
    }

    if (grouped.persons) {
      models.push({
        menu_key: 'Add person',
        menu_icon: 'fa-user',
        permission: 'can_create_people',
        types: grouped.persons
      });
    }

    return models;
  }

  private openContactMutedModal(form) {
    if (!form.showUnmuteModal) {
      return this.router.navigate(['/contacts', this.selectedContact?._id, 'report', form.code]);
    }

    this.modalService
      .show(ContactsMutedComponent)
      .afterClosed()
      .subscribe(navigate => {
        if (navigate) {
          this.router.navigate(['/contacts', this.selectedContact?._id, 'report', form.code]);
        }
      });
  }

  private openSendMessageModal(sendTo) {
    this.modalService.show(SendMessageComponent, { data: { to: sendTo } });
  }
}
