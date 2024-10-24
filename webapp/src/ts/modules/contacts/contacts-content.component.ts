import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { first, take } from 'rxjs/operators';
import * as moment from 'moment';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ContactsActions } from '@mm-actions/contacts';
import { ChangesService } from '@mm-services/changes.service';
import { ContactChangeFilterService } from '@mm-services/contact-change-filter.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { ContactsMutedComponent } from '@mm-modals/contacts-muted/contacts-muted.component';
import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';
import { ModalService } from '@mm-services/modal.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { SettingsService } from '@mm-services/settings.service';
import { SessionService } from '@mm-services/session.service';
import { MutingTransition } from '@mm-services/transitions/muting.transition';
import { ContactMutedService } from '@mm-services/contact-muted.service';
import { FastAction, FastActionButtonService } from '@mm-services/fast-action-button.service';
import { TelemetryService } from '@mm-services/telemetry.service';

@Component({
  selector: 'contacts-content',
  templateUrl: './contacts-content.component.html'
})
export class ContactsContentComponent implements OnInit, OnDestroy {
  subscriptions: Subscription = new Subscription();
  private subscriptionSelectedContactForms;
  private subscriptionAllContactForms;
  private globalActions;
  private contactsActions;

  private isOnlineOnly;
  loadingContent;
  selectedContact;
  contactsLoadingSummary;
  forms;
  summaryErrorStack;
  loadingSelectedContactReports;
  reportsTimeWindowMonths;
  tasksTimeWindowWeeks;
  userSettings;
  private settings;
  private childTypesBySelectedContact: Record<string, any>[] = [];
  private filters;
  fastActionList?: FastAction[];
  relevantReportForms;
  childContactTypes;
  filteredTasks = [];
  filteredReports: any[] = [];
  DISPLAY_LIMIT = 50;

  constructor(
    private readonly store: Store,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly changesService: ChangesService,
    private readonly contactChangeFilterService: ContactChangeFilterService,
    private readonly xmlFormsService: XmlFormsService,
    private readonly modalService: ModalService,
    private readonly contactTypesService: ContactTypesService,
    private readonly settingsService: SettingsService,
    private readonly responsiveService: ResponsiveService,
    private readonly fastActionButtonService: FastActionButtonService,
    private readonly sessionService: SessionService,
    private readonly mutingTransition: MutingTransition,
    private readonly contactMutedService: ContactMutedService,
    private readonly telemetryService: TelemetryService,
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
    this.subscriptions.unsubscribe();
    this.contactsActions.clearSelection();
  }

  private getUserFacility() {
    const subscription = this.store
      .select(Selectors.getUserFacilityIds)
      .pipe(first(id => id !== null))
      .subscribe((userFacilityIds) => {
        const shouldDisplayHomePlace = userFacilityIds &&
          !this.filters?.search &&
          !this.route.snapshot.params.id &&
          !this.responsiveService.isMobile();

        if (shouldDisplayHomePlace) {
          this.contactsActions.selectContact(userFacilityIds[0]);
        }
      });
    this.subscriptions.add(subscription);
  }

  private async findMatchingProperties(
    object: Record<string, any>,
    search: string,
    skip: string[],
    basePropertyPath = '',
  ) {
    const matchingProperties = new Set<string>();
    const colonSearch = search.split(':');
    if (colonSearch.length > 1) {
      matchingProperties.add(`${colonSearch[0]}:$value`);
    }

    const _search = search.toLowerCase();
    Object.entries(object).forEach(([key, value]) => {
      const _key = key.toLowerCase();
      if (skip.includes(_key) || _key.endsWith('_date')) {
        return;
      }

      const propertyPath = basePropertyPath ? `${basePropertyPath}.${key}` : key;
      if (typeof value === 'string' && value.toLowerCase().includes(_search)) {
        matchingProperties.add(propertyPath);
      }
    });

    return matchingProperties;
  }

  private async recordSearchTelemetry(selectedContact, nextSelectedContact, nextFilters) {
    if (!nextFilters?.search || !nextSelectedContact) {
      return;
    }

    // user searched for something and now selects a contact
    const hadNoContactSelected = selectedContact === null;
    const hadDifferentContactSelected = selectedContact !== null && selectedContact._id !== nextSelectedContact._id;
    if (hadNoContactSelected || hadDifferentContactSelected) {
      const search = nextFilters.search;
      const skip = ['_id', '_rev', 'type', 'refid', 'geolocation'];
      const matchingProperties = await this.findMatchingProperties(nextSelectedContact.doc, search, skip);

      for (const key of matchingProperties) {
        await this.telemetryService.record(`search_match:contacts_by_freetext:${key}`);
        console.info('record', `search_match:contacts_by_freetext:${key}`);
      }
    }
  }

