import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import * as moment from 'moment';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ContactsActions } from '@mm-actions/contacts';

@Component({
  selector: 'contacts-content',
  templateUrl: './contacts-content.component.html'
})
export class ContactsContentComponent implements OnInit {
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

  constructor(
    private store: Store,
    private route:ActivatedRoute,
    private router:Router,
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
    this.subscription.add(routeSubscription);
    this.setReportsTimeWindowMonths(3);
  }

  setReportsTimeWindowMonths(months) {
    this.reportsTimeWindowMonths = months;
    this.reportStartDate = months ? moment().subtract(months, 'months') : null;
  }
  filteredReports() {
    const reports = this.selectedContact.reports;
    return reports.filter((report) => !this.reportStartDate || this.reportStartDate.isBefore(report.reported_date));
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

//     const changeListener = Changes({
//       key: 'contacts-content',
//       filter: function(change) {
//         return ContactChangeFilter.matchContact(change, ctrl.selectedContact) ||
//                ContactChangeFilter.isRelevantContact(change, ctrl.selectedContact) ||
//                ContactChangeFilter.isRelevantReport(change, ctrl.selectedContact);
//       },
//       callback: function(change) {
//         if (ContactChangeFilter.matchContact(change, ctrl.selectedContact) && ContactChangeFilter.isDeleted(change)) {
//           debouncedReloadContact.cancel();
//           const parentId = ctrl.selectedContact.doc.parent && ctrl.selectedContact.doc.parent._id;
//           return $state.go('contacts.detail', { id: parentId || null });
//         }
//         return debouncedReloadContact(ctrl.selectedContact.doc._id, true);
//       }
//     });

//     $scope.$on('$destroy', function() {
//       unsubscribe();
//       changeListener.unsubscribe();
//       debouncedReloadContact.cancel();
//     });
//   }
// );
