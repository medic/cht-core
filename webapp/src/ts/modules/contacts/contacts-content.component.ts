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
import { isMobile } from '@mm-providers/responsive.provider';
import { TranslateService } from '@ngx-translate/core';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { ContactsMutedComponent } from '@mm-modals/contacts-muted/contacts-muted.component';
import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { SessionService } from '@mm-services/session.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { SettingsService } from '@mm-services/settings.service';

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
  loadingContent;
  selectedContact;
  contactsLoadingSummary;
  forms;
  loadingSelectedContactReports;
  reportStartDate;
  reportsTimeWindowMonths;
  taskEndDate;
  tasksTimeWindowWeeks;
  userSettings;
  settings;
  childTypesBySelectedContact = [];
  canDeleteContact = false; // this disables the "Delete" button until children load

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
    private sessionService: SessionService,
    private userSettingsService: UserSettingsService,
  ){
    this.globalActions = new GlobalActions(store);
    this.contactsActions = new ContactsActions(store);
  }

  ngOnInit() {
    this.subscribeToStore();
    this.subscribeToRoute();
    this.subscribeToChanges();
    this.setReportsTimeWindowMonths(3);
    this.setTasksTimeWindowWeeks(1);
    this.getUserFacility();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private getUserFacility() {
    this.store.select(Selectors.getUserFacilityId)
      .pipe(first(id => id !== null))
      .subscribe((userFacilityId) => {
        if (userFacilityId && !this.route.snapshot.params.id && !isMobile()) {
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
    ).subscribe(([
      selectedContact,
      forms,
      loadingContent,
      loadingSelectedContactReports,
      contactsLoadingSummary,
    ]) => {
      if (this.selectedContact !== selectedContact) {
        this.setReportsTimeWindowMonths(3);
        this.setTasksTimeWindowWeeks(1);
      }
      this.selectedContact = selectedContact;
      this.loadingContent = loadingContent;
      this.forms = forms;
      this.loadingSelectedContactReports = loadingSelectedContactReports;
      this.contactsLoadingSummary = contactsLoadingSummary;
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
      .subscribe((contactDoc) => {
        if (!contactDoc) {
          return;
        }
        this.setRightActionBar();
      });
    this.subscription.add(contactDocSubscription);
  }

  private subscribeToRoute() {
    const routeSubscription =  this.route.params.subscribe((params) => {
      if (params.id) {
        this.contactsActions.selectContact(this.route.snapshot.params.id);
        this.globalActions.clearCancelCallback();

        $('.tooltip').remove();
      } else {
        this.contactsActions.setSelectedContact(null);
        this.globalActions.unsetSelected();
      }
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
          return this.router.navigate([`/contacts/${parentId}`]);
        }
        return this.contactsActions.selectContact(change.id, { silent: true });
      }
    });
    this.subscription.add(changesSubscription);
  }

  setReportsTimeWindowMonths(months?) {
    this.reportsTimeWindowMonths = months;
    this.reportStartDate = months ? moment().subtract(months, 'months') : null;
  }

  filteredReports() {
    const reports = this.selectedContact?.reports;
    if (reports) {
      return reports.filter((report) => !this.reportStartDate || this.reportStartDate.isBefore(report.reported_date));
    }
    return [];
  }

  filteredTasks() {
    const tasks = this.selectedContact.tasks;
    return tasks.filter((task) => !this.taskEndDate || task.dueDate <= this.taskEndDate);
  }

  setTasksTimeWindowWeeks(weeks?) {
    this.tasksTimeWindowWeeks = weeks;
    this.taskEndDate = weeks ? moment().add(weeks, 'weeks').format('YYYY-MM-DD') : null;
  }

  private async setRightActionBar() {
    await this.setChildTypesBySelectedContact();
    await this.setUserSettings();
    await this.setSettings();

    this.globalActions.setRightActionBar({
      relevantForms: [], // This disables the "New Action" button until forms load
      sendTo: this.selectedContact?.type?.person ? this.selectedContact?.doc : '',
      canDelete: this.canDeleteContact,
      canEdit: this.sessionService.isAdmin() || this.userSettings?.facility_id !== this.selectedContact?.doc?._id,
      openContactMutedModal: (form) => this.openContactMutedModal(form),
      openSendMessageModal: (sendTo) => this.openSendMessageModal(sendTo)
    });

    this.subscribeToAllContactXmlForms();
    this.subscribeToSelectedContactXmlForms();
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
      'ContactsReportsForms',
      { contactForms: true },
      (error, forms) => {
        if (error) {
          console.error('Error fetching allowed contact forms', error);
          return;
        }

        const allowedChildTypes = this.filterAllowedChildType(forms, this.childTypesBySelectedContact);
        this.globalActions.updateRightActionBar({
          childTypes: this.getModelsFromChildTypes(allowedChildTypes)
        });
      }
    );
    this.subscription.add(this.subscriptionAllContactForms);
  }

  private subscribeToSelectedContactXmlForms() {
    if (!this.selectedContact) {
      return;
    }

    if (this.subscriptionSelectedContactForms) {
      this.subscriptionSelectedContactForms.unsubscribe();
    }

    this.subscriptionSelectedContactForms = this.xmlFormsService.subscribe(
      'selectedContactForms',
      {
        doc: this.selectedContact.doc,
        contactSummary: this.selectedContact.summary?.context,
        contactForms: false,
      },
      (error, forms) => {
        if (error) {
          console.error('Error fetching relevant forms', error);
          return;
        }

        if (!forms) {
          return;
        }

        const formSummaries = forms
          .map(xForm => {
            const title = xForm.translation_key ?
              this.translateService.instant(xForm.translation_key) : this.translateFromService.get(xForm.title);
            const isUnmute = !!(xForm.internalId && this.settings?.muting?.unmute_forms?.includes(xForm.internalId));
            return {
              code: xForm.internalId,
              title: title,
              icon: xForm.icon,
              showUnmuteModal: this.selectedContact.doc?.muted && !isUnmute
            };
          })
          .sort((a, b) => a.title?.localeCompare(b.title));
        this.globalActions.updateRightActionBar({ relevantForms: formSummaries });
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
      this.router.navigate(['/contacts', this.selectedContact._id, 'report', form.code]);
      return;
    }

    this.modalService
      .show(ContactsMutedComponent)
      .then(() => this.router.navigate(['/contacts', this.selectedContact._id, 'report', form.code]))
      .catch(() => {});
  }

  private openSendMessageModal(sendTo) {
    this.modalService
      .show(SendMessageComponent, { initialState: { fields: { to: sendTo } } })
      .catch(() => {});
  }
}
