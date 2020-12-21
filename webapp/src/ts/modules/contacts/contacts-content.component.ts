import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import * as moment from 'moment';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ContactsActions } from '@mm-actions/contacts';
import { ChangesService } from '@mm-services/changes.service';
import { ContactChangeFilterService } from '@mm-services/contact-change-filter.service';

@Component({
  selector: 'contacts-content',
  templateUrl: './contacts-content.component.html'
})
export class ContactsContentComponent implements OnInit, OnDestroy {
  subscription: Subscription = new Subscription();
  private globalActions;
  private contactsActions;
  loadingContent;
  selectedContact;
  contactsLoadingSummary;
  selectedContactChildren;
  forms;
  loadingSelectedContactReports;
  reportStartDate;
  reportsTimeWindowMonths;
  taskEndDate;
  tasksTimeWindowWeeks;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router,
    private changesService: ChangesService,
    private contactChangeFilterService: ContactChangeFilterService,
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
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  subscribeToStore() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getSelectedContact),
      this.store.select(Selectors.getLoadingSelectedContactChildren),
      this.store.select(Selectors.getForms),
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getLoadingSelectedContactReports),
      this.store.select(Selectors.getContactsLoadingSummary),
    ).subscribe(([
      selectedContact,
      selectedContactChildren,
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
      this.selectedContactChildren = selectedContactChildren;
      this.loadingContent = loadingContent;
      this.forms = forms;
      this.loadingSelectedContactReports = loadingSelectedContactReports;
      this.contactsLoadingSummary = contactsLoadingSummary;
    });
    this.subscription.add(reduxSubscription);
  }

  subscribeToRoute() {
    const routeSubscription =  this.route.params.subscribe((params) => {
      if (params.id) {
        this.contactsActions.selectContact(this.route.snapshot.params.id);
        this.globalActions.clearCancelCallback();

        $('.tooltip').remove();
      } else {
        this.globalActions.unsetSelected();
      }
    });
    this.subscription.add(routeSubscription);
  }

  subscribeToChanges() {
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
}
