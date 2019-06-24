const _ = require('underscore');
const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('ReportsActions',
  function(
    ActionUtils,
    DB,
    GlobalActions,
    LiveList,
    Selectors
  ) {
    'use strict';
    'ngInject';

    return function(dispatch) {

      const globalActions = GlobalActions(dispatch);

      function addSelectedReport(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.ADD_SELECTED_REPORT, 'selected', selected));
      }

      function removeSelectedReport(id) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.REMOVE_SELECTED_REPORT, 'id', id));
      }

      function setFirstSelectedReportDocProperty(doc) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_FIRST_SELECTED_REPORT_DOC_PROPERTY, 'doc', doc));
      }

      function setFirstSelectedReportFormattedProperty(formatted) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_FIRST_SELECTED_REPORT_FORMATTED_PROPERTY, 'formatted', formatted));
      }

      function setSelectedReports(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_REPORTS, 'selected', selected));
      }

      function setVerifyingReport(verifyingReport) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_VERIFYING_REPORT, 'verifyingReport', verifyingReport));
      }

      function updateSelectedReportItem(id, selected) {
        dispatch({
          type: actionTypes.UPDATE_SELECTED_REPORT_ITEM,
          payload: { id, selected }
        });
      }

      function setTitle(model) {
        dispatch(function(dispatch, getState) {
          const formInternalId = model.formInternalId || model.form;
          const forms = Selectors.getForms(getState());
          const form = _.findWhere(forms, { code: formInternalId });
          const name = (form && form.name) || (form && form.title) || model.form;
          globalActions.setTitle(name);
        });
      }

      function setRightActionBar() {
        dispatch(function(dispatch, getState) {
          const selectMode = Selectors.getSelectMode(getState());
          const selectedReportsDocs = Selectors.getSelectedReportsDocs(getState());
          const model = {};
          const doc =
            !selectMode &&
            selectedReportsDocs &&
            selectedReportsDocs.length === 1 &&
            selectedReportsDocs[0];
          if (!doc) {
            return globalActions.setRightActionBar(model);
          }
          model.verified = doc.verified;
          model.type = doc.content_type;
          const verifyingReport = Selectors.getVerifyingReport(getState());
          model.verifyingReport = verifyingReport;
          if (!doc.contact || !doc.contact._id) {
            return globalActions.setRightActionBar(model);
          }

          DB()
            .get(doc.contact._id)
            .then(function(contact) {
              model.sendTo = contact;
              globalActions.setRightActionBar(model);
            })
            .catch(function(err) {
              globalActions.setRightActionBar(model);
              throw err;
            });
        });
      }

      function setSelected(model) {
        dispatch(function(dispatch, getState) {
          const liveList = LiveList.reports;
          const selectMode = Selectors.getSelectMode(getState());
          const selectedReports = Selectors.getSelectedReports(getState());
          let refreshing = true;
          if (selectMode) {
            const existing = _.findWhere(selectedReports, { _id: model.doc._id });
            if (existing) {
              _.extend(existing, model);
            } else {
              model.expanded = false;
              addSelectedReport(model);
            }
          } else {
            if (liveList.initialised()) {
              liveList.setSelected(model.doc && model.doc._id);
            }
            refreshing =
              model.doc &&
              selectedReports.length &&
              selectedReports[0]._id === model.doc._id;
            if (!refreshing) {
              setVerifyingReport(false);
            }

            model.expanded = true;
            setSelectedReports([model]);
            setTitle(model);
          }
          setRightActionBar();
          globalActions.settingSelected(refreshing);
        });
      }

      return {
        addSelectedReport,
        removeSelectedReport,
        setFirstSelectedReportDocProperty,
        setFirstSelectedReportFormattedProperty,
        setSelectedReports,
        updateSelectedReportItem,
        setVerifyingReport,

        setRightActionBar,
        setTitle,
        setSelected
      };
    };
  }
);
