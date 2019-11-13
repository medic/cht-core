angular.module('inboxControllers').controller('TasksContentCtrl',
  function (
    $log,
    $ngRedux,
    $scope,
    $state,
    $translate,
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
        selectedTask: Selectors.getSelectedTask(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      const tasksActions = TasksActions(dispatch);
      return {
        clearCancelCallback: globalActions.clearCancelCallback,
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

    var setSelectedTask = function(task) {
      LiveList.tasks.setSelected(task._id);
      ctrl.setSelectedTask(task);
      if (typeof task.title === 'string') {
        // new translation key style
        task.title = $translate.instant(task.title, task);
      } else {
        // old message array style
        task.title = TranslateFrom(task.title, task);
      }
      ctrl.setTitle(TranslateFrom(task.title, task));
      ctrl.setShowContent(true);
      if (hasOneActionAndNoFields(task)) {
        ctrl.performAction(task.actions[0], true);
      }
    };

    const setSelected = function(id) {
      if (!id) {
        LiveList.tasks.clearSelected();
        ctrl.unsetSelected();
        return;
      }
      const task = LiveList.tasks.getList().find(task => task._id === id);
      if (task) {
        var refreshing = (ctrl.selectedTask && ctrl.selectedTask._id) === id;
        ctrl.settingSelected(refreshing);
        setSelectedTask(task);
      }
    };

    var geolocation;
    Geolocation()
      .then(function(position) {
        geolocation = position;
      })
      .catch($log.warn);

    var hasOneActionAndNoFields = function(task) {
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

    var markFormEdited = function() {
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
    setSelected($state.params.id);

    $scope.$on('$destroy', unsubscribe);
  }
);
