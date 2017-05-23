var _ = require('underscore'),
    scrollLoader = require('../modules/scroll-loader');

/** Mask used in medic-android for separating request ID from request code. */
var SP_ID_MASK = 0xFFFFF8;

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsCtrl',
    function (
      $element,
      $log,
      $q,
      $scope,
      $state,
      $stateParams,
      $timeout,
      $translate,
      Changes,
      ContactSchema,
      ContactSummary,
      DB,
      Export,
      LiveList,
      Search,
      SearchFilters,
      Session,
      Tour,
      UserSettings,
      XmlForms
    ) {

      'ngInject';

      var liveList = LiveList.contacts;

      $scope.loading = true;
      $scope.selected = null;
      $scope.filters = {};
      var defaultTypeFilter = {};
      var usersHomePlace;

      // The type of the children of the user's facility.
      var getUserFacilityId = function() {
        return UserSettings()
          .then(function(u) {
            return u.facility_id;
          });
      };
      var getUserHomePlaceSummary = function() {
        return getUserFacilityId().then(function(facilityId) {
          return facilityId && DB().query('medic-client/doc_summaries_by_id', {
            key: [facilityId]
          }).then(function(results) {
              var summary = results &&
                            results.rows &&
                            results.rows.length &&
                            results.rows[0].value;

              if (summary) {
                summary._id = facilityId;
                summary.home = true;
                return summary;
              }
          });
        });
      };

      var _initScroll = function() {
        scrollLoader.init(function() {
          if (!$scope.loading && $scope.moreItems) {
            _query({ skip: true });
          }
        });
      };

      var _query = function(options) {
        options = options || {};
        options.limit = options.limit || 50;

        if (!options.silent) {
          $scope.loading = true;
          $scope.error = false;
        }

        if (options.skip) {
          $scope.appending = true;
          options.skip = liveList.count();
        } else if (!options.silent) {
          liveList.set([]);
        }

        var actualFilter = $scope.filters.search ? $scope.filters : defaultTypeFilter;

        Search('contacts', actualFilter, options).then(function(contacts) {
          // If you have a home place make sure its at the top
          if (usersHomePlace && !$scope.appending) {
            var homeIndex = _.findIndex(contacts, function(contact) {
              return contact._id === usersHomePlace._id;
            });
            if (homeIndex !== -1) {
              // move it to the top
              contacts.splice(homeIndex, 1);
              contacts.unshift(usersHomePlace);
            } else if (!$scope.filters.search) {
              contacts.unshift(usersHomePlace);
            }
          }

          $scope.moreItems = liveList.moreItems = contacts.length >= options.limit;

          contacts.forEach(liveList.update);
          liveList.refresh();
          _initScroll();
          $scope.loading = false;
          $scope.appending = false;
          $scope.hasContacts = liveList.count() > 0;
        })
        .catch(function(err) {
          $scope.error = true;
          $scope.loading = false;
          $scope.appending = false;
          $log.error('Error searching for contacts', err);
        });
      };

      var getActionBarDataForChild = function(docType) {
        var selectedChildPlaceType = ContactSchema.getChildPlaceType(docType);
        if (!selectedChildPlaceType) {
          return $q.resolve();
        }
        var schema = ContactSchema.get(selectedChildPlaceType);
        return {
          addPlaceLabel: schema.addButtonLabel,
          type: selectedChildPlaceType,
          icon: schema ? schema.icon : ''
        };
      };

      // only admins can edit their own place
      var getCanEdit = function(selectedDoc) {
        return setupPromise
          .then(function() {
            return Session.isAdmin() || (usersHomePlace._id !== selectedDoc._id);
          })
          .catch(function() {
            return false;
          });
      };

      $scope.setSelected = function(selected) {
        liveList.setSelected(selected.doc._id);
        $scope.selected = selected;
        $scope.clearCancelTarget();
        var selectedDoc = selected.doc;
        var title = '';
        if (selected.doc.type === 'person') {
          title = 'contact.profile';
        } else {
          title = ContactSchema.get(selected.doc.type).label;
        }
        return $q.all([
          $translate(title),
          getActionBarDataForChild(selectedDoc.type),
          getCanEdit(selectedDoc),
          ContactSummary(selected.doc, selected.reports || [])
        ])
          .then(function(results) {
            $scope.setTitle(results[0]);
            if (results[1]) {
              selectedDoc.child = results[1];
            }
            var canEdit = results[2];
            var summary = results[3];
            $scope.selected.summary = summary;
            var options = { doc: selectedDoc, contactSummary: summary.context };
            XmlForms('ContactsCtrl', options, function(err, forms) {
              if (err) {
                $log.error('Error fetching relevant forms', err);
              }
              var canDelete = !selected.children || (
                                (!selected.children.places  || selected.children.places.length === 0) &&
                                (!selected.children.persons || selected.children.persons.length === 0)
                              );
              $scope.setRightActionBar({
                selected: [ selectedDoc ],
                relevantForms: forms,
                sendTo: selectedDoc.type === 'person' ? selectedDoc : '',
                canEdit: canEdit,
                canDelete: canDelete
              });
            });
          });
      };

      $scope.$on('ClearSelected', function() {
        $scope.selected = null;
        LiveList.contacts.clearSelected();
        LiveList['contact-search'].clearSelected();
        LiveList['contact-simprints-search'].clearSelected();
      });

      $scope.search = function() {
        $scope.loading = true;
        if ($scope.filters.search) {
          $scope.filtered = true;
          liveList = LiveList['contact-search'];
          liveList.set([]);
          _query();
        } else {
          $scope.filtered = false;
          _query();
        }
      };

      $scope.setupSearchFreetext = function() {
        SearchFilters.freetext($scope.search);
      };
      $scope.resetFilterModel = function() {
        $scope.filters = {};
        SearchFilters.reset();
        $scope.search();
      };

      $scope.simprintsSupported = !!(window.medicmobile_android && window.medicmobile_android.simprints_ident);
      $scope.triggerSimprintsIdent = function() {
        /* jslint bitwise: true */
        var simprintsInputId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) & SP_ID_MASK;
        console.log('Launching simprints with input ID: ' + simprintsInputId);

        var $input = $($element).find('input[name=simprints-idents]');
        $input.attr('data-simprints-idents', simprintsInputId);
        $input.on('change', function() {
          var $this = $(this);
          $this.off('change');
          handleSimprintsIdentResponse(JSON.parse($this.val()));
        });

        $scope.loading = true;
        window.medicmobile_android.simprints_ident(simprintsInputId);
      };

      var handleSimprintsIdentResponse = function(idents) {
        console.log('handleSimprintsIdentResponse()', idents);

        $scope.loading = true;
        $scope.filtered = true;
        liveList = LiveList['contact-simprints-search'];
        liveList.set([]);

        DB().query('medic-client/people_by_simprints_id', {
          keys: _.pluck(idents, 'id'),
          include_docs: true,
        })
          .then(function(results) {
            var docs = _.pluck(results.rows, 'doc');
            docs.forEach(function(doc) {
              var ident = idents.find(function(ident) {
                return ident.id === doc.simprints_id;
              });
              doc._simprints_confidence = ident.confidence;
              doc._simprints_stars = Array(6 - Number.parseInt(ident.tier.split('_')[1])).join('<span class="fa fa-star"></span>');
              liveList.update(doc);
            });
            liveList.refresh();
            _initScroll();
            $scope.moreItems = false;
            $scope.loading = false;
            $scope.appending = false;
            $scope.hasContacts = liveList.count() > 0;
          })
          .catch(function(err) {
            $scope.error = true;
            $scope.loading = false;
            $scope.appending = false;
            $log.error('Error searching for contacts by simprints ID', err);
          });
      };

      var setActionBarData = function() {
        var data = {
          userFacilityId: usersHomePlace && usersHomePlace._id,
          exportFn: function() {
            Export($scope.filters, 'contacts');
          }
        };
        var type;
        if (usersHomePlace) {
          type = ContactSchema.getChildPlaceType(usersHomePlace.type);
        } else if (Session.isAdmin()) {
          type = ContactSchema.getPlaceTypes()[0];
        }
        if (type) {
          defaultTypeFilter = { types: { selected: [ type ] }};
          var schema = ContactSchema.get(type);
          data.addPlaceLabel = schema.addButtonLabel;
          data.userChildPlace = {
            type: type,
            icon: schema ? schema.icon : ''
          };
        }
        $scope.setLeftActionBar(data);
      };

      var setupPromise = getUserHomePlaceSummary().then(function(home) {
        usersHomePlace = home;
        setActionBarData();
        return $scope.search();
      });

      this.getSetupPromiseForTesting = function() { return setupPromise; };

      $scope.$on('$stateChangeStart', function(event, toState) {
        if (toState.name.indexOf('contacts') === -1) {
          $scope.unsetSelected();
        }
      });

      var changeListener = Changes({
        key: 'contacts-list',
        callback: function() {
          _query({ limit: liveList.count(), silent: true });
        },
        filter: function(change) {
          return ContactSchema.getTypes().indexOf(change.doc.type) !== -1;
        }
      });

      $scope.$on('$destroy', changeListener.unsubscribe);

      if ($stateParams.tour) {
        Tour.start($stateParams.tour);
      }
    }
  );
}());