  private subscribeToStore() {
    const reduxSubscription = combineLatest([
      this.store.select(Selectors.getSelectedContact),
      this.store.select(Selectors.getForms),
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getLoadingSelectedContactReports),
      this.store.select(Selectors.getContactsLoadingSummary),
      this.store.select(Selectors.getFilters),
    ]).subscribe(([
      selectedContact,
      forms,
      loadingContent,
      loadingSelectedContactReports,
      contactsLoadingSummary,
      filters,
    ]) => {
      this.recordSearchTelemetry(this.selectedContact, selectedContact, filters);
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
    this.subscriptions.add(reduxSubscription);

    const contactDocSubscription = this.store
      .select(Selectors.getSelectedContactDoc)
      .subscribe(async (contactDoc) => {
        if (!contactDoc) {
          return;
        }
        await this.setChildTypesBySelectedContact();
        await this.setSettings();
        await this.updateFastActions();
        this.subscribeToAllContactXmlForms();
        this.subscribeToSelectedContactXmlForms();
      });
    this.subscriptions.add(contactDocSubscription);

    const contactSummarySubscription = this.store
      .select(Selectors.getSelectedContactSummary)
      .subscribe((summary) => {
        if (!summary || !this.selectedContact?.doc) {
          return;
        }
        if (summary.errorStack){
          this.summaryErrorStack = summary.errorStack;
          return;
        }
        this.subscribeToSelectedContactXmlForms();
      });
    this.subscriptions.add(contactSummarySubscription);

    const contactReportsSubscription = this.store
      .select(Selectors.getSelectedContactReports)
      .subscribe((reports) => {
        this.filterReports(this.reportsTimeWindowMonths, reports);
      });
    this.subscriptions.add(contactReportsSubscription);

    const contactTasksSubscription = this.store
      .select(Selectors.getSelectedContactTasks)
      .subscribe((tasks) => {
        this.filterTasks(this.tasksTimeWindowWeeks, tasks);
      });
    this.subscriptions.add(contactTasksSubscription);
  }

  private subscribeToRoute() {
    const routeSubscription = this.route.params.subscribe((params) => {
      if (params.id) {
        this.contactsActions.selectContact(this.route.snapshot.params.id);
        this.globalActions.clearNavigation();
        return;
      }
      this.contactsActions.clearSelection();
      this.globalActions.unsetSelected();
    });
    this.subscriptions.add(routeSubscription);
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
    this.subscriptions.add(changesSubscription);
  }

  filterReports(months?, reports?) {
    this.reportsTimeWindowMonths = months;
    const reportStartDate = months ? moment().subtract(months, 'months') : null;

    const allReports = reports || this.selectedContact?.reports || [];

    this.filteredReports = this.getFilteredReports(allReports, reportStartDate, this.DISPLAY_LIMIT);
  }

  private getFilteredReports(allReports: any[], startDate, displayLimit): any[] {
    const filteredReports: any[] = [];
    for (const report of allReports) {
      if (filteredReports.length < displayLimit && (!startDate || startDate.isBefore(report.reported_date))) {
        filteredReports.push(report);
      }
    }
    return filteredReports;
  }
  
  filterTasks(weeks?, tasks?) {
    this.tasksTimeWindowWeeks = weeks;
    const taskEndDate = weeks ? moment().add(weeks, 'weeks').format('YYYY-MM-DD') : null;
    const allTasks = tasks || this.selectedContact?.tasks || [];
    this.filteredTasks = allTasks
      .filter((task) => !taskEndDate || task.dueDate <= taskEndDate)
      .slice(0, this.DISPLAY_LIMIT);
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

  private addPermissionToContactType(allowedChildTypes: Record<string, any>[] = []) {
    return allowedChildTypes.map(childType => ({
      ...childType,
      permission: childType.type?.person ? 'can_create_people' : 'can_create_places',
    }));
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
      }
    );
    this.subscriptions.add(this.subscriptionAllContactForms);
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

        this.relevantReportForms = forms.map(xForm => {
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
      }
    );
    this.subscriptions.add(this.subscriptionSelectedContactForms);
  }

  private filterAllowedChildType(forms, childTypes: Record<string, any>[]) {
    if (!childTypes) {
      return;
    }

    return childTypes
      .filter(contactType => forms?.find(form => form._id === contactType.create_form))
      .sort((a, b) => a.id?.localeCompare(b.id));
  }

  private openContactMutedModal(form) {
    if (!form.showUnmuteModal) {
      return this.router.navigate(['/contacts', this.selectedContact?._id, 'report', form.code]);
    }

    this.modalService
      .show(ContactsMutedComponent)
      .afterClosed()
      .pipe(take(1))
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
