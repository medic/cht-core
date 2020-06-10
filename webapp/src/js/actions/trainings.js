const _ = require('lodash/core');
const actionTypes = require('./actionTypes');
/* const lineageFactory = require('@medic/lineage'); */

angular.module('inboxServices').factory('TrainingsActions',
  function(
    $log,
    $state,
    /* $translate, */
    ActionUtils,
    /* Auth, */
    DB,
    GlobalActions,
    LiveList,
    MarkRead,
    /* Modal,
    Search, */
    Selectors,
    /* ServicesActions, */    
    TrainingViewModelGenerator
  ) {
    'use strict';
    'ngInject';

    return function(dispatch) {

      const globalActions = GlobalActions(dispatch);
      /* const servicesActions = ServicesActions(dispatch); */

      function addSelectedTraining(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.ADD_SELECTED_TRAINING, 'selected', selected));
      }

      function removeSelectedTraining(id) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.REMOVE_SELECTED_TRAINING, 'id', id));
        setRightActionBar();
        globalActions.settingSelected(true);
        $(`#trainings-list li[data-record-id="${id}"] input[type="checkbox"]`).prop('checked', false);
      }

      function setFirstSelectedTrainingDocProperty(doc) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_FIRST_SELECTED_TRAINING_DOC_PROPERTY, 'doc', doc));
      } 

      function setFirstSelectedTrainingFormattedProperty(formatted) {
        dispatch(ActionUtils.createSingleValueAction(
          actionTypes.SET_FIRST_SELECTED_TRAINING_FORMATTED_PROPERTY, 'formatted', formatted
        ));
      }

      function setSelectedTrainings(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_TRAININGS, 'selected', selected));
      }

      /* function setVerifyingTraining(verifyingTraining) {
        dispatch(ActionUtils.createSingleValueAction(
          actionTypes.SET_VERIFYING_TRAINING, 'verifyingTraining', verifyingTraining
        ));
      } */

      function updateSelectedTrainingItem(id, selected) {
        dispatch({
          type: actionTypes.UPDATE_SELECTED_TRAINING_ITEM,
          payload: { id, selected }
        });
      }

      function setTitle(model) {
        dispatch(function(dispatch, getState) {
          const formInternalId = model.formInternalId || model.form;
          const forms = Selectors.getForms(getState());
          const form = _.find(forms, { code: formInternalId });
          const name = (form && form.name) || (form && form.title) || model.form;
          globalActions.setTitle(name);
        });
      }

      function getContact(id) {
        return DB().get(id)
          // log the error but continue anyway
          .catch(err => $log.error('Error fetching contact for action bar', err));
      }

      function setRightActionBar() {
        dispatch(function(dispatch, getState) {
          const selectMode = Selectors.getSelectMode(getState());
          const selectedTrainingsDocs = Selectors.getSelectedTrainingsDocs(getState());
          const model = {};
          const doc =
            !selectMode &&
            selectedTrainingsDocs &&
            selectedTrainingsDocs.length === 1 &&
            selectedTrainingsDocs[0];
          if (!doc) {
            return globalActions.setRightActionBar(model);
          }
          model.verified = doc.verified;
          model.type = doc.content_type;
          /* const verifyingTraining = Selectors.getVerifyingTraining(getState());
          model.verifyingTraining = verifyingTraining; */
          if (!doc.contact || !doc.contact._id) {
            return globalActions.setRightActionBar(model);
          }

          getContact(doc.contact._id).then(contact => {
            model.sendTo = contact;
            globalActions.setRightActionBar(model);
          });
        });
      }

      function setSelected(model) {
        dispatch(function(dispatch, getState) {
          const selectMode = Selectors.getSelectMode(getState());
          const selectedTrainings = Selectors.getSelectedTrainings(getState());
          let refreshing = true;
          if (selectMode) {
            const existing = _.find(selectedTrainings, { _id: model.doc._id });
            if (existing) {
              Object.assign(existing, model);
            } else {
              model.expanded = false;
              addSelectedTraining(model);
            }
          } else {
            if (LiveList.trainings.initialised()) {
              LiveList.trainings.setSelected(model.doc && model.doc._id);
              LiveList['training-search'].setSelected(model.doc && model.doc._id);
            }
            refreshing =
              model.doc &&
              selectedTrainings.length &&
              selectedTrainings[0]._id === model.doc._id;
            /* if (!refreshing) {
              setVerifyingTraining(false);
            } */

            model.expanded = true;
            setSelectedTrainings([model]);
            setTitle(model);

            const listModel = LiveList.trainings.getList().find(item => item._id === model._id);
            if (listModel && !listModel.read) {
              const unreadCount = Selectors.getUnreadCount(getState());
              globalActions.updateUnreadCount({ training: unreadCount.training - 1 });
              listModel.read = true;
              LiveList.trainings.update(listModel);
              LiveList['training-search'].update(listModel);
              MarkRead([model.doc]).catch(err => $log.error('Error marking read', err));
            }
          }
          setRightActionBar();
          globalActions.settingSelected(refreshing);
        });
      }

      const selectTraining = (id, { silent=false }={}) => {
        if (!id) {
          return Promise.resolve();
        }
        if (!silent) {
          globalActions.setLoadingShowContent(id);
        }
        return TrainingViewModelGenerator(id)
          .then(model => {
            if (model) {
              setSelected(model);
            }
          })
          .catch(err => {
            globalActions.unsetSelected();
            $log.error('Error selecting training', err);
          });
      };

      /* function deselectAll() {
        dispatch(() => {
          setSelectedTrainings([]);
          setRightActionBar();
          setCheckboxElements(false);
        });
      }

      function toggleVerifyingTraining() {
        dispatch((dispatch, getState) => {
          const verifyingTraining = Selectors.getVerifyingTraining(getState());
          setVerifyingTraining(!verifyingTraining);
          setRightActionBar();
        });
      } */

      /* function clearSelection() {
        setSelectedTrainings([]);
        // setVerifyingTraining(false); 
        LiveList.trainings.clearSelected();
        LiveList['training-search'].clearSelected();
        setCheckboxElements(false);
      } */

      /* function selectAll() {
        dispatch((dispatch, getState) => {
          globalActions.setLoadingShowContent(true);
          const filters = Selectors.getFilters(getState());
          Search('trainings', filters, { limit: 500, hydrateContactNames: true })
            .then(summaries => {
              const selected = summaries.map(summary => {
                return {
                  _id: summary._id,
                  summary: summary,
                  expanded: false,
                  lineage: summary.lineage,
                  contact: summary.contact,
                };
              });
              setSelectedTrainings(selected);
              globalActions.settingSelected(true);
              setRightActionBar();
              setCheckboxElements(true);
            })
            .catch(err => $log.error('Error selecting all', err));
        });
      } */

      function setSelect(value) {
        globalActions.setSelectMode(value);
        globalActions.unsetSelected();
        $state.go('trainings.detail', { id: null });
      }

      /* function verifyTraining(trainingIsVerified) {
        dispatch((dispatch, getState) => {

          const getFirstSelected = () => Selectors.getSelectedTrainings(getState())[0];

          if (!getFirstSelected().doc.form) {
            return;
          }

          globalActions.setLoadingSubActionBar(true);

          const promptUserToConfirmVerification = () => {
            const verificationTranslationKey = trainingIsVerified ?
              'trainings.verify.valid' : 'trainings.verify.invalid';
            return Modal({
              templateUrl: 'templates/modals/verify_confirm.html',
              controller: 'VerifyTrainingModalCtrl',
              model: {
                proposedVerificationState: $translate.instant(verificationTranslationKey),
              },
            })
              .then(() => true)
              .catch(() => false);
          };

          const shouldTrainingBeVerified = canUserEdit => {
            // verify if user verifications are allowed
            if (canUserEdit) {
              return true;
            }

            // don't verify if user can't edit and this is an edit
            const docHasExistingResult = getFirstSelected().doc.verified !== undefined;
            if (docHasExistingResult) {
              return false;
            }

            // verify if this is not an edit and the user accepts  prompt
            return promptUserToConfirmVerification();
          };

          const writeVerificationToDoc = () => {
            if (getFirstSelected().doc.contact) {
              const minifiedContact = lineageFactory().minifyLineage(getFirstSelected().doc.contact);
              setFirstSelectedTrainingDocProperty({ contact: minifiedContact });
            }

            const clearVerification = getFirstSelected().doc.verified === trainingIsVerified;
            if (clearVerification) {
              setFirstSelectedTrainingDocProperty({
                verified: undefined,
                verified_date: undefined,
              });
            } else {
              setFirstSelectedTrainingDocProperty({
                verified: trainingIsVerified,
                verified_date: Date.now(),
              });
            }
            servicesActions.setLastChangedDoc(getFirstSelected().doc);

            return DB()
              .get(getFirstSelected().doc._id)
              .then(existingRecord => {
                setFirstSelectedTrainingDocProperty({ _rev: existingRecord._rev });
                return DB().post(getFirstSelected().doc);
              })
              .catch(err => $log.error('Error verifying message', err))
              .finally(() => {
                const oldVerified = getFirstSelected().formatted.verified;
                const newVerified = oldVerified === trainingIsVerified ? undefined : trainingIsVerified;
                setFirstSelectedTrainingFormattedProperty({ verified: newVerified, oldVerified: oldVerified });
                globalActions.setRightActionBarVerified(newVerified);
              });
          };

          globalActions.setLoadingSubActionBar(true);
          Auth.has('can_edit_verification')
            .then(canUserEditVerifications => shouldTrainingBeVerified(canUserEditVerifications))
            .then(shouldVerify => {
              if (shouldVerify) {
                return writeVerificationToDoc();
              }
            })
            .catch(err => $log.error(`Error verifying message: ${err}`))
            .finally(() => globalActions.setLoadingSubActionBar(false));
        });
      }

      function launchEditFacilityDialog() {
        dispatch((dispatch, getState) => {
          const selectedTrainings = Selectors.getSelectedTrainings(getState());
          Modal({
            templateUrl: 'templates/modals/edit_training.html',
            controller: 'EditTrainingCtrl',
            controllerAs: 'editTrainingCtrl',
            model: { training: selectedTrainings[0].doc },
          });
        });
      }

      const setCheckboxElements = value => {
        $('#trainings-list input[type="checkbox"]').prop('checked', value);
      };  */

      return {
        addSelectedTraining,
        /* clearSelection,
        deselectAll, */
        removeSelectedTraining,
        /* launchEditFacilityDialog, 
        selectAll, */
        selectTraining,
        setFirstSelectedTrainingDocProperty,
        setFirstSelectedTrainingFormattedProperty,
        setRightActionBar,
        setSelect,
        setSelected,
        setSelectedTrainings,
        setTitle,
        /* setVerifyingTraining,
        toggleVerifyingTraining, */
        updateSelectedTrainingItem,
        /* verifyTraining, */
      };
    };
  }
);
