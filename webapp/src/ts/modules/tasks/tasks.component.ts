import * as _ from 'lodash-es';
import { isMobile } from '../../providers/responsive.provider';
import { init as scrollLoaderInit } from '../../providers/scroll-loader.provider';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';
import {GlobalActions} from '../../actions/global';
import {TasksActions} from '../../actions/tasks';
import {ServicesActions} from '../../actions/services';
import { ChangesService } from '../../services/changes.service';
import { SearchService } from '../../services/search.service';
import {Selectors} from '../../selectors';
import { combineLatest, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import {RulesEngineService} from "../../services/rules-engine.service";

const PAGE_SIZE = 50;

@Component({
  templateUrl: './tasks.component.html'
})
export class TasksComponent implements OnInit, OnDestroy {
  private subscription: Subscription = new Subscription();

  private globalActions: GlobalActions;
  private tasksActions: TasksActions;
  private servicesActions: ServicesActions;

  private listContainsTask;

  tasksList;
  selectedTasks;
  forms;
  error;
  errorSyntax;
  loading;
  appending;
  moreItems;
  filters:any = {};
  hasTasks;
  selectMode;
  filtered;

  constructor(
    private store: Store,
    private changesService: ChangesService,
    private searchService: SearchService,
    private rulesEngineService: RulesEngineService,
    private translateService: TranslateService,
  ) {
    const subscription = combineLatest(
      this.store.pipe(select(Selectors.getTasksList)),
      this.store.pipe(select(Selectors.getSelectedTasks)),
      this.store.pipe(select(Selectors.listContainsTask)),
      this.store.pipe(select(Selectors.getForms)),
    ).subscribe(([
      tasksList,
      selectedTasks,
      listContainsTask,
      forms,
    ]) => {
      this.tasksList = tasksList;
      this.selectedTasks = selectedTasks;
      this.listContainsTask = listContainsTask;
      this.forms = forms;
    });
    this.subscription.add(subscription);

    this.globalActions = new GlobalActions(store);
    this.tasksActions = new TasksActions(store);
    this.servicesActions = new ServicesActions(store);
  }

  ngOnInit() {
    this.search();

    const subscription = this.changesService.subscribe({
      key: 'tasks-list',
      callback: (change) => {
        if (change.deleted) {
          this.tasksActions.removeTaskFromList({ _id: change.id });
          this.hasTasks = this.tasksList.length;
          // setActionBarData(); todo
        } else {
          this.query({ silent: true, limit: this.tasksList.length });
        }
      },
      filter: (change) => {
        return change.doc && change.doc.form || this.listContainsTask(change.id);
      },
    });
    this.subscription.add(subscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private prepareTasks(tasks) {
    return tasks.map(task => {
      const form = _.find(this.forms, { code: task.form });
      task.icon = form && form.icon;
      task.summary = form ? form.title : task.form;
      task.lineage = task.subject && task.subject.lineage || task.lineage;
      task.unread = !task.read;

      return task;
    });
  }

  listTrackBy(index, task) {
    return task._id + task._rev;
  }

  private query(opts) {
    const options = Object.assign({ limit: PAGE_SIZE, hydrateContactNames: true }, opts);
    if (options.limit < PAGE_SIZE) {
      options.limit = PAGE_SIZE;
    }

    if (!options.silent) {
      this.error = false;
      this.errorSyntax = false;
      this.loading = true;
      if (this.selectedTasks.length && isMobile()) {
        // ctrl.unsetSelected(); todo
      }

      if (options.skip) {
        this.appending = true;
        options.skip = this.tasksList.length;
      } else if (!options.silent) {
        this.tasksActions.resetTasksList();
      }
    }

    const self = this;
    return this.rulesEngineService.fetchTaskDocsForAllContacts()
    //return this.searchService
    //  .search('tasks', [], options)
      .then((updatedTasks) => {
        // add read status todo
        updatedTasks = this.prepareTasks(updatedTasks);

        self.tasksActions.updateTasksList(updatedTasks);
        // set action bar data todo

        self.moreItems = updatedTasks.length >= options.limit;
        self.hasTasks = !!updatedTasks.length;
        self.loading = false;
        self.appending = false;
        self.error = false;
        self.errorSyntax = false;

        // set first task selected if conditions todo
        // scrolling todo

        self.initScroll();
      })
      .catch(err => {
        self.error = true;
        self.loading = false;
        if (
          self.filters.search &&
          err.reason &&
          err.reason.toLowerCase().indexOf('bad query syntax') !== -1
        ) {
          // invalid freetext filter query
          self.errorSyntax = true;
        }
        console.error('Error loading messages', err);
      });
  }

  private initScroll() {
    scrollLoaderInit(() => {
      if (!this.loading && this.moreItems) {
        this.query({ skip: true });
      }
    });
  };

  search(force = false) {
    // todo filters

    return this.query(force);
  }
}

/*
(function () {

  'use strict';
  angular.module('inboxControllers').controller('TasksCtrl', function(
    $log,
    $ngRedux,
    $scope,
    $stateParams,
    $window,
    Changes,
    ContactTypes,
    Debounce,
    GlobalActions,
    LiveList,
    RulesEngine,
    Selectors,
    TasksActions,
    Telemetry,
    Tour
  ) {
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        selectedTask: Selectors.getSelectedTask(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      const tasksActions = TasksActions(dispatch);
      return {
        unsetSelected: globalActions.unsetSelected,
        setSelectedTask: tasksActions.setSelectedTask,
        setTasksLoaded: tasksActions.setTasksLoaded,
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    ctrl.refreshTaskList = function() {
      $window.location.reload();
    };

    ctrl.setSelectedTask(null);
    ctrl.error = false;
    ctrl.hasTasks = false;
    ctrl.loading = true;

    LiveList.tasks.notifyChange = function() {
      ctrl.hasTasks = LiveList.tasks.count() > 0;
    };
    LiveList.tasks.notifyError = function() {
      ctrl.error = true;
      ctrl.unsetSelected();
    };

    if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }

    $scope.$on('$destroy', () => {
      LiveList.tasks.clearSelected();
      delete LiveList.tasks.notifyChange;
      delete LiveList.tasks.notifyError;
      changesFeed.unsubscribe();
      unsubscribe();
    });

    const refreshTasks = (initialLoad = false) => {
      const telemetryData = {
        start: Date.now(),
      };

      return RulesEngine
        .isEnabled()
        .then(isEnabled => {
          ctrl.tasksDisabled = !isEnabled;
          return isEnabled ? RulesEngine.fetchTaskDocsForAllContacts() : [];
        })
        .then(taskDocs => {
          ctrl.hasTasks = taskDocs.length > 0;
          ctrl.loading = false;
          LiveList.tasks.set(taskDocs.map(doc => doc.emission));

          telemetryData.end = Date.now();
          Telemetry.record(initialLoad ? `tasks:load`: `tasks:refresh`, telemetryData.end - telemetryData.start);
        })
        .catch(err => {
          $log.error('Error getting tasks for all contacts', err);

          const notifyError = LiveList.tasks.notifyError;
          if (notifyError) {
            notifyError();
          }

          ctrl.error = true;
          ctrl.loading = false;
          ctrl.hasTasks = false;
          LiveList.tasks.set([]);
        });
    };

    const isReport = doc => doc.type === 'data_record' && !!doc.form;
    const changesFeed = Changes({
      key: 'refresh-task-list',
      filter: change => !!change.doc && (
        ContactTypes.includes(change.doc) ||
        isReport(change.doc) ||
        change.doc.type === 'task'
      ),
      callback: () => {
        debouncedReload.cancel();
        return debouncedReload();
      },
    });

    const debouncedReload = Debounce(refreshTasks, 1000, 10 * 1000);
    ctrl.setTasksLoaded(refreshTasks(true));
  });
}());
*/
