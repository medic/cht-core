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
      this.selectedContact = selectedContact;
      this.selectedContactChildren = selectedContactChildren;
      this.loadingContent = loadingContent;
      this.forms = forms;
      this.loadingSelectedContactReports = loadingSelectedContactReports;
      this.contactsLoadingSummary = contactsLoadingSummary;
    });
    this.subscription.add(reduxSubscription);

    const routeSubscription =  this.route.params.subscribe((params) => {
      if (params.id) {
        this.contactsActions.selectContact(this.route.snapshot.params.id);
        this.globalActions.clearCancelCallback();

        $('.tooltip').remove();
      } else {
        this.globalActions.unsetSelected();
      }
    });

    const changesSubscription = this.changesService.subscribe({
      key: 'contacts-content',
      filter: (change) => {
        return this.contactChangeFilterService.matchContact(change, this.selectedContact) ||
               this.contactChangeFilterService.isRelevantContact(change, this.selectedContact) ||
               this.contactChangeFilterService.isRelevantReport(change, this.selectedContact);
      },
      callback: (change) => {
        if (
          this.contactChangeFilterService.matchContact(change, this.selectedContact) &&
          this.contactChangeFilterService.isDeleted(change)) {
          const parentId = this.selectedContact.doc.parent && this.selectedContact.doc.parent._id;
          return this.router.navigate(['/contacts', { id: parentId }]);
        }
        return this.contactsActions.selectContact(change.id, { silent: true });
      }
    });

    this.subscription.add(routeSubscription);
    this.subscription.add(changesSubscription);
    this.setReportsTimeWindowMonths(3);
    this.setTasksTimeWindowWeeks(1);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  setReportsTimeWindowMonths(months?) {
    this.reportsTimeWindowMonths = months;
    this.reportStartDate = months ? moment().subtract(months, 'months') : null;
  }

  filteredReports() {
    const reports = this.selectedContact.reports;
    return reports.filter((report) => !this.reportStartDate || this.reportStartDate.isBefore(report.reported_date));
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



// const moment = require('moment');
// const responsive = require('../modules/responsive');

// angular.module('inboxControllers').controller('ContactsContentCtrl',
//   function(
//     $log,
//     $ngRedux,
//     $scope,
//     $state,
//     $stateParams,
//     $translate,
//     Changes,
//     ContactChangeFilter,
//     ContactsActions,
//     Debounce,
//     GlobalActions,
//     Selectors,
//     Snackbar,
//     UserSettings
//   ) {

//     'use strict';
//     'ngInject';

//     const ctrl = this;
//     const mapStateToTarget = function(state) {
//       return {
//         forms: Selectors.getForms(state),
//         selectedContact: Selectors.getSelectedContact(state),
//         loadingContent: Selectors.getLoadingContent(state),
//         loadingSelectedContactChildren: Selectors.getLoadingSelectedContactChildren(state),
//         loadingSelectedContactReports: Selectors.getLoadingSelectedContactReports(state),
//         contactsLoadingSummary: Selectors.getContactsLoadingSummary(state)
//       };
//     };
//     const mapDispatchToTarget = function(dispatch) {
//       const contactsActions = ContactsActions(dispatch);
//       const globalActions = GlobalActions(dispatch);
//       return {
//         unsetSelected: globalActions.unsetSelected,
//         setLoadingShowContent: globalActions.setLoadingShowContent,
//         setSelectedContact: contactsActions.setSelectedContact,
//       };
//     };
//     const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

//     let taskEndDate;
//     let reportStartDate;
//     let usersHomePlaceId;

//     ctrl.filterTasks = function(task) {
//       return !taskEndDate || task.dueDate <= taskEndDate;
//     };
//     ctrl.filterReports = function(report) {
//       return !reportStartDate || reportStartDate.isBefore(report.reported_date);
//     };

//     ctrl.setReportsTimeWindowMonths = function(months) {
//       ctrl.reportsTimeWindowMonths = months;
//       reportStartDate = months ? moment().subtract(months, 'months') : null;
//     };

//     ctrl.setTasksTimeWindowWeeks = function(weeks) {
//       ctrl.tasksTimeWindowWeeks = weeks;
//       taskEndDate = weeks ? moment().add(weeks, 'weeks').format('YYYY-MM-DD') : null;
//     };

//     ctrl.setTasksTimeWindowWeeks(1);
//     ctrl.setReportsTimeWindowMonths(3);

//     const getHomePlaceId = function() {
//       return UserSettings()
//         .then(function(user) {
//           return user && user.facility_id;
//         })
//         .catch(function(err) {
//           $log.error('Error fetching user settings', err);
//         });
//     };

//     const selectContact = function(id, silent) {
//       if (!silent) {
//         ctrl.setLoadingShowContent(id);
//       }

//       const getChildPlaces = !usersHomePlaceId || usersHomePlaceId !== id;
//       ctrl.setSelectedContact(id, { getChildPlaces }).catch(err => {
//         if (err.code === 404 && !silent) {
//           $translate('error.404.title').then(Snackbar);
//         }
//         ctrl.unsetSelected();
//         $log.error('Error selecting contact', err);
//       });
//     };

//     // exposed solely for testing purposes
//     this.setupPromise = getHomePlaceId().then(function(id) {
//       usersHomePlaceId = id;

//       if ($stateParams.id) {
//         return selectContact($stateParams.id);
//       }
//       ctrl.unsetSelected();
//       if (responsive.isMobile()) {
//         return;
//       }
//       if (id) {
//         return selectContact(id, true);
//       }
//     });

//     const debouncedReloadContact = Debounce(selectContact, 1000, 10 * 1000);

//     $scope.$on('$destroy', function() {
//       unsubscribe();
//       changeListener.unsubscribe();
//       debouncedReloadContact.cancel();
//     });
//   }
// );
