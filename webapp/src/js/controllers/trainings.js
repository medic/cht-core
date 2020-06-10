const _ = require('lodash/core');
const responsive = require('../modules/responsive');
const scrollLoader = require('../modules/scroll-loader');

const PAGE_SIZE = 50;

angular
  .module('inboxControllers')
  .controller('TrainingsCtrl', function(
    $log,
    $ngRedux,
    $scope,
    $state,
    $stateParams,
    $timeout,
    AddReadStatus,
    Changes,
    Export,
    GlobalActions,
    LiveList,
    Search,
    SearchFilters,
    Selectors,
    ServicesActions,
    Tour,
    TrainingsActions
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = state => ({
      enketoEdited: Selectors.getEnketoEditedStatus(state),
      filters: Selectors.getFilters(state),
      forms: Selectors.getForms(state),
      selectMode: Selectors.getSelectMode(state),
      selectedTrainings: Selectors.getSelectedTrainings(state),
      selectedTrainingsDocs: Selectors.getSelectedTrainingsDocs(state),
      showContent: Selectors.getShowContent(state),
      unreadCount: Selectors.getUnreadCount(state)/* ,
      verifyingTraining: Selectors.getVerifyingTraining(state) */
    });
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      const trainingsActions = TrainingsActions(dispatch);
      const servicesActions = ServicesActions(dispatch);
      return Object.assign({}, globalActions, servicesActions, trainingsActions);
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    // selected objects have the form
    //    { _id: 'abc', summary: { ... }, training: { ... }, expanded: false }
    // where the summary is the data required for the collapsed view,
    // training is the db doc, and expanded is whether to how the details
    // or just the summary in the content pane.
    ctrl.setSelectedTrainings([]);
    ctrl.appending = false;
    ctrl.error = false;
    ctrl.setFilters({
      search: $stateParams.query,
    });
    ctrl.verifyingTraining = false;

    let liveList = LiveList.trainings;

    const updateLiveList = function(updated) {
      return AddReadStatus.trainings(updated).then(function() {
        updated.forEach(function(training) {
          liveList.update(training);
        });
        ctrl.hasTrainings = liveList.count() > 0;
        liveList.refresh();
        if ($state.params.id) {
          liveList.setSelected($state.params.id);
        }
        setActionBarData();
        return updated;
      });
    };

    const query = function(opts) {
      const options = Object.assign({ limit: PAGE_SIZE, hydrateContactNames: true }, opts);
      if (options.limit < PAGE_SIZE) {
        options.limit = PAGE_SIZE;
      }
      if (!options.silent) {
        ctrl.error = false;
        ctrl.errorSyntax = false;
        ctrl.loading = true;
        if (ctrl.selectedTrainings.length && responsive.isMobile()) {
          ctrl.unsetSelected();
        }
      }
      if (options.skip) {
        ctrl.appending = true;
        options.skip = liveList.count();
      } else if (!options.silent) {
        liveList.set([]);
      }

      Search('trainings', ctrl.filters, options)
        .then(updateLiveList)
        .then(function(data) {
          ctrl.moreItems = liveList.moreItems = data.length >= options.limit;
          ctrl.loading = false;
          ctrl.appending = false;
          ctrl.error = false;
          ctrl.errorSyntax = false;
          if (
            !$state.params.id &&
            !responsive.isMobile() &&
            !ctrl.selectedTrainings &&
            !ctrl.selectMode &&
            $state.is('trainings.detail')
          ) {
            $timeout(function() {
              const id = $('.inbox-items li')
                .first()
                .attr('data-record-id');
              $state.go('trainings.detail', { id: id }, { location: 'replace' });
            });
          }
          syncCheckboxes();
          initScroll();
        })
        .catch(function(err) {
          ctrl.error = true;
          ctrl.loading = false;
          if (
            ctrl.filters.search &&
            err.reason &&
            err.reason.toLowerCase().indexOf('bad query syntax') !== -1
          ) {
            // invalid freetext filter query
            ctrl.errorSyntax = true;
          }
          $log.error('Error loading messages', err);
        });
    };

    /**
     * @param {Boolean} force Show list even if viewing the content on mobile
     */
    ctrl.search = function(force) {
      // clears training selection for any text search or filter selection
      // does not clear selection when someone is editing a form
      if((ctrl.filters.search || Object.keys(ctrl.filters).length > 1) && !ctrl.enketoEdited) {
        $state.go('trainings.detail', { id: null }, { notify: false });
        ctrl.clearSelection();
      }
      if (!force && responsive.isMobile() && ctrl.showContent) {
        // leave content shown
        return;
      }
      ctrl.loading = true;
      if (
        ctrl.filters.search ||
        (ctrl.filters.forms &&
          ctrl.filters.forms.selected &&
          ctrl.filters.forms.selected.length) ||
        (ctrl.filters.facilities &&
          ctrl.filters.facilities.selected &&
          ctrl.filters.facilities.selected.length) ||
        (ctrl.filters.date &&
          (ctrl.filters.date.to || ctrl.filters.date.from)) ||
        (ctrl.filters.valid === true || ctrl.filters.valid === false) ||
        (ctrl.filters.verified && ctrl.filters.verified.length)
      ) {
        ctrl.filtered = true;
        liveList = LiveList['training-search'];
      } else {
        ctrl.filtered = false;
        liveList = LiveList.trainings;
      }
      query();
    };

    const initScroll = function() {
      scrollLoader.init(function() {
        if (!ctrl.loading && ctrl.moreItems) {
          query({ skip: true });
        }
      });
    };

    if (!$state.params.id) {
      ctrl.unsetSelected();
    }

    if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }

    ctrl.resetFilterModel = function() {
      if (ctrl.selectMode && ctrl.selectedTrainings && ctrl.selectedTrainings.length) {
        // can't filter when in select mode
        return;
      }
      ctrl.clearFilters();
      SearchFilters.reset();
      ctrl.search();
    };

    ctrl.search();

    $('.inbox').on('click', '#trainings-list .content-row', function(e) {
      if (ctrl.selectMode) {
        e.preventDefault();
        e.stopPropagation();
        const target = $(e.target).closest('li[data-record-id]');
        const trainingId = target.attr('data-record-id');
        const checkbox = target.find('input[type="checkbox"]');
        const alreadySelected = _.find(ctrl.selectedTrainings, { _id: trainingId });
        // timeout so if the user clicked the checkbox it has time to
        // register before we set it to the correct value.
        $timeout(function() {
          checkbox.prop('checked', !alreadySelected);
          if (!alreadySelected) {
            ctrl.selectTraining(trainingId);
          } else {
            ctrl.removeSelectedTraining(trainingId);
          }
        });
      }
    });

    const syncCheckboxes = function() {
      $('#trainings-list li').each(function() {
        const id = $(this).attr('data-record-id');
        const found = _.find(ctrl.selectedTrainings, { _id: id });
        $(this)
          .find('input[type="checkbox"]')
          .prop('checked', found);
      });
    };

    const setActionBarData = function() {
      ctrl.setLeftActionBar({
        hasResults: ctrl.hasTrainings,
        exportFn: function(e) {
          const exportFilters = _.assignIn({}, ctrl.filters);
          ['forms', 'facilities'].forEach(function(type) {
            if (exportFilters[type]) {
              delete exportFilters[type].options;
            }
          });
          const $link = $(e.target).closest('a');
          $link.addClass('mm-icon-disabled');
          $timeout(function() {
            $link.removeClass('mm-icon-disabled');
          }, 2000);

          Export('trainings', exportFilters, { humanReadable: true });
        },
      });
    };

    setActionBarData();

    const changeListener = Changes({
      key: 'trainings-list',
      callback: function(change) {
        if (change.deleted) {
          liveList.remove(change.id);
          ctrl.hasTrainings = liveList.count() > 0;
          setActionBarData();
        } else {
          query({ silent: true, limit: liveList.count() });
        }
      },
      filter: function(change) {
        return change.doc && change.doc.form || liveList.contains(change.id);
      },
    });

    $scope.$on('$destroy', function() {
      unsubscribe();
      changeListener.unsubscribe();
      if (!$state.includes('trainings')) {
        SearchFilters.destroy();
        LiveList.$reset('trainings', 'training-search');
        $('.inbox').off('click', '#trainings-list .content-row');
      }
    });
  });
