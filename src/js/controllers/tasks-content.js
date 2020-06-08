angular.module('inboxControllers').controller('TasksContentCtrl',
  function (
    $log,
    $ngRedux,
    $q,
    $scope,
    $state,
    $translate,
    DB,
    Enketo,
    Geolocation,
    GlobalActions,
    LiveList,
    Selectors,
    Snackbar,
    TasksActions,
    Telemetry,
    TranslateFrom,
    XmlForms
  ) {

    'use strict';
    'ngInject';

    const telemetryData = {
      preRender: Date.now()
    };

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        enketoStatus: Selectors.getEnketoStatus(state),
        enketoSaving: Selectors.getEnketoSavingStatus(state),
        loadingContent: Selectors.getLoadingContent(state),
        selectedTask: Selectors.getSelectedTask(state),
        loadTasks: Selectors.getLoadTasks(state),
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      const tasksActions = TasksActions(dispatch);
      return {
        clearCancelCallback: globalActions.clearCancelCallback,
        navigationCancel: globalActions.navigationCancel,
        unsetSelected: globalActions.unsetSelected,
        setCancelCallback: globalActions.setCancelCallback,
        setEnketoEditedStatus: globalActions.setEnketoEditedStatus,
        setEnketoSavingStatus: globalActions.setEnketoSavingStatus,
        setEnketoError: globalActions.setEnketoError,
        setTitle: globalActions.setTitle,
        setSelectedTask: tasksActions.setSelectedTask,
        selectAction: tasksActions.selectAction,
        settingSelected: globalActions.settingSelected,
        setShowContent: globalActions.setShowContent,
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);


    const setSelected = function(id) {
      if (!id) {
        LiveList.tasks.clearSelected();
        ctrl.unsetSelected();
        return;
      }
      const task = LiveList.tasks.getList().find(task => task._id === id);
      if (task) {
        const refreshing = (ctrl.selectedTask && ctrl.selectedTask._id) === id;
        ctrl.settingSelected(refreshing);
        hydrateTaskEmission(task).then(hydratedTask => {
          ctrl.setSelectedTask(hydratedTask);
          LiveList.tasks.setSelected(hydratedTask._id);
          ctrl.setTitle(hydratedTask.title);
          ctrl.setShowContent(true);

          if (hasOneActionAndNoFields(hydratedTask)) {
            ctrl.performAction(hydratedTask.actions[0], true);
          }
        });
      }
    };

    let geolocation;
    Geolocation()
      .then(function(position) {
        geolocation = position;
      })
      .catch($log.warn);

    const hasOneActionAndNoFields = function(task) {
      return Boolean(
        task &&
        task.actions &&
        task.actions.length === 1 &&
        (
          !task.fields ||
          task.fields.length === 0 ||
          !task.fields[0].value ||
          task.fields[0].value.length === 0
        )
      );
    };

    const hydrateTaskEmission = function(task) {
      if (!Array.isArray(task.actions) || task.actions.length === 0 || !task.forId) {
        return $q.resolve(task);
      }

      const setActionsContacts = (task, contact) => {
        task.actions.forEach(action => {
          action.content = action.content || {};
          action.content.contact = action.content.contact || contact;
        });
      };

      return DB()
        .get(task.forId)
        .catch(err => {
          if (err.status !== 404) {
            throw err;
          }

          $log.info('Failed to hydrate contact information in task action', err);
          return { _id: task.forId };
        })
        .then(contactDoc => {
          setActionsContacts(task, contactDoc);
          return task;
        });
    };

    const markFormEdited = function() {
      ctrl.setEnketoEditedStatus(true);
    };

    ctrl.performAction = function(action, skipDetails) {
      ctrl.setCancelCallback(function() {
        ctrl.setSelectedTask(null);
        if (skipDetails) {
          $state.go('tasks.detail', { id: null });
        } else {
          Enketo.unload(ctrl.form);
          ctrl.form = null;
          ctrl.loadingForm = false;
          ctrl.contentError = false;
          ctrl.clearCancelCallback();
        }
      });
      ctrl.contentError = false;
      if (action.type === 'report') {
        ctrl.loadingForm = true;
        ctrl.formId = action.form;
        XmlForms.get(action.form)
          .then(function(formDoc) {
            ctrl.setEnketoEditedStatus(false);
            return Enketo.render('#task-report', formDoc, action.content, markFormEdited)
              .then(function(formInstance) {
                ctrl.form = formInstance;
                ctrl.loadingForm = false;
                if (formDoc.translation_key) {
                  ctrl.setTitle($translate.instant(formDoc.translation_key));
                } else {
                  ctrl.setTitle(TranslateFrom(formDoc.title));
                }
              })
              .then(() => {
                telemetryData.postRender = Date.now();
                telemetryData.action = action.content.doc ? 'edit' : 'add';
                telemetryData.form = ctrl.formId;

                Telemetry.record(
                  `enketo:tasks:${telemetryData.form}:${telemetryData.action}:render`,
                  telemetryData.postRender - telemetryData.preRender);
              });
          })
          .catch(function(err) {
            ctrl.errorTranslationKey = err.translationKey || 'error.loading.form';
            ctrl.contentError = true;
            ctrl.loadingForm = false;
            $log.error('Error loading form.', err);
          });
      } else if (action.type === 'contact') {
        $state.go('contacts.addChild', action.content);
      }
    };

    ctrl.save = function() {
      if (ctrl.enketoSaving) {
        $log.debug('Attempted to call tasks-content:$scope.save more than once');
        return;
      }

      telemetryData.preSave = Date.now();

      Telemetry.record(
        `enketo:tasks:${telemetryData.form}:${telemetryData.action}:user_edit_time`,
        telemetryData.preSave - telemetryData.postRender);

      ctrl.setEnketoSavingStatus(true);
      ctrl.setEnketoError(null);
      Enketo.save(ctrl.formId, ctrl.form, geolocation)
        .then(function(docs) {
          $log.debug('saved report and associated docs', docs);
          $translate('report.created').then(Snackbar);
          ctrl.setEnketoSavingStatus(false);
          ctrl.setEnketoEditedStatus(false);
          Enketo.unload(ctrl.form);
          ctrl.unsetSelected();
          ctrl.clearCancelCallback();
          $state.go('tasks.detail', { id: null });
        })
        .then(() => {
          telemetryData.postSave = Date.now();

          Telemetry.record(
            `enketo:tasks:${telemetryData.form}:${telemetryData.action}:save`,
            telemetryData.postSave - telemetryData.preSave);
        })
        .catch(function(err) {
          ctrl.setEnketoSavingStatus(false);
          $log.error('Error submitting form data: ', err);
          $translate('error.report.save').then(function(msg) {
            ctrl.setEnketoError(msg);
          });
        });
    };

    ctrl.form = null;
    ctrl.formId = null;
    ctrl.loadTasks.then(() => setSelected($state.params.id));

    $scope.$on('$destroy', unsubscribe);
  }
);
